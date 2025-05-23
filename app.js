// app.js

// ============= IMPORTS =============
// Interaction Layer
const WhatsappSessionManager = require('./interaction/sessionManagers/whatsappSessionManager');
const WhatsappDriver = require('./interaction/whatsappDriver');

// Application Layer
const BotLogic = require('./application/services/botLogic');
const HandlerFactory = require('./application/factories/handlerFactory');

// Infrastructure Layer
const GoogleCalendarInfrastructure = require('./infrastructure/calendar/GoogleCalendarInfrastructure');
const GoogleCalendarSessionManager = require('./infrastructure/calendar/sessionManagers/googleCalendarSessionManager');
const EventParserInfrastructure = require('./infrastructure/calendar/EventParserInfrastructure');
const LangchainAgentSessionManager = require('./infrastructure/agents/sessionManagers/LangchainAgentSessionManager');
const LangchainAgentPlatform = require('./infrastructure/agents/LangchainAgentPlatform');
const systemPrompt = require('./infrastructure/agents/prompts/systemPrompt');
const apiKeyPath = './env/gemini-api-key.json';


// ============= CONFIGURATION =============
const BOT_ID = "254232636694646" //"17872949783"; // Bot ID for WhatsApp Abuela Home Number (It randomly changed to new string)
const credentials = require('./env/lucho-460500-cdb4b1f2ffe0.json'); // Google Calendar credentials

// ============= GRACEFUL SHUTDOWN HANDLERS =============
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

// ============= MAIN FUNCTION =============
async function main() {
    // ============= INFRASTRUCTURE LAYER SETUP =============
    // Create and configure calendar infrastructure
    const calendarClient = GoogleCalendarSessionManager.createClient(credentials);
    const calendarInfra = new GoogleCalendarInfrastructure(calendarClient);
    // Create and configure Langchain agent infrastructure
    const llm = await LangchainAgentSessionManager.createLLM(apiKeyPath);
    const eventParserInfra = new EventParserInfrastructure(llm);
    const langchainAgentPlatform = new LangchainAgentPlatform([calendarInfra, eventParserInfra], llm, systemPrompt);
    await langchainAgentPlatform.initialize();

    // ============= INTERACTION LAYER SETUP =============
    // Create and configure WhatsApp client
    const whatsappClient = await WhatsappSessionManager.createClient();
    const whatsappDriver = new WhatsappDriver(whatsappClient, BOT_ID);

    // ============= APPLICATION LAYER SETUP =============
    // Create and configure application services
    const handlerFactory = new HandlerFactory(whatsappDriver, langchainAgentPlatform);
    const botLogic = new BotLogic(handlerFactory);

    // Connect bot logic to WhatsApp driver
    whatsappDriver.setBot(botLogic);


    // ============= DOMAIN LAYER SETUP =============
    // TODO: Create domain tools
    // TODO: Inject infrastructure plugs
    // TODO: Configure factory with domain logic

    // ============= INITIALIZATION =============
    // Initialize WhatsApp client
    await WhatsappSessionManager.initializeClient(whatsappClient);
}

// Run the main function
main().catch(error => {
    console.error('Error in main:', error);
    process.exit(1);
});
