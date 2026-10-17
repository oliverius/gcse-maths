# KaTeX 0.16.22

Vendored from the published `katex@0.16.22` npm package (https://www.npmjs.com/package/katex/v/0.16.22).
The upstream ES module is saved as `katex.js` (originally `dist/katex.mjs`) for
static servers that do not map `.mjs` to a JavaScript MIME type. Its contents,
the minified stylesheet and bundled fonts are unmodified.
See `LICENSE` for the MIT license. Documentation: https://katex.org/docs/api.

These assets are committed so static hosting needs no npm install, build or CDN.
When upgrading, replace the module, stylesheet and fonts together, retain the license,
and run both the Node tests and browser notation checks.
