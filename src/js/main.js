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
import './form';

const WE_ARE_ON_A_MOBILE = typeof orientation !== 'undefined' || navigator.userAgent.toLowerCase().indexOf('mobile') >= 0;

// Init UI fonction
(async function initUI() {
	// Zone modal
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

	M.Tabs.init($("nav .tabs"));
	M.Tabs.getInstance($("nav .tabs")).options.onShow = function () { issuemap.initMap() }
	M.Sidenav.init($("#mobile-menu"));

	// Fill category select
	var cats = await vigilo.getCategories();
	for (var i in cats) {
		$("#issue-cat").append(`<option value="${i}">${cats[i]}</option>`)
	}

	M.Modal.init($("#modal-issue"));
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
		$("#issue-cat").addClass('browser-default')
		$("#issue-date").attr('type', 'date');
		$("#issue-time").attr('type', 'time');
	}


	$(window).scroll(() => {
		if (($(window.document.body).height() - $(window).height() - $(window).scrollTop()) < 10) {
			displayIssues(10)
		}
	})


	displayIssues(10)
})()


