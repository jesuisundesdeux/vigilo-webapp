import localDataManager from '../js/localDataManager';
import * as vigilo from '../js/vigilo-api';

import * as semver from 'semver';
import i18next from 'i18next';
import errorCard from './error';
import { escapeHtml, safeToken } from '../js/utils';


export default async function (issue) {
  const token = safeToken(issue.token);
  const btn_to_approve = `<a class="btn-floating waves-effect waves-light blue" onclick="adminApprove('${token}','0')"><i class="material-icons right">remove_circle</i></a>\n`;
  const btn_approve = `<a class="btn-floating waves-effect waves-light green" onclick="adminApprove('${token}','1')"><i class="material-icons center">check_circle</i></a>\n`;
  const btn_refuse = `<a class="btn-floating waves-effect waves-light red" onclick="adminApprove('${token}','2')"><i class="material-icons center-align">delete</i></a>\n`;
  const btn_edit = `<a class="btn-floating waves-effect waves-light blue" onclick="startForm('${token}')"><i class="material-icons center">edit</i></a>\n`;
  const btn_delete = `<a class="btn-floating waves-effect waves-light red" onclick="deleteIssue('${token}','2')"><i class="material-icons center-align">delete</i></a>\n`;
  var btns = "";
  if (localDataManager.isAdmin()) {
    if (issue.approved == "0") {
      btns = btn_approve + btn_refuse + btn_edit;
    } else if (issue.approved == "1") {
      btns = btn_to_approve;
    } else if (issue.approved == "2") {
      btns = btn_approve + btn_to_approve;
    }
  } else if (localDataManager.userCanEdit(issue)) {
    // J'ai fait ce signalement et il n'est pas encore approuvé
    var scope = await vigilo.getScope();
    if (semver.gte( scope.backend_version ,"0.0.17")) {
      btns = btn_delete;
    }
    
  }

  return `
<div class="modal-content">
  <div class="row">
      <div class="col s12 m6 l5 xl4">
          <div class="center-align">
              <img class="materialboxed center-align issue-photo" src="${escapeHtml(issue.img)}" data-fallback="${escapeHtml(issue.img_panel)}" alt="">
          </div>
          <div class="issue-minimap-wrapper">
              <div class="issue-minimap"></div>
              <p class="issue-minimap-caption grey-text"></p>
          </div>
      </div>
      <div class="col s12 m6 l7 xl8">
          <h6 class="center-align valign-wrapper">
            ${(issue.approved == 0) ? '<i class="material-icons">new_releases</i> <span data-i18n="status-unapproved-long">'+i18next.t("status-unapproved-long")+'</span>' : ''}
            ${(issue.status == 1) ? '<i class="material-icons">done_all</i> <span data-i18n="status-resolved-long">'+i18next.t("status-resolved-long")+'</span>' : ''}
            ${(issue.status == 2) ? '<i class="material-icons">info</i> <span data-i18n="status-taked-long">'+i18next.t("status-taked-long")+'</span>' : ''}
            ${(issue.status == 3) ? '<i class="material-icons">hourglass_empty</i> <span data-i18n="status-inprogress-long">'+i18next.t("status-inprogress-long")+'</span>' : ''}
            ${(issue.status == 4) ? '<i class="material-icons">done</i> <span data-i18n="status-done-long">'+i18next.t("status-done-long")+'</span>' : ''}
            ${(localDataManager.getTokenSecretId(issue.token) != undefined) ? '<i class="material-icons">person</i> <span data-i18n="i-make-it">'+i18next.t("i-make-it")+'</span>' : ''}
          </h6>
          <p><b>${i18next.t("issue-id")} :</b> <a href="${escapeHtml(issue.permLink)}">${token}</a> | <a data-i18n="issues-similar" data-i18n-attr='{"title": "issues-similar"}' title="${i18next.t("issues-similar")}" target="_blank" href="${escapeHtml(issue.mosaic)}">${i18next.t("issues-similar")}</a></p>

          <p>
              <b><span data-i18n="category">${i18next.t("category")}</span></b><br>
              <span class="cat-dot" style="background-color: ${escapeHtml(issue.color)}"></span><span data-i18n="category-name-${escapeHtml(issue.categorie)}">${i18next.t("category-name-"+issue.categorie)}</span>
          </p>
          <p>
              <b><span data-i18n="date">${i18next.t("date")}</span></b><br>
              ${issue.date_obj.toLocaleString(i18next.language.split("_")[0])}
          </p>
          <p>
              <b><span data-i18n="comment">${i18next.t("comment")}</span></b><br>
              ${escapeHtml(issue.comment)}
              <br><blockquote>${escapeHtml(issue.explanation)}</blockquote>
          </p>
          <p>
              <b><span data-i18n="location">${i18next.t("location")}</span></b><br>
              ${escapeHtml(issue.address)}
              <a href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(issue.lat_float)}&mlon=${encodeURIComponent(issue.lon_float)}#map=19/${encodeURIComponent(issue.lat_float)}/${encodeURIComponent(issue.lon_float)}" target="_blank" rel="noopener" data-i18n-attr='{"title": "see-on-osm"}' title="${i18next.t("see-on-osm")}"><i class="material-icons tiny">open_in_new</i></a>
          </p>
      </div>
  </div>
</div>
<div class="modal-footer">
${btns}
<a data-i18n-attr='{"title": "issues-similar"}' title="${i18next.t("issues-similar")}" target="_blank" class="waves-effect waves-light btn-floating" href="${escapeHtml(issue.mosaic)}"><i class="material-icons center">view_list</i></a>
<a title="${i18next.t("panoramax-searching")}" target="_blank" rel="noopener" class="waves-effect waves-light btn-floating panoramax-btn loading"><span class="panoramax-loader"></span><i class="material-icons center">streetview</i></a>
<a data-i18n-attr='{"title": "share-link"}' title="${i18next.t("share-link")}" class="waves-effect waves-light btn-floating" href="${escapeHtml(issue.permLink)}" onclick="return shareIssue(this)"><i class="material-icons center">share</i></a>
<a data-i18n-attr='{"title": "see-on-map"}' title="${i18next.t("see-on-map")}" class="waves-effect waves-light btn-floating" onclick="centerOnIssue('${token}')"><i class="material-icons center">map</i></a>
<a href="#!" data-i18n-attr='{"title": "close"}' title="${i18next.t("close")}" class="modal-close grey waves-effect waves-light btn-floating"><i class="material-icons center">close</i></a>
</div>

`
}


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
