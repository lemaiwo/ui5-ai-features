import AIBaseButton, { $AIBaseButtonSettings } from "./AIBaseButton";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import MessageToast from "sap/m/MessageToast";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";

/**
 * AISummarizeButton - A button that summarizes text using AI.
 * Reads text from the target TextArea, calls the AI service,
 * and shows a result dialog with the summary.
 *
 * @namespace be.wl.ai
 */
export default class AISummarizeButton extends AIBaseButton {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      dialogTitle: {
        type: "string",
        defaultValue: "Summarize Text with AI"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Summary"
      }
    },
    events: {
      textSummarized: {
        parameters: {
          originalText: { type: "string" },
          summarizedText: { type: "string" }
        }
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AISummarizeButtonSettings, settings?: any) {
    super(idOrSettings as string, settings);
  }

  protected getOperation(): string {
    return "summarize";
  }

  protected hasAcceptReject(): boolean {
    return false;
  }

  protected getEmptyInputMessage(): string {
    return "Please enter some text to summarize";
  }

  protected getErrorMessage(): string {
    return "Failed to summarize text. Please try again.";
  }

  protected async processText(inputText: string): Promise<void> {
    try {
      BusyIndicator.show(0);
      this.resultText = await this.callAI(inputText);
      this.fireResultEvent();
      this.showResultDialog();
    } catch (error) {
      console.error("Error summarizing text:", error);
      MessageToast.show(this.getErrorMessage());
    } finally {
      BusyIndicator.hide();
    }
  }

  protected fireResultEvent(): void {
    this.fireEvent("textSummarized", {
      originalText: this.originalText,
      summarizedText: this.resultText
    });
  }
}

interface $AISummarizeButtonSettings extends $AIBaseButtonSettings {
  dialogTitle?: string;
  outputLabel?: string;
  value?: string;
  textSummarized?: (event: AISummarizeButton$TextSummarizedEvent) => void;
}

interface AISummarizeButton$TextSummarizedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "summarizedText"): string;
}

export type { $AISummarizeButtonSettings, AISummarizeButton$TextSummarizedEvent };
