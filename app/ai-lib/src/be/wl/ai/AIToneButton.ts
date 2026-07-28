import MenuButton, { $MenuButtonSettings } from "sap/m/MenuButton";
// @ts-expect-error MenuButtonRenderer has no type declarations
import MenuButtonRenderer from "sap/m/MenuButtonRenderer";
import Menu from "sap/m/Menu";
import MenuItem from "sap/m/MenuItem";
import Dialog from "sap/m/Dialog";
import Button from "sap/m/Button";
import TextArea from "sap/m/TextArea";
import VBox from "sap/m/VBox";
import Label from "sap/m/Label";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import { callAIService, getAIModelFor } from "./AIModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import type { Menu$ItemSelectedEvent } from "sap/m/Menu";

interface ToneEntry {
  key: string;
  text: string;
  description: string;
}

const DEFAULT_TONES: ToneEntry[] = [
  { key: "formal", text: "Formal", description: "professional, corporate, and business-appropriate" },
  { key: "casual", text: "Casual", description: "friendly, relaxed, and conversational" },
  { key: "persuasive", text: "Persuasive", description: "compelling, convincing, and action-oriented" },
  { key: "empathetic", text: "Empathetic", description: "understanding, caring, and supportive" },
  { key: "concise", text: "Concise", description: "brief, to-the-point, and efficient" },
  { key: "enthusiastic", text: "Enthusiastic", description: "energetic, positive, and excited" },
  { key: "diplomatic", text: "Diplomatic", description: "tactful, balanced, and considerate" },
  { key: "instructional", text: "Instructional", description: "clear, step-by-step, and educational" }
];

/**
 * AIToneButton - A MenuButton with tone options that rewrites text in a different tone using AI.
 * Reads text from the target TextArea, calls the AI service with the selected tone,
 * and shows a result dialog with Accept/Reject options.
 *
 * @namespace be.wl.ai
 */
export default class AIToneButton extends MenuButton {
  static readonly renderer = MenuButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      dialogTitle: {
        type: "string",
        defaultValue: "Change Text Tone with AI"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Rewritten Text"
      },
      value: {
        type: "string",
        defaultValue: ""
      }
    },
    events: {
      textRewritten: {
        parameters: {
          originalText: { type: "string" },
          rewrittenText: { type: "string" },
          tone: { type: "string" }
        }
      }
    }
  };

  private _dialog: Dialog | null;
  private _outputTextArea: TextArea | null;
  private _resultText: string;
  private _originalText: string;
  private _selectedTone: ToneEntry | null;
  private _menuCreated: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AIToneButtonSettings, settings?: any) {
    super(idOrSettings as string, settings as $MenuButtonSettings);
  }

  init(): void {
    super.init();
    
    this.setIcon("sap-icon://ai");
  }

  onBeforeRendering(): void {
    if (!this._menuCreated) {
      this._setupMenu();
      this._menuCreated = true;
    }
  }

  private _setupMenu(): void {
    const menu = new Menu();
    menu.attachItemSelected((event: Menu$ItemSelectedEvent) => {
      const item = event.getParameter("item") as MenuItem;
      const text = item.getText();
      const tone = DEFAULT_TONES.find((t) => t.text === text);
      if (tone) void this._onToneSelected(tone);
    });
    DEFAULT_TONES.forEach((tone) => {
      menu.addItem(new MenuItem({ text: tone.text }));
    });
    this.setMenu(menu);
  }

  private async _onToneSelected(tone: ToneEntry): Promise<void> {
    const sourceText = this.getProperty("value") as string;
    if (!sourceText || sourceText.trim() === "") {
      MessageToast.show("Please enter some text to rewrite");
      return;
    }
    this._originalText = sourceText;
    this._selectedTone = tone;
    await this._processText(sourceText, tone);
  }

  private async _processText(inputText: string, tone: ToneEntry): Promise<void> {
    try {
      BusyIndicator.show(0);

      this._resultText = await callAIService("tone", inputText, {
        option: tone.key,
        model: getAIModelFor(this)
      });

      this._showResultDialog(tone.text);
    } catch (error) {
      console.error("Error rewriting text:", error);
      MessageToast.show("Failed to rewrite text. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  private _showResultDialog(toneName: string): void {
    if (!this._dialog) {
      this._createDialog();
    }
    this._dialog?.setTitle(`${this.getProperty("dialogTitle") as string} — ${toneName}`);
    this._outputTextArea?.setValue(this._resultText);
    this._dialog?.open();
  }

  private _createDialog(): void {
    this._outputTextArea = new TextArea({
      width: "100%",
      rows: 8,
      editable: false,
      growing: true,
      growingMaxLines: 15
    });

    const content = new VBox({
      width: "100%",
      items: [
        new Label({ text: this.getProperty("outputLabel") as string, labelFor: this._outputTextArea }),
        this._outputTextArea
      ]
    }).addStyleClass("sapUiSmallMargin");

    this._dialog = new Dialog({
      title: this.getProperty("dialogTitle") as string,
      contentWidth: "600px",
      resizable: true,
      draggable: true,
      content: [content],
      beginButton: new Button({
        text: "Accept",
        type: "Emphasized",
        icon: "sap-icon://accept",
        press: this._onAcceptPress.bind(this)
      }),
      endButton: new Button({
        text: "Reject",
        press: () => {
          this._dialog?.close();
        }
      })
    });

    this.addDependent(this._dialog);
  }

  private _onAcceptPress(): void {
    this.setProperty("value", this._resultText);

    this.fireEvent("textRewritten", {
      originalText: this._originalText,
      rewrittenText: this._resultText,
      tone: this._selectedTone?.key || ""
    });

    this._dialog?.close();
    MessageToast.show("Text updated");
  }

  exit(): void {
    if (this._dialog) {
      this._dialog.destroy();
      this._dialog = null;
    }
    this._outputTextArea = null;
    this._selectedTone = null;
  }
}

interface $AIToneButtonSettings extends $MenuButtonSettings {
  dialogTitle?: string;
  outputLabel?: string;
  value?: string;
  textRewritten?: (event: AIToneButton$TextRewrittenEvent) => void;
}

interface AIToneButton$TextRewrittenEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "rewrittenText"): string;
  getParameter(name: "tone"): string;
}

export type { $AIToneButtonSettings, AIToneButton$TextRewrittenEvent };
