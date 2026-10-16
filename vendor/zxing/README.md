# Barcode reader (build 76)

iPhone Safari, and so every browser on an iPhone, has no built-in barcode reader (`BarcodeDetector`). Android Chrome has one and Gauntlet uses it there. Everywhere else the scanner loads this reader instead: ZXing-C++ compiled to WebAssembly, from the npm package `zxing-wasm` 3.1.5 (MIT; ZXing-C++ is Apache 2.0, see LICENSE).

- `zxing-reader.js` is `dist/iife/reader/index.js` from the package, unmodified. It defines the global `ZXingWASM`.
- `zxing_reader.wasm` is `dist/reader/zxing_reader.wasm`, unmodified. Its SHA-256 is `aecc1876de036c62c8419f67a5e1a16b1698a325bcd190aa84810d516e263931`, the same as `ZXING_WASM_SHA256` inside `zxing-reader.js` (the scanner tests check they match).

They are loaded only when someone opens the scanner on a phone without a built-in reader (or when the food sheet opens there, in the background), never on first open of the app. The service worker keeps them after the first time, so scanning works offline.

To update: `npm pack zxing-wasm@<version>`, untar, copy the two files above over these, update the version and hash here, run `npm test`.
