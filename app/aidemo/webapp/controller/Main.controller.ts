import Controller from "sap/ui/core/mvc/Controller";
import type { TextArea$LiveChangeEvent } from "sap/m/TextArea";
import type AISentimentIndicator from "../control/AISentimentIndicator";

/**
 * @namespace com.eliagroup.ai.aidemo.controller
 */
export default class Main extends Controller {

    public onInit(): void {
        // intentionally empty
    }

    public onSentimentTextChange(event: TextArea$LiveChangeEvent): void {
        const text = event.getParameter("value") || "";
        const indicator = this.byId("demoSentimentIndicator") as AISentimentIndicator;
        if (indicator) {
            indicator.setProperty("text", text);
        }
    }
}
