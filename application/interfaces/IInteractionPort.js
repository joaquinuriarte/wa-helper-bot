const Message = require('../models/Message');

class IInteractionPort {
    /**
     * Send a message to a recipient
     * @param {Message} message - The message object containing the response to send
     */
    async sendMessage(message) {
        throw new Error("Method 'sendMessage()' must be implemented.");
    }
}

module.exports = IInteractionPort; 