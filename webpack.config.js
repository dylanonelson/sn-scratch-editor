const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = ({ production } = {}) => {
  return {
    entry: [
      './src/index.ts',
      './src/styles.css',
    ],
    devtool: 'inline-source-map',
    devServer: { port: 1104 },
    module: {
      rules: [
        {
          exclude: '/node_modules/',
          test: /\.node$/i,
          loader: 'html-node-loader',
        },
        {
          test: /\.svg$/i,
          loader: 'svg-inline-loader',
        },
        {
          test: /\.css$/i,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
          ],
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
      ],
    },
    optimization: {
      minimizer: [
        new OptimizeCSSAssetsPlugin(),
        new TerserWebpackPlugin(),
      ],
    },
    plugins: [
      // Clean out dist before each build
      new CleanWebpackPlugin(),
      // Automatically import and compile src/index.ejs into dist and inject
      // links to css & js build output
      new HtmlWebpackPlugin({
        minify: true,
        scriptLoading: 'defer',
      }),
      // Automatically copy json files into dist
      new CopyWebpackPlugin([{
        flatten: true,
        from: 'src/*.json',
      }]),
      // Output css as css, not js
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
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
};
