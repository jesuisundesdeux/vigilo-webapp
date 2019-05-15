import $ from 'jquery';
import M from 'materialize-css';

export class ClassImageDrawable {
    constructor(div) {
        this.div = div;
        this.color = "";
        this.initBtn();
        this.setColor('yellow');
        $(this.div).addClass('drawable');
        $(this.div).on('click touch', this.open.bind(this));
    }

    initBtn() {
        $(this.div).append(`
            <div class="fixed-action-btn">
              <a class="btn-floating btn-large waves-effect waves-light grey darken-1 disbabled">
                <i class="large material-icons">undo</i>
              </a>
              <a class="btn-floating btn-large waves-effect waves-light grey darken-1 disbabled">
                <i class="large material-icons">redo</i>
              </a>
              <a id="colorpicker" class="btn-floating btn-large waves-effect waves-light">
                <i class="large material-icons">color_lens</i>
              </a>
              <ul>
                <li><a class="btn-floating red" data-color="red"></a></li>
                <li><a class="btn-floating yellow" data-color="yellow"></a></li>
                <li><a class="btn-floating green" data-color="green"></a></li>
                <li><a class="btn-floating blue" data-color="blue"></a></li>
              </ul>
              <a id="close" class="btn-floating btn-large waves-effect waves-light grey darken-1">
                <i class="large material-icons">close</i>
              </a>
            </div>
        `)
        M.FloatingActionButton.init($(this.div).find('.fixed-action-btn')[0])
        $(this.div).find('#close').on('click', this.close.bind(this))
        var self = this;
        $(this.div).find("ul li a").click(function(){
          self.setColor($(this).data('color'))
        })


    }
    setColor(newColor){
      $(this.div).find('#colorpicker').removeClass(this.color).addClass(newColor);
      this.color=newColor;
    }

    isFullscreen() {
        return $(this.div).hasClass('fullscreen');
    }

    open(e) {
        $(this.div).addClass('fullscreen');
        e.stopPropagation();
        e.preventDefault();
    }
    close(e) {
        $(this.div).removeClass('fullscreen');
        e.stopPropagation();
        e.preventDefault();
    }
}

export default function ImageDrawable(options) {
    return new ClassImageDrawable(options);
}