import Control from "sap/ui/core/Control";
import type RenderManager from "sap/ui/core/RenderManager";
import Button from "sap/m/Button";
import ObjectStatus from "sap/m/ObjectStatus";
import HBox from "sap/m/HBox";
import MessageToast from "sap/m/MessageToast";
import { callAIService } from "./AIModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import { ValueState } from "sap/ui/core/library";

type SentimentValue = "positive" | "neutral" | "negative" | "none";

/**
 * AISentimentIndicator - Analyzes text sentiment using AI and displays a visual indicator.
 * Shows a colored status (positive/neutral/negative) based on AI analysis.
 *
 * @namespace be.wl.ai
 */
export default class AISentimentIndicator extends Control {
  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The text to analyze. Can be bound to a model property.
       */
      text: {
        type: "string",
        defaultValue: ""
      },
      /**
       * The current sentiment result
       */
      sentiment: {
        type: "string",
        defaultValue: "none"
      },
      /**
       * Whether to show the analyze button (true) or auto-analyze (false)
       */
      showButton: {
        type: "boolean",
        defaultValue: true
      },
      /**
       * Button text
       */
      buttonText: {
        type: "string",
        defaultValue: "Analyze Sentiment"
      }
    },
    events: {
      /**
       * Fired when sentiment analysis is complete
       */
      sentimentAnalyzed: {
        parameters: {
          text: { type: "string" },
          sentiment: { type: "string" }
        }
      }
    }
  };

  private _button: Button | null;
  private _status: ObjectStatus | null;
  private _container: HBox | null;
  private _busy: boolean;

  init(): void {
    super.init();
    
  }

  static readonly renderer = {
    apiVersion: 2,
    render(rm: RenderManager, control: AISentimentIndicator): void {
      rm.openStart("div", control);
      rm.class("aiSentimentIndicator");
      rm.style("display", "inline-block");
      rm.openEnd();
      const container = control._getContainer();
      rm.renderControl(container);
      rm.close("div");
    }
  };

  private _getContainer(): HBox {
    if (!this._container) {
      this._status = new ObjectStatus(this.getId() + "-status", {
        text: this._getSentimentDisplayText(),
        state: this._getSentimentState(),
        icon: this._getSentimentIcon()
      });

      const items = [];

      if (this.getProperty("showButton") as boolean) {
        this._button = new Button(this.getId() + "-btn", {
          text: this.getProperty("buttonText") as string,
          icon: "sap-icon://ai",
          type: "Transparent",
          press: this._onAnalyzePress.bind(this)
        });
        items.push(this._button);
      }

      items.push(this._status);

      this._container = new HBox(this.getId() + "-box", {
        alignItems: "Center",
        items: items
      });
      this._container.setParent(this);
    }
    return this._container;
  }

  private _getSentimentDisplayText(): string {
    const sentiment = this.getProperty("sentiment") as SentimentValue;
    switch (sentiment) {
      case "positive":
        return "Positive";
      case "neutral":
        return "Neutral";
      case "negative":
        return "Negative";
      default:
        return "";
    }
  }

  private _getSentimentState(): ValueState {
    const sentiment = this.getProperty("sentiment") as SentimentValue;
    switch (sentiment) {
      case "positive":
        return ValueState.Success;
      case "neutral":
        return ValueState.Information;
      case "negative":
        return ValueState.Error;
      default:
        return ValueState.None;
    }
  }

  private _getSentimentIcon(): string {
    const sentiment = this.getProperty("sentiment") as SentimentValue;
    switch (sentiment) {
      case "positive":
        return "sap-icon://sentiment-positive";
      case "neutral":
        return "sap-icon://sentiment-neutral";
      case "negative":
        return "sap-icon://sentiment-negative";
      default:
        return "";
    }
  }

  private _updateStatusDisplay(): void {
    if (this._status) {
      this._status.setText(this._getSentimentDisplayText());
      this._status.setState(this._getSentimentState());
      this._status.setIcon(this._getSentimentIcon());
    }
  }

  private async _onAnalyzePress(): Promise<void> {
    const text = this.getProperty("text") as string;
    if (!text || text.trim() === "") {
      MessageToast.show("No text to analyze");
      return;
    }
    await this.analyze(text);
  }

  /**
   * Analyze the sentiment of the given text (or the bound text property).
   * Can be called programmatically.
   */
  public async analyze(text?: string): Promise<SentimentValue> {
    const textToAnalyze = text || (this.getProperty("text") as string);
    if (!textToAnalyze || textToAnalyze.trim() === "") {
      return "none";
    }

    if (this._busy) {
      return this.getProperty("sentiment") as SentimentValue;
    }

    try {
      this._busy = true;
      if (this._button) {
        this._button.setBusy(true);
      }

      const rawResult = await callAIService("sentiment", textToAnalyze);
      const rawSentiment = rawResult.trim().toLowerCase();

      let sentiment: SentimentValue = "neutral";
      if (rawSentiment.includes("positive")) {
        sentiment = "positive";
      } else if (rawSentiment.includes("negative")) {
        sentiment = "negative";
      } else if (rawSentiment.includes("neutral")) {
        sentiment = "neutral";
      }

      this.setProperty("sentiment", sentiment);
      this._updateStatusDisplay();

      this.fireEvent("sentimentAnalyzed", {
        text: textToAnalyze,
        sentiment: sentiment
      });

      return sentiment;
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      MessageToast.show("Failed to analyze sentiment. Please try again.");
      return "none";
    } finally {
      this._busy = false;
      if (this._button) {
        this._button.setBusy(false);
      }
    }
  }

  exit(): void {
    if (this._container) {
      this._container.destroy();
      this._container = null;
    }
    this._button = null;
    this._status = null;
  }
}

interface $AISentimentIndicatorSettings {
  text?: string;
  sentiment?: string;
  showButton?: boolean;
  buttonText?: string;
  sentimentAnalyzed?: (event: AISentimentIndicator$SentimentAnalyzedEvent) => void;
}

interface AISentimentIndicator$SentimentAnalyzedEvent {
  getParameter(name: "text"): string;
  getParameter(name: "sentiment"): string;
}

export type { $AISentimentIndicatorSettings, AISentimentIndicator$SentimentAnalyzedEvent };
