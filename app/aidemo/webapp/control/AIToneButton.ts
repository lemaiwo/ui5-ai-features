import Button, { $ButtonSettings } from "sap/m/Button";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import Dialog from "sap/m/Dialog";
import TextArea from "sap/m/TextArea";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Label from "sap/m/Label";
import Text from "sap/m/Text";
import Select from "sap/m/Select";
import Item from "sap/ui/core/Item";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import type { Button$PressEvent } from "sap/m/Button";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import Component from "sap/ui/core/Component";

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
 * AIToneButton - A button that opens a dialog to rewrite text in a different tone using AI
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AIToneButton extends Button {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The base prompt instruction. {tone} and {toneDescription} are replaced with the selected tone.
       */
      prompt: {
        type: "string",
        defaultValue:
          "Rewrite the following text in a {tone} tone ({toneDescription}). Preserve the original meaning and key information. Only return the rewritten text, no explanations."
      },
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      dialogTitle: {
        type: "string",
        defaultValue: "Change Text Tone with AI"
      },
      inputPlaceholder: {
        type: "string",
        defaultValue: "Enter the text you want to change the tone of..."
      },
      inputLabel: {
        type: "string",
        defaultValue: "Original Text"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Rewritten Text"
      },
      /**
       * The default tone key
       */
      defaultTone: {
        type: "string",
        defaultValue: "formal"
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

  private _dialog: Dialog | null = null;
  private _inputTextArea: TextArea | null = null;
  private _outputTextArea: TextArea | null = null;
  private _toneSelect: Select | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AIToneButtonSettings, settings?: any) {
    super(idOrSettings as string, settings as $ButtonSettings);
  }

  init(): void {
    super.init();
    this.setIcon("sap-icon://ai");
    this.attachPress(this._onPress, this);
  }

  private _onPress(_event: Button$PressEvent): void {
    if (!this._dialog) {
      this._createDialog();
    }
    this._dialog?.open();
  }

  private _createDialog(): void {
    const defaultTone = this.getProperty("defaultTone") as string;

    this._toneSelect = new Select({
      width: "250px",
      items: DEFAULT_TONES.map(
        (tone) =>
          new Item({
            key: tone.key,
            text: tone.text
          })
      ),
      selectedKey: defaultTone
    });

    this._inputTextArea = new TextArea({
      width: "100%",
      rows: 6,
      placeholder: this.getProperty("inputPlaceholder") as string,
      growing: true,
      growingMaxLines: 10
    });

    this._outputTextArea = new TextArea({
      width: "100%",
      rows: 6,
      editable: false,
      growing: true,
      growingMaxLines: 10
    });

    const content = new VBox({
      width: "100%",
      items: [
        new HBox({
          alignItems: "Center",
          items: [
            new Label({ text: "Tone:" }).addStyleClass("sapUiTinyMarginEnd"),
            this._toneSelect
          ]
        }).addStyleClass("sapUiSmallMarginBottom"),
        new Label({ text: this.getProperty("inputLabel") as string, labelFor: this._inputTextArea }),
        this._inputTextArea,
        new Text({ text: "" }).addStyleClass("sapUiSmallMarginTop"),
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
        text: "Rewrite",
        type: "Emphasized",
        icon: "sap-icon://ai",
        press: this._onRewritePress.bind(this)
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

  private async _onRewritePress(): Promise<void> {
    const inputText = this._inputTextArea?.getValue();

    if (!inputText || inputText.trim() === "") {
      MessageToast.show("Please enter some text to rewrite");
      return;
    }

    const aiModelName = this.getProperty("aiModelName") as string;
    const selectedKey = this._toneSelect?.getSelectedKey() || "formal";
    const toneEntry = DEFAULT_TONES.find((t) => t.key === selectedKey) || DEFAULT_TONES[0];

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
        .replace("{tone}", toneEntry.text.toLowerCase())
        .replace("{toneDescription}", toneEntry.description);

      const context = model.bindContext("/processText(...)");
      context.setParameter("prompt", prompt);
      context.setParameter("text", inputText);

      await context.invoke();

      const result = context.getBoundContext().getObject() as { value: string } | undefined;
      const rewrittenText = result?.value || "";

      this._outputTextArea?.setValue(rewrittenText);

      this.fireEvent("textRewritten", {
        originalText: inputText,
        rewrittenText: rewrittenText,
        tone: selectedKey
      });

      MessageToast.show("Text rewritten successfully");
    } catch (error) {
      console.error("Error rewriting text:", error);
      MessageToast.show("Failed to rewrite text. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  exit(): void {
    if (this._dialog) {
      this._dialog.destroy();
      this._dialog = null;
    }
    this._inputTextArea = null;
    this._outputTextArea = null;
    this._toneSelect = null;
  }
}

interface $AIToneButtonSettings extends $ButtonSettings {
  prompt?: string;
  aiModelName?: string;
  dialogTitle?: string;
  inputPlaceholder?: string;
  inputLabel?: string;
  outputLabel?: string;
  defaultTone?: string;
  textRewritten?: (event: AIToneButton$TextRewrittenEvent) => void;
}

interface AIToneButton$TextRewrittenEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "rewrittenText"): string;
  getParameter(name: "tone"): string;
}

export type { $AIToneButtonSettings, AIToneButton$TextRewrittenEvent };
