// interaction/whatsappDriver.js
const { Client } = require('whatsapp-web.js'); // TODO #1: Add LocalAuth for session persistence (why do we need session persistence?)
const qrcode = require('qrcode-terminal');

class WhatsappDriver {
    /**
     * @param {object} applicationHandler - An object implementing the IncomingMessageHandler interface.
     */
    constructor(applicationHandler) {
        if (!applicationHandler || typeof applicationHandler.handleMessage !== 'function') {
            throw new Error("applicationHandler must implement the IncomingMessageHandler interface with a 'handleMessage' method.");
        }
        this.applicationHandler = applicationHandler;

        // TODO #1: Add LocalAuth here to save session state
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
            // Instructions for the user to scan the QR code
            console.log('Scan the QR code above with your WhatsApp app.');
        });

        this.client.on('authenticated', () => {
            console.log('AUTHENTICATED');
        });

        this.client.on('auth_failure', msg => {
            // Fired if session restore fails
            console.error('AUTHENTICATION FAILURE', msg);
        });

        this.client.on('ready', () => {
            console.log('Client is ready!');
            // You could potentially notify the application layer that the client is ready here
            // this.applicationHandler.handleClientReady();
        });

        // message_create is triggered for both incoming and outgoing messages
        this.client.on('message_create', async (msg) => {
            // Optional: Ignore messages sent by the bot itself
            if (msg.fromMe) {
                console.log('Ignoring message created by myself');
                return;
            }

            const chat = await msg.getChat();

            console.log("Raw message_create event:", {
                from: msg.from,
                to: msg.to,
                body: msg.body,
                isGroup: chat.isGroup,
                chatName: chat.name,
                type: msg.type, // e.g., chat, image, video
                hasMedia: msg.hasMedia,
                timestamp: msg.timestamp
            });

            // Create a structured message object for the application layer
            const structuredMessage = {
                chatId: msg.from, // In whatsapp-web.js, 'from' is the chat ID for incoming messages
                senderId: msg.author || msg.from, // msg.author for groups, msg.from for direct
                body: msg.body,
                isGroup: chat.isGroup,
                chatName: chat.isGroup ? chat.name : 'Direct Chat', // Provide chat name for context
                // Add other properties as needed, e.g., type, media info
            };

            // Pass the structured message to the application handler
            this.applicationHandler.handleMessage(structuredMessage);
        });

        this.client.on('disconnected', (reason) => {
            console.log('Client was disconnected', reason);
            // You might want to try and re-initialize here or notify the application layer
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


    // TODO #2: Where is the MessageSender interface specified? Interaction would need to keep mapping of chatId to chat object.
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