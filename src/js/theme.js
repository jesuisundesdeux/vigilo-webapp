import i18next from 'i18next';
import $ from 'jquery';

/*
 * Light / dark theme. The choice ("auto", "light", "dark") is kept in localStorage['vigilo-theme'];
 * "auto" follows the system setting (prefers-color-scheme). The inline script of index.html applies
 * it before the first paint; this module applies changes and handles the side menu item.
 */
const KEY = 'vigilo-theme';
const CHOICES = ['auto', 'light', 'dark'];
const ICONS = { auto: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' };
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getThemeChoice() {
  try {
    var value = localStorage.getItem(KEY);
    return CHOICES.indexOf(value) >= 0 ? value : 'auto';
  } catch (e) {
    return 'auto';
  }
}

export function isDark() {
  var choice = getThemeChoice();
  return choice === 'dark' || (choice === 'auto' && media !== null && media.matches);
}

export function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark() ? 'dark' : 'light');
  var choice = getThemeChoice();
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.querySelector('i').textContent = ICONS[choice];
    var label = toggle.querySelector('.theme-label');
    label.setAttribute('data-i18n', 'theme-' + choice);
    label.textContent = i18next.t('theme-' + choice);
  }
}

export function setThemeChoice(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch (e) {}
  applyTheme();
}

export function initTheme() {
  applyTheme();
  if (media !== null) {
    // "auto": follow the system when it changes
    var onChange = () => { if (getThemeChoice() === 'auto') { applyTheme(); } };
    if (media.addEventListener) { media.addEventListener('change', onChange); } else { media.addListener(onChange); }
  }
  $(document).on('click', '#theme-toggle', function (e) {
    e.preventDefault();
    var next = CHOICES[(CHOICES.indexOf(getThemeChoice()) + 1) % CHOICES.length];
    setThemeChoice(next);
  });
}
