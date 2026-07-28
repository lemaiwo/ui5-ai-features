import ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Shared ODataModel singleton for the AI service.
 * All AI controls share this single instance to avoid duplicate $metadata requests.
 *
 * @namespace be.wl.ai
 */
let model: ODataModel | null = null;
let serviceUrl = "/odata/v4/ai/";

/**
 * Override the URL of the AI OData service. Defaults to "/odata/v4/ai/", which
 * matches where ui5-cap-ai-features-plugin serves the AIService when the app is
 * reached through the same origin as the CAP backend (e.g. behind an app router).
 * Call this early — e.g. in Component.init — if your setup exposes the service
 * under a different path.
 */
export function setAIServiceUrl(url: string): void {
  const normalized = url.endsWith("/") ? url : url + "/";
  if (normalized !== serviceUrl) {
    serviceUrl = normalized;
    if (model) {
      model.destroy();
      model = null;
    }
  }
}

export function getAIServiceUrl(): string {
  return serviceUrl;
}

export function getAIModel(): ODataModel {
  if (!model) {
    model = new ODataModel({ serviceUrl });
  }
  return model;
}

export interface AICallOptions {
  text2?: string;
  option?: string;
}

/**
 * Invoke the AI service with a predefined operation. Prompts live server-side —
 * the client only selects an operation key and, where applicable, an allowlisted
 * option (e.g. a language or tone key).
 */
export async function callAIService(
  operation: string,
  text: string,
  options?: AICallOptions
): Promise<string> {
  const context = getAIModel().bindContext("/processText(...)");
  context.setParameter("operation", operation);
  context.setParameter("text", text);
  if (options?.text2 !== undefined) {
    context.setParameter("text2", options.text2);
  }
  if (options?.option !== undefined) {
    context.setParameter("option", options.option);
  }
  await context.invoke();
  const result = context.getBoundContext().getObject() as { value: string } | undefined;
  return result?.value || "";
}
