import dataManager from './dataManager';
import * as vigiloui from './ui-template';
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
		issues = issues.slice(offset, offset + count);
		offset += issues.length;
		issues.forEach((issue) => {
			$("#issues .cards-container").append(vigiloui.issueCard(issue))
		})
	} catch (e) {
		$("#issues").empty().append(vigiloui.errorCard(e));
	}

}

async function viewIssue(token) {
	var modal = M.Modal.getInstance($("#modal-issue")[0]);
	var issues = await dataManager.getData();
	var issue = issues.filter(item => item.token == token)[0];
	$("#modal-issue").empty().append(vigiloui.issueDetail(issue));
	M.Materialbox.init($("#modal-issue .materialboxed"));
	modal.open()
}

window.viewIssue = viewIssue