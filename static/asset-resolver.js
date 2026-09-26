// Explicit project asset lookup; never patches browser prototypes.
(() => {
  const paths = JSON.parse(document.getElementById('wiki-assets').textContent);
  window.stingAssetUrl = (path) => {
    if (!Object.hasOwn(paths, path)) throw new Error('Unknown wiki asset: ' + path);
    return paths[path];
  };
})();
