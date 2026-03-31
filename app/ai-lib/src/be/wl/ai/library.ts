import Lib from "sap/ui/core/Lib";

/**
 * AI Controls Library - Provides AI-powered UI5 controls for text processing.
 *
 * @namespace be.wl.ai
 */
const library = Lib.init({
  name: "be.wl.ai",
  dependencies: [
    "sap.ui.core",
    "sap.m"
  ],
  controls: [
    "be.wl.ai.AIBaseButton",
    "be.wl.ai.AIPolishButton",
    "be.wl.ai.AISummarizeButton",
    "be.wl.ai.AIGenerateButton",
    "be.wl.ai.AISpellCheckButton",
    "be.wl.ai.AIExtractKeywordsButton",
    "be.wl.ai.AICompareTexts",
    "be.wl.ai.AIToneButton",
    "be.wl.ai.AITranslateButton",
    "be.wl.ai.AIAutoComplete",
    "be.wl.ai.AIInputSuggestion",
    "be.wl.ai.AISentimentIndicator"
  ],
  noLibraryCSS: true
});

export default library;
