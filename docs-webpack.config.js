const path = require('path');
const webpack = require('webpack');
const getConfig = require('./webpack.config.js');

module.exports = (...args) => {
  const config = getConfig(...args);
  config.output.path = path.resolve(__dirname, 'docs')
  config.plugins = config.plugins
    .concat([
      new webpack.NormalModuleReplacementPlugin(
        /src\/client\.ts$/,
        './demoClient.ts'
      ),
    ]);

  config.module.rules.push({
    test: /\.md$/,
    loader: 'raw-loader',
  });

  return config;
};
