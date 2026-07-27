const cds = global.cds || require("@sap/cds");

const LOG = cds.log("ai-features");

// Opt-in activation: installing the plugin does nothing by itself. The consuming
// project enables it through its cds configuration, e.g. in package.json:
//   { "cds": { "requires": { "ai-features": true } } }
// Setting the entry to false (or removing it) disables the plugin again.
const enabled = !!cds.env.requires["ai-features"];

if (enabled) {
  // Contribute the AI Core service requirement, keeping any existing
  // configuration (e.g. a hybrid-profile binding) intact
  cds.env.requires.AICORE = { kind: "aicore", ...cds.env.requires.AICORE };

  cds.once("served", () => {
    const srv = cds.services.AIService;
    if (srv) LOG.info(`AIService ready at ${srv.path}`);
  });
} else {
  LOG.debug(
    'ui5-cap-ai-features-plugin is installed but not enabled — add { "cds": { "requires": { "ai-features": true } } } to your package.json to activate it'
  );
}
