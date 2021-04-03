import * as vigiloconfig from './vigilo-config';
import * as vigilo from './vigilo-api';
import errorCard from '../html/error';
import dataManager from './dataManager';
import LocalDataManager from './localDataManager';

export async function init() {
	try {
		// Fill category select + count
		var cats = await vigiloconfig.getCategories();
		var issues = await vigilo.getIssues();
		for (var i in cats) {
			$("#modal-filters #categories-select")
				.append(`<div class="col s12 m6"><label>
                  <input type="checkbox" checked="checked"  name="categories" value="${i}" />
                  <span>${cats[i].name}</span>
                </label>
              </div`)
		}
		addBadge("categories", countIssue(issues, "categorie", Object.keys(cats)));

		// Fill city select + count
		var scope = await vigilo.getScope();
		var cities = scope.cities.sort((a, b) => parseInt(a.population) <= parseInt(b.population))
		if (cities && cities.length > 0 && issues.length && issues[0].cityname !== undefined) {
			for (var i in cities) {
				$("#modal-filters #city-select")
					.append(`<div class="col s12 m6 l4">
								<label>
									<input type="checkbox" name="city" value="${cities[i].name}" checked="checked" />
									<span>${cities[i].name}</span>
				  				</label>
				  			</div>`);
			}
			addBadge("city", countIssue(issues, "cityname", cities.map(c => c.name)));
		} else {
			$("#modal-filters #city-select").remove()
		}

		// Status count
		addBadge("status", countIssueStatus(issues));

		// Age count
		addBadge("age", countIssueAge(issues));

		// Hour count
		addBadge("hour", countIssueHour(issues));

		// Day count
		addBadge("dow", countIssueDay(issues));

		// My issue count
		$("input[name=owner]").parent().parent().parent().find("h6").append(' (' + countIssueFromMe(issues) + ')');

		M.Modal.init($("#modal-filters"));
		M.Modal.getInstance($("#modal-filters")).options.onCloseStart = function () {
			dataManager.setFilter({
				categories: $.map($("#modal-filters input[name=categories]:checked"), (i) => $(i).val()),
				dow: $.map($("#modal-filters input[name=dow]:checked"), (i) => $(i).val()),
				hour: $.map($("#modal-filters input[name=hour]:checked"), (i) => $(i).val()),
				onlyme: ($.map($("#modal-filters input[name=owner]:checked"), (i) => $(i).val()).indexOf('me') != -1),
				comment: $("#modal-filters input[name=comment]").val(),
				status: $.map($("#modal-filters input[name=status]:checked"), (i) => $(i).val()),
				age: parseInt($.map($("#modal-filters input[name=age]:checked"), (i) => $(i).val())[0]),
				cities: $.map($("#modal-filters input[name=city]:checked"), (i) => $(i).val()),
			})
		}

		function updateCheckbox() {
			if ($(this).parent().parent().find('input:checked').length == 0) {
				$(this).parent().parent().find('h6 i').html('check_box_outline_blank');
			} else if ($(this).parent().parent().find('input:checked').length != $(this).parent().parent().find('input').length) {
				$(this).parent().parent().find('h6 i').html('indeterminate_check_box');
			} else {
				$(this).parent().parent().find('h6 i').html('check_box');
			}
		}

		$('#modal-filters h6').click(function () {
			if ($(this).find('i').html() == "check_box") {
				$(this).parent().find('input').prop('checked', false)
			} else {
				$(this).parent().find('input').prop('checked', true)
			}
			updateCheckbox.call($(this).parent().find('label').first())
		});

		$('#modal-filters label').click(updateCheckbox);


	} catch (e) {
		$("#issues .cards-container").empty().append(errorCard(e));
	}
}

function countIssue(issues, attr, keys) {
	var count = {}
	keys.forEach(element => {
		count[element] = 0;
	});
	issues.reduce(function (accumulator, currentIssue) {
		accumulator[currentIssue[attr]]++
		return accumulator
	}, count);
	return count;
}

function countIssueStatus(issues) {
	var count = {
		"unknow": 0,
		"unapproved": 0,
		"unresolved": 0,
		"taked": 0,
		"inprogress": 0,
		"done": 0,
		"resolved": 0,
	};
	issues.reduce(function (accumulator, currentIssue) {
		var issue_status = "unknow";
		if (currentIssue.approved == 0) {
			issue_status = "unapproved"
		} else if (currentIssue.approved == 1 && currentIssue.status == 0) {
			issue_status = "unresolved"
		} else if (currentIssue.approved == 1 && currentIssue.status == 2) {
			issue_status = "taked"
		} else if (currentIssue.approved == 1 && currentIssue.status == 3) {
			issue_status = "inprogress"
		} else if (currentIssue.approved == 1 && currentIssue.status == 4) {
			issue_status = "done"
		} else if (currentIssue.approved == 1 && currentIssue.status == 1) {
			issue_status = "resolved"
		}

		accumulator[issue_status]++
		return accumulator
	}, count);
	return count;
}
function countIssueAge(issues) {
	var count = {
		1: 0,
		3: 0,
		7: 0,
		30: 0
	}
	var date_now = Date.now();
	issues.reduce(function (accumulator, currentIssue) {
		var issue_age = (date_now - currentIssue.date_obj) / (1000 * 60 * 60 * 24);
		for (var i in accumulator) {
			if (i > issue_age) {
				accumulator[i]++
			}
		}
		return accumulator
	}, count);
	return count;
}
function countIssueHour(issues) {
	var count = {
		"morning": 0,
		"afternoon": 0,
		"night": 0,
	}
	var morning = [6, 7, 8, 9, 10, 11, 12];
	var afternoon = [13, 14, 15, 16, 17, 18, 19];
	issues.reduce(function (accumulator, currentIssue) {
		var hour = currentIssue.date_obj.getHours();
		if (morning.indexOf(hour) != -1) {
			accumulator.morning++
		} else if (afternoon.indexOf(hour) != -1) {
			accumulator.afternoon++
		} else {
			accumulator.night++
		}

		return accumulator
	}, count);
	return count;
}
function countIssueDay(issues) {
	var count = {
		"worked": 0,
		"weekend": 0,
	}
	var worked = [1, 2, 3, 4, 5];

	issues.reduce(function (accumulator, currentIssue) {
		var day = currentIssue.date_obj.getDay();
		if (worked.indexOf(day) != -1) {
			accumulator.worked++
		} else {
			accumulator.weekend++
		}

		return accumulator
	}, count);
	return count;
}

function countIssueFromMe(issues) {
	return issues.filter((item) => {
		return LocalDataManager.getTokenSecretId(item.token) != undefined
	}).length
}

function addBadge(name, count) {
	for (let [key, value] of Object.entries(count)) {
		$("#modal-filters input[name='" + name + "'][value='" + key.replace("'", "\\'") + "']").parent().find('span').append(' (' + value + ')');
	}
}
