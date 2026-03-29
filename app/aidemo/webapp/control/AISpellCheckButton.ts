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
import FormattedText from "sap/m/FormattedText";

/**
 * AISpellCheckButton - A button that opens a dialog to check spelling and grammar using AI.
 * Unlike Polish, this preserves the author's style and only fixes errors.
 * Shows a corrections summary alongside the corrected text.
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AISpellCheckButton extends Button {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The prompt for correcting the text
       */
      prompt: {
        type: "string",
        defaultValue:
          "Check the following text for spelling and grammar errors. Fix only the errors while preserving the author's original style, tone, and word choices. Do not rephrase or improve — only correct mistakes. Return only the corrected text."
      },
      /**
       * The prompt for generating the corrections summary
       */
      summaryPrompt: {
        type: "string",
        defaultValue:
          "Compare the original text and the corrected text below. List each correction made as a short bullet point in HTML format using <ul><li> tags. If no corrections were needed, say 'No corrections needed.'\n\nOriginal:\n{original}\n\nCorrected:\n{corrected}"
      },
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      dialogTitle: {
        type: "string",
        defaultValue: "Spell & Grammar Check with AI"
      },
      inputPlaceholder: {
        type: "string",
        defaultValue: "Enter the text you want to check for errors..."
      },
      inputLabel: {
        type: "string",
        defaultValue: "Original Text"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Corrected Text"
      }
    },
    events: {
      textCorrected: {
        parameters: {
          originalText: { type: "string" },
          correctedText: { type: "string" },
          corrections: { type: "string" }
        }
      }
    }
  };

  private _dialog: Dialog | null = null;
  private _inputTextArea: TextArea | null = null;
  private _outputTextArea: TextArea | null = null;
  private _correctionsText: FormattedText | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AISpellCheckButtonSettings, settings?: any) {
    super(idOrSettings as string, settings as $ButtonSettings);
  }

  init(): void {
    super.init();
    this.setIcon("sap-icon://spell-checker");
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

    this._correctionsText = new FormattedText({
      htmlText: "",
      width: "100%"
    });

    const content = new VBox({
      width: "100%",
      items: [
        new Label({ text: this.getProperty("inputLabel") as string, labelFor: this._inputTextArea }),
        this._inputTextArea,
        new Text({ text: "" }).addStyleClass("sapUiSmallMarginTop"),
        new Label({ text: this.getProperty("outputLabel") as string, labelFor: this._outputTextArea }),
        this._outputTextArea,
        new Text({ text: "" }).addStyleClass("sapUiSmallMarginTop"),
        new Label({ text: "Corrections:" }),
        this._correctionsText
      ]
    }).addStyleClass("sapUiSmallMargin");

    this._dialog = new Dialog({
      title: this.getProperty("dialogTitle") as string,
      contentWidth: "650px",
      resizable: true,
      draggable: true,
      content: [content],
      beginButton: new Button({
        text: "Check",
        type: "Emphasized",
        icon: "sap-icon://spell-checker",
        press: this._onCheckPress.bind(this)
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

  private async _onCheckPress(): Promise<void> {
    const inputText = this._inputTextArea?.getValue();

    if (!inputText || inputText.trim() === "") {
      MessageToast.show("Please enter some text to check");
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

      // Step 1: Get corrected text
      const correctContext = model.bindContext("/processText(...)");
      correctContext.setParameter("prompt", this.getProperty("prompt") as string);
      correctContext.setParameter("text", inputText);

      await correctContext.invoke();

      const correctResult = correctContext.getBoundContext().getObject() as { value: string } | undefined;
      const correctedText = correctResult?.value || "";

      this._outputTextArea?.setValue(correctedText);

      // Step 2: Get corrections summary
      const summaryPromptTemplate = this.getProperty("summaryPrompt") as string;
      const summaryPrompt = summaryPromptTemplate
        .replace("{original}", inputText)
        .replace("{corrected}", correctedText);

      const summaryContext = model.bindContext("/processText(...)");
      summaryContext.setParameter("prompt", summaryPrompt);
      summaryContext.setParameter("text", inputText);

      await summaryContext.invoke();

      const summaryResult = summaryContext.getBoundContext().getObject() as { value: string } | undefined;
      const corrections = summaryResult?.value || "No corrections found.";

      if (this._correctionsText) {
        this._correctionsText.setHtmlText(corrections);
      }

      this.fireEvent("textCorrected", {
        originalText: inputText,
        correctedText: correctedText,
        corrections: corrections
      });

      MessageToast.show("Spell check complete");
    } catch (error) {
      console.error("Error checking text:", error);
      MessageToast.show("Failed to check text. Please try again.");
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
    this._correctionsText = null;
  }
}

interface $AISpellCheckButtonSettings extends $ButtonSettings {
  prompt?: string;
  summaryPrompt?: string;
  aiModelName?: string;
  dialogTitle?: string;
  inputPlaceholder?: string;
  inputLabel?: string;
  outputLabel?: string;
  textCorrected?: (event: AISpellCheckButton$TextCorrectedEvent) => void;
}

interface AISpellCheckButton$TextCorrectedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "correctedText"): string;
  getParameter(name: "corrections"): string;
}

export type { $AISpellCheckButtonSettings, AISpellCheckButton$TextCorrectedEvent };
