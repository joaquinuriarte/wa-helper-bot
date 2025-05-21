// interaction/whatsappDriver.js
const Message = require('../application/models/Message');
const IInteractionPort = require('../application/interfaces/IInteractionPort');

/**
 * WhatsApp implementation of the interaction port
 */
class WhatsappDriver extends IInteractionPort {
    /**
     * @param {import('whatsapp-web.js').Client} client - The WhatsApp client instance
     * @param {string} botId - The ID of the bot
     */
    constructor(client, botId) {
        super();
        if (!client) {
            throw new Error("WhatsApp client is required");
        }
        if (!botId) {
            throw new Error("Bot ID is required");
        }
        this.client = client;
        this.botId = botId;
        this.setupListeners();
    }

    setupListeners() {
        this.client.on('ready', () => {
            console.log('Client is ready!');
            // TODO: You could potentially notify the application layer that the client is ready here
            // this.applicationHandler.handleClientReady();
        });

        // message is triggered for only incoming messages
        this.client.on('message', async (msg) => {
            console.log('Message received: ', msg.body);
            try {
                const msgMentions = await msg.getMentions();
                const isBotMentioned = msgMentions.some(mention => mention.id.user === this.botId);

                if (isBotMentioned) {
                    const chat = await msg.getChat();
                    const chatContact = await chat.getContact();
                    const msgContact = await msg.getContact();

                    const message = new Message(
                        msg.from,
                        msgContact.name,
                        msg.body,
                        chat.isGroup,
                        chat.isGroup ? chatContact.name : "Direct Chat"
                    );

                    await this.botLogic.handleMessage(message);
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        this.client.on('disconnected', (reason) => {
            console.log('Client was disconnected:', reason);
            // TODO: Implement reconnection strategy
        });
    }

    /**
     * Initializes the WhatsApp client
     */
    async initialize() {
        console.log('Initializing WhatsApp Client...');
        await this.client.initialize();
    }

    /**
     * Sends a message to a recipient
     * @param {Message} message - The message object containing the response to send
     */
    async sendMessage(message) {
        if (!message.response) {
            console.log(`No response to send for message in ${message.chatId}`);
            return;
        }

        try {
            await this.client.sendMessage(message.chatId, message.response);
            console.log(`Response sent successfully to ${message.chatId}`);
        } catch (error) {
            console.error(`Failed to send response to ${message.chatId}:`, error);
            throw error;
        }
    }

    /**
     * Cleans up the WhatsApp client
     */
    async cleanup() {
        try {
            await this.client.destroy();
            console.log('WhatsApp client cleaned up successfully');
        } catch (error) {
            console.error('Error cleaning up WhatsApp client:', error);
            throw error;
        }
    }
}

module.exports = WhatsappDriver;