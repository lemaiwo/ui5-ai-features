import ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Shared ODataModel singleton for the AI service.
 * All AI controls share this single instance to avoid duplicate $metadata requests.
 *
 * @namespace be.wl.ai
 */
let model: ODataModel | null = null;

export function getAIModel(): ODataModel {
  if (!model) {
    model = new ODataModel({ serviceUrl: "/odata/v4/ai/" });
  }
  return model;
}
