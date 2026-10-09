/**
 * Take the picture of an observation from a Panoramax view (form, "Panoramax" button):
 * location, nearby pictures on a map, navigation in their sequence, framing
 * (drag, zoom) and capture with the credits written on the picture.
 * 360° pictures (equirectangular) are reprojected in a canvas, flat ones are cropped.
 */
import $ from 'jquery';
import L from 'leaflet';
import M from '@materializecss/materialize';
import i18next from 'i18next';
import { addBaseLayers } from './map-layers';
import { findPicturesAround, fetchPicture } from './panoramax';
import { IMAGE_MAX_SIZE } from './vigilo-config';

// Captured picture: 4:3, IMAGE_MAX_SIZE wide at most
const ASPECT = 4 / 3;
const PREVIEW_MAX_WIDTH = 960;
// 360° pictures: horizontal field of view, in degrees
const FOV_DEFAULT = 75;
const FOV_MIN = 20;
const FOV_MAX = 110;
const PITCH_MAX = 85;
// Flat pictures: maximum zoom in the largest 4:3 frame
const ZOOM_MAX = 4;

var modal, canvas, ctx, map, picturesLayer, viewLayer, locationMarker;
var state = {
	location: null,     // [lat, lon] where pictures are looked for
	pictures: [],
	picture: null,      // current picture (see pictureFromItem)
	image: null,        // its SD image
	pixels: null,       // ImageData of the SD image (360° pictures)
	view: null,         // 360°: {yaw, pitch, fov} in degrees; flat: {cx, cy, zoom}
	onCapture: null,
	bounds: null,
	loadId: 0
};
var dirty = false;
var pointers = {};

function loadImage(url) {
	return new Promise((resolve, reject) => {
		var image = new Image();
		// required to read the pixels (Panoramax serves its pictures with CORS)
		image.crossOrigin = "anonymous";
		image.onload = () => resolve(image);
		image.onerror = reject;
		image.src = url;
	});
}

function imagePixels(image) {
	var c = document.createElement("canvas");
	c.width = image.naturalWidth;
	c.height = image.naturalHeight;
	var cx = c.getContext("2d");
	cx.drawImage(image, 0, 0);
	// throws a SecurityError if the server does not allow it (no CORS)
	return cx.getImageData(0, 0, c.width, c.height);
}

function setStatus(key, options) {
	var status = modal.find(".pnx-status");
	if (key) {
		status.text(i18next.t(key, options)).show();
	} else {
		status.hide();
	}
}

// ---- Rendering

/**
 * Perspective view of an equirectangular picture: yaw/pitch/fov in degrees,
 * yaw 0 being the center of the panorama (the picture's azimuth).
 */
function renderEquirect(src, out, view, bilinear) {
	var W = src.width, H = src.height, sd = src.data, od = out.data;
	var w = out.width, h = out.height;
	var t = Math.tan(view.fov * Math.PI / 360);
	var yaw = view.yaw * Math.PI / 180, pitch = view.pitch * Math.PI / 180;
	var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
	var o = 0;
	for (var j = 0; j < h; j++) {
		var y = (1 - 2 * (j + 0.5) / h) * t * h / w;
		var y1 = y * cp + sp;
		var z1 = -y * sp + cp;
		for (var i = 0; i < w; i++) {
			var x = (2 * (i + 0.5) / w - 1) * t;
			var x2 = x * cy + z1 * sy;
			var z2 = -x * sy + z1 * cy;
			var u = (Math.atan2(x2, z2) / (2 * Math.PI) + 0.5) * W - 0.5;
			var v = (0.5 - Math.atan2(y1, Math.sqrt(x2 * x2 + z2 * z2)) / Math.PI) * H - 0.5;
			if (v < 0) v = 0;
			if (v > H - 1) v = H - 1;
			if (bilinear) {
				var u0 = Math.floor(u), v0 = Math.floor(v);
				var fu = u - u0, fv = v - v0;
				var ua = ((u0 % W) + W) % W, ub = (ua + 1) % W;
				var vb = v0 + 1 < H ? v0 + 1 : v0;
				var p00 = (v0 * W + ua) * 4, p10 = (v0 * W + ub) * 4, p01 = (vb * W + ua) * 4, p11 = (vb * W + ub) * 4;
				for (var k = 0; k < 3; k++) {
					var top = sd[p00 + k] + (sd[p10 + k] - sd[p00 + k]) * fu;
					var bottom = sd[p01 + k] + (sd[p11 + k] - sd[p01 + k]) * fu;
					od[o + k] = top + (bottom - top) * fv;
				}
			} else {
				var ui = ((Math.round(u) % W) + W) % W;
				var p = (Math.round(v) * W + ui) * 4;
				od[o] = sd[p];
				od[o + 1] = sd[p + 1];
				od[o + 2] = sd[p + 2];
			}
			od[o + 3] = 255;
			o += 4;
		}
	}
}

/** Flat picture: source rectangle (in pixels of the given image) of the current frame */
function flatRegion(image, view) {
	var W = image.naturalWidth, H = image.naturalHeight;
	var bw = Math.min(W, H * ASPECT), bh = bw / ASPECT;
	var sw = bw / view.zoom, sh = bh / view.zoom;
	return { sx: view.cx * W - sw / 2, sy: view.cy * H - sh / 2, sw: sw, sh: sh };
}

function clampView() {
	var view = state.view;
	if (state.picture.is360) {
		view.fov = Math.min(FOV_MAX, Math.max(FOV_MIN, view.fov));
		view.pitch = Math.min(PITCH_MAX, Math.max(-PITCH_MAX, view.pitch));
		view.yaw = ((view.yaw + 540) % 360) - 180;
	} else {
		view.zoom = Math.min(ZOOM_MAX, Math.max(1, view.zoom));
		var W = state.image.naturalWidth, H = state.image.naturalHeight;
		var r = flatRegion(state.image, view);
		var hw = r.sw / 2 / W, hh = r.sh / 2 / H;
		view.cx = Math.min(1 - hw, Math.max(hw, view.cx));
		view.cy = Math.min(1 - hh, Math.max(hh, view.cy));
	}
}

function draw() {
	dirty = false;
	if (!state.image) {
		return;
	}
	if (state.picture.is360) {
		var out = ctx.createImageData(canvas.width, canvas.height);
		renderEquirect(state.pixels, out, state.view, false);
		ctx.putImageData(out, 0, 0);
	} else {
		var r = flatRegion(state.image, state.view);
		ctx.drawImage(state.image, r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);
	}
	drawViewDirection();
}

function redraw() {
	if (!dirty) {
		dirty = true;
		requestAnimationFrame(draw);
	}
}

function resizeCanvas() {
	var width = Math.min(PREVIEW_MAX_WIDTH, Math.round($(canvas).width() * (window.devicePixelRatio || 1)));
	if (width > 0 && width != canvas.width) {
		canvas.width = width;
		canvas.height = Math.round(width / ASPECT);
	}
	redraw();
}

// ---- Framing (drag, pinch, wheel, buttons)

function pan(dx, dy) {
	var view = state.view;
	var w = $(canvas).width(), h = $(canvas).height();
	if (state.picture.is360) {
		var vfov = 2 * Math.atan(Math.tan(view.fov * Math.PI / 360) / ASPECT) * 180 / Math.PI;
		view.yaw -= dx * view.fov / w;
		view.pitch += dy * vfov / h;
	} else {
		var r = flatRegion(state.image, view);
		view.cx -= dx / w * r.sw / state.image.naturalWidth;
		view.cy -= dy / h * r.sh / state.image.naturalHeight;
	}
	clampView();
	redraw();
}

function zoom(factor) {
	if (!state.image) {
		return;
	}
	if (state.picture.is360) {
		state.view.fov /= factor;
	} else {
		state.view.zoom *= factor;
	}
	clampView();
	redraw();
}

function pinchDistance() {
	var p = Object.values(pointers);
	return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
}

function initInteractions() {
	$(canvas).on("pointerdown", (e) => {
		canvas.setPointerCapture(e.pointerId);
		pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
	}).on("pointermove", (e) => {
		var previous = pointers[e.pointerId];
		if (!previous || !state.image) {
			return;
		}
		var count = Object.keys(pointers).length;
		var before = count == 2 ? pinchDistance() : 0;
		pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
		if (count == 1) {
			pan(e.clientX - previous.x, e.clientY - previous.y);
		} else if (count == 2 && before > 0) {
			zoom(pinchDistance() / before);
		}
	}).on("pointerup pointercancel", (e) => {
		delete pointers[e.pointerId];
	}).on("wheel", (e) => {
		e.preventDefault();
		zoom(e.originalEvent.deltaY < 0 ? 1.15 : 1 / 1.15);
	});
	modal.find(".pnx-zoom-in").on("click", () => zoom(1.4));
	modal.find(".pnx-zoom-out").on("click", () => zoom(1 / 1.4));
	modal.find(".pnx-prev").on("click", () => goSequence("prev"));
	modal.find(".pnx-next").on("click", () => goSequence("next"));
	modal.find(".pnx-capture").on("click", capture);
	$(window).on("resize", () => { if (modal.hasClass("open")) resizeCanvas(); });
}

// ---- Map of the pictures around

function viewHeading() {
	var p = state.picture;
	// the view of the previous picture is kept until the new one is loaded
	return p.is360 && state.image ? p.azimuth + state.view.yaw : p.azimuth;
}

function drawViewDirection() {
	if (!map || !state.picture) {
		return;
	}
	var p = state.picture;
	var heading = viewHeading() * Math.PI / 180;
	var d = 0.00025; // ~25 m
	var end = [p.lat + d * Math.cos(heading), p.lon + d * Math.sin(heading) / Math.cos(p.lat * Math.PI / 180)];
	viewLayer.clearLayers();
	L.polyline([[p.lat, p.lon], end], { color: "#e53935", weight: 4, interactive: false }).addTo(viewLayer);
	L.circleMarker([p.lat, p.lon], { radius: 8, color: "#fff", weight: 2, fillColor: "#e53935", fillOpacity: 1, interactive: false }).addTo(viewLayer);
}

function addPictureMarker(picture) {
	L.circleMarker([picture.lat, picture.lon], {
		radius: 6, color: "#1f2328", weight: 1, fillColor: "#fdd835", fillOpacity: 0.95
	}).on("click", (e) => {
		L.DomEvent.stopPropagation(e);
		showPicture(picture);
	}).addTo(picturesLayer);
}

function initMap() {
	map = L.map(modal.find(".pnx-map")[0]).setView([46.5, 2.5], 5);
	addBaseLayers(map);
	picturesLayer = L.featureGroup().addTo(map);
	viewLayer = L.layerGroup().addTo(map);
	map.on("click", (e) => searchAround([e.latlng.lat, e.latlng.lng]));
}

function searchAround(location) {
	state.location = location;
	if (locationMarker) {
		locationMarker.setLatLng(location);
	} else {
		locationMarker = L.marker(location, { interactive: false }).addTo(map);
	}
	map.setView(location, Math.max(map.getZoom(), 18));
	picturesLayer.clearLayers();
	setStatus("panoramax-capture-searching");
	var loadId = ++state.loadId;
	return findPicturesAround(location[0], location[1]).then((pictures) => {
		if (loadId != state.loadId) {
			return;
		}
		state.pictures = pictures;
		pictures.forEach(addPictureMarker);
		if (pictures.length == 0) {
			setStatus("panoramax-capture-none");
			return;
		}
		return showPicture(pictures[0]);
	});
}

// ---- Current picture

function updateButtons() {
	var p = state.picture;
	modal.find(".pnx-prev").toggleClass("disabled", !(p && p.prev));
	modal.find(".pnx-next").toggleClass("disabled", !(p && p.next));
	modal.find(".pnx-zoom-in, .pnx-zoom-out, .pnx-capture").toggleClass("disabled", !state.image);
}

function creditText(picture) {
	return i18next.t("panoramax-capture-credit", {
		producer: picture.producer || "?",
		license: picture.license || "?",
		date: picture.datetime ? picture.datetime.toLocaleDateString(i18next.language.replace("_", "-")) : "?",
		// drawn on the picture or inserted with .text(): no HTML escaping
		interpolation: { escapeValue: false }
	});
}

function showPicture(picture, heading) {
	var loadId = ++state.loadId;
	state.picture = picture;
	state.image = null;
	updateButtons();
	drawViewDirection();
	setStatus("panoramax-capture-loading");
	modal.find(".pnx-credits").empty().append(
		$('<span></span>').text(creditText(picture)),
		" ",
		$('<a target="_blank" rel="noopener"></a>').attr("href", picture.url).text(i18next.t("open-in-panoramax")));
	return loadImage(picture.sd).then((image) => {
		if (loadId != state.loadId) {
			return;
		}
		if (picture.is360) {
			state.pixels = imagePixels(image);
			// keep looking in the same direction when walking along a sequence
			state.view = { yaw: heading === undefined ? 0 : heading - picture.azimuth, pitch: 0, fov: FOV_DEFAULT };
		} else {
			imagePixels(image); // check the picture can be captured
			state.view = { cx: 0.5, cy: 0.5, zoom: 1 };
		}
		state.image = image;
		clampView();
		setStatus(null);
		updateButtons();
		resizeCanvas();
	}).catch((err) => {
		if (loadId == state.loadId) {
			console.warn("Panoramax picture", err);
			setStatus("panoramax-capture-error");
		}
	});
}

function goSequence(direction) {
	var p = state.picture;
	var href = p && p[direction];
	if (!href) {
		return;
	}
	var heading = state.image && p.is360 ? viewHeading() : undefined;
	modal.find(".pnx-prev, .pnx-next").addClass("disabled");
	fetchPicture(href).then((picture) => {
		if (!picture) {
			setStatus("panoramax-capture-error");
			updateButtons();
			return;
		}
		if (!state.pictures.find((q) => q.id == picture.id)) {
			state.pictures.push(picture);
			addPictureMarker(picture);
		}
		map.panTo([picture.lat, picture.lon]);
		showPicture(picture, heading);
	});
}

// ---- Capture

function capture() {
	var picture = state.picture;
	var view = $.extend({}, state.view);
	modal.find(".pnx-capture").addClass("disabled");
	setStatus("panoramax-capture-taking");
	// full definition picture for the capture
	var hd = picture.hd && picture.hd != picture.sd ? loadImage(picture.hd).catch(() => state.image) : Promise.resolve(state.image);
	hd.then((image) => {
		var out = document.createElement("canvas");
		var octx = out.getContext("2d");
		if (picture.is360) {
			out.width = IMAGE_MAX_SIZE;
			out.height = Math.round(IMAGE_MAX_SIZE / ASPECT);
			var pixels = image === state.image ? state.pixels : imagePixels(image);
			var data = octx.createImageData(out.width, out.height);
			renderEquirect(pixels, data, view, true);
			octx.putImageData(data, 0, 0);
		} else {
			var r = flatRegion(image, view);
			var scale = Math.min(1, IMAGE_MAX_SIZE / r.sw);
			out.width = Math.round(r.sw * scale);
			out.height = Math.round(r.sh * scale);
			octx.drawImage(image, r.sx, r.sy, r.sw, r.sh, 0, 0, out.width, out.height);
		}
		// credits band at the bottom of the picture
		var band = Math.max(20, Math.round(out.width * 0.03));
		octx.fillStyle = "rgba(0, 0, 0, 0.6)";
		octx.fillRect(0, out.height - band, out.width, band);
		octx.fillStyle = "#fff";
		octx.font = Math.round(band * 0.6) + "px sans-serif";
		octx.textBaseline = "middle";
		octx.fillText(creditText(picture), band * 0.4, out.height - band / 2, out.width - band * 0.8);
		var dataUrl = out.toDataURL("image/jpeg", 0.92);
		setStatus(null);
		updateButtons();
		M.Modal.getInstance(modal[0]).close();
		if (state.onCapture) {
			state.onCapture(dataUrl, picture, state.location);
		}
	}).catch((err) => {
		console.warn("Panoramax capture", err);
		setStatus("panoramax-capture-error");
		updateButtons();
	});
}

// ---- Opening

function currentPosition() {
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(null);
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
			() => resolve(null),
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
	});
}

function init() {
	modal = $("#modal-panoramax-capture");
	canvas = modal.find("canvas")[0];
	ctx = canvas.getContext("2d");
	M.Modal.init(modal[0], {
		onOpenEnd: () => {
			map.invalidateSize();
			resizeCanvas();
		}
	});
	initMap();
	initInteractions();
}

/**
 * Open the capture window.
 * location: [lat, lon] of the observation, or null to ask the device's position
 * bounds: [[lat, lon], [lat, lon]] of the instance's zone, shown if there is no position
 * onCapture(dataUrl, picture, location): called with the captured JPEG
 */
export function openPanoramaxCapture(location, bounds, onCapture) {
	if (!modal) {
		init();
	}
	state.onCapture = onCapture;
	M.Modal.getInstance(modal[0]).open();
	if (location) {
		searchAround(location);
		return;
	}
	if (bounds) {
		map.fitBounds(bounds);
	}
	setStatus("panoramax-capture-locating");
	currentPosition().then((position) => {
		if (position) {
			searchAround(position);
		} else {
			setStatus("panoramax-capture-click-map");
		}
	});
}
