/**
 * "Install the app" (add to home screen): a banner the user can close (closing is
 * remembered) and an entry in the side menu, shown only when the browser can install
 * the web app (Chrome, Edge, Samsung Internet...) or on iOS where it's done by hand.
 */
import i18next from 'i18next';
import M from '@materializecss/materialize';

const DISMISSED_KEY = "vigilo-install-dismissed";

var deferredPrompt = null;
var ready = false;

function isStandalone() {
	return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
	// iPadOS reports itself as a Mac
	return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform == "MacIntel" && navigator.maxTouchPoints > 1);
}

function isDismissed() {
	try {
		return localStorage.getItem(DISMISSED_KEY) == "1";
	} catch (e) {
		return false;
	}
}

function setDismissed() {
	try {
		localStorage.setItem(DISMISSED_KEY, "1");
	} catch (e) {
		// not remembered (private mode...): the banner will come back next time
	}
}

function canInstall() {
	return !isStandalone() && (deferredPrompt !== null || isIos());
}

function refresh() {
	if (!ready) {
		return;
	}
	var showBanner = canInstall() && !isDismissed();
	$("#install-app").toggleClass("hide", !canInstall());
	$("#install-banner").toggleClass("hide", !showBanner);
	$("body").toggleClass("install-banner-shown", showBanner);
	document.body.style.setProperty("--install-banner-h", showBanner ? $("#install-banner").outerHeight() + "px" : "0px");
}

async function install() {
	if (deferredPrompt !== null) {
		var prompt = deferredPrompt;
		// a prompt can only be used once
		deferredPrompt = null;
		prompt.prompt();
		var choice = await prompt.userChoice;
		if (choice.outcome == "accepted") {
			setDismissed();
		}
		refresh();
	} else if (isIos()) {
		// wrapped: a toast lays out its children side by side
		M.toast({ html: "<span>" + i18next.t("install-ios-help") + "</span>", displayLength: 10000 });
	}
}

// Listen as soon as possible: the browser may fire it before the app is initialized
window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	deferredPrompt = e;
	refresh();
});
window.addEventListener("appinstalled", () => {
	deferredPrompt = null;
	setDismissed();
	refresh();
});

export function init() {
	$("#install-banner .install-app-btn, #install-app a").on("click", (e) => {
		e.preventDefault();
		var sidenav = M.Sidenav.getInstance($("#mobile-menu")[0]);
		if (sidenav) {
			sidenav.close();
		}
		install();
	});
	$("#install-banner .install-banner-close").on("click", (e) => {
		e.preventDefault();
		setDismissed();
		refresh();
	});
	$(window).on("resize", refresh);
	ready = true;
	refresh();
}
