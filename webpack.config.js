const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = ({ analyzer, production } = {}) => {
  return {
    entry: [
      './src/index.ts',
      './src/styles.css',
    ],
    devServer: { port: 5001 },
    devtool: 'inline-source-map',
    mode: production ? 'production' : 'development',
    module: {
      rules: [
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
      // Clean out dist before each release build
      ...(production ? [new CleanWebpackPlugin()] : []),
      // Import and compile src/index.ejs into dist and inject
      // links to css & js build output
      new HtmlWebpackPlugin({
        minify: true,
        scriptLoading: 'defer',
      }),
      // Copy json files into dist
      new CopyWebpackPlugin([{
        flatten: true,
        from: 'src/*.json',
      }]),
      // Output css as css, not js
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      ...(analyzer ? [new BundleAnalyzerPlugin()] : []),
    ],
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
    },
  };
};
