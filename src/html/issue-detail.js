import localDataManager from '../js/localDataManager';
import * as vigilo from '../js/vigilo-api';

import * as semver from 'semver';
import i18next from 'i18next';


export default async function (issue) {
  const btn_to_approve = `<a class="btn-floating waves-effect waves-light blue" onclick="adminApprove('${issue.token}','0')"><i class="material-icons right">remove_circle</i></a>\n`;
  const btn_approve = `<a class="btn-floating waves-effect waves-light green" onclick="adminApprove('${issue.token}','1')"><i class="material-icons center">check_circle</i></a>\n`;
  const btn_refuse = `<a class="btn-floating waves-effect waves-light red" onclick="adminApprove('${issue.token}','2')"><i class="material-icons center-align">delete</i></a>\n`;
  const btn_edit = `<a class="btn-floating waves-effect waves-light blue" onclick="startForm('${issue.token}')"><i class="material-icons center">edit</i></a>\n`;
  const btn_delete = `<a class="btn-floating waves-effect waves-light red" onclick="deleteIssue('${issue.token}','2')"><i class="material-icons center-align">delete</i></a>\n`;
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
              <img class="materialboxed center-align" src="${issue.img}">
          </div>
          <div class="center-align hide-on-med-and-down">
              <a class="waves-effect" data-i18n-attr='{"title": "see-on-map"}' title="${i18next.t("see-on-map")}" onclick="centerOnIssue('${issue.token}')">
                <img class="center-align" src="${issue.map}">
              </a>
          </div>
      </div>
      <div class="col m6 hide-on-small-only hide-on-large-only">
          <a class="waves-effect" data-i18n-attr='{"title": "see-on-map"}' title="${i18next.t("see-on-map")}" onclick="centerOnIssue('${issue.token}')">
            <div class="center-align">
                <img class="center-align" src="${issue.map}">
            </div>
          </a>
      </div>
      <div class="col s12 m12 l7 xl8">
          <h6 class="center-align valign-wrapper">
            ${(issue.approved == 0) ? '<i class="material-icons">new_releases</i> <span data-i18n="status-unapproved-long">'+i18next.t("status-unapproved-long")+'</span>' : ''}
            ${(issue.status == 1) ? '<i class="material-icons">done_all</i> <span data-i18n="status-resolved-long">'+i18next.t("status-resolved-long")+'</span>' : ''}
            ${(issue.status == 2) ? '<i class="material-icons">info</i> <span data-i18n="status-taked-long">'+i18next.t("status-taked-long")+'</span>' : ''}
            ${(issue.status == 3) ? '<i class="material-icons">hourglass_empty</i> <span data-i18n="status-inprogress-long">'+i18next.t("status-inprogress-long")+'</span>' : ''}
            ${(issue.status == 4) ? '<i class="material-icons">done</i> <span data-i18n="status-done-long">'+i18next.t("status-done-long")+'</span>' : ''}
            ${(localDataManager.getTokenSecretId(issue.token) != undefined) ? '<i class="material-icons">person</i> <span data-i18n="i-make-it">'+i18next.t("i-make-it")+'</span>' : ''}
          </h6>
          <p><b>${i18next.t("issue-id")} :</b> <a href="${issue.permLink}">${issue.token}</a> | <a data-i18n="issues-similar" data-i18n-attr='{"title": "issues-similar"}' title="${i18next.t("issues-similar")}" target="_blank" href="${issue.mosaic}">${i18next.t("issues-similar")}</a></p>

          <p>
              <b><span data-i18n="category">${i18next.t("category")}</span></b><br>
              <span data-i18n="category-name-${issue.categorie}">${i18next.t("category-name-"+issue.categorie)}</span>
          </p>
          <p>
              <b><span data-i18n="date">${i18next.t("date")}</span></b><br>
              ${issue.date_obj.toLocaleString(i18next.language.split("_")[0])}
          </p>
          <p>
              <b><span data-i18n="comment">${i18next.t("comment")}</span></b><br>
              ${issue.comment}
              <br><blockquote>${issue.explanation}</blockquote>
          </p>
          <p>
              <b><span data-i18n="location">${i18next.t("location")}</span></b><br>
              ${issue.address}
          </p>
      </div>
      <div class="col s12 hide-on-med-and-up">
          <a class="waves-effect" data-i18n-attr='{"title": "see-on-map"}' title="${i18next.t("see-on-map")}" onclick="centerOnIssue('${issue.token}')">
            <div class="center-align">
                <img class="center-align" src="${issue.map}">
            </div>
          </a>
      </div>
  </div>
</div>
<div class="modal-footer">
${btns}
<a data-i18n-attr='{"title": "issues-similar"}' title="${i18next.t("issues-similar")}" target="_blank" class="waves-effect waves-light btn-floating" href="${issue.mosaic}"><i class="material-icons center">view_list</i></a>
<a data-i18n-attr='{"title": "share-link"}' title="${i18next.t("share-link")}" class="waves-effect waves-light btn-floating" href="${issue.permLink}"><i class="material-icons center">share</i></a>
<a data-i18n-attr='{"title": "see-on-map"}' title="${i18next.t("see-on-map")}" class="waves-effect waves-light btn-floating" onclick="centerOnIssue('${issue.token}')"><i class="material-icons center">map</i></a>
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
    $("#modal-form-loader")
      .empty()
      .append(errorCard(e))
  })
}
