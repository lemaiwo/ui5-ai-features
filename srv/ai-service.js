const cds = require("@sap/cds");
const { OrchestrationClient } = require("@sap-ai-sdk/orchestration");

module.exports = class AIService extends cds.ApplicationService {
  init() {
    this.on("processText", this.onProcessText);
    return super.init();
  }

  async onProcessText(req) {
    const { prompt, text } = req.data;

    if (!prompt || !text) {
      req.error(400, "Both 'prompt' and 'text' parameters are required");
      return;
    }

    try {
      const orchestrationClient = new OrchestrationClient({
        promptTemplating: {
          model: {
            name: "anthropic--claude-4.6-sonnet",
            params: {
              max_tokens: 4096,
              temperature: 0.7
            }
          }
        }
      });

      const response = await orchestrationClient.chatCompletion({
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant that processes text according to user instructions. " +
              "Only return the processed text without any additional explanation or commentary."
          },
          {
            role: "user",
            content: `${prompt}\n\nText to process:\n${text}`
          }
        ]
      });

      return response.getContent();
    } catch (error) {
      console.error("AI Service Error:", error);
      req.error(500, `AI processing failed: ${error.message}`);
    }
  }
};
