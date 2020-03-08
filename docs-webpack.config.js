const path = require('path');
const webpack = require('webpack');
const config = require('./webpack.config.js');

config.output.path = path.resolve(__dirname, 'docs')
config.plugins = config.plugins
  .concat([
    new webpack.NormalModuleReplacementPlugin(
      /src\/client\.ts$/,
      './demoClient.ts'
    ),
  ]);

config.devServer = {
  port: 1104,
}

module.exports = config;
