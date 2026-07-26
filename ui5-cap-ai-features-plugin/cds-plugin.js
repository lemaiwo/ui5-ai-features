const cds = global.cds || require("@sap/cds");

const LOG = cds.log("ai-features");

cds.once("served", () => {
  const srv = cds.services.AIService;
  if (srv) LOG.info(`AIService ready at ${srv.path}`);
});
