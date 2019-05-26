export function issueCard(issue){
    return `
    <div class="col s12 m12 l6 xl4">
        <div class="card horizontal">
            <div class="card-image" onclick="viewIssue('${issue.token}')">
                <img src="${issue.img_thumb}">
            </div>
            <!--<div class="card-stacked">-->
                <div class="card-content" onclick="viewIssue('${issue.token}')">
                    <span class="card-title"></span>
                    <h5>${issue.categorie_str}</h5>
                    <p class="grey-text">${issue.address}</p>
                    <p class="grey-text">${issue.date_obj.toLocaleString()}</p>
                </div>
                <!--<div class="card-action right-align">
                    <a class="waves-effect waves-light btn-floating" onclick="viewIssue('${issue.token}')"><i class="material-icons center">search</i></a>
                    <a class="waves-effect waves-light btn-floating" onclick="centerOnIssue('${issue.token}')"><i class="material-icons center">map</i></a>
                </div>-->
            <!--</div>-->
        </div>
    </div>
  `
}

export function issueDetail(issue){
    return `
<div class="modal-content">
    <div class="row">
        <div class="col s12 m6 l4 xl3">
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
        <div class="col s12 m12 l8 xl9">
            <p><b>Référence de suivi :</b></p>
            <h4 class="center-align">${issue.token}</h4>
            <p>
                <b>Catégorie :</b><br>
                ${issue.categorie_str}
            </p>
            <p>
                <b>Date :</b><br>
                ${issue.date_obj.toLocaleString()}
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

export function errorCard(e){
    return `
    <div class="row">
        <div class="col s12">
            <div class="card-panel pink lighten-5">
                Oups... une erreur est survenue.
                <hr>
                <code>
                    ${e}
                </code>
            </div>
        </div>
    </div>`;
}