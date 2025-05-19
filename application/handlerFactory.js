/**
 * @typedef {import('./interfaces/handlers').ChatHandler} ChatHandler
 * @typedef {import('./interfaces/handlers').UserHandler} UserHandler
 */

const TestHandler = require('./handlers/chatHandlers/testHandler');

/**
 * Factory class for creating chat and user handlers
 */
class HandlerFactory {
    /**
     * @param {import('./interfaces/handlers').MessageSender} messageSender 
     * @param {import('./interfaces/handlers').BotLogic} botLogic 
     */
    constructor(messageSender, botLogic) {
        this.messageSender = messageSender;
        this.botLogic = botLogic;
    }

    /**
     * Creates a chat handler for the specified chat ID
     * @param {string} chatId 
     * @returns {import('./interfaces/handlers').ChatHandler | "DNE"}
     */
    createChatHandler(chatId) {
        // For now, we'll create a TestHandler for all chats
        // TODO: Add logic to create different handlers based on chatId
        if (chatId == "Test") {
            return new TestHandler(this.messageSender, this.botLogic);
        }
        return "DNE";
    }

    /**
     * Creates a user handler for the specified user ID
     * @param {string} userId 
     * @returns {import('./interfaces/handlers').UserHandler | "DNE"}
     */
    createUserHandler(userId) {
        // TODO: Implement user handler creation
        return "DNE";
    }
}

module.exports = HandlerFactory; 