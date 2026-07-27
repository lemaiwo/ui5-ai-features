# UI5 AI Features

Demo project showing AI-powered text processing in SAPUI5 apps, built on SAP CAP and SAP AI Core's Orchestration Service.

The reusable parts are packaged for distribution via npm:

| Package | Location | Purpose |
|---|---|---|
| [`be.wl.ai`](app/ai-lib) | `app/ai-lib` | UI5 library with AI controls (AI Polish Button, AI Translate Button, AI Autocomplete, ...) |
| [`ui5-cap-ai-features-plugin`](ui5-cap-ai-features-plugin) | `ui5-cap-ai-features-plugin` | CDS plugin that serves the `AIService` (`/odata/v4/ai`) the controls call |

Both are consumed by the demo through npm workspaces, so this repo doubles as the integration test for the published packages.

## Project Layout

File or Folder | Purpose
---------|----------
`app/aidemo/` | SAPUI5 TypeScript demo app showcasing all AI controls
`app/ai-lib/` | UI5 library `be.wl.ai` (publishable to npm)
`ui5-cap-ai-features-plugin/` | CAP CDS plugin providing the AI backend service (publishable to npm)
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
cd app/ai-lib && npm run build
```

## Using the packages in your own project

Backend (CAP):

```sh
npm install ui5-cap-ai-features-plugin
```

then enable it in your project's cds configuration:

```json
"cds": { "requires": { "ai-features": true } }
```

Frontend (UI5 app):

```sh
npm install be.wl.ai
```

See the package READMEs ([plugin](ui5-cap-ai-features-plugin/README.md), [library](app/ai-lib/README.md)) for details on usage and configuration.

## Publishing

Both packages are published from their folders:

```sh
cd app/ai-lib && npm publish                    # prepublishOnly builds dist/ first
cd ui5-cap-ai-features-plugin && npm publish
```

Note: the root project depends on `ui5-cap-ai-features-plugin@^1.0.0`. Inside this repo that resolves to the workspace folder; for an MTA build/deployment outside the workspace the plugin must be available on npm.

## Deploy to SAP BTP (Cloud Foundry)

```sh
npm run build
npm run deploy
```

Required services: XSUAA, Connectivity, Destination, AI Core (`extended` plan), HTML5 Application Repository.

## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.
