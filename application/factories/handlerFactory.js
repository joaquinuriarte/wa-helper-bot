// handlerFactory.js
const IHandlerFactory = require('../interfaces/IHandlerFactory');
const { ChatHandler, UserHandler } = require('../interfaces/IHandlers');
const IInteractionPort = require('../interfaces/IInteractionPort');
const AgentService = require('../../domain/agent/services/AgentService');
const CalendarContext = require('../../domain/calendar/models/CalendarContext');

// Available handlers 
const TestHandler = require('../services/handlers/chatHandlers/testHandler');
const NickyYNick = require('../services/handlers/chatHandlers/nickyYnick');

/**
 * Factory class for creating chat and user handlers
 */
class HandlerFactory extends IHandlerFactory {
    /**
     * @param {IInteractionPort} interactionPort - The port for sending messages
     * @param {AgentService} AgentService - The agent service for handling user queries
     */
    constructor(interactionPort, AgentService) {
        super();
        if (!interactionPort) {
            throw new Error("interactionPort is required");
        }
        if (!AgentService) {
            throw new Error("agentPlatform is required");
        }
        this.interactionPort = interactionPort;
        this.AgentService = AgentService;
    }

    /**
     * Creates a chat handler for the specified chat ID
     * @param {string} chatId 
     * @returns {ChatHandler | "DNE"}
     */
    createChatHandler(chatId) {
        // This id corresponds to the group chat id of the test group i have with Irene
        if (chatId === "TODO, swap below here and below with nickYnick id") {
            const calendarContext = new CalendarContext('8fb11090c390d3c9102c6be314996c37753b1568b77b0b31d9fc4db399b23f6a@group.calendar.google.com', 'America/Los_Angeles');
            return new TestHandler(this.interactionPort, this.AgentService, calendarContext);
        } else if (chatId === "120363398524431988@g.us") {
            const calendarContext = new CalendarContext('2f272e0ecef6b3941f77b6f9bcf8347672d5d56a800944434e06857f95d51584@group.calendar.google.com', 'America/Los_Angeles');
            return new NickyYNick(this.interactionPort, this.AgentService, calendarContext);
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