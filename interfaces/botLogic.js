/**
 * @typedef {import('../datastructures/message').StructuredMessage} StructuredMessage
 */

/**
 * @typedef {Object} Tool
 * @property {string} description - Description of what the tool does
 * @property {Function} execute - The function that implements the tool's functionality
 */

/**
 * Interface defining the contract that BotLogic must implement
 * This interface is defined by the components that use BotLogic (WhatsAppDriver and HandlerFactory)
 */
class IBotLogic {
    /**
     * Handles an incoming message
     * @param {StructuredMessage} message - The message to handle
     * @returns {Promise<void>}
     */
    async handleMessage(message) {
        throw new Error("Method 'handleMessage' must be implemented");
    }

    /**
     * Returns the available tools
     * @returns {Object.<string, Tool>} Map of tool names to their implementations
     */
    getTools() {
        throw new Error("Method 'getTools' must be implemented");
    }
}

module.exports = IBotLogic; 