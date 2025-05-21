//TODO; instantiate calendar client and connect to it and feed it to infrastructure calendar implementation
// // At the application level (e.g., in your app.js or a dependency injection container)
// const { google } = require('googleapis');
// const credentials = require('./env/your-credentials.json');
// const auth = new google.auth.JWT(/* ... */);
// const calendarClient = google.calendar({ version: 'v3', auth });

// // Then create your infrastructure instance
// const calendarInfra = new GoogleCalendarInfrastructure(calendarClient);

//TODO: Instantiate whatsapp client and pass it to whatsapp driver
// interaction/whatsappDriver.js
// const { Client } = require('whatsapp-web.js'); // TODO: Add LocalAuth for session persistence (why do we need session persistence?). To not scan QR code on every restart. 
// const qrcode = require('qrcode-terminal');
// const Message = require('../application/models/Message');
// const BOT_ID = "17872949783";
// const IInteractionPort = require('../application/interfaces/IInteractionPort');

//TODO: make a client spin up service
// TODO: Add LocalAuth here to save session state
// this.client = new Client({
//     //authStrategy: new LocalAuth(),
//     // Depending on your environment, you might need puppeteer options
//     // For example, if running in a container:
//     // puppeteer: {
//     //     args: ['--no-sandbox', '--disable-setuid-sandbox']
//     // }
// });
// this.client.on('qr', (qr) => {
//     console.log('QR RECEIVED', qr);
//     qrcode.generate(qr, { small: true });
// });

// // this.client.on('authenticated', () => {
// //     console.log('AUTHENTICATED');
// // });

// // this.client.on('auth_failure', msg => {
// //     // Fired if session restore fails
// //     console.error('AUTHENTICATION FAILURE', msg);
// // });

// app.js
const WhatsappDriver = require('./interaction/whatsappDriver');
const BotLogic = require('./application/botLogic');
const HandlerFactory = require('./application/handlerFactory');

// Create instances in the correct order
const botLogic = new BotLogic();
const whatsappDriver = new WhatsappDriver(botLogic);
const handlerFactory = new HandlerFactory(whatsappDriver, botLogic);

// Set the handler factory on BotLogic
botLogic.setHandlerFactory(handlerFactory);

// Initialize the WhatsApp client
whatsappDriver.initialize();


// --- Graceful Shutdown --- TODO: Implement
// process.on('SIGINT', async () => {
//     console.log('SIGINT received, shutting down client...');
//     if (whatsappDriver && whatsappDriver.client) {
//         try {
//             await whatsappDriver.client.destroy();
//             console.log('WhatsApp client destroyed.');
//         } catch (error) {
//             console.error('Error destroying WhatsApp client:', error);
//         }
//     }
//     process.exit(0);
// });

// process.on('SIGTERM', async () => {
//     console.log('SIGTERM received, shutting down client...');
//     if (whatsappDriver && whatsappDriver.client) {
//         try {
//             await whatsappDriver.client.destroy();
//             console.log('WhatsApp client destroyed.');
//         } catch (error) {
//             console.error('Error destroying WhatsApp client:', error);
//         }
//     }
//     process.exit(0);
// });
