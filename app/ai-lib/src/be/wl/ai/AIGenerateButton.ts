import AIBaseButton, { $AIBaseButtonSettings } from "./AIBaseButton";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import MessageToast from "sap/m/MessageToast";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";

/**
 * AIGenerateButton - A button that generates text from a description using AI.
 * Reads the description from the target TextArea, calls the AI service,
 * and shows a result dialog with Accept/Reject options.
 *
 * @namespace be.wl.ai
 */
export default class AIGenerateButton extends AIBaseButton {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      dialogTitle: {
        type: "string",
        defaultValue: "Generate Text with AI"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Generated Text"
      }
    },
    events: {
      textGenerated: {
        parameters: {
          description: { type: "string" },
          generatedText: { type: "string" }
        }
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AIGenerateButtonSettings, settings?: any) {
    super(idOrSettings as string, settings);
  }

  protected getOperation(): string {
    return "generate";
  }

  protected getDefaultIcon(): string {
    return "sap-icon://create";
  }

  protected getDialogContentWidth(): string {
    return "650px";
  }

  protected getEmptyInputMessage(): string {
    return "Please enter a description of what to generate";
  }

  protected getErrorMessage(): string {
    return "Failed to generate text. Please try again.";
  }

  protected async processText(description: string): Promise<void> {
    try {
      BusyIndicator.show(0);
      this.resultText = await this.callAI(description);
      this.showResultDialog();
    } catch (error) {
      console.error("Error generating text:", error);
      MessageToast.show(this.getErrorMessage());
    } finally {
      BusyIndicator.hide();
    }
  }

  protected fireResultEvent(): void {
    this.fireEvent("textGenerated", {
      description: this.originalText,
      generatedText: this.resultText
    });
  }
}

interface $AIGenerateButtonSettings extends $AIBaseButtonSettings {
  dialogTitle?: string;
  outputLabel?: string;
  value?: string;
  textGenerated?: (event: AIGenerateButton$TextGeneratedEvent) => void;
}

interface AIGenerateButton$TextGeneratedEvent {
  getParameter(name: "description"): string;
  getParameter(name: "generatedText"): string;
}

export type { $AIGenerateButtonSettings, AIGenerateButton$TextGeneratedEvent };
