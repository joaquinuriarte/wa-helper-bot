// handlerFactory.js
const IHandlerFactory = require('../interfaces/handlerFactory');
const IMessageSender = require('../interfaces/messageSender');
const IBotLogic = require('../interfaces/botLogic');

/**
 * @typedef {import('./interfaces/handlers').ChatHandler} ChatHandler
 * @typedef {import('./interfaces/handlers').UserHandler} UserHandler
 */

const TestHandler = require('./handlers/chatHandlers/testHandler');

/**
 * Factory class for creating chat and user handlers
 */
class HandlerFactory extends IHandlerFactory {
    /**
     * @param {object} IMessageSender 
     * @param {object} IBotLogic 
     */
    constructor(messageSender, botLogic) {
        super();
        if (!(messageSender instanceof IMessageSender)) {
            throw new Error("messageSender must implement IMessageSender");
        }
        if (!(botLogic instanceof IBotLogic)) {
            throw new Error("botLogic must implement IBotLogic");
        }
        this.messageSender = messageSender;
        this.botLogic = botLogic;
    }

    /**
     * Creates a chat handler for the specified chat ID
     * @param {string} chatId 
     * @returns {import('./interfaces/handlers').ChatHandler | "DNE"}
     */
    createChatHandler(chatId) {
        console.log("Creating chat handler for chatId on factory: ", chatId);
        // For now, we'll create a TestHandler for our test group
        // This id corresponds to the group chat id of the test group i have with Irene
        if (chatId === "120363398524431988@g.us") {
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