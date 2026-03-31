import AIBaseButton, { $AIBaseButtonSettings } from "./AIBaseButton";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import Label from "sap/m/Label";
import VBox from "sap/m/VBox";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import FormattedText from "sap/m/FormattedText";
import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import type { Button$PressEvent } from "sap/m/Button";

/**
 * AICompareTexts - A button that compares two texts using AI.
 * Reads text from two target TextAreas, calls the AI service,
 * and shows a result dialog with the comparison analysis.
 *
 * @namespace be.wl.ai
 */
export default class AICompareTexts extends AIBaseButton {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      prompt: {
        type: "string",
        defaultValue:
          "Compare the following two texts. Provide a clear analysis in HTML format with these sections:\n<h4>Key Differences</h4>\n<ul><li>...</li></ul>\n<h4>Similarities</h4>\n<ul><li>...</li></ul>\n<h4>Summary</h4>\n<p>A brief overall assessment.</p>\n\nText 1:\n{text1}\n\nText 2:\n{text2}"
      },
      dialogTitle: {
        type: "string",
        defaultValue: "Compare Texts with AI"
      },
      value1: {
        type: "string",
        defaultValue: ""
      },
      value2: {
        type: "string",
        defaultValue: ""
      }
    },
    events: {
      textsCompared: {
        parameters: {
          text1: { type: "string" },
          text2: { type: "string" },
          comparison: { type: "string" }
        }
      }
    }
  };

  private comparisonResult: FormattedText | null;
  private comparisonHtml: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AICompareTextsSettings, settings?: any) {
    super(idOrSettings as string, settings);
  }

  protected getDefaultIcon(): string {
    return "sap-icon://compare";
  }

  protected hasAcceptReject(): boolean {
    return false;
  }

  protected getDialogContentWidth(): string {
    return "700px";
  }

  protected async onPress(_event: Button$PressEvent): Promise<void> {
    const text1 = this.getProperty("value1") as string;
    const text2 = this.getProperty("value2") as string;
    if (!text1 || text1.trim() === "" || !text2 || text2.trim() === "") {
      MessageToast.show("Please enter both texts to compare");
      return;
    }
    await this.processCompareTexts(text1, text2);
  }

  private async processCompareTexts(text1: string, text2: string): Promise<void> {
    try {
      BusyIndicator.show(0);

      const promptTemplate = this.getProperty("prompt") as string;
      const prompt = promptTemplate
        .replace("{text1}", text1)
        .replace("{text2}", text2);

      const combinedText = `Text 1:\n${text1}\n\nText 2:\n${text2}`;

      let html = await this.callAI(prompt, combinedText);
      html = html.replace(/^```html\s*\n?/i, "").replace(/\n?```\s*$/i, "");
      this.comparisonHtml = html;

      this.fireEvent("textsCompared", {
        text1: text1,
        text2: text2,
        comparison: this.comparisonHtml
      });

      this.showResultDialog();

      MessageToast.show("Comparison complete");
    } catch (error) {
      console.error("Error comparing texts:", error);
      MessageToast.show("Failed to compare texts. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  protected createDialogContent(): Control {
    this.comparisonResult = new FormattedText({
      htmlText: "",
      width: "100%"
    });

    return new VBox({
      width: "100%",
      items: [
        new Label({ text: "Comparison Result:" }),
        this.comparisonResult
      ]
    }).addStyleClass("sapUiSmallMargin");
  }

  protected updateDialogContent(): void {
    this.comparisonResult?.setHtmlText(this.comparisonHtml);
  }

  protected onCleanup(): void {
    this.comparisonResult = null;
  }
}

interface $AICompareTextsSettings extends $AIBaseButtonSettings {
  prompt?: string;
  dialogTitle?: string;
  value1?: string;
  value2?: string;
  textsCompared?: (event: AICompareTexts$TextsComparedEvent) => void;
}

interface AICompareTexts$TextsComparedEvent {
  getParameter(name: "text1"): string;
  getParameter(name: "text2"): string;
  getParameter(name: "comparison"): string;
}

export type { $AICompareTextsSettings, AICompareTexts$TextsComparedEvent };
