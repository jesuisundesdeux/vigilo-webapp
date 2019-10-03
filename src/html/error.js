export default function(e){
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