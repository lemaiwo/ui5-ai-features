# ui5-cap-ai-features-plugin

CAP (Cloud Application Programming Model) plugin that adds an AI text-processing service to your CAP project, backed by SAP AI Core's Orchestration Service.

It is the backend counterpart of the [`be.wl.ai`](https://www.npmjs.com/package/be.wl.ai) UI5 library, which provides ready-to-use AI controls (AI Polish Button, AI Translate Button, AI Autocomplete, ...) that call this service. The plugin can also be used on its own from any OData client.

## What you get

Simply installing the plugin serves an `AIService` at `/odata/v4/ai` with a single action:

```
POST /odata/v4/ai/processText
{ "operation": "polish", "text": "text to process", "text2": null, "option": null }
```

Supported operations: `polish`, `summarize`, `translate`, `tone`, `generate`, `spellcheck`, `spellcheckSummary`, `keywords`, `compare`, `suggest`, `autocomplete`, `sentiment`.

All prompts are maintained server-side in the plugin — clients only send an operation key plus, where applicable, an allowlisted `option` (a language key for `translate`, a tone key for `tone`). The handler enforces input length limits and per-user rate limiting, and returns generic error messages so no internals leak to the client.

## Installation

```sh
npm install ui5-cap-ai-features-plugin
```

That's it — CAP discovers the plugin automatically (via its `cds-plugin.js`), loads the `AIService` model and serves it. No `using` statement or configuration is required.

The plugin also registers the AI Core service requirement in your project's effective configuration:

```json
"AICORE": { "kind": "aicore" }
```

## Requirements

- `@sap/cds` >= 8 (peer dependency)
- An SAP AI Core instance (`extended` plan) with a deployed orchestration deployment. The plugin uses [`@sap-ai-sdk/orchestration`](https://github.com/SAP/ai-sdk-js), which picks up the AI Core binding automatically.

For local development, bind to your AI Core instance on BTP:

```sh
cds bind AICORE --to aicore --profile hybrid
cds watch --profile hybrid
```

## Configuration

Defaults can be overridden in the `cds.ai` section of your project's `package.json` (or `.cdsrc.json`):

```json
{
  "cds": {
    "ai": {
      "model": "anthropic--claude-4.6-sonnet",
      "maxTokens": 4096,
      "temperature": 0.7,
      "maxTextLength": 20000,
      "rateLimitWindowMs": 60000,
      "rateLimitMaxRequests": 20
    }
  }
}
```

| Option | Default | Description |
|---|---|---|
| `model` | `anthropic--claude-4.6-sonnet` | Model name passed to the Orchestration Service |
| `maxTokens` | `4096` | `max_tokens` model parameter |
| `temperature` | `0.7` | `temperature` model parameter |
| `maxTextLength` | `20000` | Maximum length of `text` / `text2` inputs |
| `rateLimitWindowMs` | `60000` | Rate-limit window per user |
| `rateLimitMaxRequests` | `20` | Maximum requests per user per window |

## Using it with the UI5 controls

Install the companion UI5 library in your UI5 app:

```sh
npm install be.wl.ai
```

and drop the controls into your views:

```xml
<mvc:View xmlns="sap.m" xmlns:ai="be.wl.ai">
  <TextArea value="{/sourceText}" />
  <ai:AIPolishButton text="Polish" value="{/sourceText}" />
</mvc:View>
```

The controls call `POST /odata/v4/ai/processText` — exactly what this plugin serves.

## Example

A complete demo project (CAP + SAPUI5 TypeScript app using both this plugin and the UI5 library) is available at [lemaiwo/ui5-ai-features](https://github.com/lemaiwo/ui5-ai-features).

## License

MIT
