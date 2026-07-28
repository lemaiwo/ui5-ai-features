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

### Configuring the service URL

By default the controls call the AI service at `/odata/v4/ai/` — CAP's default path for the plugin's `AIService`. This works out of the box when the app is served from the same origin as the CAP backend: during local development (`cds watch` serves both) as well as deployed behind an app router with the usual `^/odata/(.*)` route.

If your setup exposes the service under a different prefix (e.g. a destination route like `/backend/odata/v4/ai`), set the URL once before the first AI control is used, e.g. in `Component.init`:

```ts
import { setAIServiceUrl } from "be/wl/ai/AIModel";

export default class Component extends UIComponent {
  public init(): void {
    super.init();
    setAIServiceUrl("/backend/odata/v4/ai/");
  }
}
```

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
