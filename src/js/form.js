import $ from 'jquery';
import L from 'leaflet';
import 'leaflet-control-geocoder';
import 'leaflet.fullscreen';
import 'leaflet.locatecontrol';
import piexif from 'piexifjs';

import * as vigilo from './vigilo-api';
import * as vigiloconfig from './vigilo-config';
import * as vigiloui from './ui-template';

window.startForm = function () {
	clearForm()
	var modal = M.Modal.getInstance($("#modal-form")[0]);
	modal.open();
	initFormMap();
}

function clearForm() {
	$('#modal-form form').trigger("reset");
	if (mapmarker !== undefined) {
		mapmarker.remove()
	}
	$("#modal-form-loader .determinate").css("width", "10%");
}

/**
 * On file change, load image, read date, time and position and generate a rotated image
 */
$("#modal-form input[type=file]").change(function () {
	var input = this;
	if (input.files && input.files[0]) {
		var reader = new FileReader();
		reader.onload = function (e) {

			// Read Exif
			var located = false
			var timestamp = false;
			var exifObj = piexif.load(e.target.result);
			if (exifObj.GPS != undefined && exifObj.GPS[piexif.GPSIFD.GPSLatitude] !== undefined) {
				// GPS available : position, date & time
				// Position
				var lat = piexif.GPSHelper.dmsRationalToDeg(exifObj.GPS[piexif.GPSIFD.GPSLatitude], exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef])
				var lon = piexif.GPSHelper.dmsRationalToDeg(exifObj.GPS[piexif.GPSIFD.GPSLongitude], exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef])
				setFormMapPoint([lat, lon])
				// Date
				var date = new Date(exifObj.GPS[piexif.GPSIFD.GPSDateStamp].split(':').join('-'));
				// Time
				var hours = exifObj.GPS[piexif.GPSIFD.GPSTimeStamp][0][0] / exifObj.GPS[piexif.GPSIFD.GPSTimeStamp][0][1];
				var minutes = exifObj.GPS[piexif.GPSIFD.GPSTimeStamp][1][0] / exifObj.GPS[piexif.GPSIFD.GPSTimeStamp][1][1];
				date.setUTCHours(hours)
				date.setUTCMinutes(minutes)
				setDate(date)
				setTime(date.getHours(), date.getMinutes())
				located = true;
				timestamp = true;
			} else if (exifObj['0th'] !== undefined && exifObj['0th'][piexif.ImageIFD.DateTime] !== undefined) {
				// No GPS : date & time ?
				var datetime = exifObj['0th'][piexif.ImageIFD.DateTime]
				var date = new Date(datetime.split(" ")[0].split(":").join("-"))
				date.setHours(datetime.split(" ")[1].split(":")[0])
				date.setMinutes(datetime.split(" ")[1].split(":")[1])
				setDate(date)
				setTime(date.getHours(), date.getMinutes())
				timestamp = true;
			}

			if (!located) {
				// geolocate and add point
				formmap.locate();
			}

			if (!timestamp) {
				// Use current time
				var now = new Date();
				setDate(now)
				setTime(now.getHours(), now.getMinutes())
			}

			// Rotation
			var image = new Image();
			image.onload = function () {
				var orientation = 0;
				if (exifObj["0th"] !== undefined && exifObj["0th"][piexif.ImageIFD.Orientation] !== undefined) {
					orientation = exifObj["0th"][piexif.ImageIFD.Orientation];
				}

				var canvas = document.createElement("canvas");
				canvas.width = image.width;
				canvas.height = image.height;
				var ctx = canvas.getContext("2d");
				var x = 0;
				var y = 0;
				ctx.save();
				if (orientation == 2) {
					x = -canvas.width;
					ctx.scale(-1, 1);
				} else if (orientation == 3) {
					x = -canvas.width;
					y = -canvas.height;
					ctx.scale(-1, -1);
				} else if (orientation == 3) {
					x = -canvas.width;
					y = -canvas.height;
					ctx.scale(-1, -1);
				} else if (orientation == 4) {
					y = -canvas.height;
					ctx.scale(1, -1);
				} else if (orientation == 5) {
					canvas.width = image.height;
					canvas.height = image.width;
					ctx.translate(canvas.width, canvas.height / canvas.width);
					ctx.rotate(Math.PI / 2);
					y = -canvas.width;
					ctx.scale(1, -1);
				} else if (orientation == 6) {
					canvas.width = image.height;
					canvas.height = image.width;
					ctx.translate(canvas.width, canvas.height / canvas.width);
					ctx.rotate(Math.PI / 2);
				} else if (orientation == 7) {
					canvas.width = image.height;
					canvas.height = image.width;
					ctx.translate(canvas.width, canvas.height / canvas.width);
					ctx.rotate(Math.PI / 2);
					x = -canvas.height;
					ctx.scale(-1, 1);
				} else if (orientation == 8) {
					canvas.width = image.height;
					canvas.height = image.width;
					ctx.translate(canvas.width, canvas.height / canvas.width);
					ctx.rotate(Math.PI / 2);
					x = -canvas.height;
					y = -canvas.width;
					ctx.scale(-1, -1);
				}
				ctx.drawImage(image, x, y);
				ctx.restore();


				$("#picture-preview").empty().append(canvas);


			}
			image.src = e.target.result;

		}
		reader.readAsDataURL(input.files[0]);
	}
})

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
		"Carte": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>',
			subdomains: 'abcd',
			minZoom: 0,
			maxZoom: 20,
			ext: 'png'
		}).addTo(formmap),
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
		),
	};

	L.control.layers(baseLayers, {}).addTo(formmap);

	mapmarker = L.marker([0, 0], {
		draggable: true,
		autoPan: true
	}).on('dragend', (e) => {
		setFormMapPoint(mapmarker.getLatLng())
	})

	formmap.on('click locationfound', (e) => { setFormMapPoint(e.latlng) })

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

	$("#issue-address").change(() => {
		if (mapmarker.getLatLng().lat == 0 && mapmarker.getLatLng().lng == 0) {
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
		formmap.geocoderCtrl.options.geocoder.reverse(mapmarker.getLatLng(), 1, function (result) {
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

function getDate() {
	if ($("#issue-date").prop("type") == "date") {
		// Browser default (mobile devices)
		return new Date($("#issue-date").val());
	} else {
		// Materializecss picker
		return M.Datepicker.getInstance($("#issue-date")).date;
	}
}
function getTime() {
	if ($("#issue-time").prop("type") == "time") {
		// Browser default (mobile devices)
		return $("#issue-time").val().split(":");
	} else {
		// Materializecss picker
		return [M.Timepicker.getInstance($("#issue-time")).hours,
		M.Timepicker.getInstance($("#issue-time")).minutes]
	}

}
function setDate(date) {
	if ($("#issue-date").prop("type") == "date") {
		// Browser default (mobile devices)
		$("#issue-date").val(date.getFullYear() + "-" + String("0" + (date.getMonth() + 1)).slice(-2) + "-" + String("0" + (date.getDate())).slice(-2));
	} else {
		// Materializecss picker
		M.Datepicker.getInstance($("#issue-date")).setDate(date, true);
		M.Datepicker.getInstance($("#issue-date")).setInputValue();
	}

}
function setTime(hours, minutes) {
	if ($("#issue-time").prop("type") == "time") {
		// Browser default (mobile devices)
		$("#issue-time").val(String("0" + hours).slice(-2) + ":" + String("0" + minutes).slice(-2));
	} else {
		// Materializecss picker
		M.Timepicker.getInstance($("#issue-time")).hours = hours;
		M.Timepicker.getInstance($("#issue-time")).minutes = minutes;
		M.Timepicker.getInstance($("#issue-time")).done()
	}
}


/**
 * On submit, prepare data and send
 */
$("#modal-form form").submit((e) => {
	/*if (vigiloconfig.getInstance().scope !== "develop") {
		alert("La création n'est autorisée que sur l'environmment de développement.");
		e.preventDefault()
		return;
	}*/

	var data = {};
	data.version = 1;//vigiloconfig.VERSION;
	data.scope = vigiloconfig.getInstance().scope;
	data.token = "abc";
	data.coordinates_lat = mapmarker.getLatLng().lat;
	data.coordinates_lon = mapmarker.getLatLng().lng;
	data.comment = $("#issue-comment").val();
	data.explanation = $("#issue-explanation").val();
	data.categorie = parseInt($("#issue-cat").val());
	data.address = $("#issue-address").val();

	data.time = getDate()
	var time = getTime()
	data.time.setHours(time[0])
	data.time.setMinutes(time[1])
	data.time = data.time.getTime()

	var modalLoader = M.Modal.getInstance($("#modal-form-loader"))
	modalLoader.open()

	vigilo.createIssue(data)
		.then((createResponse) => {
			if (createResponse.status != 0) {
				throw "error"
			}

			$("#modal-form-loader .determinate").css("width", "50%");
			var dataURL = $("#picture-preview canvas")[0].toDataURL("image/jpeg", 1.0);
			var jpegBinary = atob(dataURL.split(",")[1]);
			var array = [];
			for (var p = 0; p < jpegBinary.length; p++) {
				array[p] = jpegBinary.charCodeAt(p);
			}
			var u8array = new Uint8Array(array);
			return vigilo.addImage(createResponse.token, createResponse.secretid, u8array.buffer)
		})
		.then(() => {
			$("#modal-form-loader .determinate").css("width", "100%");
			setTimeout(function () {
				window.location.reload()
			}, 1000)
		})
		.catch((e) => {
			$("#modal-form-loader")
				.empty()
				.append(vigiloui.errorCard(e))
		})

	e.preventDefault();
})


export async function init() {
	try {
		// Fill category select
		var cats = await vigiloconfig.getCategories();
		for (var i in cats) {
			$("#issue-cat").append(`<option value="${i}">${cats[i]}</option>`)
		}

		M.Modal.init($("#modal-form"));
		M.Modal.init($("#modal-form-loader"))

		if (!WE_ARE_ON_A_MOBILE) {
			M.Datepicker.init($("#issue-date"), {
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
				onSelect: (date) => {
					M.Timepicker.getInstance($("#issue-time")).open()
				}
			});
			M.Timepicker.init($("#issue-time"), {
				container: 'body',
				autoClose: true,
				twelveHour: false,
				i18n: {
					'cancel': 'Annuler',
					'done': 'ok'
				},
				onCloseEnd: () => {
					$("#issue-cat").focus()
				}
			});
			M.FormSelect.init($("#issue-cat"))
		} else {
			// Use browser default inputs on mobile
			$("#issue-cat").addClass('browser-default')
			$("#issue-date").attr('type', 'date');
			$("#issue-time").attr('type', 'time');
		}

	} catch (e) {
		$("#issues .cards-container").empty().append(vigiloui.errorCard(e));
	}
}