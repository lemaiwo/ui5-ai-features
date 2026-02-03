import Button, { $ButtonSettings } from "sap/m/Button";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import Dialog from "sap/m/Dialog";
import TextArea from "sap/m/TextArea";
import VBox from "sap/m/VBox";
import Label from "sap/m/Label";
import Text from "sap/m/Text";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import type { Button$PressEvent } from "sap/m/Button";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";

/**
 * AIPolishButton - A button that opens a dialog to polish text using AI
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AIPolishButton extends Button {
  // Use the parent Button renderer
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The prompt instruction sent to the AI service
       */
      prompt: {
        type: "string",
        defaultValue:
          "Polish and improve this text. Fix grammar, improve clarity, and make it more professional while keeping the original meaning."
      },
      /**
       * The name of the OData model to use for the AI service
       */
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      /**
       * Dialog title
       */
      dialogTitle: {
        type: "string",
        defaultValue: "Polish Text with AI"
      },
      /**
       * Placeholder text for the input area
       */
      inputPlaceholder: {
        type: "string",
        defaultValue: "Enter the text you want to polish..."
      },
      /**
       * Label for the input area
       */
      inputLabel: {
        type: "string",
        defaultValue: "Original Text"
      },
      /**
       * Label for the output area
       */
      outputLabel: {
        type: "string",
        defaultValue: "Polished Text"
      }
    },
    events: {
      /**
       * Fired when text has been successfully polished
       */
      textPolished: {
        parameters: {
          originalText: { type: "string" },
          polishedText: { type: "string" }
        }
      }
    }
  };

  private _dialog: Dialog | null = null;
  private _inputTextArea: TextArea | null = null;
  private _outputTextArea: TextArea | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AIPolishButtonSettings, settings?: any) {
    super(idOrSettings as string, settings as $ButtonSettings);
  }

  init(): void {
    super.init();
    this.setIcon("sap-icon://ai");
    this.attachPress(this._onPress, this);
  }

  private _onPress(_event: Button$PressEvent): void {
    this._openDialog();
  }

  private _openDialog(): void {
    if (!this._dialog) {
      this._createDialog();
    }
    this._dialog?.open();
  }

  private _createDialog(): void {
    this._inputTextArea = new TextArea({
      width: "100%",
      rows: 6,
      placeholder: this.getProperty("inputPlaceholder") as string,
      growing: true,
      growingMaxLines: 10
    });

    this._outputTextArea = new TextArea({
      width: "100%",
      rows: 6,
      editable: false,
      growing: true,
      growingMaxLines: 10
    });

    const content = new VBox({
      width: "100%",
      items: [
        new Label({ text: this.getProperty("inputLabel") as string, labelFor: this._inputTextArea }),
        this._inputTextArea,
        new Text({ text: "" }).addStyleClass("sapUiSmallMarginTop"),
        new Label({ text: this.getProperty("outputLabel") as string, labelFor: this._outputTextArea }),
        this._outputTextArea
      ]
    }).addStyleClass("sapUiSmallMargin");

    this._dialog = new Dialog({
      title: this.getProperty("dialogTitle") as string,
      contentWidth: "600px",
      resizable: true,
      draggable: true,
      content: [content],
      beginButton: new Button({
        text: "Polish",
        type: "Emphasized",
        icon: "sap-icon://ai",
        press: this._onPolishPress.bind(this)
      }),
      endButton: new Button({
        text: "Close",
        press: () => {
          this._dialog?.close();
        }
      }),
      buttons: [
        new Button({
          text: "Copy Result",
          icon: "sap-icon://copy",
          press: this._onCopyPress.bind(this),
          visible: false
        }).addStyleClass("aiPolishCopyButton")
      ]
    });

    this.addDependent(this._dialog);
  }

  private async _onPolishPress(): Promise<void> {
    const inputText = this._inputTextArea?.getValue();

    if (!inputText || inputText.trim() === "") {
      MessageToast.show("Please enter some text to polish");
      return;
    }

    const aiModelName = this.getProperty("aiModelName") as string;
    const model = this.getModel(aiModelName) as ODataModel;

    if (!model) {
      MessageToast.show(`AI model '${aiModelName}' not found`);
      return;
    }

    try {
      BusyIndicator.show(0);

      const context = model.bindContext("/processText(...)");
      context.setParameter("prompt", this.getProperty("prompt") as string);
      context.setParameter("text", inputText);

      await context.invoke();

      const result = context.getBoundContext().getObject() as { value: string } | undefined;
      const polishedText = result?.value || "";

      this._outputTextArea?.setValue(polishedText);

      // Show copy button
      const copyButton = this._dialog?.getButtons()[0];
      if (copyButton) {
        copyButton.setVisible(true);
      }

      this.fireEvent("textPolished", {
        originalText: inputText,
        polishedText: polishedText
      });

      MessageToast.show("Text polished successfully");
    } catch (error) {
      console.error("Error polishing text:", error);
      MessageToast.show("Failed to polish text. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  private _onCopyPress(): void {
    const polishedText = this._outputTextArea?.getValue();
    if (polishedText) {
      navigator.clipboard
        .writeText(polishedText)
        .then(() => {
          MessageToast.show("Copied to clipboard");
        })
        .catch(() => {
          MessageToast.show("Failed to copy to clipboard");
        });
    }
  }

  exit(): void {
    if (this._dialog) {
      this._dialog.destroy();
      this._dialog = null;
    }
    this._inputTextArea = null;
    this._outputTextArea = null;
  }
}

// Type definitions for the control settings
interface $AIPolishButtonSettings extends $ButtonSettings {
  prompt?: string;
  aiModelName?: string;
  dialogTitle?: string;
  inputPlaceholder?: string;
  inputLabel?: string;
  outputLabel?: string;
  textPolished?: (event: AIPolishButton$TextPolishedEvent) => void;
}

interface AIPolishButton$TextPolishedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "polishedText"): string;
}

export type { $AIPolishButtonSettings, AIPolishButton$TextPolishedEvent };
