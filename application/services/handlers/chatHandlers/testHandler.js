const { ChatHandler } = require('../../../interfaces/IHandlers');
const IInteractionPort = require('../../../interfaces/IInteractionPort');
const Message = require('../../../models/Message');
const IAgentExecutionPlatform = require('../../domain/agent/interfaces/IAgentExecutionPlatform');
const CalendarContext = require('../../../../domain/calendar/models/CalendarContext');
/**
 * TestHandler is a basic implementation of ChatHandler for testing purposes.
 */
class TestHandler extends ChatHandler {
    /**
     * @param {IInteractionPort} interactionPort - The port for sending messages
     * @param {IAgentExecutionPlatform} agentPlatform - The agent platform for handling user queries
     * @param {CalendarContext} calendarContext - The calendar context for calendar operations
     */
    constructor(interactionPort, agentPlatform, calendarContext) {
        super(interactionPort);
        if (!(calendarContext instanceof CalendarContext)) {
            throw new Error('Invalid calendarContext: Must be an instance of CalendarContext');
        }
        this.interactionPort = interactionPort;
        this.agentPlatform = agentPlatform;
        this.calendarContext = calendarContext;
    }

    /**
     * Handles incoming messages
     * @param {Message} message 
     */
    async handleIncomingMessage(message) {
        console.log(`TestHandler received message: ${message.body}`);

        // Create agent request with message context
        const agentRequest = {
            userInput: message.body,
            context: {
                userId: message.senderId,
                chatId: message.chatId,
                isGroup: message.isGroup,
                chatName: message.chatName,
                calendarContext: this.calendarContext
            }
        };

        // Process message through agent
        const agentResponse = await this.agentPlatform.processRequest(agentRequest);

        // Create response message with agent's output
        const responseMessage = new Message(
            message.chatId,
            message.senderId,
            message.body,
            message.isGroup,
            message.chatName,
            agentResponse.responseText
        );

        await this.interactionPort.sendMessage(responseMessage);
    }
}

module.exports = TestHandler;