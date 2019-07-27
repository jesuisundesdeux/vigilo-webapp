import m from 'mithril';
import instance from '../model/instance';
import categories from '../model/category';

var IssueCard = {
  view: function(vnode) {
    var issue = vnode.attrs.issue;
    return m(".col.s12.m12.l6.xl4",
     m("a", {href: "/"+issue.zone+"/issue/detail/"+issue.token, oncreate: m.route.link},
      m(".card.horizontal", [
        m(".card-image", m("img",{src: instance.current.api_path + "/generate_panel.php?s=150&token=" + issue.token })),
        m(".card-content", [
          m("h5", categories.idToString[issue.categorie]),
          m("p.grey-text", issue.address),
          m("p.grey-text", issue.date.toLocaleString('fr')),
        ]),
      ])
     )
    );
  }
};

export default IssueCard;
/*
<div class="col s12 m12 l6 xl4">
  <div class="card horizontal" onclick="viewIssue('${issue.token}')">
      <div class="card-image">
          <img src="${issue.img_thumb}">
      </div>
      <div class="card-content">
          <span class="card-title"></span>
          <h5>
            ${(issue.approved == 0) ? '<i class="material-icons" title="Ce signalement sera vérifié prochainement par un modérateur">new_releases</i>' : ''}
            ${(issue.status == 1) ? '<i class="material-icons" title="Ce signalement a été pris en compte et le problème corrigé !">check_circle</i>' : ''}
            ${(LocalDataManager.getTokenSecretId(issue.token) != undefined) ? '<i class="material-icons" title="J\'ai fait ce signalement">person</i>' : ''}
            ${issue.categorie_str}
          </h5>
          <p class="grey-text">${issue.address}</p>
          <p class="grey-text">${issue.date_obj.toLocaleString('fr')}</p>
      </div>
  </div>
</div>
*/