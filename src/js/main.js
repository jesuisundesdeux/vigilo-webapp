// Import HTML
import '../index.html';
// import main CSS
import '../css/main.scss';

import $ from 'jquery';
import M from 'materialize-css';
import L from 'leaflet';
// Fix import leaflet with webpack https://github.com/PaulLeCam/react-leaflet/issues/255
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


import * as vigilo from './vigilo';
import * as vigiloui from './vigilo-ui';

M.AutoInit();

/**
 * Functions for issues list
 */
let offset=0;
async function displayIssues(count){
	var issues = await vigilo.getIssues()
	issues = issues.slice(offset, offset+count);
	console.log(issues)
	offset+=issues.length;
	issues.forEach((issue)=>{
		$(".issues .cards-container").append(vigiloui.issueCard(issue))
	})	
}
displayIssues(10)
$('.more-issues a').click(()=>{displayIssues(10)})

async function viewIssue(token){
	var modal = M.Modal.getInstance($("#modal-issue")[0]);
	var issues = await vigilo.getIssues();
	var issue = issues.filter(item => item.token == token)[0];
	$("#modal-issue .modal-content").empty().append(vigiloui.issueDetail(issue));
	modal.open()
}
window.viewIssue = viewIssue

/**
 * Functions for issues map
 */
var issuesmap;
async function initMap(){
	if (issuesmap !== undefined){
		issuesmap.invalidateSize()
		return;
	}
	var issues = await vigilo.getIssues();
	$('#issues-map').empty();
	issuesmap = L.map('issues-map').setView([43.605413, 3.879568], 11);

	L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
		attribution: 'copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
		subdomains: 'abcd',
		minZoom: 0,
		maxZoom: 20,
		ext: 'png'
	}).addTo(issuesmap);

	function onIssueClick(e){
		viewIssue(e.target.properties.issue.token)
	}

	for (var i in issues){
		L.circleMarker([issues[i].lat_float, issues[i].lon_float]).addTo(issuesmap).on('click',onIssueClick).properties = {issue : issues[i]};
	}
}
M.Tabs.getInstance($("nav .tabs")[0]).options.onShow = function(){initMap()}

async function centerOnIssue(token){
	await initMap()
	var issues = await vigilo.getIssues();
	var issue = issues.filter(item => item.token == token)[0];
	issuesmap.setView([issue.lat_float, issue.lon_float],19)
	M.Tabs.getInstance($("nav .tabs")[0]).select('issues-map')
}
window.centerOnIssue = centerOnIssue