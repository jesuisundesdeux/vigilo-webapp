/**
 * Panoramax (https://panoramax.fr): look for a street-level picture at the
 * coordinates of an observation, through the federated catalog (all instances).
 */
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
 * Nearest Panoramax picture around (lat, lon), or null.
 * Resolves to { id, url } where url opens the picture in the Panoramax viewer.
 */
export function findPanoramaxPicture(lat, lon) {
	var key = lat + "," + lon;
	if (cache[key] === undefined) {
		cache[key] = getSearchEndpoint()
			.then((endpoint) => {
				var bbox = [lon - SEARCH_RADIUS_DEG, lat - SEARCH_RADIUS_DEG, lon + SEARCH_RADIUS_DEG, lat + SEARCH_RADIUS_DEG]
					.map((d) => d.toFixed(7)).join(",");
				return fetch(endpoint + "?bbox=" + bbox + "&limit=20");
			})
			.then((r) => r.ok ? r.json() : { features: [] })
			.then((result) => {
				var features = (result.features || []).filter((f) => f.id && f.geometry && f.geometry.coordinates);
				if (features.length == 0) {
					return null;
				}
				var dist = (f) => Math.pow(f.geometry.coordinates[0] - lon, 2) + Math.pow(f.geometry.coordinates[1] - lat, 2);
				var nearest = features.reduce((a, b) => dist(b) < dist(a) ? b : a);
				return {
					id: nearest.id,
					// same link as the "open on Panoramax" one of the Panoramax viewer
					url: PANORAMAX_URL + "/?pic=" + encodeURIComponent(nearest.id)
				};
			})
			.catch(() => null);
	}
	return cache[key];
}
