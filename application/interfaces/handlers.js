const Message = require('../models/Message');

/**
 * Interface for chat message handlers
 * @interface ChatHandler
 */
class ChatHandler {

    /**
     * Handles an incoming message
     * @param {Message} message - The incoming message
     */
    async handleIncomingMessage(message) {
        throw new Error("handleIncomingMessage must be implemented by subclasses");
    }
}

/**
 * Interface for user message handlers
 * @interface UserHandler
 */
class UserHandler {

    /**
     * Handles an incoming message
     * @param {Message} message - The incoming message
     */
    async handleIncomingMessage(message) {
        throw new Error("handleIncomingMessage must be implemented by subclasses");
    }
}

module.exports = {
    ChatHandler,
    UserHandler
}; 