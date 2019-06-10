import LocalDataManager from '../js/localDataManager';

export default function(issue){
  return `
<div class="modal-content">
  <div class="row">
      <div class="col s12 m6 l5 xl4">
          <div class="center-align">
              <img class="materialboxed center-align" src="${issue.img}">
          </div>
          <div class="center-align hide-on-med-and-down">
              <img class="materialboxed center-align" src="${issue.map}">
          </div>
      </div>
      <div class="col m6 hide-on-small-only hide-on-large-only">
          <div class="center-align">
              <img class="materialboxed center-align" src="${issue.map}">
          </div>
      </div>
      <div class="col s12 m12 l7 xl8">
          <h6 class="center-align valign-wrapper">
            ${(issue.approved == 0) ? '<i class="material-icons">new_releases</i> Ce signalement sera vérifié prochainement par un modérateur' : ''}
            ${(issue.status == 1) ? '<i class="material-icons">check_circle</i> Ce signalement a été pris en compte et le problème corrigé !' : ''}
            ${(LocalDataManager.getTokenSecretId(issue.token) != undefined) ? '<i class="material-icons">person</i> J\'ai fait ce signalement' : ''}
          </h6>
          <p><b>Référence de suivi :</b></p>
          <h4 class="center-align">${issue.token}</h4>
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
          <div class="center-align">
              <img class="materialboxed center-align" src="${issue.map}">
          </div>
      </div>
  </div>
</div>
<div class="modal-footer">
<a class="waves-effect waves-light btn-floating" onclick="centerOnIssue('${issue.token}')"><i class="material-icons center">map</i></a>
  <a href="#!" class="modal-close waves-effect waves-light btn-floating"><i class="material-icons">close</i></a>
</div>

`
}