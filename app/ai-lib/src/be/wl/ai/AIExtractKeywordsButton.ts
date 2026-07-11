import AIBaseButton, { $AIBaseButtonSettings } from "./AIBaseButton";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import FlexBox from "sap/m/FlexBox";
import Label from "sap/m/Label";
import Token from "sap/m/Token";
import Tokenizer from "sap/m/Tokenizer";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";

/**
 * AIExtractKeywordsButton - A button that extracts keywords from text using AI.
 * Reads text from the target TextArea, calls the AI service,
 * and shows a result dialog with keywords as tokens and a copy button.
 *
 * @namespace be.wl.ai
 */
export default class AIExtractKeywordsButton extends AIBaseButton {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      dialogTitle: {
        type: "string",
        defaultValue: "Extract Keywords with AI"
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

  private tokenizer: Tokenizer | null;
  private keywordsRawText: Text | null;
  private keywords: string[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AIExtractKeywordsButtonSettings, settings?: any) {
    super(idOrSettings as string, settings);
  }

  protected getOperation(): string {
    return "keywords";
  }

  protected getDefaultIcon(): string {
    return "sap-icon://tags";
  }

  protected hasAcceptReject(): boolean {
    return false;
  }

  protected getEmptyInputMessage(): string {
    return "Please enter some text to extract keywords from";
  }

  protected getErrorMessage(): string {
    return "Failed to extract keywords. Please try again.";
  }

  protected async processText(inputText: string): Promise<void> {
    try {
      BusyIndicator.show(0);

      const rawKeywords = await this.callAI(inputText);

      this.keywords = rawKeywords
        .split(",")
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);

      this.fireEvent("keywordsExtracted", {
        originalText: inputText,
        keywords: this.keywords
      });

      this.showResultDialog();

      MessageToast.show(`${this.keywords.length} keywords extracted`);
    } catch (error) {
      console.error("Error extracting keywords:", error);
      MessageToast.show(this.getErrorMessage());
    } finally {
      BusyIndicator.hide();
    }
  }

  protected createDialogContent(): Control {
    this.tokenizer = new Tokenizer({
      width: "100%",
      editable: false
    });

    this.keywordsRawText = new Text({
      text: "",
      visible: false
    });

    const copyButton = new Button({
      text: "Copy Keywords",
      icon: "sap-icon://copy",
      type: "Transparent",
      press: this.handleCopyPress.bind(this)
    });

    return new VBox({
      width: "100%",
      items: [
        new Label({ text: this.getProperty("outputLabel") as string }),
        this.tokenizer,
        this.keywordsRawText,
        new FlexBox({
          justifyContent: "End",
          items: [copyButton]
        }).addStyleClass("sapUiSmallMarginTop")
      ]
    }).addStyleClass("sapUiSmallMargin");
  }

  protected updateDialogContent(): void {
    this.tokenizer?.removeAllTokens();
    this.keywords.forEach((keyword: string) => {
      this.tokenizer?.addToken(new Token({ text: keyword, editable: false }));
    });

    if (this.keywordsRawText) {
      this.keywordsRawText.setText(this.keywords.join(", "));
    }
  }

  private handleCopyPress(): void {
    const text = this.keywordsRawText?.getText();
    if (text) {
      navigator.clipboard
        .writeText(text)
        .then(() => MessageToast.show("Keywords copied to clipboard"))
        .catch(() => MessageToast.show("Failed to copy to clipboard"));
    }
  }

  protected onCleanup(): void {
    this.tokenizer = null;
    this.keywordsRawText = null;
  }
}

interface $AIExtractKeywordsButtonSettings extends $AIBaseButtonSettings {
  dialogTitle?: string;
  outputLabel?: string;
  value?: string;
  keywordsExtracted?: (event: AIExtractKeywordsButton$KeywordsExtractedEvent) => void;
}

interface AIExtractKeywordsButton$KeywordsExtractedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "keywords"): string[];
}

export type { $AIExtractKeywordsButtonSettings, AIExtractKeywordsButton$KeywordsExtractedEvent };
