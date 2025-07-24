// interaction/whatsappDriver.js
const Message = require('../application/models/Message');
const IInteractionPort = require('../application/interfaces/IInteractionPort');
const IBot = require('../application/interfaces/IBot');

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
        this.bot = null;
        this.setupListeners();
    }

    /**
     * Sets the bot instance that will handle messages
     * @param {IBot} bot - The bot instance that implements IBot
     */
    setBot(bot) {
        if (!bot) {
            throw new Error("Bot instance is required");
        }
        if (!bot.handleMessage) {
            throw new Error("Bot instance must implement handleMessage method");
        }
        this.bot = bot;
    }

    setupListeners() {
        // message is triggered for only incoming messages
        this.client.on('message', async (msg) => {
            // Filter out status broadcasts and other non-chat messages
            if (msg.from === 'status@broadcast' || msg.isStatus) {
                return; // Skip status messages
            }
            
            try {
                const msgMentions = await msg.getMentions();
                const isBotMentioned = msgMentions.some(mention => mention.id.user === this.botId);

                if (isBotMentioned) {
                    console.log('Bot mentioned in message: ', msg.body);
                    
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

                    if (!this.bot) {
                        console.log('Bot not set, message will not be handled');
                        return;
                    }
                    await this.bot.handleMessage(message);
                    console.log('Message handled successfully');
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });
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
}

module.exports = WhatsappDriver;