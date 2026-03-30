import Button, { $ButtonSettings } from "sap/m/Button";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import Dialog from "sap/m/Dialog";
import TextArea from "sap/m/TextArea";
import VBox from "sap/m/VBox";
import FlexBox from "sap/m/FlexBox";
import Label from "sap/m/Label";
import Text from "sap/m/Text";
import Token from "sap/m/Token";
import Tokenizer from "sap/m/Tokenizer";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import type { Button$PressEvent } from "sap/m/Button";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import Component from "sap/ui/core/Component";

/**
 * AIExtractKeywordsButton - A button that opens a dialog to extract keywords/tags from text using AI
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AIExtractKeywordsButton extends Button {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      prompt: {
        type: "string",
        defaultValue:
          "Extract the most important keywords and key phrases from the following text. Return them as a comma-separated list. Only return the keywords, no explanations or numbering."
      },
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      dialogTitle: {
        type: "string",
        defaultValue: "Extract Keywords with AI"
      },
      inputPlaceholder: {
        type: "string",
        defaultValue: "Paste the text you want to extract keywords from..."
      },
      inputLabel: {
        type: "string",
        defaultValue: "Source Text"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Extracted Keywords"
      }
    },
    events: {
      keywordsExtracted: {
        parameters: {
          originalText: { type: "string" },
          keywords: { type: "string[]" }
        }
      }
    }
  };

  private _dialog: Dialog | null = null;
  private _inputTextArea: TextArea | null = null;
  private _tokenizer: Tokenizer | null = null;
  private _keywordsRawText: Text | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AIExtractKeywordsButtonSettings, settings?: any) {
    super(idOrSettings as string, settings as $ButtonSettings);
  }

  init(): void {
    super.init();
    this.setIcon("sap-icon://tags");
    this.attachPress(this._onPress, this);
  }

  private _onPress(_event: Button$PressEvent): void {
    if (!this._dialog) {
      this._createDialog();
    }
    this._dialog?.open();
  }

  private _createDialog(): void {
    this._inputTextArea = new TextArea({
      width: "100%",
      rows: 8,
      placeholder: this.getProperty("inputPlaceholder") as string,
      growing: true,
      growingMaxLines: 15
    });

    this._tokenizer = new Tokenizer({
      width: "100%",
      editable: false
    });

    this._keywordsRawText = new Text({
      text: "",
      visible: false
    });

    const copyButton = new Button({
      text: "Copy Keywords",
      icon: "sap-icon://copy",
      type: "Transparent",
      press: this._onCopyPress.bind(this)
    });

    const content = new VBox({
      width: "100%",
      items: [
        new Label({ text: this.getProperty("inputLabel") as string, labelFor: this._inputTextArea }),
        this._inputTextArea,
        new Text({ text: "" }).addStyleClass("sapUiSmallMarginTop"),
        new Label({ text: this.getProperty("outputLabel") as string }),
        this._tokenizer,
        this._keywordsRawText,
        new FlexBox({
          justifyContent: "End",
          items: [copyButton]
        }).addStyleClass("sapUiSmallMarginTop")
      ]
    }).addStyleClass("sapUiSmallMargin");

    this._dialog = new Dialog({
      title: this.getProperty("dialogTitle") as string,
      contentWidth: "600px",
      resizable: true,
      draggable: true,
      content: [content],
      beginButton: new Button({
        text: "Extract",
        type: "Emphasized",
        icon: "sap-icon://tags",
        press: this._onExtractPress.bind(this)
      }),
      endButton: new Button({
        text: "Close",
        press: () => {
          this._dialog?.close();
        }
      })
    });

    this.addDependent(this._dialog);
  }

  private async _onExtractPress(): Promise<void> {
    const inputText = this._inputTextArea?.getValue();

    if (!inputText || inputText.trim() === "") {
      MessageToast.show("Please enter some text to extract keywords from");
      return;
    }

    const aiModelName = this.getProperty("aiModelName") as string;

    const ownerComponent = Component.getOwnerComponentFor(this);
    const model = (ownerComponent?.getModel(aiModelName) || this.getModel(aiModelName)) as ODataModel;

    if (!model) {
      MessageToast.show(`AI model '${aiModelName}' not found. Please ensure the model is configured in manifest.json`);
      return;
    }

    try {
      BusyIndicator.show(0);

      const context = model.bindContext("/processText(...)");
      context.setParameter("prompt", this.getProperty("prompt") as string);
      context.setParameter("text", inputText);

      await context.invoke();

      const result = context.getBoundContext().getObject() as { value: string } | undefined;
      const rawKeywords = result?.value || "";

      const keywords = rawKeywords
        .split(",")
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);

      // Update tokenizer
      this._tokenizer?.removeAllTokens();
      keywords.forEach((keyword: string) => {
        this._tokenizer?.addToken(
          new Token({ text: keyword, editable: false })
        );
      });

      // Store raw text for copying
      if (this._keywordsRawText) {
        this._keywordsRawText.setText(keywords.join(", "));
      }

      this.fireEvent("keywordsExtracted", {
        originalText: inputText,
        keywords: keywords
      });

      MessageToast.show(`${keywords.length} keywords extracted`);
    } catch (error) {
      console.error("Error extracting keywords:", error);
      MessageToast.show("Failed to extract keywords. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  private _onCopyPress(): void {
    const text = this._keywordsRawText?.getText();
    if (text) {
      navigator.clipboard
        .writeText(text)
        .then(() => MessageToast.show("Keywords copied to clipboard"))
        .catch(() => MessageToast.show("Failed to copy to clipboard"));
    }
  }

  exit(): void {
    if (this._dialog) {
      this._dialog.destroy();
      this._dialog = null;
    }
    this._inputTextArea = null;
    this._tokenizer = null;
    this._keywordsRawText = null;
  }
}

interface $AIExtractKeywordsButtonSettings extends $ButtonSettings {
  prompt?: string;
  aiModelName?: string;
  dialogTitle?: string;
  inputPlaceholder?: string;
  inputLabel?: string;
  outputLabel?: string;
  keywordsExtracted?: (event: AIExtractKeywordsButton$KeywordsExtractedEvent) => void;
}

interface AIExtractKeywordsButton$KeywordsExtractedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "keywords"): string[];
}

export type { $AIExtractKeywordsButtonSettings, AIExtractKeywordsButton$KeywordsExtractedEvent };
