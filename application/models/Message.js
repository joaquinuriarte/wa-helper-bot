/**
 * Represents a structured message in the application layer
 */
class Message {
    /**
     * @param {string} chatId - The ID of the chat
     * @param {string} senderName - The name of the sender
     * @param {string} body - The message content
     * @param {boolean} isGroup - Whether the chat is a group
     * @param {string} chatName - Name of the chat
     * @param {string} [response] - Optional response to the message
     */
    constructor(chatId, senderName, body, isGroup, chatName, response = null) {
        this.chatId = chatId;
        this.senderName = senderName;
        this.body = body;
        this.isGroup = isGroup;
        this.chatName = chatName;
        this.response = response;
    }
}

module.exports = Message; 