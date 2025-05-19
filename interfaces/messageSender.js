/**
 * Interface defining the contract that message sending components must implement
 * This interface is defined by the components that need to send messages (Handlers)
 */
class IMessageSender {
    /**
     * Sends a message to a specific chat
     * @param {string} chatId - The ID of the chat to send the message to
     * @param {string} message - The message to send
     * @returns {Promise<void>}
     */
    async sendMessage(chatId, message) {
        throw new Error("Method 'sendMessage' must be implemented");
    }
}

module.exports = IMessageSender; 