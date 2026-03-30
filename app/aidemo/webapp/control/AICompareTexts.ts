import Button, { $ButtonSettings } from "sap/m/Button";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import Dialog from "sap/m/Dialog";
import TextArea from "sap/m/TextArea";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Label from "sap/m/Label";
import Text from "sap/m/Text";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import FormattedText from "sap/m/FormattedText";
import type { Button$PressEvent } from "sap/m/Button";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import Component from "sap/ui/core/Component";

/**
 * AICompareTexts - A button that opens a dialog to compare two texts using AI.
 * Provides an AI-powered analysis of differences, similarities, and key changes.
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AICompareTexts extends Button {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      prompt: {
        type: "string",
        defaultValue:
          "Compare the following two texts. Provide a clear analysis in HTML format with these sections:\n<h4>Key Differences</h4>\n<ul><li>...</li></ul>\n<h4>Similarities</h4>\n<ul><li>...</li></ul>\n<h4>Summary</h4>\n<p>A brief overall assessment.</p>\n\nText 1:\n{text1}\n\nText 2:\n{text2}"
      },
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      dialogTitle: {
        type: "string",
        defaultValue: "Compare Texts with AI"
      },
      text1Placeholder: {
        type: "string",
        defaultValue: "Enter the first text..."
      },
      text2Placeholder: {
        type: "string",
        defaultValue: "Enter the second text..."
      },
      text1Label: {
        type: "string",
        defaultValue: "Text 1"
      },
      text2Label: {
        type: "string",
        defaultValue: "Text 2"
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

  private _dialog: Dialog | null = null;
  private _text1Area: TextArea | null = null;
  private _text2Area: TextArea | null = null;
  private _comparisonResult: FormattedText | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AICompareTextsSettings, settings?: any) {
    super(idOrSettings as string, settings as $ButtonSettings);
  }

  init(): void {
    super.init();
    this.setIcon("sap-icon://compare");
    this.attachPress(this._onPress, this);
  }

  private _onPress(_event: Button$PressEvent): void {
    if (!this._dialog) {
      this._createDialog();
    }
    this._dialog?.open();
  }

  private _createDialog(): void {
    this._text1Area = new TextArea({
      width: "100%",
      rows: 6,
      placeholder: this.getProperty("text1Placeholder") as string,
      growing: true,
      growingMaxLines: 10
    });

    this._text2Area = new TextArea({
      width: "100%",
      rows: 6,
      placeholder: this.getProperty("text2Placeholder") as string,
      growing: true,
      growingMaxLines: 10
    });

    this._comparisonResult = new FormattedText({
      htmlText: "",
      width: "100%"
    });

    const textInputs = new HBox({
      width: "100%",
      items: [
        new VBox({
          width: "50%",
          items: [
            new Label({ text: this.getProperty("text1Label") as string, labelFor: this._text1Area }),
            this._text1Area
          ]
        }).addStyleClass("sapUiTinyMarginEnd"),
        new VBox({
          width: "50%",
          items: [
            new Label({ text: this.getProperty("text2Label") as string, labelFor: this._text2Area }),
            this._text2Area
          ]
        })
      ]
    });

    const content = new VBox({
      width: "100%",
      items: [
        textInputs,
        new Text({ text: "" }).addStyleClass("sapUiSmallMarginTop"),
        new Label({ text: "Comparison Result:" }),
        this._comparisonResult
      ]
    }).addStyleClass("sapUiSmallMargin");

    this._dialog = new Dialog({
      title: this.getProperty("dialogTitle") as string,
      contentWidth: "800px",
      resizable: true,
      draggable: true,
      content: [content],
      beginButton: new Button({
        text: "Compare",
        type: "Emphasized",
        icon: "sap-icon://compare",
        press: this._onComparePress.bind(this)
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

  private async _onComparePress(): Promise<void> {
    const text1 = this._text1Area?.getValue();
    const text2 = this._text2Area?.getValue();

    if (!text1 || text1.trim() === "" || !text2 || text2.trim() === "") {
      MessageToast.show("Please enter both texts to compare");
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

      const promptTemplate = this.getProperty("prompt") as string;
      const prompt = promptTemplate
        .replace("{text1}", text1)
        .replace("{text2}", text2);

      // Send both texts concatenated as the text parameter
      const combinedText = `Text 1:\n${text1}\n\nText 2:\n${text2}`;

      const context = model.bindContext("/processText(...)");
      context.setParameter("prompt", prompt);
      context.setParameter("text", combinedText);

      await context.invoke();

      const result = context.getBoundContext().getObject() as { value: string } | undefined;
      const comparison = result?.value || "";

      if (this._comparisonResult) {
        this._comparisonResult.setHtmlText(comparison);
      }

      this.fireEvent("textsCompared", {
        text1: text1,
        text2: text2,
        comparison: comparison
      });

      MessageToast.show("Comparison complete");
    } catch (error) {
      console.error("Error comparing texts:", error);
      MessageToast.show("Failed to compare texts. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  exit(): void {
    if (this._dialog) {
      this._dialog.destroy();
      this._dialog = null;
    }
    this._text1Area = null;
    this._text2Area = null;
    this._comparisonResult = null;
  }
}

interface $AICompareTextsSettings extends $ButtonSettings {
  prompt?: string;
  aiModelName?: string;
  dialogTitle?: string;
  text1Placeholder?: string;
  text2Placeholder?: string;
  text1Label?: string;
  text2Label?: string;
  textsCompared?: (event: AICompareTexts$TextsComparedEvent) => void;
}

interface AICompareTexts$TextsComparedEvent {
  getParameter(name: "text1"): string;
  getParameter(name: "text2"): string;
  getParameter(name: "comparison"): string;
}

export type { $AICompareTextsSettings, AICompareTexts$TextsComparedEvent };
