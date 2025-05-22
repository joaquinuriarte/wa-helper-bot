const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

/**
 * Manages the creation of Langchain LLM instances.
 * Provides static methods to create and configure LLMs with consistent settings.
 */
class LangchainAgentSessionManager {
    /**
     * Creates and configures the LLM instance
     * @param {string} apiKeyPath - Path to the API key file
     * @returns {Promise<Object>} Configured LLM instance
     */
    static async createLLM(apiKeyPath) {
        if (!apiKeyPath) {
            throw new Error('API key path must be provided');
        }
        const apiKey = await this._getApiKey(apiKeyPath);
        const genAI = new GoogleGenerativeAI(apiKey);
        return genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    }

    /**
     * Retrieves the API key from the configuration file
     * @private
     * @param {string} apiKeyPath - Path to the API key file
     * @returns {Promise<string>} The API key
     */
    static async _getApiKey(apiKeyPath) {
        try {
            const apiKeyData = JSON.parse(fs.readFileSync(apiKeyPath, 'utf8'));
            if (!apiKeyData.apiKey) {
                throw new Error('API key is empty in the configuration file');
            }
            return apiKeyData.apiKey;
        } catch (error) {
            throw new Error(`Failed to read Gemini API key: ${error.message}`);
        }
    }
}

module.exports = LangchainAgentSessionManager; 