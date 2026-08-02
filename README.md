# UI5 AI Features

Demo project showing AI-powered text processing in SAPUI5 apps, built on SAP CAP and SAP AI Core's Orchestration Service.

The reusable part is packaged for distribution as **one npm package**, [`ui5-cap-ai-features`](ui5-cap-ai-features), containing both halves:

- a CAP CDS plugin that serves the `AIService` (`/odata/v4/ai`) backed by SAP AI Core
- the `be.wl.ai` UI5 control library (AI Polish Button, AI Translate Button, AI Autocomplete, ...) that calls it

It is consumed by the demo through npm workspaces — by the CAP root for the backend and by `app/aidemo` for the controls — so this repo doubles as the integration test for the published package.

## Project Layout

File or Folder | Purpose
---------|----------
`app/aidemo/` | SAPUI5 TypeScript demo app showcasing all AI controls
`ui5-cap-ai-features/` | The combined npm package: CDS plugin (`cds-plugin.js`, `srv/`) + UI5 library `be.wl.ai` (`src/`, `ui5.yaml`)
`app/router/` | SAP App Router for BTP deployment
`db/` | Domain model (Books demo entity)
`srv/` | CatalogService of the demo app (the AI service comes from the plugin)
`mta.yaml` | Multi-Target Application descriptor for BTP Cloud Foundry deployment

## Getting Started

```sh
npm install
npm run bind             # bind to your AI Core instance on BTP (once)
npm run watch-hybrid     # cds watch with the AI Core binding
```

Or without a real AI Core connection: `npm run watch-aidemo`.

Before the demo app can load the UI5 library, build it once:

```sh
cd ui5-cap-ai-features && npm run build
```

## Using the package in your own project

Backend (CAP):

```sh
npm install ui5-cap-ai-features @sap-ai-sdk/orchestration
```

then enable it in your project's cds configuration:

```json
"cds": { "requires": { "ai-features": true } }
```

Frontend (UI5 app):

```sh
npm install ui5-cap-ai-features
```

See the [package README](ui5-cap-ai-features/README.md) for usage, configuration, the Work Zone consumption scenario, and BTP deployment from the npm package.

## Publishing

```sh
cd ui5-cap-ai-features && npm publish    # prepublishOnly builds dist/ incl. the deployable bewlai.zip
```

Note: the root project depends on `ui5-cap-ai-features@^1.0.0`. Inside this repo that resolves to the workspace folder; for an MTA build/deployment outside the workspace the package must be available on npm.

## Deploy to SAP BTP (Cloud Foundry)

```sh
npm run build
npm run deploy
```

Required services: XSUAA, Connectivity, Destination, AI Core (`extended` plan), HTML5 Application Repository.

## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.
