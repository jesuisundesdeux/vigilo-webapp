/**
 * Observations offered when posting a resolution from an observation (form in
 * resolution mode, see window.startResolution): resolvable observations around it,
 * with the rules of the similar observations (same category by default, closer than
 * a distance or at the same address), filters that can be changed, the observation
 * itself selected. The selection is kept when the filters change.
 */
import $ from 'jquery';
import i18next from 'i18next';
import * as vigilo from './vigilo-api';
import { distance, escapeHtml, safeToken } from './utils';
import { SIMILAR_DISTANCE, samePlace } from './similar-issues';

export const RELATED_DISTANCES = [50, 100, 300, 500, 1000];
const MAX_DISTANCE = Math.max(...RELATED_DISTANCES);

var state = newState();

function newState() {
  return {
    reference: null,    // observation the resolution was started from
    candidates: [],
    category: "",
    maxDistance: SIMILAR_DISTANCE,
    sameAddress: true,
    selected: new Set()
  };
}

// Published, in no resolution yet (status 0), of a resolvable category
function isResolvable(i) {
  return i.approved == 1 && i.status == 0 && i.resolvable;
}

function address() {
  return state.reference ? state.reference.address : "";
}

/** Within the chosen distance, or at the same address (whatever the category) */
function isNear(i) {
  return i.related_distance < state.maxDistance || (state.sameAddress && samePlace(address(), undefined, i));
}

/**
 * Start from an observation: look for the resolvable observations around it,
 * same category as it, the observation itself selected
 */
export async function setRelatedReference(issue) {
  state = newState();
  state.reference = issue;
  state.category = String(issue.categorie);
  state.selected.add(issue.token);
  var issues = await vigilo.getIssues();
  var here = issue;
  state.candidates = issues.filter((i) => isResolvable(i) || i.token == issue.token)
    .map((i) => Object.assign({}, i, { related_distance: distance(here.lat_float, here.lon_float, i.lat_float, i.lon_float) }))
    .filter((i) => i.related_distance < MAX_DISTANCE || samePlace(address(), undefined, i) || state.selected.has(i.token))
    .sort((a, b) => a.related_distance - b.related_distance);
  render();
}

export function resetRelatedIssues() {
  state = newState();
  render();
}

export function selectedRelatedTokens() {
  return Array.from(state.selected);
}

function categoryOptions() {
  // categories of the observations within the distance, with their count
  var counts = {};
  state.candidates.filter(isNear).forEach((i) => { counts[i.categorie] = (counts[i.categorie] || 0) + 1; });
  if (state.category !== "" && counts[state.category] === undefined) {
    counts[state.category] = 0;
  }
  var total = state.candidates.filter(isNear).length;
  return `<option value="">${escapeHtml(i18next.t("related-filter-all"))} (${total})</option>`
    + Object.keys(counts)
      .sort((a, b) => i18next.t("category-name-" + a).localeCompare(i18next.t("category-name-" + b)))
      .map((cat) => `<option value="${escapeHtml(cat)}"${cat == state.category ? " selected" : ""}>`
        + `${escapeHtml(i18next.t("category-name-" + cat))} (${counts[cat]})</option>`)
      .join("");
}

function cardHtml(i) {
  var token = safeToken(i.token);
  var checked = state.selected.has(i.token);
  var lang = i18next.language.split("_")[0];
  var isReference = state.reference && i.token == state.reference.token;
  var meters = i.related_distance < 1000 ? Math.round(i.related_distance) + " m"
    : (i.related_distance / 1000).toLocaleString(lang, { maximumFractionDigits: 1 }) + " km";
  var where = i.related_distance >= state.maxDistance && samePlace(address(), undefined, i)
    ? meters + " · " + i18next.t("related-same-address") : meters;
  if (isReference) {
    where = i18next.t("related-this-issue");
  }
  return `<div class="related-issue${checked ? " checked" : ""}" data-token="${token}" role="checkbox" aria-checked="${checked}" tabindex="0">
      <img src="${escapeHtml(i.img_thumb)}" data-fallback="${escapeHtml(i.img_thumb_panel)}" loading="lazy" alt="">
      <div class="related-issue-body">
        <div class="related-issue-cat"><span class="cat-dot" style="background-color: ${escapeHtml(i.color)}"></span>${escapeHtml(i18next.t("category-name-" + i.categorie))}</div>
        <div class="related-issue-meta">${escapeHtml(where)} · ${escapeHtml(i.date_obj.toLocaleDateString(lang))}</div>
        <div class="related-issue-address">${escapeHtml(i.address)}</div>
      </div>
      <a href="#!" class="related-issue-view" title="${escapeHtml(i18next.t("related-view"))}"><i class="material-icons">visibility</i></a>
      <span class="related-issue-check"><i class="material-icons">check</i></span>
    </div>`;
}

function render() {
  var panel = $("#related-panel");
  var list = $("#related-issues");
  if (state.reference === null) {
    list.empty();
    panel.find(".related-summary").empty();
    return;
  }
  $("#related-cat").html(categoryOptions());
  panel.find(".related-distance a").each(function () {
    $(this).toggleClass("active", $(this).data("distance") == state.maxDistance);
  });
  $("#related-same-address").prop("checked", state.sameAddress);

  // selected observations stay visible whatever the filters
  var shown = state.candidates.filter((i) => state.selected.has(i.token)
    || ((state.category === "" || i.categorie == state.category) && isNear(i)));
  panel.find(".related-summary").text(
    i18next.t("related-summary", { count: shown.length }) + " · " + i18next.t("related-selected", { count: state.selected.size }));
  if (shown.length == 0) {
    list.empty().append($('<p class="grey-text"></p>').text(i18next.t("related-none")));
  } else {
    list.html(shown.map(cardHtml).join(""));
  }
}

function toggle(card) {
  var token = card.attr("data-token");
  if (state.selected.has(token)) {
    state.selected.delete(token);
  } else {
    state.selected.add(token);
  }
  $("#related-issues").removeClass("invalid");
  render();
}

export function initRelatedIssues() {
  $("#related-panel .related-distance").html(RELATED_DISTANCES.map((d) =>
    `<a href="#!" data-distance="${d}">${d < 1000 ? d + " m" : d / 1000 + " km"}</a>`).join(""));
  $("#related-panel .related-distance").on("click", "a", function (e) {
    e.preventDefault();
    state.maxDistance = $(this).data("distance");
    render();
  });
  $("#related-cat").on("change", function () {
    state.category = $(this).val();
    render();
  });
  $("#related-same-address").on("change", function () {
    state.sameAddress = $(this).prop("checked");
    render();
  });
  $("#related-issues").on("click", ".related-issue-view", function (e) {
    e.preventDefault();
    e.stopPropagation();
    window.viewIssue($(this).closest(".related-issue").attr("data-token"));
  }).on("click", ".related-issue", function () {
    toggle($(this));
  }).on("keydown", ".related-issue", function (e) {
    if (e.key == " " || e.key == "Enter") {
      e.preventDefault();
      toggle($(this));
    }
  });
  render();
}
