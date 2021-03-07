const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const pkg = require('./package.json');


module.exports = {
	mode: process.env.WEBPACK_MODE,
	entry: './src/js/main.js',
	output: {
		filename: 'js/main.js',
		path: path.resolve(__dirname, 'dist')
	},
	module: {
		rules: [{
			test: /\.(s*)css$/,
			use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
		}, {
			test: /\.html$/,
			use: [{
				loader: "html-loader",
				options: {
					interpolate: true
				}
			}]
		}, {
			test: /\.(png|svg(z*)|jp(e*)g|gif)$/,
			use: [{
				loader: 'file-loader',
				options: {
					name: "[hash]-[name].[ext]",
					publicPath: (process.env.PATH_PREFIX || '') + "/img/",
					outputPath: "img/",
				}
			}]
		}]
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "css/styles.css"
		}),
		new CleanWebpackPlugin(['dist']),
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
		contentBase: path.join(__dirname, 'dist'),
		compress: false,
		host: "0.0.0.0",
		port: 80
	}
};