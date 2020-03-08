const path = require('path');
const webpack = require('webpack');
const config = require('./webpack.config.js');

config.output.path = path.resolve(__dirname, 'docs')
config.plugins = config.plugins
  .filter(plugin => !(plugin instanceof webpack.EnvironmentPlugin))
  .concat([new webpack.EnvironmentPlugin({ DEMO: 'true' })]);

config.devServer = {
  port: 1104,
}

module.exports = config;
