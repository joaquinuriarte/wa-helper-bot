const { ChatHandler } = require('../../../interfaces/IHandlers');
const IInteractionPort = require('../../../interfaces/IInteractionPort');
const Message = require('../../../models/Message');

/**
 * TestHandler is a basic implementation of ChatHandler for testing purposes.
 */
class TestHandler extends ChatHandler {
    /**
     * @param {IInteractionPort} interactionPort - The port for sending messages
     */
    constructor(interactionPort) {
        super(interactionPort);
        this.interactionPort = interactionPort;
    }

    /**
     * Handles incoming messages
     * @param {Message} message 
     */
    async handleIncomingMessage(message) {
        console.log(`TestHandler received message: ${message.body}`);
        const response = `Hey ${message.senderId}! Your message: "${message.body}" cannot be processed yet. 2+2 puede ser 5 tho.`;

        //TODO: Implement actual message handling logic with langchain

        const responseMessage = new Message(
            message.chatId,
            message.senderId,
            message.body,
            message.isGroup,
            message.chatName,
            response
        );

        await this.interactionPort.sendMessage(responseMessage);
    }
}

module.exports = TestHandler;