const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

/**
 * Manages the creation of Langchain LLM instances.
 * Provides static methods to create and configure LLMs with consistent settings.
 */
class LLMSessionManager {

    /**
     * Creates and configures the LLM instance
     * @param {string} apiKey - The Gemini API key
     * @returns {Promise<Object>} Configured LLM instance
     */
    static async createLLM(apiKey) {
        if (!apiKey) {
            throw new Error('API key must be provided');
        }

        // Instantiate LangChain's ChatGoogleGenerativeAI model
        const llm = new ChatGoogleGenerativeAI({
            model: 'gemini-1.5-pro',
            apiKey: apiKey,
            temperature: 0,
        });
        return llm;
    }
}

module.exports = LLMSessionManager;