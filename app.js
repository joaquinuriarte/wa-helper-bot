//TODO; instantiate calendar client and connect to it and feed it to infrastructure calendar implementation

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
