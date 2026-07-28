import Control from "sap/ui/core/Control";
import type RenderManager from "sap/ui/core/RenderManager";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import { callAIService, getAIModelFor } from "./AIModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";

/**
 * AIAutoComplete - A control that attaches to an existing Input or TextArea
 * and provides an AI-powered text completion button. The user writes partial text
 * and clicks the button to have AI complete it.
 *
 * @namespace be.wl.ai
 */
export default class AIAutoComplete extends Control {
  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * Tooltip for the complete button
       */
      buttonTooltip: {
        type: "string",
        defaultValue: "Complete text with AI"
      },
      value: {
        type: "string",
        defaultValue: ""
      }
    },
    events: {
      /**
       * Fired when text has been successfully completed
       */
      textCompleted: {
        parameters: {
          originalText: { type: "string" },
          completedText: { type: "string" }
        }
      }
    }
  };

  private _button: Button | null;

  init(): void {
    super.init();
    
  }

  static readonly renderer = {
    apiVersion: 2,
    render(rm: RenderManager, control: AIAutoComplete): void {
      rm.openStart("div", control);
      rm.class("aiAutoComplete");
      rm.style("display", "inline-block");
      rm.openEnd();
      const button = control._getButton();
      rm.renderControl(button);
      rm.close("div");
    }
  };

  private _getButton(): Button {
    if (!this._button) {
      this._button = new Button(this.getId() + "-btn", {
        icon: "sap-icon://complete",
        type: "Transparent",
        tooltip: this.getProperty("buttonTooltip") as string,
        press: this._onCompletePress.bind(this)
      });
      this._button.setParent(this);
    }
    return this._button;
  }

  private async _onCompletePress(): Promise<void> {
    const text = this.getProperty("value") as string;
    if (!text || text.trim() === "") {
      MessageToast.show("Please enter some text to complete");
      return;
    }

    try {
      BusyIndicator.show(0);

      const completedText = await callAIService("autocomplete", text, { model: getAIModelFor(this) });

      this.setProperty("value", completedText);

      this.fireEvent("textCompleted", {
        originalText: text,
        completedText: completedText
      });

      MessageToast.show("Text completed");
    } catch (error) {
      console.error("Error completing text:", error);
      MessageToast.show("Failed to complete text. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  exit(): void {
    if (this._button) {
      this._button.destroy();
      this._button = null;
    }
  }
}

interface $AIAutoCompleteSettings {
  buttonTooltip?: string;
  value?: string;
  textCompleted?: (event: AIAutoComplete$TextCompletedEvent) => void;
}

interface AIAutoComplete$TextCompletedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "completedText"): string;
}

export type { $AIAutoCompleteSettings, AIAutoComplete$TextCompletedEvent };
