import m from 'mithril';
import Issue from '../model/issue';
import Categorie from '../model/category';
import instance from '../model/instance';

var modal;
var openning = false;

var issueDetail = {
  issue: {},
  id: "",
  open: function () {
    if (modal) {
      modal.open();
    } else {
      // Save request for open
      openning = true;
    }
  },
  oncreate: function (vnode) {
    modal = M.Modal.init(vnode.dom);

    if (openning) {
      modal.open();
    }
    issueDetail.issue = {
      token: "",
    };
  },
  initMaterialBoxed: function(vnode){
    M.Materialbox.init(vnode.dom);
  },
  view: function (vnode) {
    var issue = Issue.byToken(issueDetail.id);
    if (issue === undefined){
      issue = {};
    }
    
    return m(".modal.modal-fixed-footer.big", [
      m(".modal-content", 
        m(".row",[
          m(".col.s12.m6.l6.xl5", m(".align-center", m("img.materialboxed",{oncreate:this.initMaterialBoxed, src: instance.current.api_path + "/generate_panel.php?s=1000&token=" + issue.token }))),
          m(".col.s12.m6.l6.xl7", [
            m("table.header-first-column",
              m("tbody",[
                m("tr",[
                  m("td", "Référence"),
                  m("td", issue.token)
                ]),
                m("tr",[
                  m("td", "Catégorie"),
                  m("td", issue.categorie)
                ]),
                m("tr",[
                  m("td", "Date"),
                  m("td", (issue.date || new Date()).toLocaleString('fr'))
                ]),
                m("tr",[
                  m("td", "Explication"),
                  m("td", [issue.comment, m("blockquote", issue.explanation)])
                ]),
                m("tr",[
                  m("td", "Localisation"),
                  m("td", issue.address)
                ]),
              ])
            )
          ])

        ])
      ),
      m(".modal-footer", m("a.modal-close.waves-effect.waves-light.btn", m("i.material-icons", "close")))
    ]);
  }
}

export default issueDetail;

/*
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
            ${(localDataManager.getTokenSecretId(issue.token) != undefined) ? '<i class="material-icons">person</i> J\'ai fait ce signalement' : ''}
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
${btns}
<a class="waves-effect waves-light btn-floating" onclick="centerOnIssue('${issue.token}')"><i class="material-icons center">map</i></a>
  <a href="#!" class="modal-close waves-effect waves-light btn-floating"><i class="material-icons center">close</i></a>
</div>
*/