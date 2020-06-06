"use strict";

const path = require("path");
const webpack = require("webpack");

module.exports = ({ prod } = {}) => ({
	context: __dirname,
	mode: prod ? "production" : "development",
	entry: "./src/editor-view",
	devtool: prod ? false : "inline-source-map",
	resolve: {
		extensions: [".mjs", ".js", ".json", ".ts", ".tsx"]
	},
	module: {
		rules: [
			{ test: /\.tsx?/, use: "ts-loader" }
		]
	},
	plugins: [
		new webpack.optimize.LimitChunkCountPlugin({
			maxChunks: 1
		})
	],
	output: {
		path: path.join(__dirname, "out/editor"),
		filename: "index.js"
	}
});
