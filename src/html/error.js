import i18next from 'i18next';
import { escapeHtml } from '../js/utils';

export default function(e){
  // e can be a string, an Error, or nothing at all (never display "undefined")
  var detail = (e instanceof Error) ? e.message : e;
  return `
  <div class="row">
      <div class="col s12">
          <div class="card-panel pink lighten-5">
              ${i18next.t("error")}
              ${detail ? `<hr>
              <code>
                  ${escapeHtml(detail)}
              </code>` : ''}
          </div>
      </div>
  </div>`;
}
