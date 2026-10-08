import * as vigiloconfig from './vigilo-config';
import * as vigilo from './vigilo-api';
import errorCard from '../html/error';
import dataManager, { filterIssues, issueStatus, periodStart } from './dataManager';
import LocalDataManager from './localDataManager';
import i18next from 'i18next';
import { escapeHtml } from './utils';

const MODAL = "#modal-filters";

function chip(name, value, label, color, checked) {
	var dot = color ? `<i class="chip-dot" style="background:${escapeHtml(color)}"></i>` : "";
	return `<label><input type="checkbox" name="${name}" value="${escapeHtml(value)}"${checked ? ' checked="checked"' : ''} />`
		+ `<span>${dot}<span${label.i18n ? ` data-i18n="${label.i18n}"` : ''}>${escapeHtml(label.text)}</span><small class="chip-count"></small></span></label>`;
}

export async function init() {
	try {
		var cats = await vigiloconfig.getCategories();
		var issues = await vigilo.getIssues();

		// Categories (the disabled ones only if observations use them)
		var used = countIssue(issues, "categorie", Object.keys(cats));
		for (var i in cats) {
			if (cats[i].disable && !used[i]) {
				continue;
			}
			$(MODAL + " #categories-select .filter-chips")
				.append(chip("categories", i, { i18n: "category-name-" + i, text: i18next.t("category-name-" + i) }, cats[i].color, true));
		}
		addCount("categories", used);

		// Cities of the scope
		var scope = await vigilo.getScope();
		var cities = (scope.cities || []).sort((a, b) => parseInt(b.population) - parseInt(a.population))
		if (cities && cities.length > 0 && issues.length && issues[0].cityname !== undefined) {
			for (var i in cities) {
				$(MODAL + " #city-select .filter-chips").append(chip("city", cities[i].name, { text: cities[i].name }, null, true));
			}
			addCount("city", countIssue(issues, "cityname", cities.map(c => c.name)));
		} else {
			$(MODAL + " #city-select").remove()
		}

		addCount("status", countBy(issues, issueStatus));
		addCount("age", countIssueAge(issues));
		addCount("hour", countBy(issues, (issue) => {
			var hour = issue.date_obj.getHours();
			return (hour >= 6 && hour <= 12) ? "morning" : ((hour >= 13 && hour <= 19) ? "afternoon" : "night");
		}));
		addCount("dow", countBy(issues, (issue) => [0, 6].indexOf(issue.date_obj.getDay()) == -1 ? "worked" : "weekend"));
		addCount("owner", { me: issues.filter((item) => LocalDataManager.getTokenSecretId(item.token) != undefined).length });

		$(MODAL + " input[name=comment]").val(dataManager.comment);

		function readFilters() {
			return {
				categories: checkedValues("categories"),
				dow: checkedValues("dow"),
				hour: checkedValues("hour"),
				onlyme: $(MODAL + " input[name=owner]").is(":checked"),
				comment: $(MODAL + " input[name=comment]").val(),
				status: checkedValues("status"),
				age: $(MODAL + " input[name=age]:checked").val() || "all",
				cities: checkedValues("city"),
			};
		}

		// "All / none" link of each group, and the number of matching observations
		function refresh() {
			$(MODAL + " [data-toggle-group]").each(function () {
				var all = $(this).find("input[type=checkbox]");
				var allChecked = all.filter(":checked").length == all.length;
				$(this).find(".filter-toggle").text(i18next.t(allChecked ? "filters-none" : "filters-all"));
			});
			var n = filterIssues(issues, readFilters()).length;
			$("#filters-summary").text(i18next.t("filters-count", { count: n }));
		}

		$(MODAL).on("change", "input", refresh);
		$(MODAL + " input[name=comment]").on("input", refresh);
		$(MODAL + " .filter-toggle").on("click", function (e) {
			e.preventDefault();
			var all = $(this).closest("[data-toggle-group]").find("input[type=checkbox]");
			all.prop("checked", all.filter(":checked").length != all.length);
			refresh();
		});
		$("#filters-reset").on("click", function (e) {
			e.preventDefault();
			$(MODAL + " [data-toggle-group] input[type=checkbox]").prop("checked", true);
			$(MODAL + " input[name=owner]").prop("checked", false);
			$(MODAL + " input[name=age][value=all]").prop("checked", true);
			$(MODAL + " input[name=comment]").val("");
			refresh();
		});

		M.Modal.init($(MODAL));
		M.Modal.getInstance($(MODAL)).options.onOpenStart = refresh;
		M.Modal.getInstance($(MODAL)).options.onCloseStart = function () {
			dataManager.setFilter(readFilters());
		}

		// Moderators: by default only the observations waiting for moderation are listed
		// (can be changed in the filters)
		if (LocalDataManager.isAdmin()) {
			$(MODAL + " input[name=status]").each(function () {
				$(this).prop('checked', $(this).val() == 'unapproved');
			});
			// set before the first display, without triggering a re-render
			dataManager.status = ['unapproved'];
			M.toast({ html: i18next.t("moderator-default-filter"), displayLength: 6000 });
		}
		refresh();

	} catch (e) {
		$("#issues .cards-container").empty().append(errorCard(e));
	}
}

/**
 * Checked values of a filter group, or [] (= no filtering) when every box is checked,
 * so that issues whose city/category is missing from the instance configuration stay visible.
 * The dow / hour values are expanded by the data manager ("-" matches nothing).
 */
function checkedValues(name) {
	var all = $(MODAL + " input[name=" + name + "]");
	var checked = all.filter(":checked");
	if (checked.length == all.length) {
		return [];
	}
	if (checked.length == 0) {
		// nothing checked: nothing matches
		return ["-"];
	}
	return $.map(checked, (i) => $(i).val());
}

function countIssue(issues, attr, keys) {
	var count = {}
	keys.forEach(element => {
		count[element] = 0;
	});
	issues.forEach((issue) => {
		if (count[issue[attr]] !== undefined) {
			count[issue[attr]]++;
		}
	});
	return count;
}

function countBy(issues, key) {
	var count = {};
	issues.forEach((issue) => {
		var k = key(issue);
		count[k] = (count[k] || 0) + 1;
	});
	return count;
}

function countIssueAge(issues) {
	var count = {};
	$(MODAL + " input[name=age]").each(function () {
		var start = periodStart($(this).val());
		count[$(this).val()] = issues.filter((issue) => start === null || issue.date_obj >= start).length;
	});
	return count;
}

function addCount(name, count) {
	$(MODAL + " input[name='" + name + "']").each(function () {
		var value = count[$(this).val()] || 0;
		$(this).parent().find(".chip-count").text(value);
	});
}
