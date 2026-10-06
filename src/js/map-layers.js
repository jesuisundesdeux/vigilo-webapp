import L from 'leaflet';
import i18next from 'i18next';

// Number of failed tiles (without any successful one) before falling back
const FALLBACK_AFTER_ERRORS = 3;
// Set once CARTO failed, so maps created later start directly on the fallback layer
var cartoUnavailable = false;

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
 * Add the base layers ("Carte", "Plan IGN", "Photos") and the layer switcher to a map.
 * If the default layer (CARTO) can't load any tile, switch to "Plan IGN" and warn the user.
 */
export function addBaseLayers(map) {
	var carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: 'abcd',
		minZoom: 0,
		maxZoom: 20,
		// Zoom 19-20 upscale level 18 tiles instead of requesting tiles that may not exist
		maxNativeZoom: 18
	});
	var planIgn = geoplateformeLayer("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", "image/png", 18);
	var photos = geoplateformeLayer("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg", 18);

	(cartoUnavailable ? planIgn : carto).addTo(map);
	L.control.layers({
		"Carte": carto,
		"Plan IGN": planIgn,
		"Photos": photos
	}, {}).addTo(map);

	var loaded = 0;
	var errors = 0;
	carto.on('tileload', () => { loaded++; });
	carto.on('tileerror', () => {
		errors++;
		if (loaded == 0 && errors == FALLBACK_AFTER_ERRORS && map.hasLayer(carto)) {
			map.removeLayer(carto);
			planIgn.addTo(map);
			if (!cartoUnavailable) {
				cartoUnavailable = true;
				M.toast({ html: i18next.t("map-tiles-fallback") });
			}
		}
	});
}
