/**
 * Close cross in the top right corner of the modals (Materialize closes a modal on a
 * click on any .modal-close element inside it). The observation modal is rebuilt at
 * each opening: addModalCross is called again after its content is replaced.
 */
import $ from 'jquery';
import i18next from 'i18next';

// modals without a cross: the sending progress can't be cancelled
const WITHOUT_CROSS = ['modal-form-loader'];

export function addModalCross(modal) {
  var el = $(modal);
  if (WITHOUT_CROSS.includes(el.attr('id')) || el.children('.modal-x').length) {
    return;
  }
  var label = i18next.t('close');
  el.prepend($('<a href="#!" class="modal-close modal-x" data-i18n-attr=\'{"title": "close", "aria-label": "close"}\'><i class="material-icons">close</i></a>')
    .attr({ title: label, 'aria-label': label }));
}

export function addModalCrosses() {
  $('.modal').each(function () { addModalCross(this); });
}

// Width of the scrollbar of whichever element scrolls: .modal, or its .modal-content for a
// fixed-footer modal. 0 when there is no scrollbar (the cross then stays flush-right).
function modalScrollbarWidth(modal) {
  var content = modal.querySelector('.modal-content');
  var m = modal.offsetWidth - modal.clientWidth;
  var c = content ? (content.offsetWidth - content.clientWidth) : 0;
  return Math.max(m, c);
}

/**
 * Keep the close cross clear of the scrollbar: expose the scrollbar width as the CSS variable
 * --modal-sbw (used by .modal-x). Measured when the modal opens; re-measured on resize since the
 * content (e.g. a photo loaded afterwards) can change whether a scrollbar is shown.
 */
export function initModalScrollbarInset() {
  $('.modal').each(function () {
    var modal = this;
    var measure = function () {
      if (modal.classList.contains('open')) {
        requestAnimationFrame(function () {
          modal.style.setProperty('--modal-sbw', modalScrollbarWidth(modal) + 'px');
        });
      }
    };
    new MutationObserver(measure).observe(modal, { attributes: true, attributeFilter: ['class'] });
    if (window.ResizeObserver) {
      var content = modal.querySelector('.modal-content');
      if (content) { new ResizeObserver(measure).observe(content); }
    }
  });
}
