const cds = global.cds || require("@sap/cds");

const LOG = cds.log("ai-features");

// Opt-in activation: installing the package does nothing by itself. The consuming
// project enables the backend through its cds configuration, e.g. in package.json:
//   { "cds": { "requires": { "ai-features": true } } }
// Setting the entry to false (or removing it) disables the plugin again.
// The UI5 library half of this package is unaffected by this switch — UI5 apps
// pick it up via the shipped ui5.yaml.
const enabled = !!cds.env.requires["ai-features"];

if (enabled) {
  // @sap-ai-sdk/orchestration is an optional peer dependency so that pure
  // frontend installs stay lean — backend projects must provide it themselves
  try {
    require.resolve("@sap-ai-sdk/orchestration");
  } catch {
    throw new Error(
      "[ai-features] The 'ai-features' plugin is enabled but '@sap-ai-sdk/orchestration' is not installed. " +
        "Run: npm install @sap-ai-sdk/orchestration"
    );
  }

  // Contribute the AI Core service requirement, keeping any existing
  // configuration (e.g. a hybrid-profile binding) intact
  cds.env.requires.AICORE = { kind: "aicore", ...cds.env.requires.AICORE };

  cds.once("served", () => {
    const srv = cds.services.AIService;
    if (srv) LOG.info(`AIService ready at ${srv.path}`);
  });
} else {
  LOG.debug(
    'ui5-cap-ai-features is installed but its backend is not enabled — add { "cds": { "requires": { "ai-features": true } } } to your package.json to activate it'
  );
}
