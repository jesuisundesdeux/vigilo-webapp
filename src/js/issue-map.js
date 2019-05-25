
import $ from 'jquery';
import L from 'leaflet';
import 'leaflet-control-geocoder';
import 'leaflet.fullscreen';
import 'leaflet.locatecontrol';
import './circle-marker-dynamic';
import { CATEGORIES_COLORS } from './colors';

import * as vigilo from './vigilo-api';

var issuesmap, issueslayer;
export async function initMap() {
	if (issuesmap !== undefined) {
		issuesmap.invalidateSize()
		return;
	}
	var issues = await vigilo.getIssues();
	$('#issues-map').empty();
	issuesmap = L.map('issues-map').setView([43.605413, 3.879568], 11);
	window.issuesmap = issuesmap;

	var baseLayers = {
		"Carte": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
			subdomains: 'abcd',
			minZoom: 0,
			maxZoom: 20,
			ext: 'png'
		}).addTo(issuesmap),
		"Photos": L.tileLayer(
			"https://wxs.ign.fr/choisirgeoportail/geoportail/wmts?" +
			"&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
			"&STYLE=normal" +
			"&TILEMATRIXSET=PM" +
			"&FORMAT=image/jpeg" +
			"&LAYER=ORTHOIMAGERY.ORTHOPHOTOS" +
			"&TILEMATRIX={z}" +
			"&TILEROW={y}" +
			"&TILECOL={x}",
			{
				minZoom: 0,
				maxZoom: 20,
				maxNativeZoom: 18,
				attribution: '<a href="http://www.ign.fr">IGN-F/Geoportail</a>',
				tileSize: 256
			}
		),
	};

	L.control.layers(baseLayers, {}).addTo(issuesmap);


	// Create layer and fill
	issueslayer = L.featureGroup([])
		.addTo(issuesmap)
		.on('click', (e) => { viewIssue(e.propagatedFrom.options.issue.token) });

	for (var i in issues) {

		var marker = L.circleMarkerDynamic(
			[issues[i].lat_float, issues[i].lon_float],
			{
				styles: STYLES,
				issue: issues[i],
				color: CATEGORIES_COLORS[issues[i].categorie_str].color
			}
		);
		issueslayer.addLayer(marker);
	}

	issuesmap.fitBounds(issueslayer.getBounds())

}



window.centerOnIssue = async function (token) {
	await initMap()
	var issues = await vigilo.getIssues();
	var issue = issues.filter(item => item.token == token)[0];
	issuesmap.setView([issue.lat_float, issue.lon_float], 18)
	M.Tabs.getInstance($("#issues .tabs")[0]).select('issues-map')
	M.Modal.getInstance($("#modal-issue")[0]).close();
}

const STYLES = {
	"0-12": {
		radius: 1,
		weight: 1,
	},
	"13-14": {
		radius: 2,
		weight: 1,
	},
	"15": {
		radius: 4,
		weight: 1,
	},
	"16-20": {
		radius: 8,
		weight: 2,
	}
}