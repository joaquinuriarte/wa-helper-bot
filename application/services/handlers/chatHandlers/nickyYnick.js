// const { ChatHandler } = require('../../../interfaces/IHandlers');
// const IInteractionPort = require('../../../interfaces/IInteractionPort');
// const Message = require('../../../models/Message');
// const AgentService = require('../../../../domain/agent/services/AgentService');
// const CalendarContext = require('../../../../domain/calendar/models/CalendarContext');
// const AgentRequest = require('../../../../domain/agent/models/AgentRequest');
// const AgentResponse = require('../../../../domain/agent/models/AgentResponse');
// /**
//  * TestHandler is a basic implementation of ChatHandler for testing purposes.
//  */
// class TestHandler extends ChatHandler {
//     /**
//      * @param {IInteractionPort} interactionPort - The port for sending messages
//      * @param {AgentService} AgentService - The agent service for handling user queries
//      * @param {CalendarContext} calendarContext - The calendar context for calendar operations
//      */
//     constructor(interactionPort, AgentService, calendarContext) {
//         super(interactionPort);
//         if (!(calendarContext instanceof CalendarContext)) {
//             throw new Error('Invalid calendarContext: Must be an instance of CalendarContext');
//         }
//         this.interactionPort = interactionPort;
//         this.AgentService = AgentService;
//         this.calendarContext = calendarContext;
//     }

//     /**
//      * Handles incoming messages
//      * @param {Message} message 
//      */
//     async handleIncomingMessage(message) {
//         console.log(`TestHandler received message: ${message.body}`);
//         console.log(`Messgage type: ${typeof message.body}`); // Your log confirms this is string

//         // Prepare arguments for AgentRequest constructor
//         const userTextInput = message.body;
//         const agentContext = {
//             calendarContext: this.calendarContext
//             //TODO: Here i would add more context relevant to more tools 
//             //TODO: Supply all chat members.
//         };

//         // Call AgentRequest constructor with two separate arguments
//         const agentRequest = new AgentRequest(userTextInput, agentContext);

//         try {
//             // Process message through agent
//             const agentResponse = await this.AgentService.handleUserQuery(agentRequest);

//             // Check if there was an error in the agent's processing
//             if (agentResponse.error) {
//                 console.error('Agent processing error:', agentResponse.error);
//                 // Create error message for user
//                 const errorMessage = new Message(
//                     message.chatId,
//                     message.senderId,
//                     message.body,
//                     message.isGroup,
//                     message.chatName,
//                     "I apologize, but I'm having trouble processing your request right now."
//                 );
//                 await this.interactionPort.sendMessage(errorMessage);
//                 return;
//             }

//             // Verify response is valid
//             if (!(agentResponse instanceof AgentResponse) || !agentResponse.responseText) {
//                 console.error('Agent response is invalid:', agentResponse);
//                 return;
//             }

//             // Create response message with agent's output
//             const responseMessage = new Message(
//                 message.chatId,
//                 message.senderId,
//                 message.body,
//                 message.isGroup,
//                 message.chatName,
//                 agentResponse.responseText
//             );

//             await this.interactionPort.sendMessage(responseMessage);
//         } catch (error) {
//             console.error('Error in handleIncomingMessage:', error);
//             // Create error message for user
//             const errorMessage = new Message(
//                 message.chatId,
//                 message.senderId,
//                 message.body,
//                 message.isGroup,
//                 message.chatName,
//                 "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."
//             );
//             await this.interactionPort.sendMessage(errorMessage);
//         }
//     }
// }

// module.exports = TestHandler;