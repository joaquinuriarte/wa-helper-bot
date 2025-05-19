// application/botLogic.js

/**
 * @typedef {import('../datastructures/message').StructuredMessage} StructuredMessage
 */

/**
 * @typedef {import('./interfaces/handlers').ChatHandler} ChatHandler
 * @typedef {import('./interfaces/handlers').UserHandler} UserHandler
 */

/**
 * @typedef {object} MessageSender - Conceptual interface for sending messages.
 * @property {function(string, string): Promise<void>} sendMessage - Method to send a message.
 */

/**
 * @typedef {Object} Tool
 * @property {string} description - Description of what the tool does
 * @property {Function} execute - The function that implements the tool's functionality
 */

/**
 * BotLogic class acts as the Application Layer handler and message router.
 * It receives structured messages from the WhatsappDriver (after mention check)
 * and routes them to the appropriate ChatHandler based on chat ID.
 * It also contains the core, chat-agnostic command processing logic.
 */
class BotLogic {
    /**
     * @param {MessageSender} messageSender - An object implementing the MessageSender interface (WhatsappDriver instance).
     * @param {import('./handlerFactory').HandlerFactory} handlerFactory - Factory for creating chat and user handlers.
     */
    constructor(messageSender, handlerFactory) {
        if (!messageSender || typeof messageSender.sendMessage !== 'function') {
            throw new Error("messageSender must implement the MessageSender interface with a 'sendMessage' method.");
        }
        if (!handlerFactory || typeof handlerFactory.createChatHandler !== 'function' || typeof handlerFactory.createUserHandler !== 'function') {
            throw new Error("handlerFactory must implement the HandlerFactory interface");
        }
        this.messageSender = messageSender;
        this.handlerFactory = handlerFactory;
        console.log('BotLogic initialized with handler factory');
    }

    /**
     * Handles an incoming structured message received from the WhatsappDriver.
     * This method acts as the router to the specific ChatHandlers.
     *
     * @param {StructuredMessage} message - The structured message object received from the WhatsappDriver.
     * @returns {Promise<void>} - This method does not return a response directly; the ChatHandler handles sending.
     */
    async handleMessage(message) {
        console.log(`BotLogic received message for routing from ${message.chatName} (${message.chatId}): "${message.body}"`);

        // Get the appropriate handler for this chat ID
        if (message.isGroup) {
            const handler = this.handlerFactory.createChatHandler(message.chatId);
        } else {
            const handler = this.handlerFactory.createUserHandler(message.chatId);
        }

        if (handler !== "DNE") {
            console.log(`BotLogic routing message to handler for chat ID: ${message.chatId}`);
            try {
                await handler.handleIncomingMessage(message);
            } catch (error) {
                console.error(`Error during routing or handling in ChatHandler for ${message.chatId}:`, error);
                // TODO: Error handling - potentially notify the user or log more severely
            }
        } else {
            console.log(`No specific handler registered for chat ID: ${message.chatId}. Ignoring message after mention check.`);
            // Optional: Implement default behavior for mentioned messages in unhandled chats
            // Example: await this.messageSender.sendMessage(message.chatId, "Hello! I don't have specific logic for this chat yet, but I heard you mention me!");
        }
    }

    /**
     * Returns a structure of available tools with their descriptions and function pointers
     * @returns {Object.<string, Tool>} Map of tool names to their descriptions and functions
     */
    getTools() {
        return {
            parseEventDetails: {
                description: "Parses text to extract event details like date, time, and description",
                execute: async (text) => {
                    // TODO: Implement event parsing logic
                    return { date: null, time: null, description: null };
                }
            },
            addCalendarEvent: {
                description: "Adds an event to the calendar with the specified details",
                execute: async (details) => {
                    // TODO: Implement calendar event creation
                    return { success: false, eventId: null };
                }
            },
            // Add more tools as needed
        };
    }

    // TODO: Add methods to interact with the Domain Layer, e.g.:
    // async parseEventDetails(text) { ... } // Could be in Domain Layer
    // async addCalendarEvent(details) {
    //     // Interact with Infrastructure Layer (e.g., Google Calendar Adapter)
    //     return await this.infrastructure.calendarAdapter.createEvent(details);
    // }
}

module.exports = BotLogic;
