import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type ManagedObject from "sap/ui/base/ManagedObject";

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
 * matches where the ui5-cap-ai-features CDS plugin serves the AIService when the app is
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

/**
 * Name of the model the AI controls look for on themselves (propagated from
 * the view/component) before falling back to the library's own singleton.
 * Consuming apps can define an OData V4 model named "ai" in their manifest —
 * with a dataSource URI resolved relative to the app — and all AI controls
 * will use it automatically. This is the recommended setup when the app and
 * the CAP backend are deployed separately (e.g. behind SAP Build Work Zone,
 * connected through a destination route).
 */
export const AI_MODEL_NAME = "ai";

/**
 * Resolve the OData model to use for a given control: the nearest model named
 * "ai" if one is provided by the app, otherwise the shared singleton.
 */
export function getAIModelFor(requestor?: ManagedObject): ODataModel {
  const contextual = requestor?.getModel(AI_MODEL_NAME);
  if (contextual instanceof ODataModel) {
    return contextual;
  }
  return getAIModel();
}

export interface AICallOptions {
  text2?: string;
  option?: string;
  /** Model to use for the call — defaults to the shared singleton */
  model?: ODataModel;
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
  const context = (options?.model ?? getAIModel()).bindContext("/processText(...)");
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
