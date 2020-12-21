import dataManager from './dataManager';
import errorCard from '../html/error';
import issueCard from '../html/issue-card';
import issueDetail from '../html/issue-detail';
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
			$("#issues .cards-container").append(issueCard(issue))
		})
	} catch (e) {
		$("#issues").empty().append(errorCard(e));
	}

}

export async function viewIssue(token) {
	var modal = M.Modal.getInstance($("#modal-issue")[0]);
	var issues = await dataManager.getData();
	var issue = issues.filter(item => item.token == token);
	if( issue.length > 0) {
		$("#modal-issue").empty().append(await issueDetail(issue[0]));
		M.Materialbox.init($("#modal-issue .materialboxed"));
		window.history.replaceState({}, '', issue[0].permLink)
		modal.open()
	} else {
		console.warn("This token does not exist: ", token);
	}
}

window.viewIssue = viewIssue
