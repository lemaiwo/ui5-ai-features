import Control from "sap/ui/core/Control";
import type RenderManager from "sap/ui/core/RenderManager";
import Button from "sap/m/Button";
import ResponsivePopover from "sap/m/ResponsivePopover";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import TextArea from "sap/m/TextArea";
import Text from "sap/m/Text";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import Component from "sap/ui/core/Component";
import type Input from "sap/m/Input";

/**
 * AIInputSuggestion - An AI assist control that attaches to an existing Input or TextArea.
 * Renders a small AI button next to the target control. Clicking it opens a popover
 * with AI-generated suggestion based on the current field value.
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AIInputSuggestion extends Control {
  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The prompt instruction sent to the AI service.
       * Use {text} as placeholder for the current field value.
       */
      prompt: {
        type: "string",
        defaultValue:
          "Improve and complete the following text. Make it more professional and clear. Only return the improved text, no explanations:\n\n{text}"
      },
      /**
       * The name of the OData model to use for the AI service
       */
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      /**
       * Button tooltip
       */
      buttonTooltip: {
        type: "string",
        defaultValue: "Get AI suggestion"
      },
      /**
       * Popover title
       */
      popoverTitle: {
        type: "string",
        defaultValue: "AI Suggestion"
      }
    },
    associations: {
      /**
       * The target input control (sap.m.Input or sap.m.TextArea) to attach to
       */
      target: {
        type: "sap.ui.core.Control",
        multiple: false
      }
    },
    events: {
      /**
       * Fired when the user accepts the AI suggestion
       */
      suggestionAccepted: {
        parameters: {
          originalText: { type: "string" },
          suggestedText: { type: "string" }
        }
      }
    }
  };

  private _button: Button | null = null;
  private _popover: ResponsivePopover | null = null;
  private _suggestionTextArea: TextArea | null = null;
  private _originalText: string = "";

  static readonly renderer = {
    apiVersion: 2,
    render(rm: RenderManager, control: AIInputSuggestion): void {
      rm.openStart("div", control);
      rm.class("aiInputSuggestion");
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
        icon: "sap-icon://ai",
        type: "Transparent",
        tooltip: this.getProperty("buttonTooltip") as string,
        press: this._onButtonPress.bind(this)
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
    return sap.ui.getCore().byId(targetId) as (Input | TextArea) | null;
  }

  private _getTargetValue(): string {
    const target = this._getTargetControl();
    if (!target) {
      return "";
    }
    // Both Input and TextArea have getValue()
    return (target as TextArea).getValue() || "";
  }

  private _setTargetValue(value: string): void {
    const target = this._getTargetControl();
    if (!target) {
      return;
    }
    (target as TextArea).setValue(value);
  }

  private _onButtonPress(): void {
    const text = this._getTargetValue();
    if (!text || text.trim() === "") {
      MessageToast.show("Please enter some text in the field first");
      return;
    }
    this._openPopover();
    void this._fetchSuggestion(text);
  }

  private _openPopover(): void {
    if (!this._popover) {
      this._createPopover();
    }
    this._suggestionTextArea?.setValue("");
    this._popover?.openBy(this._button!);
  }

  private _createPopover(): void {
    this._suggestionTextArea = new TextArea({
      width: "100%",
      rows: 5,
      editable: false,
      growing: true,
      growingMaxLines: 10
    });

    const acceptButton = new Button({
      text: "Accept",
      type: "Emphasized",
      icon: "sap-icon://accept",
      press: this._onAccept.bind(this)
    });

    const discardButton = new Button({
      text: "Discard",
      press: () => {
        this._popover?.close();
      }
    });

    const content = new VBox({
      width: "100%",
      items: [
        new Text({ text: "Suggested improvement:" }).addStyleClass("sapUiTinyMarginBottom"),
        this._suggestionTextArea,
        new HBox({
          justifyContent: "End",
          items: [discardButton, acceptButton]
        }).addStyleClass("sapUiSmallMarginTop")
      ]
    }).addStyleClass("sapUiSmallMargin");

    this._popover = new ResponsivePopover({
      title: this.getProperty("popoverTitle") as string,
      contentWidth: "400px",
      placement: "Auto",
      content: [content]
    });

    this.addDependent(this._popover);
  }

  private async _fetchSuggestion(text: string): Promise<void> {
    this._originalText = text;
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
      const suggestion = result?.value || "";

      this._suggestionTextArea?.setValue(suggestion);
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      MessageToast.show("Failed to get AI suggestion. Please try again.");
      this._popover?.close();
    } finally {
      BusyIndicator.hide();
    }
  }

  private _onAccept(): void {
    const suggestedText = this._suggestionTextArea?.getValue() || "";
    if (suggestedText) {
      this._setTargetValue(suggestedText);
      this.fireEvent("suggestionAccepted", {
        originalText: this._originalText,
        suggestedText: suggestedText
      });
      MessageToast.show("Suggestion applied");
    }
    this._popover?.close();
  }

  exit(): void {
    if (this._popover) {
      this._popover.destroy();
      this._popover = null;
    }
    if (this._button) {
      this._button.destroy();
      this._button = null;
    }
    this._suggestionTextArea = null;
  }
}

interface $AIInputSuggestionSettings {
  prompt?: string;
  aiModelName?: string;
  buttonTooltip?: string;
  popoverTitle?: string;
  target?: string;
  suggestionAccepted?: (event: AIInputSuggestion$SuggestionAcceptedEvent) => void;
}

interface AIInputSuggestion$SuggestionAcceptedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "suggestedText"): string;
}

export type { $AIInputSuggestionSettings, AIInputSuggestion$SuggestionAcceptedEvent };
