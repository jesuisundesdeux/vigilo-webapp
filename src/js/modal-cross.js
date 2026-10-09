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
