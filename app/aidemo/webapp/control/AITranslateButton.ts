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

interface LanguageEntry {
  key: string;
  text: string;
}

const DEFAULT_LANGUAGES: LanguageEntry[] = [
  { key: "en", text: "English" },
  { key: "de", text: "German" },
  { key: "fr", text: "French" },
  { key: "es", text: "Spanish" },
  { key: "it", text: "Italian" },
  { key: "pt", text: "Portuguese" },
  { key: "nl", text: "Dutch" },
  { key: "pl", text: "Polish" },
  { key: "zh", text: "Chinese" },
  { key: "ja", text: "Japanese" },
  { key: "ko", text: "Korean" },
  { key: "ar", text: "Arabic" }
];

/**
 * AITranslateButton - A button that opens a dialog to translate text using AI
 *
 * @namespace com.eliagroup.ai.aidemo.control
 */
export default class AITranslateButton extends Button {
  static readonly renderer = ButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      /**
       * The base prompt instruction sent to the AI service. The target language is appended automatically.
       */
      prompt: {
        type: "string",
        defaultValue:
          "Translate the following text to {targetLanguage}. Preserve the original meaning, tone, and formatting. Only return the translated text, no explanations."
      },
      /**
       * The name of the OData model to use for the AI service
       */
      aiModelName: {
        type: "string",
        defaultValue: "ai"
      },
      /**
       * Dialog title
       */
      dialogTitle: {
        type: "string",
        defaultValue: "Translate Text with AI"
      },
      /**
       * Placeholder text for the input area
       */
      inputPlaceholder: {
        type: "string",
        defaultValue: "Enter the text you want to translate..."
      },
      /**
       * Label for the input area
       */
      inputLabel: {
        type: "string",
        defaultValue: "Original Text"
      },
      /**
       * Label for the output area
       */
      outputLabel: {
        type: "string",
        defaultValue: "Translated Text"
      },
      /**
       * Comma-separated list of language codes to offer, or empty for defaults.
       * Format: "en,de,fr,es" — uses built-in language names.
       */
      languages: {
        type: "string",
        defaultValue: ""
      },
      /**
       * The default target language code
       */
      defaultTargetLanguage: {
        type: "string",
        defaultValue: "en"
      }
    },
    events: {
      /**
       * Fired when text has been successfully translated
       */
      textTranslated: {
        parameters: {
          originalText: { type: "string" },
          translatedText: { type: "string" },
          targetLanguage: { type: "string" }
        }
      }
    }
  };

  private _dialog: Dialog | null = null;
  private _inputTextArea: TextArea | null = null;
  private _outputTextArea: TextArea | null = null;
  private _languageSelect: Select | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AITranslateButtonSettings, settings?: any) {
    super(idOrSettings as string, settings as $ButtonSettings);
  }

  init(): void {
    super.init();
    this.setIcon("sap-icon://translate");
    this.attachPress(this._onPress, this);
  }

  private _getLanguages(): LanguageEntry[] {
    const languagesProp = this.getProperty("languages") as string;
    if (!languagesProp) {
      return DEFAULT_LANGUAGES;
    }
    const codes = languagesProp.split(",").map((s: string) => s.trim());
    return codes.map((code: string) => {
      const found = DEFAULT_LANGUAGES.find((l) => l.key === code);
      return found || { key: code, text: code.toUpperCase() };
    });
  }

  private _onPress(_event: Button$PressEvent): void {
    this._openDialog();
  }

  private _openDialog(): void {
    if (!this._dialog) {
      this._createDialog();
    }
    this._dialog?.open();
  }

  private _createDialog(): void {
    const languages = this._getLanguages();
    const defaultLang = this.getProperty("defaultTargetLanguage") as string;

    this._languageSelect = new Select({
      width: "200px",
      items: languages.map(
        (lang) =>
          new Item({
            key: lang.key,
            text: lang.text
          })
      ),
      selectedKey: defaultLang
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
            new Label({ text: "Target Language:" }).addStyleClass("sapUiTinyMarginEnd"),
            this._languageSelect
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
        text: "Translate",
        type: "Emphasized",
        icon: "sap-icon://translate",
        press: this._onTranslatePress.bind(this)
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

  private async _onTranslatePress(): Promise<void> {
    const inputText = this._inputTextArea?.getValue();

    if (!inputText || inputText.trim() === "") {
      MessageToast.show("Please enter some text to translate");
      return;
    }

    const aiModelName = this.getProperty("aiModelName") as string;
    const selectedKey = this._languageSelect?.getSelectedKey() || "en";
    const selectedItem = this._languageSelect?.getSelectedItem();
    const targetLanguageName = selectedItem?.getText() || selectedKey;

    const ownerComponent = Component.getOwnerComponentFor(this);
    const model = (ownerComponent?.getModel(aiModelName) || this.getModel(aiModelName)) as ODataModel;

    if (!model) {
      MessageToast.show(`AI model '${aiModelName}' not found. Please ensure the model is configured in manifest.json`);
      return;
    }

    try {
      BusyIndicator.show(0);

      const promptTemplate = this.getProperty("prompt") as string;
      const prompt = promptTemplate.replace("{targetLanguage}", targetLanguageName);

      const context = model.bindContext("/processText(...)");
      context.setParameter("prompt", prompt);
      context.setParameter("text", inputText);

      await context.invoke();

      const result = context.getBoundContext().getObject() as { value: string } | undefined;
      const translatedText = result?.value || "";

      this._outputTextArea?.setValue(translatedText);

      this.fireEvent("textTranslated", {
        originalText: inputText,
        translatedText: translatedText,
        targetLanguage: selectedKey
      });

      MessageToast.show("Text translated successfully");
    } catch (error) {
      console.error("Error translating text:", error);
      MessageToast.show("Failed to translate text. Please try again.");
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
    this._languageSelect = null;
  }
}

interface $AITranslateButtonSettings extends $ButtonSettings {
  prompt?: string;
  aiModelName?: string;
  dialogTitle?: string;
  inputPlaceholder?: string;
  inputLabel?: string;
  outputLabel?: string;
  languages?: string;
  defaultTargetLanguage?: string;
  textTranslated?: (event: AITranslateButton$TextTranslatedEvent) => void;
}

interface AITranslateButton$TextTranslatedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "translatedText"): string;
  getParameter(name: "targetLanguage"): string;
}

export type { $AITranslateButtonSettings, AITranslateButton$TextTranslatedEvent };
