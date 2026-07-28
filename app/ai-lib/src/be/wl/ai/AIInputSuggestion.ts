import Control from "sap/ui/core/Control";
import type RenderManager from "sap/ui/core/RenderManager";
import Button from "sap/m/Button";
import ResponsivePopover from "sap/m/ResponsivePopover";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import TextArea from "sap/m/TextArea";
import Text from "sap/m/Text";
import MessageToast from "sap/m/MessageToast";
import { callAIService, getAIModelFor } from "./AIModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";

/**
 * AIInputSuggestion - An AI assist control that attaches to an existing Input or TextArea.
 * Renders a small AI button next to the target control. Clicking it opens a popover
 * with AI-generated suggestion based on the current field value.
 *
 * @namespace be.wl.ai
 */
export default class AIInputSuggestion extends Control {
  static readonly metadata: MetadataOptions = {
    properties: {
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
      },
      value: {
        type: "string",
        defaultValue: ""
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

  private _button: Button | null;
  private _popover: ResponsivePopover | null;
  private _suggestionTextArea: TextArea | null;
  private _originalText: string;

  init(): void {
    super.init();
    
  }

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

  private _onButtonPress(): void {
    const text = this.getProperty("value") as string;
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

    try {
      this._popover?.setBusy(true);

      const suggestion = await callAIService("suggest", text, { model: getAIModelFor(this) });

      this._suggestionTextArea?.setValue(suggestion);
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      MessageToast.show("Failed to get AI suggestion. Please try again.");
      this._popover?.close();
    } finally {
      this._popover?.setBusy(false);
    }
  }

  private _onAccept(): void {
    const suggestedText = this._suggestionTextArea?.getValue() || "";
    if (suggestedText) {
      this.setProperty("value", suggestedText);
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
  buttonTooltip?: string;
  popoverTitle?: string;
  value?: string;
  suggestionAccepted?: (event: AIInputSuggestion$SuggestionAcceptedEvent) => void;
}

interface AIInputSuggestion$SuggestionAcceptedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "suggestedText"): string;
}

export type { $AIInputSuggestionSettings, AIInputSuggestion$SuggestionAcceptedEvent };
