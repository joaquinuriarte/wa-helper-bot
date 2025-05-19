// application/botLogic.js

// Interfaces
const IBotLogic = require('../interfaces/botLogic');
const IHandlerFactory = require('../interfaces/handlerFactory');

/**
 * @typedef {import('../datastructures/message').StructuredMessage} StructuredMessage
 */

/**
 * @typedef {import('./interfaces/handlers').ChatHandler} ChatHandler
 * @typedef {import('./interfaces/handlers').UserHandler} UserHandler
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
class BotLogic extends IBotLogic {
    constructor() {
        super();
        this.handlerFactory = null;
        console.log('BotLogic initialized');
    }

    /**
     * Sets the handler factory for this BotLogic instance
     * @param {import('./interfaces/handlerFactory').IHandlerFactory} handlerFactory 
     */
    setHandlerFactory(handlerFactory) {
        if (!(handlerFactory instanceof IHandlerFactory)) {
            throw new Error("handlerFactory must implement IHandlerFactory");
        }
        this.handlerFactory = handlerFactory;
        console.log('Handler factory set on BotLogic');
    }

    /**
     * Handles an incoming structured message received from the WhatsappDriver.
     * This method acts as the router to the specific ChatHandlers.
     *
     * @param {StructuredMessage} message - The structured message object received from the WhatsappDriver.
     * @returns {Promise<void>} - This method does not return a response directly; the ChatHandler handles sending.
     */
    async handleMessage(message) {
        if (!this.handlerFactory) {
            throw new Error("Handler factory not set on BotLogic");
        }

        console.log(`BotLogic received message for routing from ${message.chatName} (${message.chatId}): "${message.body}"`);

        // Get the appropriate handler for this chat ID
        let handler;
        if (message.isGroup) {
            handler = this.handlerFactory.createChatHandler(message.chatId);
        } else {
            handler = this.handlerFactory.createUserHandler(message.chatId);
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
