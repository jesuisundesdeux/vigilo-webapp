/**
 * Full screen photo viewer (observation photo): pinch to zoom and drag with the
 * fingers, double tap / double click to zoom in or out, mouse wheel on a computer.
 * Closed by the cross, Escape, the back button (history entry) or a tap beside the photo.
 */
import $ from 'jquery';
import i18next from 'i18next';

const MAX_SCALE = 6;
const DOUBLE_TAP_SCALE = 2.5;

var viewer = null;

export function openPhotoViewer(src, alt) {
  closePhotoViewer(false);
  var overlay = $(`<div id="photo-viewer" class="photo-viewer" role="dialog" aria-modal="true">
      <img class="photo-viewer-img" alt="" draggable="false">
      <a href="#!" class="photo-viewer-close" data-i18n-attr='{"title": "close", "aria-label": "close"}'><i class="material-icons">close</i></a>
    </div>`);
  overlay.find(".photo-viewer-close").attr({ title: i18next.t("close"), "aria-label": i18next.t("close") });
  overlay.find("img").attr({ src: src, alt: alt || "" });
  $("body").append(overlay);
  var el = overlay[0];
  viewer = { el: el, img: el.querySelector("img"), scale: 1, tx: 0, ty: 0, pointers: new Map(), gesture: null, lastTap: null };
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("dblclick", (e) => e.preventDefault());
  overlay.find(".photo-viewer-close").on("click", (e) => { e.preventDefault(); closePhotoViewer(); });
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", onResize);
  // the back button closes the viewer instead of leaving the page
  history.pushState({ photoViewer: true }, "");
  window.addEventListener("popstate", onPopState);
  // real full screen when the browser allows it (not on iPhone: the overlay fills the screen anyway)
  if (el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  }
  document.addEventListener("fullscreenchange", onFullscreenChange);
  overlay.find(".photo-viewer-close").trigger("focus");
}

export function closePhotoViewer(fromHistory) {
  if (viewer === null) {
    return;
  }
  var el = viewer.el;
  viewer = null;
  window.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("resize", onResize);
  window.removeEventListener("popstate", onPopState);
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  if (document.fullscreenElement === el && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  $(el).remove();
  if (fromHistory !== true && history.state && history.state.photoViewer) {
    history.back();
  }
}

function onPopState() {
  closePhotoViewer(true);
}

function onFullscreenChange() {
  // leaving the full screen (gesture, Escape) closes the viewer
  if (viewer !== null && document.fullscreenElement === null && viewer.wasFullscreen) {
    closePhotoViewer();
  } else if (viewer !== null && document.fullscreenElement === viewer.el) {
    viewer.wasFullscreen = true;
  }
}

function onKeyDown(e) {
  if (e.key == "Escape") {
    // keep the observation window open
    e.stopPropagation();
    e.preventDefault();
    closePhotoViewer();
  }
}

function onResize() {
  apply(false);
}

// Size of the photo displayed without zoom (object-fit: contain), and its offset
function baseRect() {
  var W = viewer.el.clientWidth, H = viewer.el.clientHeight;
  var nw = viewer.img.naturalWidth || W, nh = viewer.img.naturalHeight || H;
  var ratio = Math.min(W / nw, H / nh);
  var w = nw * ratio, h = nh * ratio;
  return { W: W, H: H, x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
}

// Keep the photo on screen: centered when smaller than the screen, no empty border otherwise
function clamp() {
  var r = baseRect(), s = viewer.scale;
  var axis = (t, size, offset, screen) => {
    if (size * s <= screen) {
      return (screen - size * s) / 2 - offset * s;
    }
    return Math.min(-offset * s, Math.max(screen - (offset + size) * s, t));
  };
  viewer.tx = axis(viewer.tx, r.w, r.x, r.W);
  viewer.ty = axis(viewer.ty, r.h, r.y, r.H);
}

function apply(animate) {
  if (viewer === null) {
    return;
  }
  clamp();
  viewer.img.style.transition = animate ? "transform .2s ease" : "none";
  viewer.img.style.transform = `translate(${viewer.tx}px, ${viewer.ty}px) scale(${viewer.scale})`;
  viewer.el.classList.toggle("zoomed", viewer.scale > 1.01);
}

// Zoom to a scale keeping the point (x, y) of the screen in place
function zoomAt(scale, x, y, animate) {
  scale = Math.min(MAX_SCALE, Math.max(1, scale));
  viewer.tx = x - (x - viewer.tx) * (scale / viewer.scale);
  viewer.ty = y - (y - viewer.ty) * (scale / viewer.scale);
  viewer.scale = scale;
  apply(animate);
}

// Whether a point of the screen is on the photo (the <img> fills the screen, the photo is centered in it)
function onPhoto(p) {
  var r = baseRect(), s = viewer.scale;
  var x = (p.x - viewer.tx) / s, y = (p.y - viewer.ty) / s;
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function point(e) {
  var rect = viewer.el.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startGesture() {
  var pts = Array.from(viewer.pointers.values());
  if (pts.length >= 2) {
    var [a, b] = pts;
    viewer.gesture = {
      type: "pinch",
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      scale: viewer.scale, tx: viewer.tx, ty: viewer.ty
    };
  } else if (pts.length == 1) {
    viewer.gesture = { type: "pan", start: pts[0], tx: viewer.tx, ty: viewer.ty };
  } else {
    viewer.gesture = null;
  }
}

function onPointerDown(e) {
  if (e.target.closest(".photo-viewer-close")) {
    return;
  }
  e.preventDefault();
  viewer.el.setPointerCapture(e.pointerId);
  var p = point(e);
  viewer.pointers.set(e.pointerId, p);
  if (viewer.pointers.size == 1) {
    viewer.down = { x: p.x, y: p.y, time: Date.now(), moved: false, onImage: onPhoto(p) };
  } else {
    viewer.down = null;
  }
  startGesture();
}

function onPointerMove(e) {
  if (viewer === null || !viewer.pointers.has(e.pointerId)) {
    return;
  }
  var p = point(e);
  viewer.pointers.set(e.pointerId, p);
  var g = viewer.gesture;
  if (viewer.down && Math.hypot(p.x - viewer.down.x, p.y - viewer.down.y) > 10) {
    viewer.down.moved = true;
  }
  if (g && g.type == "pinch" && viewer.pointers.size >= 2) {
    var [a, b] = Array.from(viewer.pointers.values());
    var scale = Math.min(MAX_SCALE, Math.max(1, g.scale * Math.hypot(a.x - b.x, a.y - b.y) / g.dist));
    var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    viewer.scale = scale;
    viewer.tx = mid.x - (g.mid.x - g.tx) * (scale / g.scale);
    viewer.ty = mid.y - (g.mid.y - g.ty) * (scale / g.scale);
    apply(false);
  } else if (g && g.type == "pan" && viewer.scale > 1) {
    viewer.tx = g.tx + p.x - g.start.x;
    viewer.ty = g.ty + p.y - g.start.y;
    apply(false);
  }
}

function onPointerUp(e) {
  if (viewer === null || !viewer.pointers.has(e.pointerId)) {
    return;
  }
  viewer.pointers.delete(e.pointerId);
  var down = viewer.down;
  // a tap (no move): double tap zooms, a tap beside the photo closes
  if (e.type == "pointerup" && down && !down.moved && viewer.pointers.size == 0 && Date.now() - down.time < 400) {
    var now = Date.now();
    var last = viewer.lastTap;
    if (last && now - last.time < 350 && Math.hypot(down.x - last.x, down.y - last.y) < 30) {
      viewer.lastTap = null;
      clearTimeout(viewer.tapTimer);
      if (viewer.scale > 1.01) {
        zoomAt(1, down.x, down.y, true);
      } else {
        zoomAt(DOUBLE_TAP_SCALE, down.x, down.y, true);
      }
    } else {
      viewer.lastTap = { x: down.x, y: down.y, time: now };
      if (!down.onImage && viewer.scale <= 1.01) {
        // wait to know whether it is a double tap
        viewer.tapTimer = setTimeout(() => {
          if (viewer !== null && viewer.lastTap && viewer.lastTap.time == now) {
            closePhotoViewer();
          }
        }, 350);
      }
    }
  }
  viewer.down = null;
  startGesture();
}

function onWheel(e) {
  e.preventDefault();
  var p = point(e);
  zoomAt(viewer.scale * Math.exp(-e.deltaY * 0.002), p.x, p.y, false);
}
