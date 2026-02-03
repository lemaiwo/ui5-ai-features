/**
 * AI Service - Generic service for AI-powered text operations
 * Connects to SAP AI Core via the Orchestration Service
 */
service AIService {

    /**
     * Process text using AI with a given prompt instruction
     * @param prompt - The instruction for the AI (e.g., "Polish this text", "Make it more formal")
     * @param text - The text to process
     * @returns The AI-processed text
     */
    action processText(prompt : String, text : LargeString) returns LargeString;

}
