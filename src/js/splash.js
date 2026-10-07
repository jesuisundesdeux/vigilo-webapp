/**
 * Loading screen (#app-splash in index.html): status text while the app starts,
 * faded out once the observations are displayed (or the territory has to be chosen).
 */
var hidden = false;

export function setSplashStatus(text) {
	var status = document.querySelector('#app-splash .splash-status');
	if (status && text) {
		status.textContent = text;
	}
}

export function hideSplash() {
	var splash = document.getElementById('app-splash');
	if (hidden || !splash) {
		return;
	}
	hidden = true;
	splash.classList.add('splash-hidden');
	document.documentElement.classList.remove('splash');
	// removed after the fade out (or right away when there is no transition)
	var remove = () => splash.parentNode && splash.parentNode.removeChild(splash);
	splash.addEventListener('transitionend', remove);
	setTimeout(remove, 600);
}

// never keep the app hidden behind the loading screen
setTimeout(hideSplash, 20000);
