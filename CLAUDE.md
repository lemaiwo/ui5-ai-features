# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAP CAP (Cloud Application Programming Model) + SAPUI5 TypeScript application that provides AI-powered text processing features via SAP AI Core's Orchestration Service. The app namespace is `be.wl.ai.aidemo`.

The reusable parts are packaged for npm distribution and consumed by the demo via npm workspaces:
- **`app/ai-lib`** → npm package `be.wl.ai` (UI5 control library, prebuilt `dist/` is shipped; `prepublishOnly` runs the build)
- **`ui5-cap-ai-features-plugin/`** → npm package `ui5-cap-ai-features-plugin` (CDS plugin providing the AI backend service)

## Commands

### Local Development
```bash
npm run watch-aidemo          # Start CDS server with live reload, opens the aidemo app
npm run watch-hybrid          # Same but with hybrid profile (connects to real SAP AI Core service)
npm run bind                  # Bind to AI Core instance on BTP (creates .cdsrc-private.json)
```

### Build & Deploy (SAP BTP Cloud Foundry)
```bash
npm run build                 # Clean + MBT build (generates mta_archives/archive.mtar)
npm run deploy                # Deploy MTAR to Cloud Foundry
npm run undeploy              # Remove app + services from Cloud Foundry
```

### UI5 App Build (app/aidemo)
```bash
cd app/aidemo && npm run build:cf   # UI5 preload build with deploy config
```

### Linting
```bash
npx eslint .                  # Root uses @sap/cds ESLint config
cd app/aidemo && npx eslint . # UI5 app has its own ESLint config (@sap-ux/eslint-plugin-fiori-tools)
```

## Architecture

### Backend (CAP - Node.js)

- **`db/schema.cds`** - Domain model (Books entity in `my.bookshop` namespace)
- **`srv/cat-service.cds`** - CatalogService exposing Books as read-only projection
- **`ui5-cap-ai-features-plugin/`** - CDS plugin that provides the AIService. Opt-in: it only activates when the consuming project sets `"ai-features": true` in its `cds.requires` (the plugin ships a `cds.requires.kinds` preset that loads its `index.cds` model; its `cds-plugin.js` then contributes the `AICORE` service requirement). Setting the entry to `false` or removing it makes the installed plugin fully inert.
  - **`srv/ai-service.cds`** - AIService with `processText(operation, text, text2, option)` action, bound to its implementation via `@impl`. Prompts are maintained server-side in a registry in `srv/ai-service.js` — clients send an operation key (e.g. `polish`, `translate`) plus an allowlisted `option` (language/tone key) where applicable. The handler enforces input length limits and per-user rate limiting, and returns generic error messages.
  - **`srv/ai-service.js`** - Implementation using `@sap-ai-sdk/orchestration` `OrchestrationClient` to call SAP AI Core. Model name, token/temperature params, text-length limit, and rate limits are overridable via the consuming project's `cds.ai` config section.

The CAP server exposes two OData V4 services: `/odata/v4/catalog/` and `/odata/v4/ai/`.

### Frontend (SAPUI5 TypeScript - `app/aidemo/webapp/`)

Written in TypeScript, transpiled via `ui5-tooling-transpile`. Uses SAPUI5 1.144.x with `@sapui5/types`.

Key custom controls:
- **`app/ai-lib/src/be/wl/ai/`** - Reusable UI5 custom controls (e.g. `AIPolishButton` extending `sap/m/Button` via `AIBaseButton`). Each control invokes a fixed server-side operation key (see `getOperation()`) through the shared `callAIService` helper in `AIModel.ts` — prompts are not configurable from the client. Configurable properties are limited to UI texts (`dialogTitle`, `outputLabel`, …) and bindable values.

The app uses two OData models: default (`""`) for CatalogService and `"ai"` for AIService.

### Deployment (MTA)

Deployed as a Multi-Target Application to SAP BTP Cloud Foundry. Modules: CAP server (`bc-aiui-features-srv`), App Router (`bc-aiui-features`), HTML5 app deployer, and the UI5 app. Required services: XSUAA, Connectivity, Destination, AI Core (extended plan), HTML5 repo.

### Workspace Structure

npm workspaces configured with `app/*` and `ui5-cap-ai-features-plugin`. The `app/router` package is the SAP App Router. The `cds-plugin-ui5` dev dependency serves the UI5 app through the CDS server during development. The root project depends on `ui5-cap-ai-features-plugin`, resolved to the workspace folder locally (must be published to npm for MTA builds outside the workspace).

## Key Patterns

- CAP services are defined in `.cds` files and implemented in same-name `.js` files
- UI5 controls use `static readonly metadata` for properties/events and `static readonly renderer` to reuse parent renderers
- The hybrid profile (`.cdsrc-private.json`) binds to a real AI Core instance on Cloud Foundry for local testing against remote services
