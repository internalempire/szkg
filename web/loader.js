/* Select the default Sigma renderer or the legacy Cytoscape safety fallback. */
(function () {
  const parameters = new URLSearchParams(window.location.search);
  const useCytoscape = parameters.get("renderer") === "cytoscape";
  const files = useCytoscape
    ? [
        "vendor/cytoscape.min.js",
        "vendor/layout-base.js",
        "vendor/cose-base.js",
        "vendor/cytoscape-fcose.js",
        "app-cytoscape.js",
      ]
    : ["dist/app-sigma.bundle.js"];

  // Cytoscape extensions depend on earlier files, so load scripts in order.
  function load(index) {
    if (index >= files.length) return;
    const script = document.createElement("script");
    script.src = files[index];
    script.onload = () => load(index + 1);
    script.onerror = () => {
      document.getElementById("loading").textContent =
        `Could not load ${files[index]}. Run 'npm run build:web' in the project directory.`;
    };
    document.body.appendChild(script);
  }
  load(0);
})();
