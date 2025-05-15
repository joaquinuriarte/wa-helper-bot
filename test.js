const { Client } = require('whatsapp-web.js');

// Create a new client
const client = new Client();

// When the QR code is received
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    // You'll need to scan this QR code with your WhatsApp app
});

// When the client is ready
client.on('ready', () => {
    console.log('Client is ready!');
});

// Initialize the client
client.initialize(); 