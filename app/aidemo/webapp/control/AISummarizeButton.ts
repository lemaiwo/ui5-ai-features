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
import Component from "sap/ui/core/Component";

/**
 * AISummarizeButton - A button that opens a dialog to summarize long text using AI
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AISummarizeButton extends Button {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The prompt instruction sent to the AI service
       */
      prompt: {
        type: "string",
        defaultValue:
          "Summarize the following text concisely. Capture the key points and main ideas in a clear, brief summary."
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
        defaultValue: "Summarize Text with AI"
      },
      /**
       * Placeholder text for the input area
       */
      inputPlaceholder: {
        type: "string",
        defaultValue: "Paste the long text you want to summarize..."
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
        defaultValue: "Summary"
      }
    },
    events: {
      /**
       * Fired when text has been successfully summarized
       */
      textSummarized: {
        parameters: {
          originalText: { type: "string" },
          summarizedText: { type: "string" }
        }
      }
    }
  };

  private _dialog: Dialog | null = null;
  private _inputTextArea: TextArea | null = null;
  private _outputTextArea: TextArea | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AISummarizeButtonSettings, settings?: any) {
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
      rows: 8,
      placeholder: this.getProperty("inputPlaceholder") as string,
      growing: true,
      growingMaxLines: 15
    });

    this._outputTextArea = new TextArea({
      width: "100%",
      rows: 4,
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
        text: "Summarize",
        type: "Emphasized",
        icon: "sap-icon://ai",
        press: this._onSummarizePress.bind(this)
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

  private async _onSummarizePress(): Promise<void> {
    const inputText = this._inputTextArea?.getValue();

    if (!inputText || inputText.trim() === "") {
      MessageToast.show("Please enter some text to summarize");
      return;
    }

    const aiModelName = this.getProperty("aiModelName") as string;

    const ownerComponent = Component.getOwnerComponentFor(this);
    const model = (ownerComponent?.getModel(aiModelName) || this.getModel(aiModelName)) as ODataModel;

    if (!model) {
      MessageToast.show(`AI model '${aiModelName}' not found. Please ensure the model is configured in manifest.json`);
      console.error(`Model '${aiModelName}' not found. Available models on component:`, ownerComponent?.getManifest());
      return;
    }

    try {
      BusyIndicator.show(0);

      const context = model.bindContext("/processText(...)");
      context.setParameter("prompt", this.getProperty("prompt") as string);
      context.setParameter("text", inputText);

      await context.invoke();

      const result = context.getBoundContext().getObject() as { value: string } | undefined;
      const summarizedText = result?.value || "";

      this._outputTextArea?.setValue(summarizedText);

      this.fireEvent("textSummarized", {
        originalText: inputText,
        summarizedText: summarizedText
      });

      MessageToast.show("Text summarized successfully");
    } catch (error) {
      console.error("Error summarizing text:", error);
      MessageToast.show("Failed to summarize text. Please try again.");
    } finally {
      BusyIndicator.hide();
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

interface $AISummarizeButtonSettings extends $ButtonSettings {
  prompt?: string;
  aiModelName?: string;
  dialogTitle?: string;
  inputPlaceholder?: string;
  inputLabel?: string;
  outputLabel?: string;
  textSummarized?: (event: AISummarizeButton$TextSummarizedEvent) => void;
}

interface AISummarizeButton$TextSummarizedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "summarizedText"): string;
}

export type { $AISummarizeButtonSettings, AISummarizeButton$TextSummarizedEvent };
