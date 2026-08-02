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
 * AITranslateButton - A MenuButton with language options that translates text using AI.
 * Reads text from the target TextArea, calls the AI service with the selected language,
 * and shows a result dialog with Accept/Reject options.
 *
 * @namespace be.wl.ai
 */
export default class AITranslateButton extends MenuButton {
  static readonly renderer = MenuButtonRenderer;

  static readonly metadata: MetadataOptions = {
    properties: {
      dialogTitle: {
        type: "string",
        defaultValue: "Translate Text with AI"
      },
      outputLabel: {
        type: "string",
        defaultValue: "Translated Text"
      },
      languages: {
        type: "string",
        defaultValue: ""
      },
      value: {
        type: "string",
        defaultValue: ""
      }
    },
    events: {
      textTranslated: {
        parameters: {
          originalText: { type: "string" },
          translatedText: { type: "string" },
          targetLanguage: { type: "string" }
        }
      }
    }
  };

  private _dialog: Dialog | null;
  private _outputTextArea: TextArea | null;
  private _resultText: string;
  private _originalText: string;
  private _selectedLanguage: LanguageEntry | null;
  private _menuCreated: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(idOrSettings?: string | $AITranslateButtonSettings, settings?: any) {
    super(idOrSettings as string, settings as $MenuButtonSettings);
  }

  init(): void {
    super.init();
    
    this.setIcon("sap-icon://translate");
  }

  onBeforeRendering(): void {
    if (!this._menuCreated) {
      this._setupMenu();
      this._menuCreated = true;
    }
  }

  private _getLanguages(): LanguageEntry[] {
    const languagesProp = this.getProperty("languages") as string;
    if (!languagesProp) {
      return DEFAULT_LANGUAGES;
    }
    // Only languages known to the backend allowlist are supported
    const codes = languagesProp.split(",").map((s: string) => s.trim());
    return codes
      .map((code: string) => DEFAULT_LANGUAGES.find((l) => l.key === code))
      .filter((l): l is LanguageEntry => l !== undefined);
  }

  private _setupMenu(): void {
    const languages = this._getLanguages();
    const menu = new Menu();
    menu.attachItemSelected((event: Menu$ItemSelectedEvent) => {
      const item = event.getParameter("item") as MenuItem;
      const text = item.getText();
      const lang = languages.find((l) => l.text === text);
      if (lang) void this._onLanguageSelected(lang);
    });
    languages.forEach((lang) => {
      menu.addItem(new MenuItem({ text: lang.text }));
    });
    this.setMenu(menu);
  }

  private async _onLanguageSelected(lang: LanguageEntry): Promise<void> {
    const sourceText = this.getProperty("value") as string;
    if (!sourceText || sourceText.trim() === "") {
      MessageToast.show("Please enter some text to translate");
      return;
    }
    this._originalText = sourceText;
    this._selectedLanguage = lang;
    await this._processText(sourceText, lang);
  }

  private async _processText(inputText: string, lang: LanguageEntry): Promise<void> {
    try {
      BusyIndicator.show(0);

      this._resultText = await callAIService("translate", inputText, {
        option: lang.key,
        model: getAIModelFor(this)
      });

      this._showResultDialog(lang.text);
    } catch (error) {
      console.error("Error translating text:", error);
      MessageToast.show("Failed to translate text. Please try again.");
    } finally {
      BusyIndicator.hide();
    }
  }

  private _showResultDialog(languageName: string): void {
    if (!this._dialog) {
      this._createDialog();
    }
    this._dialog?.setTitle(`${this.getProperty("dialogTitle") as string} — ${languageName}`);
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

    this.fireEvent("textTranslated", {
      originalText: this._originalText,
      translatedText: this._resultText,
      targetLanguage: this._selectedLanguage?.key || ""
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
    this._selectedLanguage = null;
  }
}

interface $AITranslateButtonSettings extends $MenuButtonSettings {
  dialogTitle?: string;
  outputLabel?: string;
  languages?: string;
  value?: string;
  textTranslated?: (event: AITranslateButton$TextTranslatedEvent) => void;
}

interface AITranslateButton$TextTranslatedEvent {
  getParameter(name: "originalText"): string;
  getParameter(name: "translatedText"): string;
  getParameter(name: "targetLanguage"): string;
}

export type { $AITranslateButtonSettings, AITranslateButton$TextTranslatedEvent };
