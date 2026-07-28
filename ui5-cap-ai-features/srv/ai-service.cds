/**
 * AI Service - Service for AI-powered text operations
 * Connects to SAP AI Core via the Orchestration Service
 *
 * Prompts are maintained server-side (see ai-service.js) — clients only
 * select a predefined operation and, where applicable, an allowlisted option.
 */
@impl: 'ui5-cap-ai-features/srv/ai-service.js'
service AIService {

    /**
     * Process text using a predefined AI operation
     * @param operation - Key of a server-side prompt template (e.g., "polish", "summarize", "translate")
     * @param text - The text to process
     * @param text2 - Second text for two-text operations ("compare", "spellcheckSummary")
     * @param option - Allowlisted option for parameterized operations (language key for "translate", tone key for "tone")
     * @returns The AI-processed text
     */
    action processText(operation : String(30), text : LargeString, text2 : LargeString, option : String(30)) returns LargeString;

}
