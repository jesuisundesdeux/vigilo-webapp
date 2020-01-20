import localDataManager from '../js/localDataManager';

export default function (issue) {
  const btn_to_approve = `<a class="btn-floating waves-effect waves-light blue" onclick="adminApprove('${issue.token}','0')"><i class="material-icons right">remove_circle</i></a>\n`;
  const btn_approve = `<a class="btn-floating waves-effect waves-light green" onclick="adminApprove('${issue.token}','1')"><i class="material-icons center">check_circle</i></a>\n`;
  const btn_refuse = `<a class="btn-floating waves-effect waves-light red" onclick="adminApprove('${issue.token}','2')"><i class="material-icons center-align">delete</i></a>\n`;
  const btn_edit = `<a class="btn-floating waves-effect waves-light blue" onclick="startForm('${issue.token}')"><i class="material-icons center">edit</i></a>\n`;
  var btns = "";
  if (localDataManager.isAdmin()) {
    if (issue.approved == "0") {
      btns = btn_approve + btn_refuse + btn_edit;
    } else if (issue.approved == "1") {
      btns = btn_to_approve;
    } else if (issue.approved == "2") {
      btns = btn_approve + btn_to_approve;
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
              <a class="waves-effect" title="Voir sur la carte" onclick="centerOnIssue('${issue.token}')">
                <img class="center-align" src="${issue.map}">
              </a>
          </div>
      </div>
      <div class="col m6 hide-on-small-only hide-on-large-only">
          <a class="waves-effect" title="Voir sur la carte" onclick="centerOnIssue('${issue.token}')">
            <div class="center-align">
                <img class="center-align" src="${issue.map}">
            </div>
          </a>
      </div>
      <div class="col s12 m12 l7 xl8">
          <h6 class="center-align valign-wrapper">
            ${(issue.approved == 0) ? '<i class="material-icons">new_releases</i> Ce signalement sera vérifié prochainement par un modérateur' : ''}
            ${(issue.status == 1) ? '<i class="material-icons">done_all</i> Ce signalement a été pris en compte et le problème corrigé !' : ''}
            ${(issue.status == 2) ? '<i class="material-icons">info</i> Ce signalement sera prochainement résolu.' : ''}
            ${(issue.status == 3) ? '<i class="material-icons">hourglass_empty</i> Ce signalement est en cours de résolution.' : ''}
            ${(issue.status == 4) ? '<i class="material-icons">done</i> Ce signalement semble être résolu.' : ''}
            ${(localDataManager.getTokenSecretId(issue.token) != undefined) ? '<i class="material-icons">person</i> J\'ai fait ce signalement' : ''}
          </h6>
          <p><b>Référence de suivi :</b> <a href="/?token=${issue.token}">${issue.token}</a></p>
          <p>
              <b>Catégorie :</b><br>
              ${issue.categorie_str}
          </p>
          <p>
              <b>Date :</b><br>
              ${issue.date_obj.toLocaleString('fr')}
          </p>
          <p>
              <b>Remarque :</b><br>
              ${issue.comment}
              <br><blockquote>${issue.explanation}</blockquote>
          </p>
          <p>
              <b>Localisation :</b><br>
              ${issue.address}
          </p>
      </div>
      <div class="col s12 hide-on-med-and-up">
          <a class="waves-effect" title="Voir sur la carte" onclick="centerOnIssue('${issue.token}')">
            <div class="center-align">
                <img class="center-align" src="${issue.map}">
            </div>
          </a>
      </div>
  </div>
</div>
<div class="modal-footer">
${btns}
<a title="Lien à partager" class="waves-effect blue waves-light btn-floating" href="/?token=${issue.token}"><i class="material-icons center">share</i>${issue.token}</a>
<a title="Voir sur la carte" class="waves-effect waves-light btn-floating" onclick="centerOnIssue('${issue.token}')"><i class="material-icons center">map</i></a>
<a href="#!" title="Fermer" class="modal-close grey waves-effect waves-light btn-floating"><i class="material-icons center">close</i></a>
</div>

`
}
