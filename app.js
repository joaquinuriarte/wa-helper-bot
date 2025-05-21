
// app.js
const WhatsappSessionManager = require('./interaction/sessionManagers/whatsappSessionManager');
const WhatsappDriver = require('./interaction/whatsappDriver');
const BotLogic = require('./application/services/botLogic');
const HandlerFactory = require('./application/factories/handlerFactory');
const GoogleCalendarInfrastructure = require('./infrastructure/calendar/GoogleCalendarInfrastructure');
const GoogleCalendarSessionManager = require('./infrastructure/calendar/sessionManagers/googleCalendarSessionManager');


// INTERACTION PORT

// Interaction Port Variables
const BOT_ID = "17872949783";

// Instances 
const whatsappSessionManager = new WhatsappSessionManager();
const whatsappClient = await whatsappSessionManager.createClient();
const whatsappDriver = new WhatsappDriver(whatsappClient, BOT_ID);

// APPLICATION

// Instances 
const handlerFactory = new HandlerFactory(whatsappDriver); // TODO: pass in domain logic
const botLogic = new BotLogic(handlerFactory);

// Set the bot logic on whatsapp client
whatsappDriver.setBot(botLogic);

// INFRASTRUCTURE
const credentials = require('env/lucho-460500-cdb4b1f2ffe0.json');
const calendarClient = GoogleCalendarSessionManager.createClient(credentials);
const calendarInfra = new GoogleCalendarInfrastructure(calendarClient);

// DOMAIN LOGIC
// Create tools? Inject infra plugs
// give to factory?

// Initialize whatsapp client
await WhatsappSessionManager.initializeClient(whatsappClient);


// --- Graceful Shutdown ---
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down client...');
    if (whatsappClient) {
        try {
            await WhatsappSessionManager.cleanupClient(whatsappClient);
            console.log('WhatsApp client destroyed.');
        } catch (error) {
            console.error('Error destroying WhatsApp client:', error);
        }
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down client...');
    if (whatsappClient) {
        try {
            await WhatsappSessionManager.cleanupClient(whatsappClient);
            console.log('WhatsApp client destroyed.');
        } catch (error) {
            console.error('Error destroying WhatsApp client:', error);
        }
    }
    process.exit(0);
});
