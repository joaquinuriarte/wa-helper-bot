const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Create a new client
const client = new Client();

// When the QR code is received
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    // You'll need to scan this QR code with your WhatsApp app
});

// When the client is ready
client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message_create', async (msg) => { // What's differnece between message and message_create?
    const chat = await msg.getChat();
    console.log("Message from ", chat.name, ": ", msg.body);
    console.log("Is group chat: ", chat.isGroup);
    console.log("chat.getContact()", chat.getContact(), "msg.getContact()", msg.getContact());
    if (msg.body === '!ping') {
        // send back "pong" to the chat the message was sent in
        client.sendMessage(msg.from, 'pong');
        chat.sendMessage('pong_2');
    }
});

// Initialize the client
client.initialize(); 