# Three.js 0.160.1

Vendored from the official npm package `three@0.160.1`:
https://registry.npmjs.org/three/-/three-0.160.1.tgz

The upstream MIT license is included as `LICENSE`.

`three.module.min.js` is unchanged. `GLTFLoader.js` and
`BufferGeometryUtils.js` have only their module import paths changed to these
local files. This removes the runtime CDN and import-map dependency for the
new stability builds. Earlier game versions are unaffected.
