/** @typedef {import("html-webpack-plugin").HtmlTagObject} HtmlTagObject */
/** @typedef {import("webpack/lib/Compilation.js")} WebpackCompilation */
/** @typedef {import("html-webpack-plugin").ProcessedOptions} ProcessedHtmlWebpackOptions */
/**
 * The type of asset
 * @typedef {"script"|"style"|"meta"} AssetType
 */
/**
 * The context for selector function.
 * @typedef {Object} SelectorContext
 * @property {string[]} entryFiles files belong to entry
 * @property {string} entry entry name
 * @property {string} outputName html-webpack-plugin html output name
 */
/**
 * @callback selectorFn
 * @param {HtmlTagObject} asset The asset to select
 * @param {SelectorContext} context context
 * @param {AssetType} type The type of asset
 * @returns {boolean}
 */
/**
 * @typedef {Object} PluginOptions
 * @property {selectorFn|string} selector
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const PLUGIN_NAME = 'HtmlSelectAssetsPlugin';

/**
 * Get entry's files.
 * @param {WebpackCompilation} compilation webpack compilation
 * @param {string} entryName entry name
 *
 * @returns {string[]} files
 */
const getEntryPointFiles = (compilation, entryName) => {
    if (!entryName) {
        return [];
    }
    const entryPointUnfilteredFiles = compilation.entrypoints
        .get(entryName)
        .getFiles();

    const entryPointFiles = entryPointUnfilteredFiles.filter((chunkFile) => {
        const asset = compilation.getAsset && compilation.getAsset(chunkFile);
        if (!asset) {
            return true;
        }
        // Prevent hot-module files from being included:
        const assetMetaInformation = asset.info || {};
        return !(
            assetMetaInformation.hotModuleReplacement ||
            assetMetaInformation.development
        );
    });
    return entryPointFiles;
};

/**
 * Get entry name from outputName.
 * @param {string[]} entryNames entry names
 * @param {string} outputName html-webpack-plugin's output name of html
 * @param {ProcessedHtmlWebpackOptions} options
 *
 * @returns {string?} current entry name.
 */
const retrieveCurrentEntry = (entryNames, outputName, options) => {
    const userOptionFilename = options.filename;
    const filenameFunction =
        typeof userOptionFilename === 'function'
            ? userOptionFilename
            : // Replace '[name]' with entry name
              (entryName) => userOptionFilename.replace(/\[name\]/g, entryName);
    let currentEntry = '';
    if (
        entryNames.some((v) => {
            const name = filenameFunction(v);
            currentEntry = v;
            return name === outputName;
        })
    ) {
        return currentEntry;
    }
};

/**
 * The selector function for "smart".
 * @param {HtmlTagObject} asset The asset to select
 * @param {SelectorContext} context context
 * @param {AssetType} type The type of asset
 *
 * @returns {boolean}
 */
const smartSelecor = (asset, { entryFiles }, type) => {
    // Don't handle meta asset.
    if (type === 'meta') {
        return true;
    }
    const assetUrl = asset.attributes.src || asset.attributes.href;
    return entryFiles.some((v) => assetUrl.endsWith(v));
};

/**
 * Check whether preserve or drop the asset.
 * @param {HtmlTagObject} asset The asset to select
 * @param {SelectorContext} context context
 * @param {AssetType} type The type of asset
 * @param {selectorFn} selector selector funtion
 *
 * @returns {boolean}
 */
const selectAsset = (asset, context, type, selector) => {
    if (selector === 'smart') {
        return smartSelecor(asset, context, type);
    }
    if (typeof selector === 'function') {
        return selector(asset, context, type);
    }
    return true;
};

module.exports = class HtmlSelectAssetsPlugin {
    static smartSelecor = smartSelecor;
    /**
     * @param {PluginOptions} options
     */
    constructor({ selector } = {}) {
        this.selector = selector;
    }

    apply(compiler) {
        const selector = this.selector;
        // Only support webpack>=5 & html-webpack>=5
        if (!HtmlWebpackPlugin.getHooks) {
            throw new Error('Cannot find appropriate compilation hook');
        }
        compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
            const hooks = HtmlWebpackPlugin.getHooks(compilation);
            hooks.alterAssetTags.tapAsync(PLUGIN_NAME, (data, cb) => {
                const entryNames = Array.from(compilation.entrypoints.keys());
                // Get the current instance entry name.
                const currentEntry =
                    retrieveCurrentEntry(
                        entryNames,
                        data.outputName,
                        data.plugin.options
                    ) || path.parse(data.outputName).name;
                if (!currentEntry) {
                    return cb(null, data);
                }
                // Get entry files for current entry.
                const entryFiles = getEntryPointFiles(
                    compilation,
                    currentEntry
                );
                // Now we can select assets by entry name.
                const context = {
                    entry: currentEntry,
                    outputName: data.outputName,
                    entryFiles,
                };
                data.assetTags.scripts = data.assetTags.scripts.filter(
                    (asset) => selectAsset(asset, context, 'script', selector)
                );
                data.assetTags.styles = data.assetTags.styles.filter((asset) =>
                    selectAsset(asset, context, 'style', selector)
                );
                data.assetTags.meta = data.assetTags.meta.filter((asset) =>
                    selectAsset(asset, context, 'meta', selector)
                );
                return cb(null, data);
            });
        });
    }
};
