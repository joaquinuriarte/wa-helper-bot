// application/botLogic.js
const Message = require('../models/Message');
const IHandlerFactory = require('../interfaces/IHandlerFactory');
const { ChatHandler, UserHandler } = require('../interfaces/IHandlers');
const IBot = require('../interfaces/IBot');

/**
 * BotLogic class acts as the Application Layer handler and message router.
 * It receives structured messages and routes them to the appropriate handler
 * based on the message type (group or user chat).
 */
class BotLogic extends IBot {
    /**
     * @param {IHandlerFactory} handlerFactory - Factory for creating chat and user handlers
     */
    constructor(handlerFactory) {
        super();
        if (!handlerFactory) {
            throw new Error("Handler factory is required");
        }
        this.handlerFactory = handlerFactory;
    }

    /**
     * Adds sender information to the message body for context
     * @param {Message} message - The message to modify
     * @returns {Message} The modified message with sender info added
     * @private
     */
    addSenderInfoToMessage(message) {
        const senderInfo = `Sent by: ${message.senderName}`;
        const modifiedBody = `${message.body}\n\n${senderInfo}`;

        console.log('TESTING: modifiedBody: ', modifiedBody);

        // Create a new message object with the modified body
        return new Message(
            message.chatId,
            message.senderName,
            modifiedBody,
            message.isGroup,
            message.chatName
        );
    }

    /**
     * Handles an incoming message by routing it to the appropriate handler
     * @param {Message} message - The message to handle
     */
    async handleMessage(message) { // TODO: logic identifying it bot was mentioned should live here.
        // Add sender information to the message body for context
        const messageWithSenderInfo = this.addSenderInfoToMessage(message);

        const handler = this.getHandlerForMessage(messageWithSenderInfo);
        if (!handler) {
            return;
        }
        await this.delegateToHandler(handler, messageWithSenderInfo);
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
