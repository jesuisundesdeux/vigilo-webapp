export function issueCard(issue){
    return `
    <div class="col s12 m6 l4">
        <div class="card">
            <!--div class="card-image">
                <img src="${issue.img}">
            </div-->
            <!--div class="card-stacked"-->
                <div class="card-content">
                    <span class="card-title"></span>
                    <p>${issue.token}</p>
                    <p>${issue.comment}</p>
                    <p>${issue.date_obj.toLocaleString()} - ${issue.address}</p>
                </div>
                <div class="card-action">
                    <a href="#">This is a link</a>
                </div>
            <!--/div-->
        </div>
    </div>
  `
}