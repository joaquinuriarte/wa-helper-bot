const { ChatHandler } = require('../../interfaces/handlers');

/**
 * TestHandler is a basic implementation of ChatHandler for testing purposes.
 */
class TestHandler extends ChatHandler {
    /**
     * @param {import('../../interfaces/handlers').MessageSender} messageSender 
     * @param {import('../../interfaces/handlers').BotLogic} botLogic 
     */
    constructor(messageSender, botLogic) {
        super(messageSender, botLogic);
    }

    /**
     * Handles incoming messages
     * @param {import('../../../datastructures/message').StructuredMessage} message 
     */
    async handleIncomingMessage(message) {
        console.log(`TestHandler received message: ${message.body}`);
        const response = "Hey " + message.senderId + "! Your message: \"" + message.body + "\" cannot be processed yet. 2+2 puede ser 5 tho.";


        // TODO
        // Aqui esta toda la logica de averiguar con tools que quiere user. podemos expose solo tools que queremos que chat use. 
        // Basic echo functionality
        // tiene que haber constructor para chatbot que usemos
        await this.messageSender.sendMessage(message.chatId, response);
    }
}

module.exports = TestHandler;