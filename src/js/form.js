import $ from 'jquery';
import L from 'leaflet';
import 'leaflet-control-geocoder';
import 'leaflet.fullscreen';
import 'leaflet.locatecontrol';

import * as vigilo from './vigilo-api';
import * as vigiloconfig from './vigilo-config';

window.startForm = function () {
	clearForm()
	var modal = M.Modal.getInstance($("#modal-form")[0]);
	modal.open();
	initFormMap();
}

function clearForm(){
	$('#modal-form form').trigger("reset");
	if (mapmarker !== undefined){
		mapmarker.remove()
	}
	$("#modal-form-loader .determinate").css("width","10%");
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

	$("#issue-address").change(()=>{
		if (mapmarker.getLatLng().lat == 0 && mapmarker.getLatLng().lng == 0){
			formmap.geocoderCtrl._input.value = $("#issue-address").val()
			formmap.geocoderCtrl._geocode()
		}
	});
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
	return `${address.properties.address.road || address.properties.address.pedestrian || address.properties.address.footway || ''}, ${address.properties.address.village || address.properties.address.town || address.properties.address.city}`
}

$("#modal-form form").submit((e)=>{
	if (vigiloconfig.getInstance().scope !=="develop"){
		alert("La création n'est autorisée que sur l'environmment de développement.");
		e.preventDefault()	
		return;
	}

	var data={};
	data.version = 1;//vigiloconfig.VERSION;
	data.scope = vigiloconfig.getInstance().scope;
	data.token = "abc";
	data.coordinates_lat = mapmarker.getLatLng().lat;
	data.coordinates_lon = mapmarker.getLatLng().lng;
	data.comment = $("#issue-comment").val();
	data.explanation = "";
	data.categorie = parseInt($("#issue-cat").val());
	data.address = $("#issue-address").val();
	
	if ($("#issue-date").prop("type") == "date"){
		// Browser default (mobile devices)
		data.time = new Date($("#issue-date").val());
	} else {
		// Materializecss picker
		data.time = M.Datepicker.getInstance($("#issue-date")).date
	}
	
	if ($("#issue-time").prop("type") == "time"){
		// Browser default (mobile devices)
		data.time.setHours($("#issue-time").val().split(":")[0])
		data.time.setMinutes($("#issue-time").val().split(":")[1])
	} else {
		// Materializecss picker
		data.time.setHours(M.Timepicker.getInstance($("#issue-time")).hours)
		data.time.setMinutes(M.Timepicker.getInstance($("#issue-time")).minutes)
	}

	data.time = data.time.getTime()

	var modalLoader = M.Modal.getInstance($("#modal-form-loader"))
	modalLoader.open()

	vigilo.createIssue(data)
		.then((createResponse)=>{
			if (createResponse.status != 0){
				throw "error"
			}

			$("#modal-form-loader .determinate").css("width","50%");
			
			return vigilo.addImage(createResponse.token, createResponse.secretid, $("#modal-form input[type=file]").prop('files')[0])
		})
		.then(()=>{
			$("#modal-form-loader .determinate").css("width","100%");
			setTimeout(function(){
				window.location.reload()
			},1000)
		})
		.catch((e)=>{
			$("#modal-form-loader")
				.empty()
				.append('<div class="card-panel teal red">Oups... erreur.<br>'+e+'</div>')
		})

	e.preventDefault();
})