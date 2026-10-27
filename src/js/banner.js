/**
 * Banners (announcements) configured in the admin (get_banner.php). Several can be active at once:
 * the app shows at most one bar under the top bar and one window at launch, each from the most
 * recent active banner whose "display" covers that channel (banner / modal / both) — so the bar and
 * the window may come from two different banners. Once closed a channel stays closed — keyed by the
 * shown banner's "id" — until the admin changes its content (its "id" changes, see localDataManager).
 * A "persistent" banner (backend >= 0.0.39) is instead shown again on every start even after being
 * closed, and its window reopens at launch (its close is not remembered). Each banner has an optional
 * bold "title" (shown above the message) and a "message" with light formatting (**bold**, _italic_,
 * [text](https://link)); the message is HTML-escaped first, so the formatting is safe.
 */
import M from '@materializecss/materialize';
import * as vigilo from './vigilo-api';
import localDataManager from './localDataManager';

// Icon per type; a type the app doesn't know yet (added later on the backend) falls back to info.
// The type only drives the icon and colour (data-type), not any text heading.
const ICONS = { info: 'info', success: 'check_circle', warning: 'warning', alert: 'report_problem' };

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Light, safe formatting for the message: links [text](http(s)://url), **bold**, _italic_.
// The text is escaped first; links are tokenised out so bold/italic never touch their URLs; only
// http/https links are produced, so there is no way to inject markup or a javascript: URL.
function formatMessage(text) {
  var tokens = [];
  var out = escapeHtml(text);
  out = out.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, label, url) => {
    tokens.push('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>');
    return '\u0000' + (tokens.length - 1) + '\u0000';
  });
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  out = out.replace(/\u0000(\d+)\u0000/g, (m, i) => tokens[+i]);
  return out;
}

// Fill a banner's title (bold, plain text) and message (formatted); hide the title element when empty
function fillContent(root, banner) {
  var title = root.find('.app-banner-title');
  if (banner.title) {
    title.text(banner.title).prop('hidden', false);
  } else {
    title.text('').prop('hidden', true);
  }
  root.find('.app-banner-message').html(formatMessage(banner.message));
}

export async function init() {
  var banners = await vigilo.getBanner();
  if (!banners || !banners.length) {
    return;
  }
  // one banner per channel: the most recent active one whose display covers it (list is sorted recent first)
  var bar = banners.filter((b) => b.display === 'banner' || b.display === 'both')[0];
  var modal = banners.filter((b) => b.display === 'modal' || b.display === 'both')[0];
  if (bar) {
    showChannel('banner', bar, showBar);
  }
  if (modal) {
    showChannel('modal', modal, showModal);
  }
}

// Show a banner on a channel unless it was dismissed (a persistent banner ignores the dismissal)
function showChannel(channel, banner, show) {
  var type = ICONS[banner.type] ? banner.type : 'info';
  var persistent = banner.persistent === 1 || banner.persistent === true;
  if (persistent || localDataManager.getBannerDismissed(channel) !== banner.id) {
    show(banner, type, persistent);
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
  fillContent(bar, banner);
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
  fillContent(modal, banner);
  M.Modal.init(modal[0], { onCloseEnd: () => { if (!persistent) { localDataManager.setBannerDismissed('modal', banner.id); } } });
  M.Modal.getInstance(modal[0]).open();
}
