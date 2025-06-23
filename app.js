// app.js

// ============= IMPORTS =============
// Interaction Layer
const WhatsappSessionManager = require('./interaction/sessionManagers/whatsappSessionManager');
const WhatsappDriver = require('./interaction/whatsappDriver');

// Domain Layer
const AgentService = require('./domain/agent/services/AgentService');
const CalendarService = require('./domain/calendar/services/CalendarService');
const EventParserService = require('./domain/calendar/services/EventParserService');

// Application Layer
const BotLogic = require('./application/services/botLogic');
const HandlerFactory = require('./application/factories/handlerFactory');

// Infrastructure Layer
const GoogleCalendarInfrastructure = require('./infrastructure/calendar/GoogleCalendarInfrastructure');
const GoogleCalendarSessionManager = require('./infrastructure/calendar/sessionManagers/googleCalendarSessionManager');
const EventParserInfrastructure = require('./infrastructure/calendar/EventParserInfrastructure');
const LLMSessionManager = require('./infrastructure/calendar/sessionManagers/LLMSessionManager');
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
    const llm_event_parser = await LLMSessionManager.createLLM(apiKeyPath);
    const eventParserInfra = new EventParserInfrastructure(llm_event_parser);


    // ============= DOMAIN LAYER SETUP =============
    const calendarService = new CalendarService(calendarInfra);
    const eventParserService = new EventParserService(eventParserInfra);

    // ============= AGENT INFRASTRUCTURE LAYER SETUP =============
    const langchainAgentPlatform = new LangchainAgentPlatform([calendarService, eventParserService], apiKeyPath, systemPrompt);
    await langchainAgentPlatform.createAgent();

    // ============= AGENT DOMAIN LAYER SETUP =============
    const agentService = new AgentService(langchainAgentPlatform);

    // ============= INTERACTION LAYER SETUP =============
    // Create and configure WhatsApp client
    const whatsappClient = await WhatsappSessionManager.createClient();
    const whatsappDriver = new WhatsappDriver(whatsappClient, BOT_ID);

    // ============= APPLICATION LAYER SETUP =============
    // Create and configure application services
    const handlerFactory = new HandlerFactory(whatsappDriver, agentService);
    const botLogic = new BotLogic(handlerFactory);

    // Connect bot logic to WhatsApp driver
    whatsappDriver.setBot(botLogic);

    // ============= INITIALIZATION =============
    // Initialize WhatsApp client
    await WhatsappSessionManager.initializeClient(whatsappClient);
}

// Run the main function
main().catch(error => {
    console.error('Error in main:', error);
    process.exit(1);
});