/**
 * @typedef {import('./interfaces/handlers').ChatHandler} ChatHandler
 * @typedef {import('./interfaces/handlers').UserHandler} UserHandler
 */

/**
 * Factory class for creating chat and user handlers
 */
class HandlerFactory {
    constructor() {
        // Initialize any necessary dependencies here
    }

    /**
     * Creates or retrieves a chat handler for a given chat ID
     * @param {string} chatId - The ID of the chat
     * @returns {ChatHandler|"DNE"} The chat handler or "DNE" if not found
     */
    createChatHandler(chatId) {
        if (chatId === "1234567890@g.us") {
            return new TestGroupChatHandler();
        } else if (chatId === "9876543210@g.us") {
            return new AnotherGroupChatHandler();
        }
        // Add more chat handlers as needed
        return "DNE";
    }

    /**
     * Creates or retrieves a user handler for a given user ID
     * @param {string} userId - The ID of the user
     * @returns {UserHandler|"DNE"} The user handler or "DNE" if not found
     */
    createUserHandler(userId) {
        if (userId === "111222333@c.us") {
            return new AdminUserHandler();
        } else if (userId === "444555666@c.us") {
            return new RegularUserHandler();
        }
        // Add more user handlers as needed
        return "DNE";
    }
}

module.exports = HandlerFactory; 