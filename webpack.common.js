var path = require('path')
var HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin');
var webpack = require('webpack')

module.exports = {
    entry: {
        opensheetmusicdisplay: './src/index.ts', // Main index (OpenSheetMusicDisplay and other classes)
        demo: './demo/index.js' // Demo index
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js',
        library: 'opensheetmusicdisplay',
        libraryTarget: 'umd',
        globalObject: 'this'
    },
    resolve: {
        // Add '.ts' and '.tsx' as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                // loader: 'awesome-typescript-loader',
                exclude: /(node_modules|bower_components)/
            },
            {
                test: /\.glsl$/,
                type: "asset/source",
                exclude: /(node_modules|bower_components)/
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
        }),
        new webpack.EnvironmentPlugin({
            STATIC_FILES_SUBFOLDER: false, // Set to other directory if NOT using webpack-dev-server
            DEBUG: false,
            DRAW_BOUNDING_BOX_ELEMENT: false //  Specifies the element to draw bounding boxes for (e.g. 'GraphicalLabels'). If 'all', bounding boxes are drawn for all elements.
        }),
        // add a demo page to the build folder
        new HtmlWebpackPlugin({
            template: 'demo/index.html',
            favicon: 'demo/favicon.ico',
            title: 'OSMD Demo'
        }),
        new CopyPlugin({
            patterns: [
                { from: 'demo/resources/digitaciones', to: 'resources/digitaciones' }
            ]
        })
    ],
  devServer: {
      static: [
        path.join(__dirname, 'test/data'),
        path.join(__dirname, 'build'),
        path.join(__dirname, 'demo'),
        {
          directory: path.join(__dirname, 'resources'),
          publicPath: '/resources'
        }
      ],
      port: 8000,
      compress: false
    }
}
