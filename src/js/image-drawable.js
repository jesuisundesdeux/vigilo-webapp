import $ from 'jquery';
import M from 'materialize-css';


export class ClassImageDrawable {

  constructor(div) {
    this.queue_length = 10;
    this.rotation = 0;
    this.backHistory = [];
    this.upHistory = [];
    this.drawing = false;

    this.div = div;
    this.ctx = $(div).find('canvas')[0].getContext('2d');
    this.height = $(div).find('canvas')[0].height;
    this.width = $(div).find('canvas')[0].width;
    this.initBtn();
    this.setColor('yellow');
    $(this.div).addClass('drawable');
    $(this.div).on('click touch', this.open.bind(this));
  }

  initBtn() {
    $(this.div).append(`
            <div class="fixed-action-btn undo">
              <a class="btn-floating waves-effect waves-light grey darken-1 disbabled">
                <i class="large material-icons">undo</i>
              </a>
            </div>
            <div class="fixed-action-btn redo">
              <a class="btn-floating waves-effect waves-light grey darken-1 disbabled">
                <i class="large material-icons">redo</i>
              </a>
            </div>
            <div class="fixed-action-btn rotate_left">
              <a class="btn-floating waves-effect waves-light grey darken-1">
                <i class="large material-icons">rotate_left</i>
              </a>
            </div>
            <div class="fixed-action-btn rotate_right">
              <a class="btn-floating waves-effect waves-light grey darken-1">
                <i class="large material-icons">rotate_right</i>
              </a>
            </div>
            <div class="fixed-action-btn color-picker">
              <a class="btn-floating btn-large waves-effect waves-light">
                <i class="large material-icons">color_lens</i>
              </a>
              <ul>
                <li><a class="btn-floating red" data-color="red"></a></li>
                <li><a class="btn-floating yellow" data-color="yellow"></a></li>
                <li><a class="btn-floating green" data-color="green"></a></li>
                <li><a class="btn-floating blue" data-color="blue"></a></li>
                <li><a class="btn-floating grey darken-4" data-color="black"></a></li>
                <li><a class="btn-floating white" data-color="white"></a></li>
              </ul>
            </div>
            <div class="fixed-action-btn close">
              <a id="close" class="btn-floating btn-large waves-effect waves-light grey darken-1">
                <i class="large material-icons">close</i>
              </a>
            </div>
        `)
    M.FloatingActionButton.init($(this.div).find('.fixed-action-btn.color-picker')[0])
    $(this.div).find('.fixed-action-btn.close').on('click', this.close.bind(this))
    var self = this;
    $(this.div).find(".fixed-action-btn.color-picker ul li a").click(function () {
      self.setColor($(this).data('color'))
      M.FloatingActionButton.getInstance($(self.div).find('.fixed-action-btn.color-picker')[0]).close()
    })
    $(this.div).find(".fixed-action-btn.undo a").click(this.undo.bind(this))
    $(this.div).find(".fixed-action-btn.redo a").click(this.redo.bind(this))
    $(this.div).find(".fixed-action-btn.rotate_left a").click(this.rotate.bind(this, false));
    $(this.div).find(".fixed-action-btn.rotate_right a").click(this.rotate.bind(this, true));
    this.updateBtnStatus()
  }

  setColor(newColor) {
    $(this.div).find('.fixed-action-btn.color-picker a').first().removeClass(this.color).addClass(newColor);
    this.color = newColor;
    this.ctx.lineWidth = 30;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.strokeStyle = this.color;
  }

  isFullscreen() {
    return $(this.div).hasClass('fullscreen');
  }

  open(e) {
    $(this.div).addClass('fullscreen');
    e.stopPropagation();
    e.preventDefault();

    $(this.div).find('canvas').on('mousedown touchstart', this.startDraw.bind(this))
    $(this.div).find('canvas').on('mouseup mouseleave touchend touchleave', this.stopDraw.bind(this))
    $(this.div).find('canvas').on('mousemove touchmove', this.onDraw.bind(this))

    this.offset = $(this.div).find('canvas').offset();
  }

  close(e) {
    $(this.div).removeClass('fullscreen');
    e.stopPropagation();
    e.preventDefault();

    this.stopDraw();

    $(this.div).find('canvas').off('mousedown touchstart');
    $(this.div).find('canvas').off('mouseup mouseleave touchend touchleave');
    $(this.div).find('canvas').off('mousemove touchmove');
  }

  updateBtnStatus() {
    if (this.backHistory.length == 0) {
      $(this.div).find(".fixed-action-btn.undo a").addClass('disabled')
    } else {
      $(this.div).find(".fixed-action-btn.undo a").removeClass('disabled')
    }
    if (this.upHistory.length == 0) {
      $(this.div).find(".fixed-action-btn.redo a").addClass('disabled')
    } else {
      $(this.div).find(".fixed-action-btn.redo a").removeClass('disabled')
    }
  }

  saveImage() {
    // push image to history and clean upcomming history
    var data = this.ctx.getImageData(0, 0, this.width, this.height);
    this.backHistory.push({"rotation": this.rotation, "data":data});
    this.backHistory.slice(-this.queue_length);
    this.upHistory = []
    this.updateBtnStatus()
  }

  redo() {
    if (this.upHistory.length == 0) {
      return
    }
    // push image to back history and shift up history to canvas
    var data = this.ctx.getImageData(0, 0, this.width, this.height);
    this.backHistory.push({"rotation": this.rotation, "data":data});
    var to_redo = this.upHistory.shift(this.backHistory);
    var delta_rotation = ((to_redo.rotation - this.rotation)%4 + 4)%4;
    for (var i = delta_rotation; i>0; i--) {
      this.rotate(true);
    }
    this.ctx.putImageData(to_redo.data, 0, 0, 0, 0, this.width, this.height);
    for (var i = delta_rotation; i>0; i--) {
      this.rotate(false);
    }
    this.updateBtnStatus()
  }

  undo() {
    if (this.backHistory.length == 0) {
      return
    }
    // unshift image to upcomming history and pop back history to canvas
    var data = this.ctx.getImageData(0, 0, this.width, this.height);
    this.upHistory.unshift({"rotation": this.rotation, "data":data});
    var to_undo = this.backHistory.pop(this.backHistory);
    var delta_rotation = ((this.rotation - to_undo.rotation)%4 + 4)%4;
    for (var i = delta_rotation; i>0; i--) {
      this.rotate( false );
    }
    this.ctx.putImageData(to_undo.data, 0, 0, 0, 0, this.width, this.height);
    for (var i = delta_rotation; i>0; i--) {
      this.rotate( true );
    }
    this.updateBtnStatus()
  }

  startDraw(e) {
    if (!this.drawing) {
      this.drawing = true;
      this.ratioWidth = this.width / $("canvas").last().width();
      this.ratioHeight = this.height / $("canvas").last().height();
      this.saveImage();
      console.log('start')
      e.stopPropagation();
      e.preventDefault();
      this.ctx.beginPath();
    }
  }

  stopDraw(e) {
    if (this.drawing) {
      this.drawing = false
      console.log('stop')
      e.stopPropagation();
      e.preventDefault();
    }
  }

  onDraw(e) {
    if (!this.drawing) {
      this.lastDrawX = undefined;
      this.lastDrawY = undefined;
      return;
    }
    
    var x, y;
    if (e.type == 'touchmove') {
      x = e.changedTouches[0].pageX;
      y = e.changedTouches[0].pageY;
    } else {
      x = e.pageX;
      y = e.pageY;
    }
    x = (x - this.offset.left) * this.ratioWidth;
    y = (y - this.offset.top) * this.ratioHeight;

    var lX = this.lastDrawX;
    var lY = this.lastDrawY;
    this.lastDrawX = x;	
    this.lastDrawY = y;	

    if (lX === undefined || lY === undefined){
      this.ctx.moveTo(x, y);
      return;	
    } else {
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
    
    e.stopPropagation();
    e.preventDefault();
  }


  rotate(clockwise) {
    console.log("rotate", clockwise);

    if (clockwise) {
      this.rotation++;
    } else {
      this.rotation--;
    }
    var canvas = $(this.div).find('canvas')[0];

    // Store data in temp canvas
    var tempCanvas = document.createElement("canvas"),
    tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas,0,0,canvas.width,canvas.height);

    this.ctx.save();
    this.height = canvas.width;
    this.width = canvas.height;
      
    canvas.width = this.width;
    canvas.height = this.height;

    this.ctx.translate(canvas.width/2, canvas.height/2);
    this.ctx.rotate( (clockwise?1:-1)*Math.PI / 2 );
    this.ctx.translate(-canvas.height/2, -canvas.width/2);
    this.ctx.drawImage(tempCanvas, 0, 0);
    this.ctx.restore();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.setColor(this.color);
    this.offset = $(this.div).find('canvas').offset();


  }
}

export default function ImageDrawable(options) {
  return new ClassImageDrawable(options);
}
