# html-webpack-select-assets-plugin
Select certain output files to the html file. Works with newer html-webpack-plugin versions.

[![Build Status](https://travis-ci.com/creeperyang/html-webpack-select-assets-plugin.svg?branch=main)](https://travis-ci.com/creeperyang/html-webpack-select-assets-plugin)

[![NPM](https://nodei.co/npm/html-webpack-select-assets-plugin.png)](https://nodei.co/npm/html-webpack-select-assets-plugin/)

> Only for webpack@5 and html-webpack-plugin@5 or higher.
## Usage

1. Install via `npm i -D html-webpack-select-assets-plugin`.
1. Add to your webpack config **AFTER** HtmlWebpackPlugin.

```js
const HtmlWebpackSelectAssetsPlugin = require('html-webpack-select-assets-plugin');
// OR
import HtmlWebpackSelectAssetsPlugin from 'html-webpack-select-assets-plugin';

// And for webpack config
{
    entry: {
        app: join(__dirname, './src/entry.js'),
        other: join(__dirname, './src/other.js'),
    },
    // ...
    plugins: [
        new HtmlWebpackPlugin({
            filename: (entry) => `${entry}.html`,
            template: join(__dirname, './src/index.html'),
        }),
        new HtmlWebpackSelectAssetsPlugin({
            selector: 'smart',
        }),
    ]
}
```

The plugin takes a configuration argument with a key called `selector`. It will help you to select assets to the specified output html.

The typical or **most powerful usage case** is when you deal with **multiple** html pages:

- You have multiple `entry` for webpack entry config;
- Only one HtmlWebpackPlugin instance and config with `filename: (entry) => entry + '.html'` to generate multiple html files (one-to-one correspond to each entry point).

The problem is that HtmlWebpackPlugin will inject all (entries') assets files to each html file. What if you only want the corresponding entry's assets? 

This is why `html-webpack-select-assets-plugin` here -- select assets corresponding to the entry.

## Powerful `selector` option

- **`"smart"`**: only select assets corresponding to each entry automatically. This means if you want to generate `app.html` for `entry:app.js`, only `app.js` and assets imported by `app.js` will be injected.

- **`function selector(asset:HtmlTagObject, context:SelectorContext, type:AssetType):boolean`**: you can write your custom selector function to choose assets flexibly. 

    - `HtmlTagObject`: `{attributes,meta,tagName}`, the type is defined by `html-webpack-plugin` and represents the asset.
    - `SelectorContext`: `{entry:string, outputName:string, entryFiles:string[]}`, the context info for the asset. `entry` means entry name, `outputName` is current generated html file's name, and `entryFiles` means all assets associated with the `entry`.
    - `AssetType`: enum `"script"|"style"|"meta"`, means the type of the asset.

