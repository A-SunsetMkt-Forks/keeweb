const path = require('path');

const webpack = require('webpack');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const rootDir = path.join(__dirname, '..');

const pkg = require('../package.json');

process.noDeprecation = true; // for css loaders

function config(options) {
    const mode = options.mode || 'production';
    const devMode = mode === 'development';
    const date = options.date;
    const dt = date.toISOString().replace(/T.*/, '');
    const year = date.getFullYear();
    return {
        mode,
        entry: {
            app: ['babel-helpers', 'main', 'main.scss']
        },
        output: {
            path: path.resolve('.', 'tmp'),
            filename: 'js/[name].js'
        },
        target: 'web',
        performance: {
            hints: false
        },
        stats: {
            colors: false,
            modules: true,
            reasons: true
        },
        resolve: {
            modules: [
                path.join(rootDir, 'app/scripts'),
                path.join(rootDir, 'app/styles'),
                path.join(rootDir, 'node_modules')
            ],
            alias: {
                'babel-helpers': path.join(rootDir, 'app/lib/babel-helpers.js'),
                kdbxweb: `kdbxweb/dist/kdbxweb${devMode ? '' : '.min'}.js`,
                baron: `baron/baron${devMode ? '' : '.min'}.js`,
                qrcode: `jsqrcode/dist/qrcode${devMode ? '' : '.min'}.js`,
                argon2: 'argon2-browser/dist/argon2.js',
                marked: devMode ? 'marked/lib/marked.js' : 'marked/marked.min.js',
                dompurify: `dompurify/dist/purify${devMode ? '' : '.min'}.js`,
                tweetnacl: `tweetnacl/nacl${devMode ? '' : '.min'}.js`,
                'argon2-wasm': 'argon2-browser/dist/argon2.wasm',
                locales: path.join(rootDir, 'app/locales'),
                'public-key.pem': path.join(rootDir, 'app/resources/public-key.pem'),
                'public-key-new.pem': path.join(rootDir, 'app/resources/public-key-new.pem'),
                'demo.kdbx': path.join(rootDir, 'app/resources/Demo.kdbx'),
                'fontawesome.woff2': '@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2'
            },
            fallback: {
                console: false,
                process: false,
                crypto: false,
                Buffer: false,
                __filename: false,
                __dirname: false,
                fs: false,
                setImmediate: false,
                path: false,
                moment: false
            },
            extensions: ['.tsx', '.ts', '.js']
        },
        resolveLoader: {
            modules: ['node_modules', path.join(__dirname, 'loaders')]
        },
        module: {
            rules: [
                {
                    test: /runtime-info\.ts$/,
                    loader: 'string-replace-loader',
                    options: {
                        multiple: [
                            {
                                search: /@@VERSION/g,
                                replace: pkg.version + (options.beta ? '-beta' : '')
                            },
                            {
                                search: /@@BETA/g,
                                replace: options.beta ? '1' : ''
                            },
                            { search: /@@DATE/g, replace: dt },
                            {
                                search: /@@COMMIT/g,
                                replace: options.sha
                            },
                            { search: /@@DEVMODE/g, replace: devMode ? '1' : '' },
                            { search: /@@APPLE_TEAM_ID/g, replace: options.appleTeamId }
                        ]
                    }
                },
                {
                    test: /baron(\.min)?\.js$/,
                    use: [
                        {
                            loader: 'string-replace-loader',
                            options: {
                                search: /\(1,\s*eval\)\('this'\)/g,
                                replace: 'window'
                            }
                        },
                        {
                            loader: 'exports-loader',
                            options: { type: 'module', exports: 'default baron' }
                        }
                    ]
                },
                {
                    test: /babel-helpers\.js$/,
                    loader: 'exports-loader',
                    options: { type: 'module', exports: 'default babelHelpers' }
                },
                {
                    test: /\.(js|tsx|ts)$/,
                    exclude: /(node_modules|babel-helpers\.js)/,
                    loader: 'babel-loader',
                    options: { cacheDirectory: true }
                },
                { test: /argon2\.wasm/, type: 'javascript/auto', loader: 'base64-loader' },
                { test: /argon2(\.min)?\.js/, loader: 'raw-loader' },
                {
                    test: /\.s?css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        { loader: 'css-loader', options: { sourceMap: devMode } },
                        { loader: 'postcss-loader', options: { sourceMap: devMode } },
                        { loader: 'sass-loader', options: { sourceMap: devMode } },
                        { loader: 'scss-add-icons-loader' }
                    ]
                },
                { test: /fontawesome.*\.woff2$/, loader: 'fontawesome-loader' },
                { test: /\.pem$/, loader: 'raw-loader' },
                { test: /\.kdbx$/, loader: 'base64-loader' }
            ]
        },
        optimization: {
            runtimeChunk: false,
            minimize: !devMode,
            minimizer: [
                new TerserPlugin({
                    extractComments: 'never-extract-comments',
                    terserOptions: {
                        ecma: 6
                    }
                }),
                new OptimizeCSSAssetsPlugin({
                    cssProcessorPluginOptions: {
                        preset: ['default', { discardComments: { removeAll: true } }]
                    }
                }),
                new BundleAnalyzerPlugin({
                    openAnalyzer: false,
                    analyzerMode: 'static',
                    reportFilename: 'stats/analyzer_report.html',
                    generateStatsFile: true,
                    statsFilename: 'stats/stats.json'
                })
            ]
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: 'app/index.html', to: 'index.html' },
                    { from: 'app/icons', to: 'icons' },
                    { from: 'app/manifest/manifest.json', to: 'manifest.json' },
                    { from: 'app/manifest/browserconfig.xml', to: 'browserconfig.xml' }
                ]
            }),
            new webpack.BannerPlugin(
                'keeweb v' +
                    pkg.version +
                    ', (c) ' +
                    year +
                    ' ' +
                    pkg.author.name +
                    ', opensource.org/licenses/' +
                    pkg.license
            ),
            new webpack.ProvidePlugin({
                babelHelpers: 'babel-helpers'
            }),
            new webpack.IgnorePlugin(/^(moment)$/),
            new MiniCssExtractPlugin({
                filename: 'css/[name].css'
            })
        ],
        node: {
            __filename: false,
            __dirname: false
        },
        externals: {
            xmldom: 'null',
            crypto: 'null',
            fs: 'null',
            path: 'null',
            http: 'null',
            https: 'null',
            electron: 'null'
        },
        devtool: devMode ? 'source-map' : undefined
    };
}

module.exports.config = config;
