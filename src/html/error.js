import i18next from 'i18next';

export default function(e){
  return `
  <div class="row">
      <div class="col s12">
          <div class="card-panel pink lighten-5">
              ${i18next.t("error")}
              <hr>
              <code>
                  ${e}
              </code>
          </div>
      </div>
  </div>`;
}