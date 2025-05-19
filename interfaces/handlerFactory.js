/**
 * @typedef {import('../application/interfaces/handlers').ChatHandler} ChatHandler
 * @typedef {import('../application/interfaces/handlers').UserHandler} UserHandler
 */

/**
 * Interface defining the contract that handler factory components must implement
 * This interface is defined by the components that need to create handlers (BotLogic)
 */
class IHandlerFactory {
    /**
     * Creates a chat handler for the specified chat ID
     * @param {string} chatId 
     * @returns {ChatHandler | "DNE"}
     */
    createChatHandler(chatId) {
        throw new Error("Method 'createChatHandler' must be implemented");
    }

    /**
     * Creates a user handler for the specified user ID
     * @param {string} userId 
     * @returns {UserHandler | "DNE"}
     */
    createUserHandler(userId) {
        throw new Error("Method 'createUserHandler' must be implemented");
    }
}

module.exports = IHandlerFactory; 