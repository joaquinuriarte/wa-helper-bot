const { Client } = require('whatsapp-web.js'); //TODO: Add LocalAuth for session persistence
const qrcode = require('qrcode-terminal');

/**
 * Helper class for managing WhatsApp client sessions.
 */
class WhatsappSessionManager {
    /**
     * Creates a new WhatsApp client instance 
     * @returns {Promise<import('whatsapp-web.js').Client>} The configured WhatsApp client
     */
    static async createClient() {
        const client = new Client({
            puppeteer: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu'
                  ]
            }
        });

        // Only handle session-related events
        client.on('qr', (qr) => {
            console.log('QR RECEIVED');
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', () => {
            console.log('Client is ready!');
        });

        client.on('disconnected', (reason) => {
            console.log('Client was disconnected:', reason);
        });

        return client;
    }

    /**
     * Initializes a WhatsApp client instance
     * @param {import('whatsapp-web.js').Client} client - The client to initialize
     */
    static async initializeClient(client) {
        if (!client) {
            throw new Error("WhatsApp client is required");
        }
        console.log('Initializing WhatsApp Client...');
        await client.initialize();
    }

    /**
     * Cleans up a WhatsApp client instance
     * @param {import('whatsapp-web.js').Client} client - The client to clean up
     */
    static async cleanupClient(client) {
        if (client) {
            try {
                await client.destroy();
                console.log('WhatsApp client cleaned up successfully');
            } catch (error) {
                console.error('Error cleaning up WhatsApp client:', error);
                throw error;
            }
        }
    }
}

module.exports = WhatsappSessionManager; 