const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  devServer: {
    publicPath: '/dist/',
    index: './index.html',
    port: 1104,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ts$/i,
        use: ['ts-loader'],
        exclude: '/node_modules/',
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader'
      },
      {
        exclude: '/node_modules/',
        test: /\.html$/i,
        loader: 'html-node-loader',
      },
    ],
  },
  plugins: [
    ...(process.env.ANALYZE === 'true' ? [new BundleAnalyzerPlugin()] : []),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'loaders'),
    ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
