// Import HTML
import '../index.html';
// import main CSS
import '../css/main.scss';

import $ from 'jquery';
window.$ = $
import M from 'materialize-css';
import L from 'leaflet';
import 'leaflet-control-geocoder';
import 'leaflet.fullscreen';
import 'leaflet.locatecontrol';
// Fix import leaflet with webpack https://github.com/PaulLeCam/react-leaflet/issues/255
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
	iconUrl: require('leaflet/dist/images/marker-icon.png'),
	shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

import * as vigilo from './vigilo-api';
import * as vigiloui from './vigilo-ui';

// Init UI fonction
(async function initUI() {
	M.Tabs.init($("nav .tabs"));
	M.Modal.init($("#modal-issue"));
	M.Modal.init($("#modal-form"));
	M.Datepicker.init($("#modal-form .datepicker"), {
		container: 'body',
		firstDay: 1,
		format: 'dd mmm yyyy',
		i18n: {
			months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
			monthsShort: ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
			weekdays: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
			weekdaysShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
			weekdaysAbbrev: ['D', 'L', 'Ma', 'Me', 'J', 'V', 'S'],
			cancel: "Annuler",

		},
		autoClose: true,
		onSelect: () => {
			M.Timepicker.getInstance($("#modal-form .timepicker")).open()
		}
	});
	M.Timepicker.init($("#modal-form .timepicker"), {
		container: 'body',
		autoClose: true,
		twelveHour: false,
		i18n: {
			'cancel': 'Annuler',
			'done': 'ok'
		},
		onCloseEnd: () => {
			$("#modal-form select").focus()
		}
	});
	// Fill category select
	var cats = await vigilo.getCategories();
	for (var i in cats) {
		$("#modal-form select").append(`<option value="${i}">${cats[i]}</option>`)
	}
	M.FormSelect.init($("#modal-form select"))

	// Preview picture
	$("#modal-form input[type=file]").change(function () {
		var input = this;
		if (input.files && input.files[0]) {
			var reader = new FileReader();

			reader.onload = function (e) {
				$('#picture-preview').attr('src', e.target.result);
			}

			reader.readAsDataURL(input.files[0]);
		}
	})
})()


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
$(window).scroll(() => {
	if (($(window.document.body).height() - $(window).height() - $(window).scrollTop()) < 10) {
		displayIssues(10)
	}
})
displayIssues(10)

async function viewIssue(token) {
	var modal = M.Modal.getInstance($("#modal-issue")[0]);
	var issues = await vigilo.getIssues();
	var issue = issues.filter(item => item.token == token)[0];
	$("#modal-issue").empty().append(vigiloui.issueDetail(issue));
	M.Materialbox.init($("#modal-issue .materialboxed"));
	modal.open()
}
window.viewIssue = viewIssue
/* ******************************************************* */



/**
 * Functions for issues map
 */
var issuesmap, issueslayer;
async function initMap() {
	if (issuesmap !== undefined) {
		issuesmap.invalidateSize()
		return;
	}
	var issues = await vigilo.getIssues();
	$('#issues-map').empty();
	issuesmap = L.map('issues-map').setView([43.605413, 3.879568], 11);


	var baseLayers = {
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
				maxZoom: 18,
				attribution: '<a href="http://www.ign.fr">IGN-F/Geoportail</a>',
				tileSize: 256
			}
		).addTo(issuesmap),
		"Carte": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
			subdomains: 'abcd',
			minZoom: 0,
			maxZoom: 20,
			ext: 'png'
		}).addTo(issuesmap),
	};
	
	L.control.layers(baseLayers, {}).addTo(issuesmap);
	

	// Create layer and fill
	issueslayer = L.featureGroup([])
		.addTo(issuesmap)
		.on('click', (e) => { viewIssue(e.layer.options.issue.token) });


	for (var i in issues) {
		issueslayer.addLayer(L.circleMarker([issues[i].lat_float, issues[i].lon_float], { issue: issues[i] }));
	}

}

M.Tabs.getInstance($("nav .tabs")[0]).options.onShow = function () { initMap() }

async function centerOnIssue(token) {
	await initMap()
	var issues = await vigilo.getIssues();
	var issue = issues.filter(item => item.token == token)[0];
	issuesmap.setView([issue.lat_float, issue.lon_float], 18)
	M.Tabs.getInstance($("nav .tabs")[0]).select('issues-map')
	M.Modal.getInstance($("#modal-issue")[0]).close();
}
window.centerOnIssue = centerOnIssue
/* ************************************************************* */


/**
 * Form functions
 */

window.startForm = function () {
	var modal = M.Modal.getInstance($("#modal-form")[0]);
	modal.open();
	initFormMap();
}
var formmap, mapmarker;
function initFormMap() {
	if (formmap !== undefined) {
		formmap.invalidateSize()
		return;
	}
	formmap = L.map('form-map', {
		fullscreenControl: true,
		fullscreenControlOptions: {
			position: 'topleft'
		}
	}).setView([43.605413, 3.879568], 11);


	var baseLayers = {
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
				maxZoom: 18,
				attribution: '<a href="http://www.ign.fr">IGN-F/Geoportail</a>',
				tileSize: 256
			}
		).addTo(formmap),
		"Carte": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
			subdomains: 'abcd',
			minZoom: 0,
			maxZoom: 20,
			ext: 'png'
		}).addTo(formmap),
	};

	L.control.layers(baseLayers, {}).addTo(formmap);

	mapmarker = L.marker([0, 0], {
		draggable: true,
		autoPan: true
	}).on('dragend', (e) => {
		setFormMapPoint(mapmarker.getLatLng())
	})

	formmap.on('click', (e) => { setFormMapPoint(e.latlng) })

	formmap.geocoderCtrl = L.Control.geocoder({
		position: 'topright',
		defaultMarkGeocode: false
	})
	.on('markgeocode', function (e) {
		setFormMapPoint(e.geocode.center, e.geocode)
	}).addTo(formmap)

	L.control.locate({
		locateOptions: {
			enableHighAccuracy: true
		},
		iconElementTag: 'i',
		icon: 'material-icons tiny location_searching',
		iconLoading: 'material-icons tiny',
		drawCircle: false

	}).addTo(formmap)

	// We use materialcss iconw instead of fontawesome
	$("i.location_searching").append('location_searching')
}
function setFormMapPoint(latlng, address) {
	if (formmap === undefined) {
		return
	}
	formmap.setView(latlng, 18);
	mapmarker.setLatLng(latlng).addTo(formmap)
	if (address !== undefined) {
		$("#issue-address").val(addressFormat(address))
		M.updateTextFields();
	} else {
		//Reversegeocoding
		formmap.geocoderCtrl.options.geocoder.reverse(latlng, 1, function (result) {
			if (result.length > 0) {
				$("#issue-address").val(addressFormat(result[0]))
				M.updateTextFields();
			}
		})
	}

}

function addressFormat(address) {
	return `${address.properties.address.road || ''}, ${address.properties.address.city}`
}

window.step1 = function () {

}


