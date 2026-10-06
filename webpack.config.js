const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');


module.exports = {
	mode: process.env.WEBPACK_MODE || 'production',
	entry: './src/js/main.js',
	output: {
		// content hash in file names so browsers never keep a stale bundle after a deploy
		filename: 'js/main.[contenthash].js',
		path: path.resolve(__dirname, 'dist'),
		// 'auto' = URLs relative to the page/stylesheet, so the same build works
		// at the site root, under /develop or under PATH_PREFIX
		publicPath: process.env.PATH_PREFIX ? process.env.PATH_PREFIX + '/' : 'auto',
		clean: true
	},
	module: {
		rules: [{
			test: /\.(s*)css$/,
			use: [MiniCssExtractPlugin.loader, 'css-loader', {
				loader: 'sass-loader',
				options: {
					sassOptions: {
						// materialize-css 1.0 SCSS predates Dart Sass 1.x deprecations
						quietDeps: true,
						silenceDeprecations: ['import', 'global-builtin', 'slash-div', 'color-functions']
					}
				}
			}]
		}, {
			test: /\.html$/,
			use: path.resolve(__dirname, 'webpack/html-interpolate-loader.js')
		}, {
			test: /\.(png|svg(z*)|jp(e*)g|gif)$/,
			type: 'asset/resource',
			generator: {
				filename: "img/[contenthash]-[name][ext]"
			}
		}]
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "css/styles.[contenthash].css"
		}),
		new HtmlWebpackPlugin({
			filename: "index.html",
			template: "src/html/index.html",
			title: "Vǐgǐlo",
			meta: {
				viewport: 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no',
				robots: "index,follow"
			}
		}),
		new HtmlWebpackPlugin({
			template: "src/html/stats-iframe.html",
			filename: "stats-iframe.html",
			title: "Vǐgǐlo"
		}),
		new WebpackPwaManifest({
			// the plugin doesn't understand output.publicPath 'auto'
			publicPath: process.env.PATH_PREFIX ? process.env.PATH_PREFIX + '/' : './',
			name: 'Vǐgǐlo',
			short_name: 'Vǐgǐlo',
			description: 'Vigilo est une application qui permet aux citoyens qui se déplacent avec des moyens de locomotion non motorisés (piétons, cyclistes, ...) de remonter des observations sur les problèmes de déplacements auxquels ils font face au quotidien.',
			lang: "fr",
			background_color: '#fdd835',
			theme_color: '#fdd835',
			ios: true,
			icons: [{
					src: path.resolve('src/img/favicon.png'),
					sizes: [48, 72, 96]
				},
				{
					src: path.resolve('src/img/vigilo.png'),
					sizes: [128, 192, 256, 384, 512, 1024]
				}
			]
		})
	],
	devServer: {
		static: path.join(__dirname, 'dist'),
		compress: false,
		host: "0.0.0.0",
		port: 80
	}
};
