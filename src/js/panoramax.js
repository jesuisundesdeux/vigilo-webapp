/**
 * Panoramax (https://panoramax.fr): look for a street-level picture at the
 * coordinates of an observation, through the federated catalog (all instances).
 */
import M from '@materializecss/materialize';

const PANORAMAX_URL = "https://explore.panoramax.fr";
// Search box half-size, in degrees (~50 m, as the Panoramax viewer does)
const SEARCH_RADIUS_DEG = 0.0005;

var searchEndpoint;
var cache = {};

function getSearchEndpoint() {
	if (searchEndpoint === undefined) {
		// STAC landing page: its "search" link gives the search endpoint
		searchEndpoint = fetch(PANORAMAX_URL + "/api")
			.then((r) => r.json())
			.then((landing) => {
				var link = (landing.links || []).find((l) => l.rel == "search");
				return link ? new URL(link.href, PANORAMAX_URL + "/api/").href : PANORAMAX_URL + "/api/search";
			})
			.catch(() => PANORAMAX_URL + "/api/search");
	}
	return searchEndpoint;
}

/**
 * Most recent Panoramax picture around (lat, lon) (the nearest of that day), or null.
 * Resolves to { id, url } where url opens the picture in the Panoramax viewer.
 */
export function findPanoramaxPicture(lat, lon) {
	var key = lat + "," + lon;
	if (cache[key] === undefined) {
		cache[key] = getSearchEndpoint()
			.then((endpoint) => {
				var bbox = [lon - SEARCH_RADIUS_DEG, lat - SEARCH_RADIUS_DEG, lon + SEARCH_RADIUS_DEG, lat + SEARCH_RADIUS_DEG]
					.map((d) => d.toFixed(7)).join(",");
				return fetch(endpoint + "?bbox=" + bbox + "&limit=100");
			})
			.then((r) => r.ok ? r.json() : { features: [] })
			.then((result) => {
				var features = (result.features || []).filter((f) => f.id && f.geometry && f.geometry.coordinates);
				if (features.length == 0) {
					return null;
				}
				// the most recent picture around (same day: the nearest), so that the view shows the place as it is now
				var dist = (f) => Math.pow(f.geometry.coordinates[0] - lon, 2) + Math.pow(f.geometry.coordinates[1] - lat, 2);
				var day = (f) => {
					var d = f.properties && f.properties.datetime ? new Date(f.properties.datetime) : null;
					return d && !isNaN(d) ? d.toISOString().slice(0, 10) : "";
				};
				var picked = features.reduce((a, b) => day(b) > day(a) || (day(b) == day(a) && dist(b) < dist(a)) ? b : a);
				return {
					id: picked.id,
					// same link as the "open on Panoramax" one of the Panoramax viewer
					url: PANORAMAX_URL + "/?pic=" + encodeURIComponent(picked.id),
					// viewer focused on the picture, with the map around (embeddable in an iframe,
					// as offered by the share menu of Panoramax)
					embedUrl: PANORAMAX_URL + "/#focus=pic&pic=" + encodeURIComponent(picked.id) + "&map=18/" + lat + "/" + lon
				};
			})
			.catch(() => null);
	}
	return cache[key];
}

/**
 * Open the Panoramax viewer on a picture, in a popup over the current page
 */
export function openPanoramaxViewer(picture) {
	var modal = $("#modal-panoramax");
	var instance = M.Modal.getInstance(modal[0]) || M.Modal.init(modal[0], {
		// stop the viewer (and its network activity) once closed
		onCloseEnd: () => modal.find("iframe").attr("src", "about:blank")
	});
	modal.find("iframe").attr("src", picture.embedUrl);
	modal.find(".panoramax-open").attr("href", picture.url);
	instance.open();
}

// ---- Pictures around a point, for the form (see panoramax-capture.js)

// Search box half-size for the form, in degrees (~100 m)
const NEARBY_RADIUS_DEG = 0.001;

/**
 * Normalize a STAC item of the Panoramax API into a picture usable by the capture viewer
 */
/**
 * Orientation correction of a picture, as the official Panoramax viewer computes it
 * (web-viewer, utils/picture.js getSphereCorrection): pers:yaw / pers:pitch / pers:roll, else the
 * EXIF / XMP tags, in degrees. Applied to flat pictures with a pitch or a roll, to 360° pictures with
 * both. Returns {pan, tilt, roll} in radians (photo-sphere-viewer sphereCorrection), or null.
 */
function sphereCorrection(props, is360) {
	var exif = props.exif || {};
	var angle = (name, fallbacks) => {
		var values = [props[name]].concat(fallbacks.map((tag) => exif[tag]));
		for (var i = 0; i < values.length; i++) {
			var v = parseFloat(values[i]);
			if (!isNaN(v)) {
				return v;
			}
		}
		return 0;
	};
	var yaw = angle("pers:yaw", ["Xmp.GPano.PoseHeadingDegrees", "Xmp.Camera.Yaw", "Exif.MpfInfo.MPFYawAngle"]);
	var pitch = angle("pers:pitch", ["Xmp.GPano.PosePitchDegrees", "Xmp.Camera.Pitch", "Exif.MpfInfo.MPFPitchAngle"]);
	var roll = angle("pers:roll", ["Xmp.GPano.PoseRollDegrees", "Xmp.Camera.Roll", "Exif.MpfInfo.MPFRollAngle"]);
	if ((!is360 && (pitch !== 0 || roll !== 0)) || (pitch !== 0 && roll !== 0)) {
		var rad = Math.PI / 180;
		return { pan: yaw * rad, tilt: -pitch * rad, roll: roll * rad };
	}
	return null;
}

export function pictureFromItem(item) {
	if (!item || !item.id || !item.geometry || !item.geometry.coordinates) {
		return null;
	}
	var props = item.properties || {};
	var assets = item.assets || {};
	var href = (name) => assets[name] && assets[name].href;
	var orientation = props["pers:interior_orientation"] || {};
	var link = (rel) => (item.links || []).find((l) => l.rel == rel && l.href);
	var producer = props["geovisio:producer"]
		|| ((item.providers || []).find((p) => (p.roles || []).indexOf("producer") >= 0) || {}).name
		|| "";
	return {
		id: item.id,
		lon: item.geometry.coordinates[0],
		lat: item.geometry.coordinates[1],
		datetime: props.datetime ? new Date(props.datetime) : null,
		azimuth: parseFloat(props["view:azimuth"]) || 0,
		// 360° pictures are equirectangular panoramas
		is360: parseFloat(orientation.field_of_view) >= 360,
		correction: sphereCorrection(props, parseFloat(orientation.field_of_view) >= 360),
		sd: href("sd") || href("hd"),
		hd: href("hd") || href("sd"),
		thumb: href("thumb") || href("sd"),
		producer: producer,
		license: props.license || "",
		next: link("next") ? link("next").href : null,
		prev: link("prev") ? link("prev").href : null,
		url: PANORAMAX_URL + "/?pic=" + encodeURIComponent(item.id)
	};
}

/**
 * Pictures around (lat, lon), nearest first (empty array on error).
 * dates: optional {from, to} (Date, either may be null): only the pictures taken in this
 * period. Asked to the API (STAC "datetime" parameter, retried without it if refused)
 * and checked here as well.
 */
export function findPicturesAround(lat, lon, dates) {
	var from = dates && dates.from, to = dates && dates.to;
	var interval = (from || to) ? (from ? from.toISOString() : "..") + "/" + (to ? to.toISOString() : "..") : null;
	return getSearchEndpoint()
		.then((endpoint) => {
			var bbox = [lon - NEARBY_RADIUS_DEG, lat - NEARBY_RADIUS_DEG, lon + NEARBY_RADIUS_DEG, lat + NEARBY_RADIUS_DEG]
				.map((d) => d.toFixed(7)).join(",");
			var url = endpoint + "?bbox=" + bbox + "&limit=100";
			if (!interval) {
				return fetch(url);
			}
			return fetch(url + "&datetime=" + encodeURIComponent(interval))
				.then((r) => r.ok ? r : fetch(url));
		})
		.then((r) => r.ok ? r.json() : { features: [] })
		.then((result) => {
			var dist = (p) => Math.pow(p.lon - lon, 2) + Math.pow(p.lat - lat, 2);
			return (result.features || []).map(pictureFromItem).filter((p) => p && p.sd)
				.filter((p) => !interval || (p.datetime && (!from || p.datetime >= from) && (!to || p.datetime <= to)))
				.sort((a, b) => dist(a) - dist(b));
		})
		.catch(() => []);
}

/**
 * Picture of a STAC item URL (next / previous one of a sequence), or null
 */
export function fetchPicture(href) {
	return fetch(href)
		.then((r) => r.ok ? r.json() : null)
		.then(pictureFromItem)
		.catch(() => null);
}
