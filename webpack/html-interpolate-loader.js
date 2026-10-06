/**
 * Replacement for html-loader 0.5's `interpolate` option (removed in html-loader 1.x):
 * turns an HTML file into a JS module exporting it as a template literal, so that
 * `${require('./partial.html')}` or `${require('../img/x.png')}` inside the HTML
 * are evaluated by webpack.
 */
module.exports = function (source) {
	const escaped = source
		.replace(/\\/g, "\\\\")
		.replace(/`/g, "\\`");
	return "module.exports = `" + escaped + "`;";
};
