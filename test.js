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

client.on('message', async (msg) => { // What's differnece between message and message_create?
    const chat = await msg.getChat();
    console.log("Message from ", chat.name, ": ", msg.body);
    console.log("Is group chat: ", chat.isGroup);
    console.log("msg.from", msg.from);

    // Await both contact promises
    const msgMentions = await msg.getMentions();
    const chatContact = await chat.getContact();
    const msgContact = await msg.getContact();
    console.log("chat.getContact()", chatContact, "msg.getContact()", msgContact);
    console.log("msgMentions", msgMentions);

    if (msg.body === '!ping') {
        // send back "pong" to the chat the message was sent in
        client.sendMessage(msg.from, 'pong');
        chat.sendMessage('pong_2');
    }
});

// Initialize the client
client.initialize();


//
// const chat = await msg.getChat();
// const msgMentions = await msg.getMentions();

// // TODO: EVENTUALLY here we create a chat class or access an existing one. 
// if (chat.isGroup && chat.name == CHAT_NAME && msgMentions == BOT_NAME) {

//     // Create a structured message object for the application layer
//     const chatContact = await chat.getContact();
//     const msgContact = await msg.getContact();
//     const structuredMessage = createStructuredMessage(msg, chat, chatContact, msgContact);

//     // Pass the structured message to the application handler
//     const response = await this.applicationHandler.handleMessage(structuredMessage);
//     if (response) {
//         await this.sendMessage(msg.from, response);
//     }
// }