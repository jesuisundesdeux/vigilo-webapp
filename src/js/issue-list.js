import * as vigilo from './vigilo-api';
import * as vigiloui from './ui-template';
/**
 * Functions for issues list
 */
let offset = 0;
async function displayIssues(count) {
	var issues = await vigilo.getIssues()
	issues = issues.slice(offset, offset + count);
	offset += issues.length;
	issues.forEach((issue) => {
		$(".issues .cards-container").append(vigiloui.issueCard(issue))
	})
}

async function viewIssue(token) {
	var modal = M.Modal.getInstance($("#modal-issue")[0]);
	var issues = await vigilo.getIssues();
	var issue = issues.filter(item => item.token == token)[0];
	$("#modal-issue").empty().append(vigiloui.issueDetail(issue));
	M.Materialbox.init($("#modal-issue .materialboxed"));
	modal.open()
}
window.viewIssue = viewIssue
window.displayIssues = displayIssues

