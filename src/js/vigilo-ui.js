export function issueCard(issue){
    return `
    <div class="col s12 m12 l6 xl4">
        <div class="card horizontal">
            <div class="card-image">
                <img src="${issue.img_thumb}">
            </div>
            <div class="card-stacked">
                <div class="card-content">
                    <span class="card-title"></span>
                    <h5>${issue.categorie_str}</h5>
                    <p class="grey-text">${issue.address}</p>
                    <p class="grey-text">${issue.date_obj.toLocaleString()}</p>
                </div>
                <div class="card-action right-align">
                    <a class="waves-effect waves-light btn-floating" onclick="viewIssue('${issue.token}')"><i class="material-icons center">search</i></a>
                    <a class="waves-effect waves-light btn-floating" onclick="centerOnIssue('${issue.token}')"><i class="material-icons center">map</i></a>
                </div>
            </div>
        </div>
    </div>
  `
}

export function issueDetail(issue){
    return `
    <div class="row">
        <div class="col s12 m6 l4">
            <div class="center-align">
                <img class="center-align" src="${issue.img}">
            </div>
        </div>
        <div class="col s12 m6 l8">
            <p><strong>Référence de suivi :</strong></p>
            <h4 class="center-align">${issue.token}</h4>
            <p>
                <strong>Catégorie :</strong><br>
                ${issue.categorie_str}
            </p>
            <p>
                <strong>Date :</strong><br>
                ${issue.date_obj.toLocaleString()}
            </p>
            <p>
                <strong>Remarque :</strong><br>
                ${issue.comment}
                <br><blockquote>${issue.explanation}</blockquote>
            </p>
            <p>
                <strong>Localisation :</strong><br>
                ${issue.address}
            </p>
        </div>
    </div>
    

  `
}