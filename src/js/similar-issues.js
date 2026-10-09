import i18next from 'i18next';
import { distance, escapeHtml, flatString, safeToken } from './utils';

// Same rules as the "Similaires" search of the backend admin (sameas()): same category, and
// closer than SIMILAR_DISTANCE meters or at the same address in the same city.
export const SIMILAR_DISTANCE = 300;

/**
 * Observations similar to `issue` among `issues` (the list already loaded from get_issues.php),
 * nearest first. Each result gets a `similar_distance` (meters).
 */
export function findSimilarIssues(issue, issues) {
  return issues
    .filter((other) => other.token != issue.token && other.categorie == issue.categorie)
    .map((other) => Object.assign({}, other, {
      similar_distance: distance(issue.lat_float, issue.lon_float, other.lat_float, other.lon_float)
    }))
    .filter((other) => other.similar_distance < SIMILAR_DISTANCE || samePlace(issue.address, issue.cityname, other))
    .sort((a, b) => a.similar_distance - b.similar_distance);
}

/**
 * Is `other` at the same address (accents, case and punctuation ignored)?
 * cityname: also compared when given (the form only knows the address, which includes the city).
 */
export function samePlace(address, cityname, other) {
  var flat = flatString(address);
  return flat !== "" && flatString(other.address) == flat
    && (cityname === undefined || flatString(other.cityname) == flatString(cityname));
}

/** Section of the observation window listing the similar observations */
export function similarIssuesHtml(similar) {
  var title = `<h6><i class="material-icons left">view_module</i><span>${escapeHtml(i18next.t("issues-similar"))}</span>`
    + ` <span class="similar-issues-count">${similar.length}</span></h6>`
    + `<p class="similar-issues-hint grey-text">${escapeHtml(i18next.t("issues-similar-hint", { distance: SIMILAR_DISTANCE }))}</p>`;
  if (similar.length == 0) {
    return title + `<p class="grey-text">${escapeHtml(i18next.t("issues-similar-none"))}</p>`;
  }
  var lang = i18next.language.split("_")[0];
  return title + '<div class="similar-issues-grid">' + similar.map((other) => {
    var token = safeToken(other.token);
    var meters = Math.round(other.similar_distance);
    return `<a href="#!" class="similar-issue" onclick="viewIssue('${token}'); return false;" title="${escapeHtml(other.address)}">`
      + `<img src="${escapeHtml(other.img_thumb)}" data-fallback="${escapeHtml(other.img_thumb_panel)}" loading="lazy" alt="${token}">`
      + `<span class="similar-issue-caption">${meters} m · ${escapeHtml(other.date_obj.toLocaleDateString(lang))}</span>`
      + `</a>`;
  }).join("") + '</div>';
}
