// import main CSS
import '../css/main.scss';

import $ from 'jquery';
window.$ = $;



// Fix import leaflet with webpack https://github.com/PaulLeCam/react-leaflet/issues/255
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
	iconUrl: require('leaflet/dist/images/marker-icon.png'),
	shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});




window.WE_ARE_ON_A_MOBILE = typeof orientation !== 'undefined' || navigator.userAgent.toLowerCase().indexOf('mobile') >= 0 || window.location.search.indexOf('mobile') >=0;

import VigiloApp from './app';
window.vigilo = new VigiloApp();
window.vigilo.init()
