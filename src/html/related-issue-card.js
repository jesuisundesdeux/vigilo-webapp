import { escapeHtml } from '../js/utils';
export default function (issue) {
  return `<div class="related-issue" data-token="${escapeHtml(issue.token)}">
      <div>
        <img class="materialboxed center-align" src="${escapeHtml(issue.img)}" data-fallback="${escapeHtml(issue.img_panel)}" loading="lazy" alt="">
      </div>
      <a class="btn-floating waves-effect waves-light yellow darken-1"><i class="material-icons">add</i></a>
</div>`
}