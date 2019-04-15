// Import HTML
import '../index.html';
// import main CSS
import '../css/main.scss';

import $ from 'jquery';
//window.$ = window.jQuery = global.$ = global.jQuery = $;
import M from 'materialize-css';


import * as vigilo from './vigilo';
import * as vigiloui from './vigilo-ui';

M.AutoInit();


// Issues list
let offset=0;
function printIssues(count){
	vigilo.getIssues().then((issues) => {
		issues = issues.slice(offset, offset+count);
		console.log(issues)
		offset+=issues.length;
		issues.forEach((issue)=>{
			$(".container.issues .cards-container").append(vigiloui.issueCard(issue))
		})
	})
	
}
printIssues(10)
$('.more-issues a').click(()=>{printIssues(10)})