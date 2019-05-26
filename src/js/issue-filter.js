import * as vigiloconfig from './vigilo-config';
import * as vigiloui from './ui-template';
import dataManager from './dataManager';

(async function() {
	try {
		// Fill category select
		var cats = await vigiloconfig.getCategories();
		for (var i in cats) {
			$("#modal-filters #categories-select")
				.append(`<p>
                <label>
                  <input type="checkbox" checked="checked"  name="categories" value="${i}" />
                  <span>${cats[i]}</span>
                </label>
              </p>`)
		}
		M.Modal.init($("#modal-filters"));
		M.Modal.getInstance($("#modal-filters")).options.onCloseStart = function(){
			dataManager.setFilter({
				categories: $.map($("#modal-filters input[name=categories]:checked"), (i)=>$(i).val()),
				dow: $.map($("#modal-filters input[name=dow]:checked"), (i)=>$(i).val()),
				hour: $.map($("#modal-filters input[name=hour]:checked"), (i)=>$(i).val())
			})
		}
		
    } catch (e) {
        $("#issues .cards-container").empty().append(vigiloui.errorCard(e));
    }
})()