const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const pkg= require('./package.json');


module.exports = {
	mode: process.env.WEBPACK_MODE,
	entry: './src/js/main.js',
	output: {
		filename: 'js/main.js',
		path: path.resolve(__dirname, 'dist')
	},
	module: {
		rules: [
			{
				test: /\.(s*)css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader']
			}, {
				test: /\.html$/,
				use: [
					{
						loader: "html-loader",
						options: {
							interpolate: true
						}
					}
				]
			}, {
				test: /\.(png|svg(z*)|jp(e*)g|gif)$/,
				use: [{
					loader: 'file-loader',
					options: {
						name: "[hash]-[name].[ext]",
						publicPath: (process.env.PATH_PREFIX||'')+"/img/",
						outputPath: "img/",
					}
				}]
			}
		]
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "css/styles.css"
		}),
		new CleanWebpackPlugin(['dist']),
		new HtmlWebpackPlugin({
      template: "src/html/index.html",
      title: "Vǐgǐlo",
      meta: {
        viewport: 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no',
        robots: "index,follow"
      }
		})
	],
	devServer: {
		contentBase: path.join(__dirname, 'dist'),
		compress: false,
		host: "0.0.0.0",
		port: 80
	}
};