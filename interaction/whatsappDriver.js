// interaction/whatsappDriver.js
const { Client } = require('whatsapp-web.js'); // TODO: Add LocalAuth for session persistence (why do we need session persistence?). To not scan QR code on every restart. 
const qrcode = require('qrcode-terminal');
const { createStructuredMessage } = require('../datastructures/message');
const BOT_ID = "17872949783";
// interfaces
const IMessageSender = require('../interfaces/messageSender');
const IBotLogic = require('../interfaces/botLogic');


class WhatsappDriver extends IMessageSender {
    /**
     * @param {object} IBotLogic - An object implementing the IncomingMessageHandler interface.
     */
    constructor(botLogic) {
        super();
        if (!(botLogic instanceof IBotLogic)) {
            throw new Error("botLogic must implement IBotLogic");
        }
        this.botLogic = botLogic;

        // TODO: Add LocalAuth here to save session state
        this.client = new Client({
            //authStrategy: new LocalAuth(),
            // Depending on your environment, you might need puppeteer options
            // For example, if running in a container:
            // puppeteer: {
            //     args: ['--no-sandbox', '--disable-setuid-sandbox']
            // }
        });

        this.setupListeners();
    }

    setupListeners() {
        this.client.on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            qrcode.generate(qr, { small: true });
        });

        // this.client.on('authenticated', () => {
        //     console.log('AUTHENTICATED');
        // });

        // this.client.on('auth_failure', msg => {
        //     // Fired if session restore fails
        //     console.error('AUTHENTICATION FAILURE', msg);
        // });

        this.client.on('ready', () => {
            console.log('Client is ready!');
            // TODO: You could potentially notify the application layer that the client is ready here
            // this.applicationHandler.handleClientReady();
        });

        // message is triggered for only incoming messages
        this.client.on('message', async (msg) => {
            console.log('Message received: ', msg.body);
            try {
                // Identify if bot was summoned
                const msgMentions = await msg.getMentions();
                console.log('Mentions:', msgMentions.map(m => m.id));
                const isBotMentioned = msgMentions.some(mention => mention.id.user === BOT_ID);
                console.log('Is bot mentioned: ', isBotMentioned);
                if (isBotMentioned) {
                    // Create structured message object for application layer
                    const chat = await msg.getChat();
                    const chatContact = await chat.getContact();
                    const msgContact = await msg.getContact();
                    const structuredMessage = createStructuredMessage(msg, chat, chatContact, msgContact);
                    // Pass the structured message to the application handler
                    await this.botLogic.handleMessage(structuredMessage);
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        this.client.on('disconnected', (reason) => {
            console.log('Client was disconnected', reason);
            // TODO: You might want to try and re-initialize here or notify the application layer
            // this.client.initialize();
        });
    }

    /**
     * Initializes the whatsapp-web.js client.
     */
    initialize() {
        console.log('Initializing WhatsApp Client...');
        this.client.initialize();
    }


    /**
     * Sends a message to a specific chat.
     * Implements the MessageSender interface method.
     * @param {string} chatId - The ID of the chat (group or contact).
     * @param {string} text - The message text.
     * @returns {Promise<void>}
     */
    async sendMessage(chatId, text) {
        console.log(`Attempting to send message to ${chatId}: "${text}"`);
        try {
            await this.client.sendMessage(chatId, text);
            console.log(`Message sent successfully to ${chatId}`);
        } catch (error) {
            console.error(`Failed to send message to ${chatId}:`, error);
            throw error; // Re-throw for the application layer to handle if necessary
        }
    }
}

module.exports = WhatsappDriver;