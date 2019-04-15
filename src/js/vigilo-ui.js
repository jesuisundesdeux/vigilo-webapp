export function issueCard(issue){
    return `
    <div class="col s12 m12 l6 xl4">
        <div class="card horizontal">
            <div class="card-image">
                <img src="${issue.img}">
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
    <h2>${issue.token}</h2>
  `
}