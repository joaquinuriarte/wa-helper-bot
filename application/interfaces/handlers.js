/**
 * @typedef {import('../../datastructures/message').StructuredMessage} StructuredMessage
 */

/**
 * @typedef {object} MessageSender
 * @property {function(string, string): Promise<void>} sendMessage - Method to send a message
 */

/**
 * @typedef {object} BotLogic
 * @property {function(): Object.<string, {description: string, execute: Function}>} getTools - Returns available tools
 */

/**
 * @interface ChatHandler
 * @property {MessageSender} messageSender - The service for sending messages
 * @property {BotLogic} botLogic - The main bot logic instance
 * @property {function(StructuredMessage): Promise<void>} handleIncomingMessage - Handles incoming messages
 */
class ChatHandler {
    /**
     * @param {MessageSender} messageSender - The service for sending messages
     * @param {BotLogic} botLogic - The main bot logic instance
     */
    constructor(messageSender, botLogic) {
        if (!messageSender || typeof messageSender.sendMessage !== 'function') {
            throw new Error("messageSender must implement the MessageSender interface");
        }
        if (!botLogic || typeof botLogic.getTools !== 'function') {
            throw new Error("botLogic must implement the BotLogic interface");
        }
        this.messageSender = messageSender;
        this.botLogic = botLogic;
    }

    /**
     * Handles an incoming message
     * @param {StructuredMessage} message - The incoming message
     * @returns {Promise<void>}
     */
    async handleIncomingMessage(message) {
        throw new Error("handleIncomingMessage must be implemented by subclasses");
    }
}

/**
 * @interface UserHandler
 * @property {MessageSender} messageSender - The service for sending messages
 * @property {BotLogic} botLogic - The main bot logic instance
 * @property {function(StructuredMessage): Promise<void>} handleIncomingMessage - Handles incoming messages
 */
class UserHandler {
    /**
     * @param {MessageSender} messageSender - The service for sending messages
     * @param {BotLogic} botLogic - The main bot logic instance
     */
    constructor(messageSender, botLogic) {
        if (!messageSender || typeof messageSender.sendMessage !== 'function') {
            throw new Error("messageSender must implement the MessageSender interface");
        }
        if (!botLogic || typeof botLogic.getTools !== 'function') {
            throw new Error("botLogic must implement the BotLogic interface");
        }
        this.messageSender = messageSender;
        this.botLogic = botLogic;
    }

    /**
     * Handles an incoming message
     * @param {StructuredMessage} message - The incoming message
     * @returns {Promise<void>}
     */
    async handleIncomingMessage(message) {
        throw new Error("handleIncomingMessage must be implemented by subclasses");
    }
}

module.exports = {
    ChatHandler,
    UserHandler
}; 