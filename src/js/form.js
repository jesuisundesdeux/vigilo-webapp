import $ from 'jquery';
import L from 'leaflet';
import { geocoder, geocoders } from 'leaflet-control-geocoder';
import 'leaflet.fullscreen'; // registers the fullscreenControl map option
import { locate } from 'leaflet.locatecontrol';
import { addBaseLayers } from './map-layers';
import piexif from 'piexifjs';

import * as vigilo from './vigilo-api';
import * as vigiloconfig from './vigilo-config';
import { initRelatedIssues, setRelatedReference, resetRelatedIssues, selectedRelatedTokens } from './related-issues';
import { distance } from './utils';
import errorCard from '../html/error';
import ImageDrawable from './image-drawable';
import { openPanoramaxCapture } from './panoramax-capture';
import LocalDataManager from './localDataManager';
import dataManager from './dataManager';

import i18next from 'i18next';

// Observation the resolution being written was started from (resolution mode), or null
var resolutionIssue = null;

/** Show the fields of an observation or of a resolution */
function setFormMode(resolution) {
  $("#modal-form .onissueonly").toggle(!resolution);
  $("#modal-form .onresolutiononly").toggle(resolution);
  // hidden fields must not block the browser's validation
  $("#issue-cat, #issue-address").prop("required", !resolution);
}

window.startForm = async function (token) {
  clearForm()
  setFormMode(false);
  var modal = M.Modal.getInstance($("#modal-form")[0]);
  modal.open();
  await initFormMap();

  // "Clear all" only for a new observation
  $("#form-clear").toggle(token === undefined);

  if (token !== undefined) {
    // every observation, even one hidden by the filters (e.g. opened from a link)
    var issues = await vigilo.getIssues();
    var issue = issues.filter(item => item.token == token)[0];

    $("#issue-token").val(token);

    $("input[type='file']").prop("required", false)
    renderImage(issue.img)

    setFormMapPoint([issue.lat_float, issue.lon_float], issue.address);
    setDate(issue.date_obj)
    setTime(issue.date_obj.getHours(), issue.date_obj.getMinutes());

    $("#issue-cat option").filter(function () {
      return $(this).val() == issue.categorie;
    }).prop('selected', true);
    $("#issue-cat").parent().find("input[type='text']").val(i18next.t("category-name-"+issue.categorie));

    $("#issue-comment").val(issue.comment);
    $("#issue-explanation").val(issue.explanation);
    M.updateTextFields()
  }
}

/**
 * Resolution of an observation (button of the observation window): picture, date, comment
 * and the observations it resolves (similar ones offered, see related-issues.js)
 */
window.startResolution = async function (token) {
  var issues = await vigilo.getIssues();
  var issue = issues.find((i) => i.token == token);
  if (issue === undefined) {
    return;
  }
  clearForm();
  resolutionIssue = issue;
  setFormMode(true);
  $("#form-clear").hide();
  var now = new Date();
  setDate(now);
  setTime(now.getHours(), now.getMinutes());
  M.updateTextFields();
  var issueModal = M.Modal.getInstance($("#modal-issue")[0]);
  if (issueModal && issueModal.isOpen) {
    issueModal.close();
  }
  M.Modal.getInstance($("#modal-form")[0]).open();
  await setRelatedReference(issue);
}

function clearForm() {
  resolutionIssue = null;
  $('#modal-form form').trigger("reset");
  // hidden inputs are not reset by the form
  $("#issue-token").val("");
  // A picture is required, from the gallery or from the camera button (see file change handler)
  $("#issue-picture").prop("required", true);
  $("#picture-preview").off(".drawable .drawable-edit").removeClass("drawable fullscreen").empty();
  $("#picture-preview").next().addClass('hide');
  photoLocatePending = false;
  if (mapmarker !== undefined) {
    mapmarker.remove()
  }
  $("#modal-form-loader .determinate").css("width", "10%");

  $("#related-issues").removeClass("invalid");
  resetRelatedIssues();
  if (!WE_ARE_ON_A_MOBILE && M.FormSelect.getInstance($("#issue-cat")[0])) {
    M.FormSelect.init($("#issue-cat"));
  }

  if (!WE_ARE_ON_A_MOBILE) {
    M.Datepicker.init($("#issue-date"), {
      container: 'body',
      firstDay: (i18next.getResourceBundle(i18next.language).datepicker ? i18next.getResourceBundle(i18next.language).datepicker.firstDay : 0),
      format: (i18next.getResourceBundle(i18next.language).datepicker ? i18next.getResourceBundle(i18next.language).datepicker.format : "mmm dd, yyyy"),
      i18n: (i18next.getResourceBundle(i18next.language).datepicker ? i18next.getResourceBundle(i18next.language).datepicker : {}),
      autoClose: true,
      onSelect: (date) => {
        M.Timepicker.getInstance($("#issue-time")).open()
      }
    });
  }
}

// Quality of the uploaded JPEG: 1.0 produced needlessly heavy files for no visible gain,
// and photos are now displayed as is (not only through the backend's panel)
const JPEG_QUALITY = 0.9;

// A photo older than this is not located with the phone's current position (issue #128)
const RECENT_PHOTO_MS = 30 * 60 * 1000;
// Set while geolocating the phone because the photo has no GPS position
var photoLocatePending = false;

/**
 * Does the photo still carry camera metadata (maker, model, shooting date)?
 * If so, a missing GPS position was most likely removed by the phone
 * (Android strips it from photos handed to web pages, issue #128).
 */
function hasCameraMetadata(exifObj) {
  var zeroth = exifObj['0th'] || {};
  var exif = exifObj['Exif'] || {};
  return zeroth[piexif.ImageIFD.Make] !== undefined
    || zeroth[piexif.ImageIFD.Model] !== undefined
    || exif[piexif.ExifIFD.DateTimeOriginal] !== undefined;
}

/**
 * "Clear all" button: empty every field, the picture and the position
 */
$("#form-clear").on("click", async function (e) {
  e.preventDefault();
  if (!window.confirm(i18next.t("form-clear-confirm"))) {
    return;
  }
  clearForm();
  M.updateTextFields();
  if (formmap !== undefined) {
    var scope = await vigilo.getScope();
    formmap.fitBounds(scopeBounds(scope));
  }
})

/**
 * Default view of the instance: center and zoom of the scope (map_center_string, map_zoom),
 * with its bounds as fallback
 */
function scopeView(scope) {
  var center = String(scope.map_center_string || "").split(",").map(parseFloat);
  var zoom = parseInt(scope.map_zoom);
  return {
    center: center.length == 2 && center.every((c) => !isNaN(c)) ? center : null,
    zoom: isNaN(zoom) ? null : zoom,
    bounds: scopeBounds(scope)
  };
}

function scopeBounds(scope) {
  return [
    [parseFloat(scope.coordinate_lat_min), parseFloat(scope.coordinate_lon_min)],
    [parseFloat(scope.coordinate_lat_max), parseFloat(scope.coordinate_lon_max)]
  ];
}

/**
 * Picture taken from a nearby Panoramax view: around the observation's position
 * if it is already set, else around the device's position
 */
$("#panoramax-picture").on("click", async function (e) {
  e.preventDefault();
  var scope = await vigilo.getScope();
  var located = formmap !== undefined && formmap.hasLayer(mapmarker);
  var location = resolutionIssue ? [resolutionIssue.lat_float, resolutionIssue.lon_float]
    : located ? [mapmarker.getLatLng().lat, mapmarker.getLatLng().lng] : null;
  openPanoramaxCapture(location, scopeView(scope), (dataUrl, picture, searchLocation) => {
    $("#issue-picture").prop("required", false);
    $("#modal-form .file-path").val(i18next.t("panoramax-capture-file"));
    renderImage(dataUrl);
    if (!resolutionIssue && (formmap === undefined || !formmap.hasLayer(mapmarker))) {
      setFormMapPoint(searchLocation || [picture.lat, picture.lon]);
    }
    // date and time of the Panoramax picture (now if unknown)
    var date = picture.datetime && !isNaN(picture.datetime.getTime()) ? picture.datetime : new Date();
    setDate(date);
    setTime(date.getHours(), date.getMinutes());
    M.updateTextFields();
  });
})

function longToast(key, options) {
  M.toast({ html: i18next.t(key, options), displayLength: 8000 });
}

/**
 * On file change, load image, read date, time and position and generate a rotated image
 */
$("#modal-form input[type=file]").change(function () {
  if (this.files && this.files[0]) {
    // Taken right now with the camera button: the phone's position is the photo's position
    loadPicture(this.files[0], this.hasAttribute("capture"), this.id != "issue-picture");
  }
})

/**
 * Paste an image from the clipboard into the form (issue #26), e.g. a photo
 * copied from an image editor. Text pastes are left untouched.
 */
$(document).on("paste", function (event) {
  if (!$("#modal-form").hasClass("open")) {
    return;
  }
  var clipboard = event.originalEvent.clipboardData;
  var image = clipboard ? Array.from(clipboard.files || []).find((f) => f.type.indexOf("image/") == 0) : undefined;
  if (image === undefined) {
    return;
  }
  event.preventDefault();
  $("#modal-form .file-path").val(i18next.t("pasted-image"));
  loadPicture(image, false, true);
})

/**
 * Load a picture (file input, camera or clipboard): preview, date/time and position
 * from EXIF, or a fallback explained to the user.
 * notFromMainInput: the required gallery input stays empty, so it must not block submission.
 */
function loadPicture(file, fromCamera, notFromMainInput) {
  if (notFromMainInput) {
    $("#issue-picture").prop("required", false);
  }
  var reader = new FileReader();
  reader.onload = function (e) {

    // Render image preview
    renderImage(e.target.result);

    // Read Exif
    var located = false
    var timestamp = false;
    var photoDate = null;
    var exifObj = {};
    try {
      exifObj = piexif.load(e.target.result);
    } catch (err) {
      // Not a JPEG (PNG, HEIC...) or unreadable EXIF: fallback to geolocation and current time
      console.warn("Unable to read EXIF data", err);
    }
    if (exifObj.GPS != undefined && exifObj.GPS[piexif.GPSIFD.GPSLatitude] !== undefined && exifObj.GPS[piexif.GPSIFD.GPSLongitude] !== undefined) {
      // GPS available : position, date & time
      // Position
      var lat = piexif.GPSHelper.dmsRationalToDeg(exifObj.GPS[piexif.GPSIFD.GPSLatitude], exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef])
      var lon = piexif.GPSHelper.dmsRationalToDeg(exifObj.GPS[piexif.GPSIFD.GPSLongitude], exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef])
      setFormMapPoint([lat, lon])
      located = true;
      if (exifObj.GPS[piexif.GPSIFD.GPSDateStamp] !== undefined && exifObj.GPS[piexif.GPSIFD.GPSTimeStamp] !== undefined) {
        // Date
        var date = new Date(exifObj.GPS[piexif.GPSIFD.GPSDateStamp].split(':').join('-'));
        // Time
        var hours = exifObj.GPS[piexif.GPSIFD.GPSTimeStamp][0][0] / exifObj.GPS[piexif.GPSIFD.GPSTimeStamp][0][1];
        var minutes = exifObj.GPS[piexif.GPSIFD.GPSTimeStamp][1][0] / exifObj.GPS[piexif.GPSIFD.GPSTimeStamp][1][1];
        date.setUTCHours(hours)
        date.setUTCMinutes(minutes)
        if (!isNaN(date.getTime())) {
          setDate(date)
          setTime(date.getHours(), date.getMinutes())
          timestamp = true;
          photoDate = date;
        }
      }
    }
    if (!timestamp && exifObj['Exif'] !== undefined && exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] !== undefined) {
      // No GPS timestamp : date & time ? (format "YYYY:MM:DD HH:MM:SS")
      var datetime = String(exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal]).split(" ")
      var date = new Date((datetime[0] || "").split(":").join("-"))
      var hm = (datetime[1] || "").split(":")
      date.setHours(hm[0])
      date.setMinutes(hm[1])
      if (!isNaN(date.getTime())) {
        setDate(date)
        setTime(date.getHours(), date.getMinutes())
        timestamp = true;
        photoDate = date;
      }
    }

    if (!located && !resolutionIssue) {
      // No GPS position in the photo: the phone's current position is only
      // relevant if the photo was just taken (issue #128)
      var recent = fromCamera || (photoDate !== null && Math.abs(Date.now() - photoDate.getTime()) < RECENT_PHOTO_MS);
      if (recent) {
        photoLocatePending = true;
        formmap.locate({ enableHighAccuracy: true });
      } else if (hasCameraMetadata(exifObj)) {
        longToast("photo-location-removed");
      } else {
        longToast("photo-no-location");
      }
    }

    if (!timestamp) {
      // Use current time
      var now = new Date();
      setDate(now)
      setTime(now.getHours(), now.getMinutes())
    }


  }
  reader.readAsDataURL(file);
}

function renderImage(src) {
  var image = new Image();
  image.crossOrigin = "Anonymous";
  image.onload = function () {
    var orientation = 0;

    if (typeof src != "string") {
      try {
        var exifObj = piexif.load(src);
        if (exifObj["0th"] !== undefined && exifObj["0th"][piexif.ImageIFD.Orientation] !== undefined) {
          orientation = exifObj["0th"][piexif.ImageIFD.Orientation];
        }
      } catch {}
    }

    var canvas = document.createElement("canvas");

    var sx = vigiloconfig.IMAGE_MAX_SIZE / image.width;
    var sy = vigiloconfig.IMAGE_MAX_SIZE / image.height;
    var scale = Math.min(sx, sy);


    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    // read back by the picture editor (undo history)
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var x = 0;
    var y = 0;
    ctx.save();
    if (orientation == 2) {
      x = -canvas.width;
      ctx.scale(-scale, scale);
    } else if (orientation == 3) {
      x = -canvas.width;
      y = -canvas.height;
      ctx.scale(-scale, -scale);
    } else if (orientation == 4) {
      y = -canvas.height;
      ctx.scale(scale, -scale);
    } else if (orientation == 5) {
      canvas.width = image.height * scale;
      canvas.height = image.width * scale;
      ctx.translate(canvas.width, canvas.height / canvas.width);
      ctx.rotate(Math.PI / 2);
      y = -canvas.width;
      ctx.scale(scale, -scale);
    } else if (orientation == 6) {
      canvas.width = image.height * scale;
      canvas.height = image.width * scale;
      ctx.translate(canvas.width, canvas.height / canvas.width);
      ctx.rotate(Math.PI / 2);
    } else if (orientation == 7) {
      canvas.width = image.height * scale;
      canvas.height = image.width * scale;
      ctx.translate(canvas.width, canvas.height / canvas.width);
      ctx.rotate(Math.PI / 2);
      x = -canvas.height;
      ctx.scale(-scale, scale);
    } else if (orientation == 8) {
      canvas.width = image.height * scale;
      canvas.height = image.width * scale;
      ctx.translate(canvas.width, canvas.height / canvas.width);
      ctx.rotate(Math.PI / 2);
      x = -canvas.height;
      y = -canvas.width;
      ctx.scale(-scale, -scale);
    }
    ctx.drawImage(image, 0, 0, image.width, image.height, x, y, canvas.width, canvas.height);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);


    $("#picture-preview").empty().append(canvas);
    $("#picture-preview").next().removeClass('hide');
    ImageDrawable($("#picture-preview"))


  }
  image.src = src;
}

var formmap, mapmarker;
async function initFormMap() {
  if (formmap !== undefined) {
    formmap.invalidateSize()
    return;
  }

  var scope = await vigilo.getScope();

  formmap = L.map('form-map', {
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: 'topleft'
    }
  }).setView([43.605413, 3.879568], 11);

  formmap.fitBounds([
    [
      parseFloat(scope.coordinate_lat_min),
      parseFloat(scope.coordinate_lon_min)
    ], [
      parseFloat(scope.coordinate_lat_max),
      parseFloat(scope.coordinate_lon_max)
    ]
  ]);

  addBaseLayers(formmap);

  mapmarker = L.marker([0, 0], {
    draggable: true,
    autoPan: true
  }).on('dragend', (e) => {
    setFormMapPoint(mapmarker.getLatLng())
  })

  formmap.on('click locationfound', (e) => { setFormMapPoint(e.latlng) })
  formmap.on('locationfound', (e) => {
    if (photoLocatePending) {
      photoLocatePending = false;
      longToast("photo-location-estimated", { accuracy: Math.round(e.accuracy) });
    }
  })
  formmap.on('locationerror', () => {
    if (photoLocatePending) {
      photoLocatePending = false;
      longToast("geolocation-failed");
    }
  })

  formmap.geocoderCtrl = geocoder({
    position: 'topright',
    defaultMarkGeocode: false,
    // Only suggest addresses inside the instance's zone (otherwise homonymous streets
    // from anywhere in the world are proposed, see issue #121)
    geocoder: geocoders.nominatim({
      geocodingQueryParams: {
        viewbox: [scope.coordinate_lon_min, scope.coordinate_lat_min, scope.coordinate_lon_max, scope.coordinate_lat_max].join(','),
        bounded: 1
      }
    })
  }).on('markgeocode', function (e) {
    setFormMapPoint(e.geocode.center, e.geocode)
  }).addTo(formmap)

  locate({
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
    if (!formmap.hasLayer(mapmarker)) {
      formmap.geocoderCtrl._input.value = $("#issue-address").val()
      formmap.geocoderCtrl._geocode()
    }
  });
}



async function setFormMapPoint(latlng, address) {
  // a resolution has no position of its own
  if (formmap === undefined || resolutionIssue) {
    return
  }
  var scope = await vigilo.getScope();
  var bounds_scope = L.latLngBounds([scope.coordinate_lat_min, scope.coordinate_lon_min], [scope.coordinate_lat_max, scope.coordinate_lon_max])

  if (!bounds_scope.contains(latlng)) {
    // Outside !
    alert("La localisation doit se trouver dans la zone géographique choisie.");
    return
  }

  formmap.setView(latlng, 18);
  mapmarker.setLatLng(latlng).addTo(formmap)
  if (address !== undefined) {
    $("#issue-address").val(addressFormat(address))
    M.updateTextFields();
  } else {
    //Reversegeocoding
    formmap.geocoderCtrl.options.geocoder.reverse(mapmarker.getLatLng(), formmap.options.crs.scale(formmap.getZoom())).then(function (result) {
      if (result.length > 0) {
        $("#issue-address").val(addressFormat(result[0]))
        M.updateTextFields();
      }
    })
  }
}



function addressFormat(address) {
  if (typeof address == "object") {
    return `${address.properties.address.road || address.properties.address.pedestrian || address.properties.address.footway || ''}, ${address.properties.address.village || address.properties.address.town || address.properties.address.city}`
  }
  return address
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


  var data = {};
  data.token = $("#issue-token").val();
  data.comment = $("#issue-comment").val();
  data.version = vigiloconfig.VERSION;
  data.time = getDate()
  var time = getTime()
  if (!(data.time instanceof Date) || isNaN(data.time.getTime())) {
    M.toast({html: i18next.t('date-required'), classes: "red"})
    e.preventDefault();
    return
  }
  data.time.setHours(time[0])
  data.time.setMinutes(time[1])
  data.time = data.time.getTime()

  var isResolution = resolutionIssue !== null;
  var resolvedToken = isResolution ? resolutionIssue.token : null;

  if (isResolution){
    data.tokenlist = selectedRelatedTokens().join(',');
    if (data.tokenlist.length == 0){
      M.toast({html: i18next.t('solved-reports-required'), classes: "red"})
      $("#related-issues").addClass("invalid");
      e.preventDefault();
      return
    }
  } else {
    if (!formmap || !formmap.hasLayer(mapmarker)) {
      M.toast({html: i18next.t('location-required'), classes: "red"})
      e.preventDefault();
      return
    }
    data.scope = vigiloconfig.getInstance().scope;
    data.coordinates_lat = mapmarker.getLatLng().lat;
    data.coordinates_lon = mapmarker.getLatLng().lng;
    data.explanation = $("#issue-explanation").val();
    data.categorie = parseInt($("#issue-cat").val());
    data.address = $("#issue-address").val();
  }
  $("#related-issues").removeClass("invalid");
  var modalLoader = M.Modal.getInstance($("#modal-form-loader"))
  modalLoader.open()

  var key;
  if (LocalDataManager.isAdmin()) {
    key = LocalDataManager.getAdminKey();
  }

  var firstStep;

  if (isResolution){
    firstStep = vigilo.createResolution(data);
  } else {
    firstStep = vigilo.createIssue(data, key);
  }
  
  var createdToken = null;
  firstStep
    .then((createResponse) => {
      if (createResponse.status != 0 && createResponse.token == undefined) {
        throw (createResponse.error || createResponse.message || JSON.stringify(createResponse))
      }

      // Store secretId
      if (key === undefined) {
        LocalDataManager.setTokenSecretId(createResponse.token, createResponse.secretid);
      }

      createdToken = createResponse.token;
      $("#modal-form-loader .determinate").css("width", "50%");
      var jpegb64 = $("#picture-preview canvas")[0].toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1];
      // the moderator key lets the photo of an approved observation be replaced
      return vigilo.addImage(createResponse.token, createResponse.secretid, jpegb64, isResolution, key)
    })
    .then(() => {
      $("#modal-form-loader .determinate").css("width", "100%");
      // Open the observation just posted (the URL may still carry the token of the
      // observation viewed before)
      var url = new URL(window.location.href);
      url.searchParams.delete('token');
      if (isResolution) {
        // back to the resolved observation
        url.searchParams.set('token', resolvedToken);
      } else if (createdToken) {
        url.searchParams.set('token', createdToken);
      }
      setTimeout(function () {
        if (url.href == window.location.href) {
          window.location.reload()
        } else {
          window.location.href = url.href
        }
      }, 1000)
    })
    .catch((e) => {
      // Show the error and let the user go back to the form to fix it (issue #86)
      $("#modal-form-loader .form-error").remove();
      $("#modal-form-loader .modal-content").append(
        $('<div class="form-error"></div>')
          .append(errorCard(e))
          .append($('<a class="btn waves-effect waves-light"></a>')
            .text(i18next.t("back-to-form"))
            .on('click', () => {
              $("#modal-form-loader .form-error").remove();
              $("#modal-form-loader .determinate").css("width", "10%");
              M.Modal.getInstance($("#modal-form-loader")).close();
            })))
    })

  e.preventDefault();
})



export async function init() {
  try {
    // Fill category select
    var cats = await vigiloconfig.getCategories();
    for (var i in cats) {
      if (cats[i].disable == false || LocalDataManager.isAdmin()) {
        $("#issue-cat").append(`<option data-i18n="category-name-${i}" value="${i}">${i18next.t("category-name-"+i)}</option>`)
      }
    }

    initRelatedIssues();
    M.Modal.init($("#modal-form"));
    M.Modal.init($("#modal-form-loader"))

    if (!WE_ARE_ON_A_MOBILE) {
      M.Timepicker.init($("#issue-time"), {
        container: 'body',
        autoClose: true,
        twelveHour: false,
        i18n: {
          'cancel': i18next.t("cancel"),
          'done': i18next.t("ok")
        },
        onCloseEnd: () => {
          $("#issue-cat").focus()
        }
      });
      M.FormSelect.init($("#issue-cat"))
      $(".paste-hint").removeClass('hide')
    } else {
      // Use browser default inputs on mobile
      $(".camera-capture").removeClass('hide')
      $("#issue-cat").addClass('browser-default')
      $("#issue-date").attr('type', 'date');
      $("#issue-time").attr('type', 'time');
    }

  } catch (e) {
    $("#issues .cards-container").empty().append(errorCard(e));
  }
}
