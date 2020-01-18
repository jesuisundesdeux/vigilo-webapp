import LocalDataManager from '../js/localDataManager';

export default function (issue) {
  return `<div class="col s12 m12 l6 xl4">
  <div class="card horizontal" onclick="viewIssue('${issue.token}')">
      <div class="card-image">
          <img src="${issue.img_thumb}">
      </div>
      <div class="card-content">
          <span class="card-title"></span>
          <h5>
            ${(issue.approved == 0) ? '<i class="material-icons" title="Ce signalement sera vérifié prochainement par un modérateur">new_releases</i>' : ''}
            ${(issue.status == 1) ? '<i class="material-icons" title="Ce signalement a été pris en compte et le problème corrigé !">done_all</i>' : ''}
            ${(issue.status == 2) ? '<i class="material-icons" title="Ce signalement sera prochainement résolu.">info</i>' : ''}
            ${(issue.status == 3) ? '<i class="material-icons" title="Ce signalement est en cours de résolution.">hourglass_empty</i>' : ''}
            ${(issue.status == 4) ? '<i class="material-icons" title="Ce signalement semble être résolu.">done</i>' : ''}
            ${(LocalDataManager.getTokenSecretId(issue.token) != undefined) ? '<i class="material-icons" title="J\'ai fait ce signalement">person</i>' : ''}
            ${issue.categorie_str}
          </h5>
          <p class="grey-text">${issue.address}</p>
          <p class="grey-text">${issue.date_obj.toLocaleString('fr')}</p>
      </div>
  </div>
</div>`
}