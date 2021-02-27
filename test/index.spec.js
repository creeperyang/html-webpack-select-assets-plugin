const { join } = require('path');
const { readFileSync } = require('fs');
const { expect } = require('chai');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const rimraf = require('rimraf');
const HtmlWebpackSelectAssetsPlugin = require('../plugin');

const OUTPUT_DIR = join(__dirname, './test_dist');

const HtmlWebpackPluginOptions = {
    filename: 'index.html',
    hash: false,
    inject: 'body',
    minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
    },
    showErrors: true,
    template: join(__dirname, './test_data/index.html'),
};

const webpackDevOptions = {
    mode: 'development',
    entry: {
        app: join(__dirname, './test_data/entry.js'),
        other: join(__dirname, './test_data/other.js'),
    },
    output: {
        path: OUTPUT_DIR,
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: 'css-loader',
                    },
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
        }),
    ],
};

const webpackProdOptions = {
    ...webpackDevOptions,
    output: {
        filename: '[name].[contenthash].min.js',
        path: OUTPUT_DIR,
        pathinfo: true,
    },
    mode: 'production',
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].min.css',
        }),
    ],
};

/* global describe, afterEach, it */
/* eslint-disable no-unused-expressions */
function getOutput(name = 'index') {
    const htmlFile = join(OUTPUT_DIR, `./${name}.html`);
    const htmlContents = readFileSync(htmlFile).toString('utf8');
    expect(!!htmlContents).to.be.true;
    return htmlContents;
}

console.log('\nWEBPACK VERSION', webpack.version, '\n');
console.log('\nHTML-WEBPACK_PLUGIN VERSION', HtmlWebpackPlugin.version, '\n');

const configs = [
    {
        name: 'Development',
        options: webpackDevOptions,
    },
    {
        name: 'Production',
        options: webpackProdOptions,
    },
];

configs.forEach((c) => {
    // have to use `function` instead of arrow so we can see `this`
    describe(`HtmlWebpackSelectAssetsPlugin ${c.name} Mode`, function () {
        // set timeout to 6s because webpack is slow
        this.timeout(6000);

        afterEach((done) => {
            rimraf(OUTPUT_DIR, done);
        });

        it('should do nothing when no patterns are specified', (done) => {
            webpack(
                {
                    ...c.options,
                    plugins: [
                        ...c.options.plugins,
                        new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                        new HtmlWebpackSelectAssetsPlugin(),
                    ],
                },
                (err) => {
                    expect(!!err).to.be.false;
                    const html = getOutput();
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?other(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html
                        ),
                        'could not find other bundle'
                    ).to.be.true;
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html
                        ),
                        'could not find app bundle'
                    ).to.be.true;
                    expect(
                        /link\s+.*?href\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.css"/i.test(
                            html
                        ),
                        'could not find styles css bundle'
                    ).to.be.true;
                    done();
                }
            );
        });

        it('should do nothing when no patterns & multi output pages generated', (done) => {
            webpack(
                {
                    ...c.options,
                    plugins: [
                        ...c.options.plugins,
                        new HtmlWebpackPlugin({
                            ...HtmlWebpackPluginOptions,
                            filename: (entry) => `${entry}.html`,
                        }),
                        new HtmlWebpackSelectAssetsPlugin(),
                    ],
                },
                (err) => {
                    expect(!!err).to.be.false;
                    const html = getOutput('app');
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?other(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html
                        ),
                        'could not find other bundle'
                    ).to.be.true;
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html
                        ),
                        'could not find app bundle'
                    ).to.be.true;
                    expect(
                        /link\s+.*?href\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.css"/i.test(
                            html
                        ),
                        'could not find styles css bundle'
                    ).to.be.true;
                    const html2 = getOutput('other');
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?other(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html2
                        ),
                        'could not find other bundle'
                    ).to.be.true;
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html2
                        ),
                        'could not find app bundle'
                    ).to.be.true;
                    expect(
                        /link\s+.*?href\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.css"/i.test(
                            html2
                        ),
                        'could not find styles css bundle'
                    ).to.be.true;
                    done();
                }
            );
        });

        it('should only select assets relative to current entry if plugin.selector="smart"', (done) => {
            webpack(
                {
                    ...c.options,
                    plugins: [
                        ...c.options.plugins,
                        new HtmlWebpackPlugin({
                            ...HtmlWebpackPluginOptions,
                            filename: (entry) => `${entry}.html`,
                        }),
                        new HtmlWebpackSelectAssetsPlugin({
                            selector: 'smart',
                        }),
                    ],
                },
                (err) => {
                    expect(!!err).to.be.false;
                    const html = getOutput('app');
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html
                        ),
                        'could not find app bundle'
                    ).to.be.true;
                    expect(
                        /link\s+.*?href\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.css"/i.test(
                            html
                        ),
                        'could not find styles css bundle'
                    ).to.be.true;
                    const html2 = getOutput('other');
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?other(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html2
                        ),
                        'could not find other bundle'
                    ).to.be.true;
                    done();
                }
            );
        });

        it('should only select correct assets if plugin.selector set to function', (done) => {
            webpack(
                {
                    ...c.options,
                    plugins: [
                        ...c.options.plugins,
                        new HtmlWebpackPlugin({
                            ...HtmlWebpackPluginOptions,
                            filename: (entry) => `${entry}.html`,
                        }),
                        new HtmlWebpackSelectAssetsPlugin({
                            selector: (asset, context, type) => {
                                expect(type).to.oneOf([
                                    'script',
                                    'style',
                                    'meta',
                                ]);
                                const result = HtmlWebpackSelectAssetsPlugin.smartSelecor(
                                    asset,
                                    context,
                                    type
                                );
                                if (type === 'script') {
                                    expect(result).to.equal(
                                        context.entryFiles.includes(
                                            asset.attributes.src
                                        )
                                    );
                                } else if (type === 'style') {
                                    expect(result).to.equal(
                                        context.entryFiles.includes(
                                            asset.attributes.href
                                        )
                                    );
                                } else {
                                    expect(result).to.equal(false);
                                }
                                return result;
                            },
                        }),
                    ],
                },
                (err) => {
                    expect(!!err).to.be.false;
                    const html = getOutput('app');
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html
                        ),
                        'could not find app bundle'
                    ).to.be.true;
                    expect(
                        /link\s+.*?href\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.css"/i.test(
                            html
                        ),
                        'could not find styles css bundle'
                    ).to.be.true;
                    const html2 = getOutput('other');
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?other(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html2
                        ),
                        'could not find other bundle'
                    ).to.be.true;
                    done();
                }
            );
        });

        it('should only select correct assets if plugin.selector set to custom function', (done) => {
            webpack(
                {
                    ...c.options,
                    plugins: [
                        ...c.options.plugins,
                        new HtmlWebpackPlugin({
                            ...HtmlWebpackPluginOptions,
                            filename: (entry) => `${entry}.html`,
                        }),
                        new HtmlWebpackSelectAssetsPlugin({
                            selector: (asset, context, type) => {
                                expect(type).to.oneOf([
                                    'script',
                                    'style',
                                    'meta',
                                ]);
                                return context.entry === 'app';
                            },
                        }),
                    ],
                },
                (err) => {
                    expect(!!err).to.be.false;
                    const html = getOutput('app');
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html
                        ),
                        'could not find app bundle'
                    ).to.be.true;
                    expect(
                        /link\s+.*?href\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.css"/i.test(
                            html
                        ),
                        'could not find styles css bundle'
                    ).to.be.true;
                    const html2 = getOutput('other');
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?other(\.[a-z0-9]+\.min)?\.js"/i.test(
                            html2
                        ),
                        'find other bundle'
                    ).to.be.false;
                    expect(
                        /script\s+.*?src\s*=\s*"(\/)?other(\.[a-z0-9]+\.min)?\.css"/i.test(
                            html2
                        ),
                        'find other bundle'
                    ).to.be.false;
                    done();
                }
            );
        });
    });
});
