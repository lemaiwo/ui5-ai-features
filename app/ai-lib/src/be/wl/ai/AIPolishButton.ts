import AIBaseButton, { $AIBaseButtonSettings } from "./AIBaseButton";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";

/**
 * AIPolishButton - A button that polishes text using AI.
 * Reads text from the target TextArea, calls the AI service,
 * and shows a result dialog with Accept/Reject options.
 *
 * @namespace be.wl.ai
 */
export default class AIPolishButton extends AIBaseButton {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      prompt: {
        type: "string",
        defaultValue:
          "Polish and improve this text. Fix grammar, improve clarity, and make it more professional while keeping the original meaning."
      },
      dialogTitle: {
        type: "string",
        defaultValue: "Polish Text with AI"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Polished Text"
      }
    },
    events: {
      textPolished: {
        parameters: {
          originalText: { type: "string" },
          polishedText: { type: "string" }
        }
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AIPolishButtonSettings, settings?: any) {
    super(idOrSettings as string, settings);
  }

  protected getEmptyInputMessage(): string {
    return "Please enter some text to polish";
  }

  protected getErrorMessage(): string {
    return "Failed to polish text. Please try again.";
  }

  protected fireResultEvent(): void {
    this.fireEvent("textPolished", {
      originalText: this.originalText,
      polishedText: this.resultText
    });
  }
}

interface $AIPolishButtonSettings extends $AIBaseButtonSettings {
  prompt?: string;
  dialogTitle?: string;
  outputLabel?: string;
  value?: string;
  textPolished?: (event: AIPolishButton$TextPolishedEvent) => void;
}

interface AIPolishButton$TextPolishedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "polishedText"): string;
}

export type { $AIPolishButtonSettings, AIPolishButton$TextPolishedEvent };
