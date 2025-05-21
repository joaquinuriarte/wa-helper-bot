// application/botLogic.js
const Message = require('../models/Message');
const IHandlerFactory = require('../interfaces/handlerFactory');
const { ChatHandler, UserHandler } = require('../interfaces/handlers');

/**
 * BotLogic class acts as the Application Layer handler and message router.
 * It receives structured messages and routes them to the appropriate handler
 * based on the message type (group or user chat).
 */
class BotLogic {
    /**
     * @param {IHandlerFactory} handlerFactory - Factory for creating chat and user handlers
     */
    constructor(handlerFactory) {
        if (!handlerFactory) {
            throw new Error("Handler factory is required");
        }
        this.handlerFactory = handlerFactory;
    }

    /**
     * Handles an incoming message by routing it to the appropriate handler
     * @param {Message} message - The message to handle
     */
    async handleMessage(message) {
        const handler = this.getHandlerForMessage(message);
        if (!handler) {
            return;
        }
        await this.delegateToHandler(handler, message);
    }

    /**
     * Gets the appropriate handler for the given message
     * @param {Message} message - The message to get a handler for
     * @returns {ChatHandler|UserHandler|null} The handler or null if none exists
     * @private
     */
    getHandlerForMessage(message) {
        if (message.isGroup) {
            return this.handlerFactory.createChatHandler(message.chatId);
        }
        return this.handlerFactory.createUserHandler(message.chatId);
    }

    /**
     * Delegates the message to the appropriate handler
     * @param {ChatHandler|UserHandler} handler - The handler to delegate to
     * @param {Message} message - The message to handle
     * @private
     */
    async delegateToHandler(handler, message) {
        if (handler === "DNE") {
            return;
        }

        try {
            await handler.handleIncomingMessage(message);
        } catch (error) {
            console.error(`Error handling message for ${message.chatId}:`, error);
            // TODO: Implement proper error handling strategy
        }
    }
}

module.exports = BotLogic;
