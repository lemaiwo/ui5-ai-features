import AIBaseButton, { $AIBaseButtonSettings } from "./AIBaseButton";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import TextArea from "sap/m/TextArea";
import VBox from "sap/m/VBox";
import Label from "sap/m/Label";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import FormattedText from "sap/m/FormattedText";
import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";

/**
 * AISpellCheckButton - A button that checks spelling and grammar using AI.
 * Reads text from the target TextArea, calls the AI service twice
 * (correction + summary), and shows a result dialog with Accept/Reject.
 *
 * @namespace be.wl.ai
 */
export default class AISpellCheckButton extends AIBaseButton {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      prompt: {
        type: "string",
        defaultValue:
          "Check the following text for spelling and grammar errors. Fix only the errors while preserving the author's original style, tone, and word choices. Do not rephrase or improve — only correct mistakes. Return only the corrected text."
      },
      summaryPrompt: {
        type: "string",
        defaultValue:
          "Compare the original text and the corrected text below. List each correction made as a short bullet point in HTML format using <ul><li> tags. If no corrections were needed, say 'No corrections needed.'\n\nOriginal:\n{original}\n\nCorrected:\n{corrected}"
      },
      dialogTitle: {
        type: "string",
        defaultValue: "Spell & Grammar Check with AI"
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

  private correctionsText: FormattedText | null;
  private correctionsHtml: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AISpellCheckButtonSettings, settings?: any) {
    super(idOrSettings as string, settings);
  }

  protected getDefaultIcon(): string {
    return "sap-icon://spell-checker";
  }

  protected getDialogContentWidth(): string {
    return "650px";
  }

  protected getEmptyInputMessage(): string {
    return "Please enter some text to check";
  }

  protected getErrorMessage(): string {
    return "Failed to check text. Please try again.";
  }

  protected async processText(inputText: string): Promise<void> {
    try {
      BusyIndicator.show(0);

      // Step 1: Get corrected text
      this.resultText = await this.callAI(
        this.getProperty("prompt") as string,
        inputText
      );

      // Step 2: Get corrections summary
      const summaryPromptTemplate = this.getProperty("summaryPrompt") as string;
      const summaryPrompt = summaryPromptTemplate
        .replace("{original}", inputText)
        .replace("{corrected}", this.resultText);

      let corrections = await this.callAI(summaryPrompt, inputText);
      corrections = corrections.replace(/^```html\s*\n?/i, "").replace(/\n?```\s*$/i, "");
      this.correctionsHtml = corrections;

      this.showResultDialog();
    } catch (error) {
      console.error("Error checking text:", error);
      MessageToast.show(this.getErrorMessage());
    } finally {
      BusyIndicator.hide();
    }
  }

  protected createDialogContent(): Control {
    this.outputTextArea = new TextArea({
      width: "100%",
      rows: 6,
      editable: false,
      growing: true,
      growingMaxLines: 10
    });

    this.correctionsText = new FormattedText({
      htmlText: "",
      width: "100%"
    });

    return new VBox({
      width: "100%",
      items: [
        new Label({ text: this.getProperty("outputLabel") as string, labelFor: this.outputTextArea }),
        this.outputTextArea,
        new Label({ text: "Corrections:" }).addStyleClass("sapUiSmallMarginTop"),
        this.correctionsText
      ]
    }).addStyleClass("sapUiSmallMargin");
  }

  protected updateDialogContent(): void {
    this.outputTextArea?.setValue(this.resultText);
    this.correctionsText?.setHtmlText(this.correctionsHtml);
  }

  protected fireResultEvent(): void {
    this.fireEvent("textCorrected", {
      originalText: this.originalText,
      correctedText: this.resultText,
      corrections: this.correctionsHtml
    });
  }

  protected onCleanup(): void {
    this.correctionsText = null;
  }
}

interface $AISpellCheckButtonSettings extends $AIBaseButtonSettings {
  prompt?: string;
  summaryPrompt?: string;
  dialogTitle?: string;
  outputLabel?: string;
  value?: string;
  textCorrected?: (event: AISpellCheckButton$TextCorrectedEvent) => void;
}

interface AISpellCheckButton$TextCorrectedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "correctedText"): string;
  getParameter(name: "corrections"): string;
}

export type { $AISpellCheckButtonSettings, AISpellCheckButton$TextCorrectedEvent };
