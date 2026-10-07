import L from 'leaflet';
import i18next from 'i18next';

// Number of failed tiles (without any successful one) before falling back
const FALLBACK_AFTER_ERRORS = 3;
// Set once the default layer failed, so maps created later start directly on the fallback layer
var defaultUnavailable = false;

function geoplateformeLayer(layer, format, maxNativeZoom) {
	return L.tileLayer(
		"https://data.geopf.fr/wmts?" +
		"&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
		"&STYLE=normal" +
		"&TILEMATRIXSET=PM" +
		"&FORMAT=" + format +
		"&LAYER=" + layer +
		"&TILEMATRIX={z}" +
		"&TILEROW={y}" +
		"&TILECOL={x}",
		{
			minZoom: 0,
			maxZoom: 20,
			maxNativeZoom: maxNativeZoom,
			attribution: '<a href="https://www.ign.fr">IGN-F/Géoplateforme</a>',
			tileSize: 256
		}
	);
}

/**
 * Add the base layers ("Carte", "OpenStreetMap", "Plan IGN", "Photos") and the layer switcher to a map.
 * All providers are keyless. If the default layer (OSM France) can't load any tile,
 * switch to the main OpenStreetMap servers and warn the user.
 */
export function addBaseLayers(map, options) {
	options = options || {};
	var osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">les contributeurs OpenStreetMap</a>';
	var osmFr = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
		attribution: osmAttribution + ', tuiles <a href="https://www.openstreetmap.fr">OSM France</a>',
		subdomains: 'abc',
		minZoom: 0,
		maxZoom: 20,
		// Zoom 20 upscales level 19 tiles instead of requesting tiles that may not exist
		maxNativeZoom: 19
	});
	var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: osmAttribution,
		minZoom: 0,
		maxZoom: 20,
		maxNativeZoom: 19
	});
	var planIgn = geoplateformeLayer("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", "image/png", 18);
	var photos = geoplateformeLayer("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg", 18);

	(defaultUnavailable ? osm : osmFr).addTo(map);
	if (options.control !== false) {
		L.control.layers({
			"Carte": osmFr,
			"OpenStreetMap": osm,
			"Plan IGN": planIgn,
			"Photos": photos
		}, {}).addTo(map);
	}

	var loaded = 0;
	var errors = 0;
	osmFr.on('tileload', () => { loaded++; });
	osmFr.on('tileerror', () => {
		errors++;
		if (loaded == 0 && errors == FALLBACK_AFTER_ERRORS && map.hasLayer(osmFr)) {
			map.removeLayer(osmFr);
			osm.addTo(map);
			if (!defaultUnavailable) {
				defaultUnavailable = true;
				M.toast({ html: i18next.t("map-tiles-fallback") });
			}
		}
	});
}
