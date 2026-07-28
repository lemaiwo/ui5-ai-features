# be.wl.ai — AI Controls Library for UI5

A UI5 library (TypeScript, works with SAPUI5 and OpenUI5) providing ready-to-use AI-powered controls for text processing:

| Control | Purpose |
|---|---|
| `AIPolishButton` | Polish/improve a text (grammar, clarity, professionalism) |
| `AISummarizeButton` | Summarize a text |
| `AITranslateButton` | Translate a text (language picker included) |
| `AIToneButton` | Rewrite a text in a selected tone |
| `AIGenerateButton` | Generate text from a description |
| `AISpellCheckButton` | Spelling/grammar corrections incl. summary of changes |
| `AIExtractKeywordsButton` | Extract keywords from a text |
| `AICompareTexts` | Compare two texts |
| `AIInputSuggestion` | Input with AI improvement suggestion |
| `AIAutoComplete` | TextArea with AI auto-completion |
| `AISentimentIndicator` | Sentiment analysis indicator |

Each control invokes a fixed server-side operation — prompts live in the backend, not in the client. The backend is provided by the companion CAP plugin [`ui5-cap-ai-features-plugin`](https://www.npmjs.com/package/ui5-cap-ai-features-plugin), which serves the expected `AIService` at `/odata/v4/ai` on top of SAP AI Core's Orchestration Service.

## Installation

Add the library to your UI5 app:

```sh
npm install be.wl.ai
```

The published package ships the prebuilt library (`dist/`) together with a `ui5.yaml`, so the UI5 tooling (v3+) picks it up automatically as a framework project dependency — no extra configuration needed for local development with `ui5 serve`.

Declare the library in your app's `manifest.json`:

```json
"sap.ui5": {
  "dependencies": {
    "libs": {
      "be.wl.ai": {}
    }
  }
}
```

## Usage

Use the controls in your XML views via the `be.wl.ai` namespace. The `value` property supports two-way binding, so accepted AI results are written back to your model:

```xml
<mvc:View
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:ai="be.wl.ai">
    <TextArea value="{/sourceText}" width="100%" rows="8" />
    <OverflowToolbar>
        <ai:AIPolishButton text="Polish" value="{/sourceText}" />
        <ai:AISummarizeButton text="Summarize" value="{/sourceText}" />
        <ai:AITranslateButton text="Translate" value="{/sourceText}" />
        <ai:AIToneButton text="Change Tone" value="{/sourceText}" />
    </OverflowToolbar>
</mvc:View>
```

Configurable properties are limited to UI texts (e.g. `dialogTitle`, `outputLabel`) and bindable values — the AI prompts themselves are maintained server-side and cannot be altered from the client.

## Backend requirement

This library is one half of a pair — it is designed for UI5 apps with a CAP backend and does nothing useful without it. The controls call `POST /odata/v4/ai/processText` on the same origin. In a CAP project, install and enable the companion plugin:

```sh
npm install ui5-cap-ai-features-plugin
```

```json
"cds": { "requires": { "ai-features": true } }
```

For any other backend, expose an OData V4 service at `/odata/v4/ai` with a matching `processText(operation, text, text2, option)` action.

### How the controls find the AI service

The controls resolve their OData model in this order:

1. **A model named `ai`** propagated to the control (e.g. defined in your app's `manifest.json`) — used automatically whenever present.
2. The library's shared singleton, targeting the URL set via `setAIServiceUrl(url)`.
3. Default: `/odata/v4/ai/` on the same origin — CAP's default path for the plugin's `AIService`. Works out of the box when the app is served from the same origin as the CAP backend: local development (`cds watch` serves both) and deployments behind one app router.

### Consuming from a separate deployment (SAP Build Work Zone)

The backend and the app do **not** have to live in the same MTA/monorepo. A typical setup: one "provider" MTA deploys the CAP service (with `ui5-cap-ai-features-plugin`) and this library to the HTML5 Application Repository; other UI5 apps in their own MTAs consume both via Work Zone:

1. **Library resolution:** declare `"be.wl.ai": {}` under `sap.ui5/dependencies/libs`. When both the library and your app are deployed to the HTML5 Application Repository in the same subaccount (or shared via content federation), the Work Zone runtime resolves the library from the provider's deployment — no bundling needed.

2. **Service connectivity:** create a destination to the provider's CAP service and add a route to your app's `xs-app.json`:

   ```json
   {
     "source": "^/odata/v4/ai/(.*)$",
     "target": "/odata/v4/ai/$1",
     "destination": "ai-features-srv",
     "authenticationType": "xsuaa"
   }
   ```

3. **Model:** under the managed app router, routes are scoped to your app's path, so define the service as an app-relative dataSource and name the model `ai` in your `manifest.json` — the controls pick it up automatically:

   ```json
   "sap.app": {
     "dataSources": {
       "aiService": {
         "uri": "odata/v4/ai/",
         "type": "OData",
         "settings": { "odataVersion": "4.0" }
       }
     }
   },
   "sap.ui5": {
     "models": {
       "ai": { "dataSource": "aiService" }
     }
   }
   ```

   Note the **relative** URI (no leading slash) — it resolves against your app's base path and therefore hits the route from step 2.

Alternatively, without a named model, set an explicit URL once before the first AI control is used, e.g. in `Component.init`:

```ts
import { setAIServiceUrl } from "be/wl/ai/AIModel";

export default class Component extends UIComponent {
  public init(): void {
    super.init();
    setAIServiceUrl("/backend/odata/v4/ai/");
  }
}
```

## Deploying to SAP BTP from the npm package

The published package ships a ready-to-deploy HTML5 Application Repository archive at `node_modules/be.wl.ai/dist/bewlai.zip` (library resources with `manifest.json`, prebuilt and zipped). That means an MTA can deploy this library **without the library's source and without any UI5 app** — for example a headless "provider" MTA containing only the CAP service (with `ui5-cap-ai-features-plugin`) and the library content for consumption by other apps via SAP Build Work Zone.

Create a small content folder in your project, e.g. `ai-lib-content/package.json`:

```json
{
  "name": "ai-lib-content",
  "private": true,
  "dependencies": { "be.wl.ai": "^1.0.0" },
  "scripts": {
    "copy-archive": "node -e \"const fs=require('fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('node_modules/be.wl.ai/dist/bewlai.zip','dist/bewlai.zip')\""
  }
}
```

and wire it into your `mta.yaml` next to the CAP server module:

```yaml
modules:
  # ... your CAP srv module (with ui5-cap-ai-features-plugin enabled) ...
  - name: ai-provider-app-deployer
    type: com.sap.application.content
    path: gen
    requires:
      - name: ai-provider-html5-repo-host
        parameters:
          content-target: true
    build-parameters:
      build-result: app/
      requires:
        - artifacts: [bewlai.zip]
          name: bewlai
          target-path: app/
  - name: bewlai
    type: html5
    path: ai-lib-content
    build-parameters:
      build-result: dist
      builder: custom
      commands:
        - npm install
        - npm run copy-archive
      supported-platforms: []
resources:
  - name: ai-provider-html5-repo-host
    type: org.cloudfoundry.managed-service
    parameters:
      service: html5-apps-repo
      service-plan: app-host
```

Consumer apps then resolve the library through Work Zone (see the previous section) and reach the CAP service via a destination pointing at the provider's `srv` URL. The same copy-archive trick also works inside a *consumer's* MTA if you prefer each app to deploy its own copy of the library instead of consuming a centrally provisioned one.

## Development

```sh
npm install
npm run build     # transpiles TypeScript and builds the library into dist/
```

The package's `ui5.yaml` points at `dist/`, so consumers always get the prebuilt resources; `prepublishOnly` makes sure `dist/` is rebuilt before publishing.

## Example

A complete demo project (CAP + SAPUI5 TypeScript app) is available at [lemaiwo/ui5-ai-features](https://github.com/lemaiwo/ui5-ai-features).

## License

Apache-2.0
