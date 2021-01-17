

export default function (issue) {
  return `<div class="related-issue" data-token="${issue.token}">
      <div>
        <img class="materialboxed center-align" src="${issue.img}">
      </div>
      <a class="btn-floating waves-effect waves-light yellow darken-1"><i class="material-icons">add</i></a>
</div>`
}