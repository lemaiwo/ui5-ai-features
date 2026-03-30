import Button, { $ButtonSettings } from "sap/m/Button";
// @ts-expect-error ButtonRenderer has no type declarations
import ButtonRenderer from "sap/m/ButtonRenderer";
import Dialog from "sap/m/Dialog";
import TextArea from "sap/m/TextArea";
import Input from "sap/m/Input";
import VBox from "sap/m/VBox";
import Label from "sap/m/Label";
import Text from "sap/m/Text";
import MessageToast from "sap/m/MessageToast";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import type { Button$PressEvent } from "sap/m/Button";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { MetadataOptions } from "sap/ui/base/ManagedObject";
import Component from "sap/ui/core/Component";

/**
 * AIGenerateButton - A button that opens a dialog to generate text from a brief description/prompt.
 * Inverse of summarize: provide a short input and get expanded, well-written content.
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AIGenerateButton extends Button {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The prompt instruction. {description} is replaced with the user's input.
       */
      prompt: {
        type: "string",
        defaultValue:
          "Generate well-written, professional text based on the following description. Be detailed and comprehensive. Only return the generated text, no meta-commentary:\n\n{description}"
      },
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      dialogTitle: {
        type: "string",
        defaultValue: "Generate Text with AI"
      },
      /**
       * Placeholder text for the description input
       */
      inputPlaceholder: {
        type: "string",
        defaultValue: "Describe what you want to generate (e.g., 'a product description for a wireless keyboard')..."
      },
      inputLabel: {
        type: "string",
        defaultValue: "Description / Instructions"
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

  private _dialog: Dialog | null = null;
  private _descriptionInput: Input | null = null;
  private _outputTextArea: TextArea | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AIGenerateButtonSettings, settings?: any) {
    super(idOrSettings as string, settings as $ButtonSettings);
  }

  init(): void {
    super.init();
    this.setIcon("sap-icon://create");
    this.attachPress(this._onPress, this);
  }

  private _onPress(_event: Button$PressEvent): void {
    if (!this._dialog) {
      this._createDialog();
    }
    this._dialog?.open();
  }

  private _createDialog(): void {
    this._descriptionInput = new Input({
      width: "100%",
      placeholder: this.getProperty("inputPlaceholder") as string
    });

    this._outputTextArea = new TextArea({
      width: "100%",
      rows: 10,
      editable: false,
      growing: true,
      growingMaxLines: 20
    });

    const content = new VBox({
      width: "100%",
      items: [
        new Label({ text: this.getProperty("inputLabel") as string, labelFor: this._descriptionInput }),
        this._descriptionInput,
        new Text({ text: "" }).addStyleClass("sapUiSmallMarginTop"),
        new Label({ text: this.getProperty("outputLabel") as string, labelFor: this._outputTextArea }),
        this._outputTextArea
      ]
    }).addStyleClass("sapUiSmallMargin");

    this._dialog = new Dialog({
      title: this.getProperty("dialogTitle") as string,
      contentWidth: "650px",
      resizable: true,
      draggable: true,
      content: [content],
      beginButton: new Button({
        text: "Generate",
        type: "Emphasized",
        icon: "sap-icon://create",
        press: this._onGeneratePress.bind(this)
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

  private async _onGeneratePress(): Promise<void> {
    const description = this._descriptionInput?.getValue();

    if (!description || description.trim() === "") {
      MessageToast.show("Please enter a description of what to generate");
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
      const prompt = promptTemplate.replace("{description}", description);

      const context = model.bindContext("/processText(...)");
      context.setParameter("prompt", prompt);
      context.setParameter("text", description);

      await context.invoke();

      const result = context.getBoundContext().getObject() as { value: string } | undefined;
      const generatedText = result?.value || "";

      this._outputTextArea?.setValue(generatedText);

      this.fireEvent("textGenerated", {
        description: description,
        generatedText: generatedText
      });

      MessageToast.show("Text generated successfully");
    } catch (error) {
      console.error("Error generating text:", error);
      MessageToast.show("Failed to generate text. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  exit(): void {
    if (this._dialog) {
      this._dialog.destroy();
      this._dialog = null;
    }
    this._descriptionInput = null;
    this._outputTextArea = null;
  }
}

interface $AIGenerateButtonSettings extends $ButtonSettings {
  prompt?: string;
  aiModelName?: string;
  dialogTitle?: string;
  inputPlaceholder?: string;
  inputLabel?: string;
  outputLabel?: string;
  textGenerated?: (event: AIGenerateButton$TextGeneratedEvent) => void;
}

interface AIGenerateButton$TextGeneratedEvent {
  getParameter(name: "description"): string;
  getParameter(name: "generatedText"): string;
}

export type { $AIGenerateButtonSettings, AIGenerateButton$TextGeneratedEvent };
