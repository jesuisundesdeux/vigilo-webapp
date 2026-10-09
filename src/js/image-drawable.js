import $ from 'jquery';
import i18next from 'i18next';

// Picture editor of the form: opens full screen on click on the picture.
// Tools: pen, arrow, circle (to circle something) and blur (rectangle).
// Two fingers zoom and move the picture (mouse wheel on a computer); one finger draws.

const COLORS = {
  red: "#e53935",
  yellow: "#fdd835",
  green: "#43a047",
  blue: "#1e88e5",
  black: "#000000",
  white: "#ffffff"
};
// Line widths, relative to the largest side of the picture
const SIZES = [0.006, 0.012, 0.024];
const TOOLS = [
  { name: "pen", icon: "gesture" },
  { name: "arrow", icon: "north_east" },
  { name: "circle", icon: "radio_button_unchecked" },
  { name: "blur", icon: "blur_on" }
];
const HISTORY_LENGTH = 10;
const MAX_ZOOM = 8;

function button(cls, icon, titleKey, attrs) {
  return `<a href="#!" class="drawable-btn ${cls}" title="${i18next.t(titleKey)}" ${attrs || ''}><i class="material-icons">${icon}</i></a>`;
}

export class ClassImageDrawable {

  constructor(div) {
    this.rotation = 0;
    this.backHistory = [];
    this.upHistory = [];
    this.drawing = false;
    this.tool = "pen";
    this.size = 1;
    this.color = "yellow";
    this.pointers = new Map();
    this.pinch = null;
    this.view = { scale: 1, tx: 0, ty: 0 };

    this.div = div;
    this.el = $(div)[0];
    this.canvas = $(div).find('canvas')[0];
    this.ctx = this.canvas.getContext('2d');
    this.height = this.canvas.height;
    this.width = this.canvas.width;
    this.initBtn();
    this.applyStyle();
    // namespaced: a new picture replaces the editor of the previous one
    $(this.div).off('.drawable .drawable-edit').addClass('drawable');
    $(this.div).on('click.drawable', this.open.bind(this));
  }

  initBtn() {
    var tools = TOOLS.map((t) => button("tool", t.icon, "editor-" + t.name, `data-tool="${t.name}"`)).join('');
    var colors = Object.keys(COLORS).map((c) =>
      `<a href="#!" class="drawable-color" data-color="${c}" style="background:${COLORS[c]}" title="${i18next.t("editor-color")}"></a>`).join('');
    $(this.div).append(`
      <div class="drawable-toolbar drawable-top">
        ${button("undo", "undo", "editor-undo")}
        ${button("redo", "redo", "editor-redo")}
        ${button("rotate-left", "rotate_left", "editor-rotate-left")}
        ${button("rotate-right", "rotate_right", "editor-rotate-right")}
        <span class="drawable-spacer"></span>
        ${button("done", "check", "editor-done")}
      </div>
      <div class="drawable-toolbar drawable-bottom">
        ${tools}
        <a href="#!" class="drawable-btn size" title="${i18next.t("editor-size")}"><span class="size-dot"></span></a>
        <a href="#!" class="drawable-btn color" title="${i18next.t("editor-color")}"><span class="color-dot"></span></a>
        <div class="drawable-colors">${colors}</div>
      </div>
    `);
    var self = this;
    var on = (selector, handler) => $(this.div).find(selector).on('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handler.call(this, e);
    });
    on('.drawable-btn.done', (e) => this.close(e));
    on('.drawable-btn.undo', () => this.undo());
    on('.drawable-btn.redo', () => this.redo());
    on('.drawable-btn.rotate-left', () => this.rotate(false));
    on('.drawable-btn.rotate-right', () => this.rotate(true));
    on('.drawable-btn.tool', function () { self.setTool($(this).data('tool')); });
    on('.drawable-btn.size', () => { this.size = (this.size + 1) % SIZES.length; this.applyStyle(); });
    on('.drawable-btn.color', () => $(this.div).find('.drawable-colors').toggleClass('open'));
    on('.drawable-color', function () {
      self.color = $(this).data('color');
      $(self.div).find('.drawable-colors').removeClass('open');
      self.applyStyle();
    });
    this.setTool(this.tool);
    this.updateBtnStatus();
  }

  setTool(tool) {
    this.tool = tool;
    $(this.div).find('.drawable-btn.tool').each(function () {
      $(this).toggleClass('active', $(this).data('tool') == tool);
    });
  }

  lineWidth() {
    return Math.max(2, Math.round(SIZES[this.size] * Math.max(this.width, this.height)));
  }

  // Line style of the context (reset when the canvas is resized by a rotation)
  applyStyle() {
    this.ctx.lineWidth = this.lineWidth();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.strokeStyle = COLORS[this.color];
    this.ctx.fillStyle = COLORS[this.color];
    $(this.div).find('.color-dot').css('background', COLORS[this.color]);
    $(this.div).find('.size-dot').css({ width: 6 + this.size * 6, height: 6 + this.size * 6 });
  }

  isFullscreen() {
    return $(this.div).hasClass('fullscreen');
  }

  open(e) {
    if (this.isFullscreen()) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    $(this.div).addClass('fullscreen');
    this.resetView();
    $(this.div)
      .on('pointerdown.drawable-edit', this.onPointerDown.bind(this))
      .on('pointermove.drawable-edit', this.onPointerMove.bind(this))
      .on('pointerup.drawable-edit pointercancel.drawable-edit', this.onPointerUp.bind(this))
      .on('wheel.drawable-edit', this.onWheel.bind(this));
  }

  close(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    this.drawing = false;
    this.pointers.clear();
    this.pinch = null;
    this.resetView();
    $(this.div).removeClass('fullscreen');
    $(this.div).find('.drawable-colors').removeClass('open');
    $(this.div).off('.drawable-edit');
  }

  // ---- Zoom (CSS transform of the canvas: point() reads the transformed position, drawing stays exact)

  resetView() {
    this.view = { scale: 1, tx: 0, ty: 0 };
    this.applyView();
  }

  applyView() {
    var v = this.view;
    if (v.scale <= 1.001) {
      v.scale = 1;
      v.tx = 0;
      v.ty = 0;
    } else {
      // keep the picture over the center of the screen
      var L = this.canvasOrigin(), w = this.canvas.offsetWidth, h = this.canvas.offsetHeight;
      var cx = this.el.clientWidth / 2, cy = this.el.clientHeight / 2;
      v.tx = Math.min(cx - L.x, Math.max(cx - L.x - w * v.scale, v.tx));
      v.ty = Math.min(cy - L.y, Math.max(cy - L.y - h * v.scale, v.ty));
    }
    this.canvas.style.transformOrigin = "0 0";
    this.canvas.style.transform = v.scale == 1 ? "" : `translate(${v.tx}px, ${v.ty}px) scale(${v.scale})`;
  }

  // Position of the (untransformed) canvas in the editor
  canvasOrigin() {
    return { x: this.canvas.offsetLeft, y: this.canvas.offsetTop };
  }

  // Pointer position in the editor
  screenPoint(e) {
    var rect = this.el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Zoom keeping the point p of the editor in place
  zoomAt(scale, p) {
    var v = this.view, L = this.canvasOrigin();
    scale = Math.min(MAX_ZOOM, Math.max(1, scale));
    v.tx = p.x - L.x - (p.x - L.x - v.tx) * (scale / v.scale);
    v.ty = p.y - L.y - (p.y - L.y - v.ty) * (scale / v.scale);
    v.scale = scale;
    this.applyView();
  }

  startPinch() {
    var [a, b] = Array.from(this.pointers.values());
    this.pinch = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      scale: this.view.scale, tx: this.view.tx, ty: this.view.ty
    };
  }

  onPointerDown(e) {
    if ($(e.target).closest('.drawable-toolbar, .drawable-colors').length) {
      return;
    }
    e.preventDefault();
    this.el.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, this.screenPoint(e));
    if (this.pointers.size == 2) {
      // second finger: zoom instead of drawing
      this.cancelDraw();
      this.startPinch();
    } else if (this.pointers.size == 1 && e.target === this.canvas) {
      this.startDraw(e);
    }
  }

  onPointerMove(e) {
    if (!this.pointers.has(e.pointerId)) {
      return;
    }
    this.pointers.set(e.pointerId, this.screenPoint(e));
    if (this.pinch && this.pointers.size >= 2) {
      e.preventDefault();
      var [a, b] = Array.from(this.pointers.values());
      var g = this.pinch, L = this.canvasOrigin();
      var scale = Math.min(MAX_ZOOM, Math.max(1, g.scale * Math.hypot(a.x - b.x, a.y - b.y) / g.dist));
      var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.view.scale = scale;
      this.view.tx = mid.x - L.x - (g.mid.x - L.x - g.tx) * (scale / g.scale);
      this.view.ty = mid.y - L.y - (g.mid.y - L.y - g.ty) * (scale / g.scale);
      this.applyView();
    } else {
      this.onDraw(e);
    }
  }

  onPointerUp(e) {
    if (!this.pointers.has(e.pointerId)) {
      return;
    }
    this.pointers.delete(e.pointerId);
    if (this.pinch) {
      // the drawing starts again only with a new finger
      if (this.pointers.size < 2) {
        this.pinch = null;
      }
      return;
    }
    this.stopDraw(e);
  }

  onWheel(e) {
    e.preventDefault();
    this.zoomAt(this.view.scale * Math.exp(-e.originalEvent.deltaY * 0.002), this.screenPoint(e));
  }

  updateBtnStatus() {
    $(this.div).find(".drawable-btn.undo").toggleClass('disabled', this.backHistory.length == 0);
    $(this.div).find(".drawable-btn.redo").toggleClass('disabled', this.upHistory.length == 0);
  }

  saveImage() {
    // push image to history and clean upcoming history
    var data = this.ctx.getImageData(0, 0, this.width, this.height);
    this.backHistory.push({ "rotation": this.rotation, "data": data });
    this.backHistory = this.backHistory.slice(-HISTORY_LENGTH);
    this.upHistory = [];
    this.updateBtnStatus();
    return data;
  }

  redo() {
    if (this.upHistory.length == 0) {
      return;
    }
    // push image to back history and shift up history to canvas
    var data = this.ctx.getImageData(0, 0, this.width, this.height);
    this.backHistory.push({ "rotation": this.rotation, "data": data });
    var to_redo = this.upHistory.shift();
    var delta_rotation = ((to_redo.rotation - this.rotation) % 4 + 4) % 4;
    for (var i = delta_rotation; i > 0; i--) {
      this.rotate(true, true);
    }
    this.ctx.putImageData(to_redo.data, 0, 0);
    this.updateBtnStatus();
  }

  undo() {
    if (this.backHistory.length == 0) {
      return;
    }
    // unshift image to upcoming history and pop back history to canvas
    var data = this.ctx.getImageData(0, 0, this.width, this.height);
    this.upHistory.unshift({ "rotation": this.rotation, "data": data });
    var to_undo = this.backHistory.pop();
    var delta_rotation = ((to_undo.rotation - this.rotation) % 4 + 4) % 4;
    for (var i = delta_rotation; i > 0; i--) {
      this.rotate(true, true);
    }
    this.ctx.putImageData(to_undo.data, 0, 0);
    this.updateBtnStatus();
  }

  // Pointer position in canvas pixels
  point(e) {
    var rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * this.width / rect.width,
      y: (e.clientY - rect.top) * this.height / rect.height
    };
  }

  startDraw(e) {
    if (this.drawing) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    $(this.div).find('.drawable-colors').removeClass('open');
    this.drawing = true;
    this.snapshot = this.saveImage();
    this.start = this.last = this.point(e);
    if (this.tool == "pen") {
      // a single tap draws a dot
      this.ctx.beginPath();
      this.ctx.moveTo(this.start.x, this.start.y);
      this.ctx.lineTo(this.start.x, this.start.y);
      this.ctx.stroke();
    }
  }

  // A drawing started by the first finger of a pinch is undone
  cancelDraw() {
    if (!this.drawing) {
      return;
    }
    this.drawing = false;
    this.ctx.putImageData(this.snapshot, 0, 0);
    this.backHistory.pop();
    this.updateBtnStatus();
  }

  onDraw(e) {
    if (!this.drawing) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    var p = this.point(e);
    if (this.tool == "pen") {
      this.ctx.beginPath();
      this.ctx.moveTo(this.last.x, this.last.y);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
    } else {
      // shapes: redraw from the picture before the gesture
      this.ctx.putImageData(this.snapshot, 0, 0);
      this.drawShape(this.start, p, true);
    }
    this.last = p;
  }

  stopDraw(e) {
    if (!this.drawing) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.drawing = false;
    if (this.tool != "pen") {
      this.ctx.putImageData(this.snapshot, 0, 0);
      var p = this.point(e);
      if (Math.hypot(p.x - this.start.x, p.y - this.start.y) < this.lineWidth()) {
        // too small: nothing drawn, forget the history entry
        this.backHistory.pop();
        this.updateBtnStatus();
        return;
      }
      this.drawShape(this.start, p, false);
    }
  }

  drawShape(a, b, preview) {
    var ctx = this.ctx;
    if (this.tool == "arrow") {
      var head = Math.max(this.ctx.lineWidth * 3, 16);
      var angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x - Math.cos(angle) * head * 0.6, b.y - Math.sin(angle) * head * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 7), b.y - head * Math.sin(angle - Math.PI / 7));
      ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 7), b.y - head * Math.sin(angle + Math.PI / 7));
      ctx.closePath();
      ctx.fill();
    } else if (this.tool == "circle") {
      ctx.beginPath();
      ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (this.tool == "blur") {
      var x = Math.max(0, Math.min(a.x, b.x)), y = Math.max(0, Math.min(a.y, b.y));
      var w = Math.min(this.width, Math.max(a.x, b.x)) - x, h = Math.min(this.height, Math.max(a.y, b.y)) - y;
      if (w < 1 || h < 1) {
        return;
      }
      if (preview) {
        ctx.save();
        ctx.lineWidth = Math.max(2, this.width / 300);
        ctx.setLineDash([ctx.lineWidth * 4, ctx.lineWidth * 3]);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      } else {
        this.blur(x, y, w, h);
      }
    }
  }

  // Blur a rectangle: shrink it then enlarge it (works on every browser, unlike ctx.filter)
  blur(x, y, w, h) {
    var block = Math.max(12, this.lineWidth() * 1.5);
    var tmp = document.createElement("canvas");
    tmp.width = Math.max(1, Math.round(w / block));
    tmp.height = Math.max(1, Math.round(h / block));
    var tctx = tmp.getContext("2d");
    tctx.drawImage(this.canvas, x, y, w, h, 0, 0, tmp.width, tmp.height);
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
    this.ctx.restore();
  }

  // Rotate a quarter turn. inHistory: called by undo/redo, which restore the pixels themselves
  rotate(clockwise, inHistory) {
    if (!inHistory) {
      this.saveImage();
    }
    this.rotation += clockwise ? 1 : -1;
    var canvas = this.canvas;

    // Store data in temp canvas
    var tempCanvas = document.createElement("canvas"),
      tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

    this.height = canvas.width;
    this.width = canvas.height;
    canvas.width = this.width;
    canvas.height = this.height;

    this.ctx.save();
    this.ctx.translate(canvas.width / 2, canvas.height / 2);
    this.ctx.rotate((clockwise ? 1 : -1) * Math.PI / 2);
    this.ctx.translate(-canvas.height / 2, -canvas.width / 2);
    this.ctx.drawImage(tempCanvas, 0, 0);
    this.ctx.restore();
    this.applyStyle();
    this.resetView();
  }
}

export default function ImageDrawable(options) {
  return new ClassImageDrawable(options);
}
