const { ChatHandler, UserHandler } = require('./handlers');

/**
 * Interface for creating chat and user handlers
 * @interface IHandlerFactory
 */
class IHandlerFactory {
    /**
     * Creates a chat handler for the specified chat ID
     * @param {string} chatId 
     * @returns {ChatHandler | "DNE"}
     */
    createChatHandler(chatId) {
        throw new Error("createChatHandler must be implemented");
    }

    /**
     * Creates a user handler for the specified user ID
     * @param {string} userId 
     * @returns {UserHandler | "DNE"}
     */
    createUserHandler(userId) {
        throw new Error("createUserHandler must be implemented");
    }
}

module.exports = IHandlerFactory; 