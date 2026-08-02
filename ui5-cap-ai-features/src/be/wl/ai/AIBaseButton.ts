import Button, { $ButtonSettings } from "sap/m/Button";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import Dialog from "sap/m/Dialog";
import TextArea from "sap/m/TextArea";
import VBox from "sap/m/VBox";
import Label from "sap/m/Label";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import type { Button$PressEvent } from "sap/m/Button";
import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import { callAIService, getAIModelFor, AICallOptions } from "./AIModel";

/**
 * AIBaseButton - Abstract base class for AI-powered button controls.
 * Provides shared logic: AI service calls, dialog management, and
 * a bindable value property for two-way data binding with input controls.
 *
 * @namespace be.wl.ai
 */
export default class AIBaseButton extends Button {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      value: {
        type: "string",
        defaultValue: ""
      },
      dialogTitle: {
        type: "string",
        defaultValue: "AI Result"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Result"
      }
    }
  };

  protected dialog: Dialog | null;
  protected outputTextArea: TextArea | null;
  protected resultText: string;
  protected originalText: string;

  init(): void {
    super.init();
    this.dialog = null;
    this.outputTextArea = null;
    this.resultText = "";
    this.originalText = "";
    this.setIcon(this.getDefaultIcon());
    this.attachPress(this.onPress, this);
  }

  // --- Overridable hooks ---

  /**
   * Key of the server-side prompt template this control invokes.
   * Prompts are maintained in the backend — controls only select an operation.
   */
  protected getOperation(): string {
    return "";
  }

  protected getDefaultIcon(): string {
    return "sap-icon://ai";
  }

  protected getEmptyInputMessage(): string {
    return "Please enter some text to process";
  }

  protected getErrorMessage(): string {
    return "Failed to process text. Please try again.";
  }

  protected getDialogContentWidth(): string {
    return "600px";
  }

  protected hasAcceptReject(): boolean {
    return true;
  }

  protected async onPress(_event: Button$PressEvent): Promise<void> {
    const text = this.getProperty("value") as string;
    if (!text || text.trim() === "") {
      MessageToast.show(this.getEmptyInputMessage());
      return;
    }
    this.originalText = text;
    await this.processText(text);
  }

  protected async processText(inputText: string): Promise<void> {
    try {
      BusyIndicator.show(0);
      this.resultText = await this.callAI(inputText);
      this.showResultDialog();
    } catch (error) {
      console.error("Error processing text:", error);
      MessageToast.show(this.getErrorMessage());
    } finally {
      BusyIndicator.hide();
    }
  }

  protected createDialogContent(): Control {
    this.outputTextArea = new TextArea({
      width: "100%",
      rows: 8,
      editable: false,
      growing: true,
      growingMaxLines: 15
    });

    return new VBox({
      width: "100%",
      items: [
        new Label({
          text: this.getProperty("outputLabel") as string,
          labelFor: this.outputTextArea
        }),
        this.outputTextArea
      ]
    }).addStyleClass("sapUiSmallMargin");
  }

  protected updateDialogContent(): void {
    this.outputTextArea?.setValue(this.resultText);
  }

  protected fireResultEvent(): void {
    // No-op by default — each subclass fires its own event
  }

  protected onCleanup(): void {
    // No-op by default
  }

  // --- Concrete shared methods ---

  protected async callAI(text: string, options?: AICallOptions): Promise<string> {
    return callAIService(this.getOperation(), text, { model: getAIModelFor(this), ...options });
  }

  protected showResultDialog(): void {
    if (!this.dialog) {
      this.createResultDialog();
    }
    this.updateDialogContent();
    this.dialog?.open();
  }

  private createResultDialog(): void {
    const content = this.createDialogContent();
    const buttons = this.getDialogButtons();

    this.dialog = new Dialog({
      title: this.getProperty("dialogTitle") as string,
      contentWidth: this.getDialogContentWidth(),
      resizable: true,
      draggable: true,
      content: [content],
      endButton: buttons.endButton
    });

    if (buttons.beginButton) {
      this.dialog.setBeginButton(buttons.beginButton);
    }

    this.addDependent(this.dialog);
  }

  protected getDialogButtons(): { beginButton?: Button; endButton: Button } {
    if (this.hasAcceptReject()) {
      return {
        beginButton: new Button({
          text: "Accept",
          type: "Emphasized",
          icon: "sap-icon://accept",
          press: this.onAcceptPress.bind(this)
        }),
        endButton: new Button({
          text: "Reject",
          press: () => { this.dialog?.close(); }
        })
      };
    }
    return {
      endButton: new Button({
        text: "Close",
        press: () => { this.dialog?.close(); }
      })
    };
  }

  protected onAcceptPress(): void {
    this.setProperty("value", this.resultText);
    this.fireResultEvent();
    this.dialog?.close();
    MessageToast.show("Text updated");
  }

  exit(): void {
    this.onCleanup();
    if (this.dialog) {
      this.dialog.destroy();
      this.dialog = null;
    }
    this.outputTextArea = null;
  }
}

interface $AIBaseButtonSettings extends $ButtonSettings {
  value?: string;
  dialogTitle?: string;
  outputLabel?: string;
}

export type { $AIBaseButtonSettings };
