import Control from "sap/ui/core/Control";
import type RenderManager from "sap/ui/core/RenderManager";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import Component from "sap/ui/core/Component";
import type TextArea from "sap/m/TextArea";
import type Input from "sap/m/Input";
import Element from "sap/ui/core/Element";

/**
 * AIAutoComplete - A control that attaches to an existing Input or TextArea
 * and provides an AI-powered text completion button. The user writes partial text
 * and clicks the button to have AI complete it.
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AIAutoComplete extends Control {
  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The prompt instruction. {text} is replaced with the current field value.
       */
      prompt: {
        type: "string",
        defaultValue:
          "Continue and complete the following text naturally. Maintain the same style and tone. Only return the completed text (including the original beginning), no explanations:\n\n{text}"
      },
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      /**
       * Tooltip for the complete button
       */
      buttonTooltip: {
        type: "string",
        defaultValue: "Complete text with AI"
      }
    },
    associations: {
      /**
       * The target input control (sap.m.Input or sap.m.TextArea) to complete text in
       */
      target: {
        type: "sap.ui.core.Control",
        multiple: false
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

  private _button: Button | null = null;

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

  private _getTargetControl(): (Input | TextArea) | null {
    const targetId = this.getAssociation("target") as string;
    if (!targetId) {
      return null;
    }
    return Element.getElementById(targetId) as (Input | TextArea) | null;
  }

  private _getTargetValue(): string {
    const target = this._getTargetControl();
    if (!target) {
      return "";
    }
    return (target as TextArea).getValue() || "";
  }

  private _setTargetValue(value: string): void {
    const target = this._getTargetControl();
    if (!target) {
      return;
    }
    (target as TextArea).setValue(value);
  }

  private async _onCompletePress(): Promise<void> {
    const text = this._getTargetValue();
    if (!text || text.trim() === "") {
      MessageToast.show("Please enter some text to complete");
      return;
    }

    const aiModelName = this.getProperty("aiModelName") as string;

    const ownerComponent = Component.getOwnerComponentFor(this);
    const model = (ownerComponent?.getModel(aiModelName) || this.getModel(aiModelName)) as ODataModel;

    if (!model) {
      MessageToast.show(`AI model '${aiModelName}' not found`);
      return;
    }

    try {
      BusyIndicator.show(0);

      const promptTemplate = this.getProperty("prompt") as string;
      const prompt = promptTemplate.replace("{text}", text);

      const context = model.bindContext("/processText(...)");
      context.setParameter("prompt", prompt);
      context.setParameter("text", text);

      await context.invoke();

      const result = context.getBoundContext().getObject() as { value: string } | undefined;
      const completedText = result?.value || "";

      this._setTargetValue(completedText);

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
  prompt?: string;
  aiModelName?: string;
  buttonTooltip?: string;
  target?: string;
  textCompleted?: (event: AIAutoComplete$TextCompletedEvent) => void;
}

interface AIAutoComplete$TextCompletedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "completedText"): string;
}

export type { $AIAutoCompleteSettings, AIAutoComplete$TextCompletedEvent };
