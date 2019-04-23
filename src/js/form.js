import $ from 'jquery';
import L from 'leaflet';
import 'leaflet-control-geocoder';
import 'leaflet.fullscreen';
import 'leaflet.locatecontrol';

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
	return `${address.properties.address.road || ''}, ${address.properties.address.city}`
}

$("#modal-form form").submit((e)=>{
	e.preventDefault()
})