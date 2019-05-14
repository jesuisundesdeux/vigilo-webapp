import $ from 'jquery';
import M from 'materialize-css';

export class ClassImageDrawable {
    constructor(div) {
        this.div = div
        this.initBtn()
        $(this.div).addClass('drawable');
        $(this.div).on('click touch', this.open.bind(this))
    }

    initBtn() {
        $(this.div).append(`
            <div class="fixed-action-btn">
              <a class="btn-floating btn-large waves-effect waves-light blue">
                <i class="large material-icons">undo</i>
              </a>
              <a class="btn-floating btn-large waves-effect waves-light blue">
                <i class="large material-icons">redo</i>
              </a>
              <a class="btn-floating btn-large waves-effect waves-light green">
                <i class="large material-icons">color_lens</i>
              </a>
              <ul>
                <li><a class="btn-floating red"></a></li>
                <li><a class="btn-floating yellow"></a></li>
                <li><a class="btn-floating green"></a></li>
                <li><a class="btn-floating blue"></a></li>
              </ul>
              <a id="close" class="btn-floating btn-large waves-effect waves-light red">
                <i class="large material-icons">close</i>
              </a>
            </div>
        `)
        M.FloatingActionButton.init($(this.div).find('.fixed-action-btn')[0])
        $(this.div).find('#close').on('click', this.close.bind(this))

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