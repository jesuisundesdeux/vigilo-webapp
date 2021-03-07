import i18next from 'i18next';
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
            ${(issue.approved == 0) ? '<i class="material-icons" data-i18n-attr=\'{"title": "status-unapproved-long"}\' title="'+i18next.t("status-unapproved-long")+'">new_releases</i>' : ''}
            ${(issue.status == 1) ? '<i class="material-icons" data-i18n-attr=\'{"title": "status-resolved-long"}\' title="'+i18next.t("status-resolved-long")+'">done_all</i>' : ''}
            ${(issue.status == 2) ? '<i class="material-icons" data-i18n-attr=\'{"title": "status-taked-long"}\' title="'+i18next.t("status-taked-long")+'">info</i>' : ''}
            ${(issue.status == 3) ? '<i class="material-icons" data-i18n-attr=\'{"title": "status-inprogress-long"}\' title="'+i18next.t("status-inprogress-long")+'">hourglass_empty</i>' : ''}
            ${(issue.status == 4) ? '<i class="material-icons" data-i18n-attr=\'{"title": "status-done-long"}\' title="'+i18next.t("status-done-long")+'">done</i>' : ''}
            ${(LocalDataManager.getTokenSecretId(issue.token) != undefined) ? '<i class="material-icons" data-i18n-attr=\'{"title": "i-make-it"}\' title="'+i18next.t("i-make-it")+'">person</i>' : ''}
            <span data-i18n="category-name-${issue.categorie}">${i18next.t("category-name-"+issue.categorie)}</span>
          </h5>
          <p class="grey-text">${issue.address}</p>
          <p class="grey-text" data-i18n-date="${issue.date_obj.toString()}">${issue.date_obj.toLocaleString(i18next.language.split("_")[0])}</p>
      </div>
  </div>
</div>`
}