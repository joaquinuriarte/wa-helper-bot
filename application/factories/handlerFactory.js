// handlerFactory.js
const IHandlerFactory = require('../interfaces/handlerFactory');
const { ChatHandler, UserHandler } = require('../interfaces/handlers');
const IInteractionPort = require('../interfaces/IInteractionPort');

// Available handlers 
const TestHandler = require('../handlers/chatHandlers/testHandler');

/**
 * Factory class for creating chat and user handlers
 */
class HandlerFactory extends IHandlerFactory {
    /**
     * @param {IInteractionPort} interactionPort - The port for sending messages
     */
    constructor(interactionPort) {
        super();
        if (!interactionPort) {
            throw new Error("interactionPort is required");
        }
        this.interactionPort = interactionPort;
    }

    /**
     * Creates a chat handler for the specified chat ID
     * @param {string} chatId 
     * @returns {ChatHandler | "DNE"}
     */
    createChatHandler(chatId) {
        // This id corresponds to the group chat id of the test group i have with Irene
        if (chatId === "120363398524431988@g.us") {
            return new TestHandler(this.interactionPort);
        }
        return "DNE";
    }

    /**
     * Creates a user handler for the specified user ID
     * @param {string} userId 
     * @returns {UserHandler | "DNE"}
     */
    createUserHandler(userId) {
        // TODO: Implement user handler creation
        return "DNE";
    }
}

module.exports = HandlerFactory; 