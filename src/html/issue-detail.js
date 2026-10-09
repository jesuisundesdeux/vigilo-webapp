import $ from 'jquery';
import localDataManager from '../js/localDataManager';
import * as vigilo from '../js/vigilo-api';

import * as semver from 'semver';
import i18next from 'i18next';
import errorCard from './error';
import { escapeHtml, safeToken } from '../js/utils';


export default async function (issue) {
  const token = safeToken(issue.token);
  const t = (key) => i18next.t(key);
  const lang = i18next.language.split("_")[0];
  const scope = await vigilo.getScope().catch(() => ({}));
  const backendAtLeast = (v) => scope.backend_version !== undefined && semver.gte(scope.backend_version, v);

  // Actions: the main ones are buttons of the footer, the others are in the "more" menu
  const primaryBtn = (classes, onclick, icon, key) =>
    `<a href="#!" class="btn waves-effect waves-light issue-primary ${classes}" onclick="${onclick}; return false;"><i class="material-icons left">${icon}</i><span data-i18n="${key}">${t(key)}</span></a>\n`;
  const menuItem = (onclick, icon, key, classes = "", href = "#!") =>
    `<a href="${escapeHtml(href)}" role="menuitem" class="issue-menu-item ${classes}"${onclick ? ` onclick="${onclick}"` : ""}><i class="material-icons">${icon}</i><span data-i18n="${key}">${t(key)}</span></a>\n`;
  var primary = "";
  var menuMain = "";
  var menuManage = "";

  // Resolution of a published observation of a resolvable category, in no resolution yet (status 0: one
  // resolution per observation, the backend refuses to validate a resolution whose observations are in another one)
  // (backend >= 0.0.14)
  if (issue.approved == 1 && issue.status == 0 && issue.resolvable && backendAtLeast("0.0.14")) {
    primary += primaryBtn("resolve-btn", `startResolution('${token}')`, "done_all", "resolve-issue");
  }

  if (localDataManager.isAdmin()) {
    if (issue.approved == "0") {
      primary = primaryBtn("approve-btn", `adminApprove('${token}','1')`, "check_circle", "admin-approve-short")
        + primaryBtn("refuse-btn", `adminApprove('${token}','2')`, "block", "admin-refuse-short");
      menuManage += menuItem(`startForm('${token}')`, "edit", "edit-issue");
    } else if (issue.approved == "1") {
      // approved observations can be edited too (the backend keeps their moderation state)
      menuManage += menuItem(`startForm('${token}')`, "edit", "edit-issue")
        + menuItem(`adminApprove('${token}','0')`, "remove_circle", "admin-unapprove")
        + menuItem(`adminApprove('${token}','2')`, "block", "admin-refuse", "danger");
    } else if (issue.approved == "2") {
      primary = primaryBtn("approve-btn", `adminApprove('${token}','1')`, "check_circle", "admin-approve-short");
      menuManage += menuItem(`adminApprove('${token}','0')`, "remove_circle", "admin-unapprove");
    }
  } else if (localDataManager.userCanEdit(issue) && backendAtLeast("0.0.17")) {
    // my observation, not approved yet
    menuManage += menuItem(`deleteIssue('${token}','2')`, "delete", "delete-issue", "danger");
  }

  // Report the observation to the association of the instance (e-mail with the observation in the body)
  var reportBody = i18next.t("report-issue-body", {
    token: issue.token,
    category: t("category-name-" + issue.categorie),
    address: issue.address || "",
    date: issue.date_obj.toLocaleString(lang),
    comment: issue.comment || "",
    explanation: issue.explanation || "",
    link: issue.permLink,
    interpolation: { escapeValue: false }
  });
  var reportHref = "mailto:" + encodeURIComponent(scope.contact_email || "")
    + "?subject=" + encodeURIComponent(i18next.t("report-issue-subject", { token: issue.token, interpolation: { escapeValue: false } }))
    + "&body=" + encodeURIComponent(reportBody);
  var osmHref = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(issue.lat_float)}&mlon=${encodeURIComponent(issue.lon_float)}#map=19/${encodeURIComponent(issue.lat_float)}/${encodeURIComponent(issue.lon_float)}`;

  menuMain += menuItem(`centerOnIssue('${token}'); return false;`, "map", "see-on-map")
    + menuItem(`document.querySelector('#modal-issue .similar-issues').scrollIntoView({behavior: 'smooth'}); return false;`, "view_module", "issues-similar")
    + `<a href="${escapeHtml(osmHref)}" target="_blank" rel="noopener" role="menuitem" class="issue-menu-item"><i class="material-icons">open_in_new</i><span data-i18n="see-on-osm">${t("see-on-osm")}</span></a>\n`
    + menuItem("", "flag", "report-issue", "report-btn", reportHref);

  // State: moderation first, then the resolution status
  var state;
  if (issue.approved == 0) {
    state = { cls: "unapproved", icon: "new_releases", key: "status-unapproved", long: "status-unapproved-long" };
  } else if (issue.approved == 2) {
    state = { cls: "refused", icon: "block", key: "status-refused" };
  } else {
    state = {
      0: { cls: "open", icon: "radio_button_unchecked", key: "status-unresolved" },
      1: { cls: "resolved", icon: "done_all", key: "status-resolved", long: "status-resolved-long" },
      2: { cls: "taked", icon: "info", key: "status-taked", long: "status-taked-long" },
      3: { cls: "inprogress", icon: "hourglass_empty", key: "status-inprogress", long: "status-inprogress-long" },
      4: { cls: "done", icon: "done", key: "status-done", long: "status-done-long" }
    }[issue.status] || { cls: "open", icon: "radio_button_unchecked", key: "status-unresolved" };
  }
  var chips = `<span class="issue-chip issue-chip-${state.cls}"><i class="material-icons">${state.icon}</i><span data-i18n="${state.key}">${t(state.key)}</span></span>`;
  if (localDataManager.getTokenSecretId(issue.token) != undefined) {
    chips += `<span class="issue-chip issue-chip-mine"><i class="material-icons">person</i><span data-i18n="i-make-it">${t("i-make-it")}</span></span>`;
  }
  var stateNote = state.long ? `<p class="issue-state-note issue-state-${state.cls}" data-i18n="${state.long}">${t(state.long)}</p>` : "";

  var comment = "";
  if (issue.comment || issue.explanation) {
    comment = `<section class="issue-section">
      <h3 class="issue-label" data-i18n="comment">${t("comment")}</h3>
      ${issue.comment ? `<p class="issue-comment">${escapeHtml(issue.comment)}</p>` : ""}
      ${issue.explanation ? `<blockquote>${escapeHtml(issue.explanation)}</blockquote>` : ""}
    </section>`;
  }

  return `
<div class="modal-content issue-detail">
  <header class="issue-head">
    <h2 class="issue-title"><span class="cat-dot" style="background-color: ${escapeHtml(issue.color)}"></span><span data-i18n="category-name-${escapeHtml(issue.categorie)}">${t("category-name-" + issue.categorie)}</span></h2>
    <div class="issue-chips">${chips}</div>
    ${stateNote}
  </header>
  <div class="issue-layout">
    <div class="issue-media">
      <img class="materialboxed issue-photo" src="${escapeHtml(issue.img)}" data-fallback="${escapeHtml(issue.img_panel)}" alt="">
      <!-- shown while looking for a Panoramax picture, removed if there is none (see js/panoramax.js) -->
      <p class="panoramax-row">
        <a href="#!" class="btn btn-small waves-effect waves-light panoramax-btn loading"><span class="panoramax-loader"></span><i class="material-icons left">streetview</i><span class="panoramax-label">${t("panoramax-searching")}</span></a>
      </p>
    </div>
    <div class="issue-info">
      <dl class="issue-facts">
        <div class="issue-fact">
          <dt><i class="material-icons">place</i><span data-i18n="location">${t("location")}</span></dt>
          <dd>${escapeHtml(issue.address)}</dd>
        </div>
        <div class="issue-fact">
          <dt><i class="material-icons">event</i><span data-i18n="date">${t("date")}</span></dt>
          <dd data-i18n-date="${issue.date_obj.toString()}">${issue.date_obj.toLocaleString(lang)}</dd>
        </div>
        <div class="issue-fact">
          <dt><i class="material-icons">tag</i><span data-i18n="issue-id">${t("issue-id")}</span></dt>
          <dd><a href="${escapeHtml(issue.permLink)}">${token}</a></dd>
        </div>
      </dl>
      ${comment}
      <div class="issue-minimap-wrapper">
        <div class="issue-minimap"></div>
        <p class="issue-minimap-caption grey-text"></p>
      </div>
    </div>
  </div>
  <!-- filled by js/similar-issues.js once the window is open -->
  <div class="similar-issues"></div>
</div>
<div class="issue-menu" role="menu" hidden>
${menuMain}${menuManage ? '<div class="issue-menu-divider" role="separator"></div>\n' + menuManage : ""}</div>
<div class="modal-footer issue-actions">
  <div class="issue-primary-actions">${primary}</div>
  <a href="${escapeHtml(issue.permLink)}" class="btn-flat waves-effect issue-icon-btn" onclick="return shareIssue(this)" data-i18n-attr='{"title": "share-link", "aria-label": "share-link"}' title="${t("share-link")}" aria-label="${t("share-link")}"><i class="material-icons">share</i></a>
  <a href="#!" class="btn-flat waves-effect issue-icon-btn issue-more" aria-haspopup="menu" aria-expanded="false" data-i18n-attr='{"title": "more-actions", "aria-label": "more-actions"}' title="${t("more-actions")}" aria-label="${t("more-actions")}"><i class="material-icons">more_vert</i></a>
</div>
`
}

// "More" menu of the observation window
function toggleIssueMenu(open) {
  var menu = $("#modal-issue .issue-menu");
  var button = $("#modal-issue .issue-more");
  if (open === undefined) {
    open = menu.prop("hidden");
  }
  menu.prop("hidden", !open);
  button.attr("aria-expanded", String(open));
  if (open) {
    menu.find(".issue-menu-item").first().trigger("focus");
  }
}
$(document).on("click", "#modal-issue .issue-more", function (e) {
  e.preventDefault();
  e.stopPropagation();
  toggleIssueMenu();
}).on("click", "#modal-issue .issue-menu-item", function () {
  toggleIssueMenu(false);
}).on("click", function (e) {
  if (!$(e.target).closest("#modal-issue .issue-menu").length) {
    toggleIssueMenu(false);
  }
}).on("keydown", "#modal-issue .issue-menu", function (e) {
  var items = $(this).find(".issue-menu-item");
  var index = items.index(document.activeElement);
  if (e.key == "Escape") {
    e.stopPropagation();
    toggleIssueMenu(false);
    $("#modal-issue .issue-more").trigger("focus");
  } else if (e.key == "ArrowDown" || e.key == "ArrowUp") {
    e.preventDefault();
    items.eq((index + (e.key == "ArrowDown" ? 1 : -1) + items.length) % items.length).trigger("focus");
  }
});


window.deleteIssue = async function(token) {

  vigilo.deleteIssue(token, localDataManager.getTokenSecretId(token))
  .then((resp) => {
    if (resp.status != 0) {
      throw "error"
    }
    setTimeout(function () {
      window.location.reload()
    }, 1000)
  })
  .catch((e) => {
    $("#modal-issue .modal-content")
      .prepend(errorCard(e))
  })
}

/**
 * Share an issue link with the native share sheet when available (mobile),
 * otherwise copy it to the clipboard (issue #55). Falls back to following the link.
 */
window.shareIssue = function (link) {
  var url = link.href;
  if (navigator.share) {
    navigator.share({ title: document.title, url: url }).catch(() => {});
    return false;
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => M.toast({ html: i18next.t("link-copied") }));
    return false;
  }
  return true;
}
