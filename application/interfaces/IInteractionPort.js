const Message = require('../models/Message');

class IInteractionPort {
    /**
     * Initialize the interaction port
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error("Method 'initialize()' must be implemented.");
    }

    /**
     * Send a message to a recipient
     * @param {Message} message - The message object containing the response to send
     */
    async sendMessage(message) {
        throw new Error("Method 'sendMessage()' must be implemented.");
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async cleanup() {
        throw new Error("Method 'cleanup()' must be implemented.");
    }
}

module.exports = IInteractionPort; 