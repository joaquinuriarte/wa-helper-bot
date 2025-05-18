/**
 * Represents a structured message object for the application layer
 * @typedef {Object} StructuredMessage
 * @property {string} chatId - The ID of the chat (from field in whatsapp-web.js)
 * @property {string} senderId - The ID of the sender (author for groups, from for direct)
 * @property {string} body - The message content
 * @property {boolean} isGroup - Whether the chat is a group
 * @property {string} chatName - Name of the chat (group name or 'Direct Chat')
 */

const createStructuredMessage = (msg, chat, chatContact, msgContact) => {
    return {
        chatId: msg.from,
        senderId: msgContact.name,
        body: msg.body,
        isGroup: chat.isGroup,
        chatName: chat.isGroup ? chatContact.name : "Direct Chat",
        // Add other properties as needed, e.g., type, media info
    };
};

//TODO: Add structured message object for interaction layer when sending a message

module.exports = {
    createStructuredMessage
}; 