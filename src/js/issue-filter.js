import * as vigiloconfig from './vigilo-config';
import errorCard from '../html/error';
import dataManager from './dataManager';

export async function init() {
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
        hour: $.map($("#modal-filters input[name=hour]:checked"), (i)=>$(i).val()),
        onlyme: ($.map($("#modal-filters input[name=owner]:checked"), (i)=>$(i).val()).indexOf('me') != -1),
			})
		}

		function updateCheckbox(){
			if ($(this).parent().parent().find('input:checked').length == 0){
				$(this).parent().parent().find('h6 i').html('check_box_outline_blank');
			} else if ($(this).parent().parent().find('input:checked').length != $(this).parent().parent().find('input').length){
				$(this).parent().parent().find('h6 i').html('indeterminate_check_box');
			} else {
				$(this).parent().parent().find('h6 i').html('check_box');
			}
		}

		$('#modal-filters h6').click(function(){
			if ($(this).find('i').html() == "check_box"){
				$(this).parent().find('input').prop('checked',false)
			} else {
				$(this).parent().find('input').prop('checked',true)
			}
			updateCheckbox.call($(this).parent().find('label').first())
		});

		$('#modal-filters label').click(updateCheckbox);
		
		
    } catch (e) {
        $("#issues .cards-container").empty().append(errorCard(e));
    }
}