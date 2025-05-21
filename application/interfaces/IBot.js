const Message = require('../models/Message');

/**
 * Interface for bot implementations
 */
class IBot {
    /**
     * Handles an incoming message
     * @param {Message} message - The message to handle
     */
    async handleMessage(message) {
        throw new Error("Method 'handleMessage()' must be implemented.");
    }
}

module.exports = IBot;