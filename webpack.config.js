const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    const isDevelopment = !isProduction;
    
    return {
        entry: {
            app: './src/app.js'
        },
        
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: isProduction ? '[name].[contenthash].js' : '[name].js',
            chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
            clean: true,
            publicPath: '/dist/'
        },
        
        mode: isProduction ? 'production' : 'development',
        
        devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
        
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
                '@core': path.resolve(__dirname, 'src/core'),
                '@modules': path.resolve(__dirname, 'src/modules'),
                '@styles': path.resolve(__dirname, 'src/styles'),
                '@workers': path.resolve(__dirname, 'src/workers')
            },
            extensions: ['.js', '.json']
        },
        
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    targets: {
                                        browsers: ['> 1%', 'last 2 versions', 'not dead']
                                    },
                                    useBuiltIns: 'usage',
                                    corejs: 3
                                }]
                            ]
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                sourceMap: true
                            }
                        }
                    ]
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'images/[name].[hash][ext]'
                    }
                },
                {
                    test: /\.(ply|splat)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/[name].[hash][ext]'
                    }
                }
            ]
        },
        
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/index.html',
                filename: '../index.html',
                inject: 'head',
                scriptLoading: 'defer'
            }),
            
            ...(isProduction ? [
                new MiniCssExtractPlugin({
                    filename: '[name].[contenthash].css',
                    chunkFilename: '[name].[contenthash].chunk.css'
                })
            ] : [])
        ],
        
        optimization: {
            minimize: isProduction,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            drop_console: isProduction,
                            drop_debugger: isProduction
                        },
                        format: {
                            comments: false
                        }
                    },
                    extractComments: false
                }),
                new CssMinimizerPlugin()
            ],
            
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    three: {
                        test: /[\\/]node_modules[\\/]three[\\/]/,
                        name: 'three',
                        chunks: 'all',
                        priority: 20
                    },
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        priority: 10
                    },
                    core: {
                        test: /[\\/]src[\\/]core[\\/]/,
                        name: 'core',
                        chunks: 'all',
                        priority: 5
                    },
                    modules: {
                        test: /[\\/]src[\\/]modules[\\/]/,
                        name: 'modules',
                        chunks: 'all',
                        priority: 3
                    }
                }
            },
            
            runtimeChunk: {
                name: 'runtime'
            }
        },
        
        performance: {
            hints: isProduction ? 'warning' : false,
            maxEntrypointSize: 1024000,
            maxAssetSize: 1024000
        },
        
        stats: {
            colors: true,
            modules: false,
            children: false,
            chunks: false,
            chunkModules: false
        }
    };
};