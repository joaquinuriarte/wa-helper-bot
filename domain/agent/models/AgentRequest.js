/**
 * Represents a request to be processed by an agent execution platform.
 */
class AgentRequest {
    /**
     * @param {string} userInput - The textual input from the user.
     * @param {object} [context] - Optional context for the agent.
     * @param {string} [context.userId] - The ID of the user.
     * @param {string} [context.chatId] - The ID of the chat.
     * @param {Array<{role: 'user' | 'assistant' | 'system', content: string}>} [context.conversationHistory] - History of the conversation.
     */
    constructor(userInput, context = {}) {
        if (!userInput || typeof userInput !== 'string') {
            throw new Error('userInput is required and must be a string.');
        }
        this.userInput = userInput;
        this.context = context; // e.g., { userId, chatId, conversationHistory }
    }
}

module.exports = AgentRequest; 