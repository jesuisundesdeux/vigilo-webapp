// Import HTML
import '../index.html';
// import main CSS
import '../css/main.scss';

import $ from 'jquery';
window.$ = $;
import M from 'materialize-css';


// Fix import leaflet with webpack https://github.com/PaulLeCam/react-leaflet/issues/255
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
	iconUrl: require('leaflet/dist/images/marker-icon.png'),
	shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


import * as vigilo from './vigilo-api';
import * as vigiloconfig from './vigilo-config';
import * as issuemap from './issue-map';
import './issue-list';
import * as form from './form';
import * as stats from './stats';

window.WE_ARE_ON_A_MOBILE = typeof orientation !== 'undefined' || navigator.userAgent.toLowerCase().indexOf('mobile') >= 0;

$("#version a").append(vigiloconfig.VERSION_NUMBER);
// Init UI fonction
(async function initUI() {
	/**
	 * SELECT ZONE MODAL
	 */
	var current_instance = vigiloconfig.getInstance() == null ? '' : vigiloconfig.getInstance().name;
	for (var i in vigiloconfig.INSTANCES) {
		$("#modal-zone .modal-content .collection").append(`<a href="#!" onclick="setInstance('${vigiloconfig.INSTANCES[i].name}')" class="collection-item${(vigiloconfig.INSTANCES[i].name == current_instance ? ' active' : '')}">${vigiloconfig.INSTANCES[i].name}</a>`)
	}

	M.Modal.init($("#modal-zone"));
	if (vigiloconfig.getInstance() == null) {
		M.Modal.getInstance($("#modal-zone")).open();
		return
	}
	$("title").append(" "+ vigiloconfig.getInstance().name)
	$("nav .brand-logo").append(" "+ vigiloconfig.getInstance().name)


	/**
	 * SIDENAV
	 */
	M.Sidenav.init($("#mobile-menu"));
	M.Tabs.init($("#mobile-menu .tabs"),{
		onShow: function(){
			M.Sidenav.getInstance($("#mobile-menu")).close()
		}
	});



	/**
	 * ISSUES LIST AND MAP
	 */
	M.Tabs.init($("#issues .tabs"));
	M.Tabs.getInstance($("#issues .tabs")).options.onShow = function () { issuemap.initMap() }
	M.Modal.init($("#modal-issue"));
	$(window).scroll(() => {
		if (($(window.document.body).height() - $(window).height() - $(window).scrollTop()) < 10) {
			displayIssues(10)
		}
	})


	/**
	 * ISSUE FORM
	 */
	form.init();


	

	await displayIssues(10)
	stats.init()
	
})()


