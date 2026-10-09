import i18next from 'i18next';
import dataManager from './dataManager';
import * as vigilo from './vigilo-api';
import errorCard from '../html/error';
import issueCard from '../html/issue-card';
import issueDetail from '../html/issue-detail';
import { showIssueMiniMap } from './issue-minimap';
import { safeToken } from './utils';
import { findPanoramaxPicture, openPanoramaxViewer } from './panoramax';
import { findSimilarIssues, similarIssuesHtml } from './similar-issues';
/**
 * Functions for issues list
 */
let offset = 0;
export async function cleanIssues() {
	$("#issues .cards-container").empty();
	offset = 0;
}

export async function displayIssues(count) {
	try {
		var issues = await dataManager.getData();
		// loading placeholders
		$("#issues .cards-container .skeleton-list").remove();
		if (issues.length) {
			issues = issues.slice(offset, offset + count);
			offset += issues.length;
			issues.forEach((issue) => {
				$("#issues .cards-container").append(issueCard(issue))
			})
		} else {
			$("#issues .cards-container").append('<div class="no-issue-to-display-container"><div class="no-issue-to-display" data-i18n="no-issue">' + i18next.t("no-issue") + '</div></div>')
		}

	} catch (e) {
		$("#issues").empty().append(errorCard(e));
	}

}

export async function viewIssue(token) {
	var modal = M.Modal.getInstance($("#modal-issue")[0]);
	// every observation, even one hidden by the filters (e.g. the one just posted)
	var issues = await vigilo.getIssues();
	var issue = issues.filter(item => item.token == token);
	if (issue.length == 0) {
		// not in the list (yet): ask the backend for this one
		issue = await vigilo.getIssues({ token: token }).catch(() => []);
		issue = issue.filter(item => item.token == token);
	}
	if (issue.length > 0) {
		$("#modal-issue").empty().append(await issueDetail(issue[0]));
		M.Materialbox.init($("#modal-issue .materialboxed"));
		window.history.replaceState({}, '', issue[0].permLink)
		modal.open()
		showIssueMiniMap($("#modal-issue .issue-minimap")[0], $("#modal-issue .issue-minimap-caption")[0], issue[0]);
		// Similar observations (same category, nearby or same address), computed from the loaded list
		$("#modal-issue .similar-issues").html(similarIssuesHtml(findSimilarIssues(issue[0], issues)));
		$("#modal-issue .modal-content").scrollTop(0);
		// "See with Panoramax" button, only if a street-level picture exists there
		var row = $("#modal-issue .panoramax-row");
		findPanoramaxPicture(issue[0].lat_float, issue[0].lon_float).then((picture) => {
			if (picture) {
				row.find(".panoramax-btn").removeClass("loading").on("click", (e) => {
					e.preventDefault();
					openPanoramaxViewer(picture);
				});
				row.find(".panoramax-label").attr("data-i18n", "see-on-panoramax").text(i18next.t("see-on-panoramax"));
			} else {
				row.remove();
			}
		});
	} else {
		console.warn("This token does not exist: ", token);
	}
}

/**
 * Re-render one card in place (e.g. after a moderation action), without
 * reloading the list nor losing the scroll position.
 */
export async function refreshIssueCard(issue) {
	var card = $("#issues .card[onclick=\"viewIssue('" + safeToken(issue.token) + "')\"]").parent();
	var stillMatchesFilters = (await dataManager.getData()).some((i) => i.token == issue.token);
	if (stillMatchesFilters) {
		card.replaceWith(issueCard(issue));
	} else if (card.length) {
		// e.g. a moderator listing only the observations to moderate: the card leaves the list
		card.remove();
		offset = Math.max(0, offset - 1);
		// keep the list filled: load the next observation, if any
		await displayIssues(1);
	}
}

window.viewIssue = viewIssue
