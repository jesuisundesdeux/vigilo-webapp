/**
 * Banner (announcement) configured in the admin (get_banner.php). Shown as a bar under the top
 * bar and/or as a window at launch, according to its "display" (banner / modal / both). Once
 * closed it stays closed — per channel — until the admin changes the message (its "id" changes,
 * see localDataManager). A "persistent" banner (backend >= 0.0.39) is instead shown again on every
 * start even after being closed, and its window reopens at launch (its close is not remembered).
 * Message text is inserted with .text() (white-space: pre-line keeps the line breaks), never as HTML.
 */
import i18next from 'i18next';
import M from '@materializecss/materialize';
import * as vigilo from './vigilo-api';
import localDataManager from './localDataManager';

// Icon per type; a type the app doesn't know yet (added later on the backend) falls back to info
const ICONS = { info: 'info', success: 'check_circle', warning: 'warning', alert: 'report_problem' };

function typeHeading(type) {
  var key = 'banner-' + type;
  var label = i18next.t(key);
  return label === key ? '' : label;
}

export async function init() {
  var banner = await vigilo.getBanner();
  if (!banner) {
    return;
  }
  var type = ICONS[banner.type] ? banner.type : 'info';
  // persistent: ignore any remembered dismissal, so the banner shows again on every start
  var persistent = banner.persistent === 1 || banner.persistent === true;
  var channels = banner.display === 'modal' ? ['modal']
    : banner.display === 'both' ? ['banner', 'modal'] : ['banner'];
  if (channels.indexOf('banner') !== -1 && (persistent || localDataManager.getBannerDismissed('banner') !== banner.id)) {
    showBar(banner, type, persistent);
  }
  if (channels.indexOf('modal') !== -1 && (persistent || localDataManager.getBannerDismissed('modal') !== banner.id)) {
    showModal(banner, type, persistent);
  }
}

// Expose the bar height so the content below (tabs, map) moves down, like the moderator banner
function setBarHeight() {
  var el = document.getElementById('app-banner');
  var h = (el && !el.hidden) ? el.offsetHeight : 0;
  document.documentElement.style.setProperty('--app-banner-h', h + 'px');
}

function showBar(banner, type, persistent) {
  var bar = $('#app-banner').attr('data-type', type);
  bar.find('.app-banner-icon').text(ICONS[type]);
  bar.find('.app-banner-message').text(banner.message);
  bar.prop('hidden', false);
  setBarHeight();
  // the message can wrap differently when the window is resized
  if (window.ResizeObserver) {
    new ResizeObserver(setBarHeight).observe(bar[0]);
  } else {
    $(window).on('resize', setBarHeight);
  }
  bar.find('.app-banner-close').off('click').on('click', (e) => {
    e.preventDefault();
    bar.prop('hidden', true);
    setBarHeight();
    // persistent banners are not remembered as dismissed: they come back on the next start
    if (!persistent) {
      localDataManager.setBannerDismissed('banner', banner.id);
    }
  });
}

function showModal(banner, type, persistent) {
  var modal = $('#modal-banner').attr('data-type', type);
  modal.find('.app-banner-modal-icon').text(ICONS[type]);
  modal.find('.app-banner-modal-heading').text(typeHeading(type));
  modal.find('.app-banner-modal-message').text(banner.message);
  M.Modal.init(modal[0], { onCloseEnd: () => { if (!persistent) { localDataManager.setBannerDismissed('modal', banner.id); } } });
  M.Modal.getInstance(modal[0]).open();
}
