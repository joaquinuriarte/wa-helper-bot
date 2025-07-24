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

// ============= MEMORY MONITORING =============
function logMemoryUsage(label = 'Memory Usage') {
    const memUsage = process.memoryUsage();
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    console.log(`📊 ${label}:`, {
        rss: `${rssMB}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
    
    // Warn if approaching Render's limit
    if (rssMB > 400) {
        console.log(`⚠️  WARNING: Memory usage is high (${rssMB}MB). Render limit is 512MB.`);
    }
    if (rssMB > 450) {
        console.log(`🚨 CRITICAL: Memory usage is very high (${rssMB}MB). Consider restarting.`);
    }
}

// Log memory every 10 seconds (more frequent)
setInterval(() => {
    logMemoryUsage('Periodic Memory Check');
}, 10000);

// Log memory every 5 seconds during high activity
let highActivityInterval;
function startHighActivityMonitoring() {
    if (highActivityInterval) clearInterval(highActivityInterval);
    highActivityInterval = setInterval(() => {
        logMemoryUsage('High Activity Memory Check');
    }, 5000);
}

function stopHighActivityMonitoring() {
    if (highActivityInterval) {
        clearInterval(highActivityInterval);
        highActivityInterval = null;
    }
}

// ============= CONFIGURATION =============
let credentials;
let BOT_ID;
let apiKey;

if (process.env.NODE_ENV === 'production') {
    // Production: Use environment variables
    credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
    BOT_ID = process.env.BOT_ID;
    apiKey = process.env.GEMINI_API_KEY;
} else {
    // Development: Use local files
    credentials = require('./env/lucho-460500-cdb4b1f2ffe0.json');
    BOT_ID = "17872949783"; // It randomly changed back to phone number instead of string "254232636694646" //"17872949783"; // Bot ID for WhatsApp Abuela Home Number (It randomly changed to new string)
    const apiKeyData = require('./env/gemini-api-key.json');
    apiKey = apiKeyData.apiKey;
}

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
    logMemoryUsage('Start of main()');
    
    // ============= INFRASTRUCTURE LAYER SETUP =============
    // Create and configure calendar infrastructure
    const calendarClient = GoogleCalendarSessionManager.createClient(credentials);
    const calendarInfra = new GoogleCalendarInfrastructure(calendarClient);
    // Create and configure Langchain agent infrastructure
    const llm_event_parser = await LLMSessionManager.createLLM(apiKey);
    const eventParserInfra = new EventParserInfrastructure(llm_event_parser);

    logMemoryUsage('After infrastructure setup');

    // ============= DOMAIN LAYER SETUP =============
    const calendarService = new CalendarService(calendarInfra);
    const eventParserService = new EventParserService(eventParserInfra);

    // ============= AGENT INFRASTRUCTURE LAYER SETUP =============
    const langchainAgentPlatform = new LangchainAgentPlatform([calendarService, eventParserService], apiKey, systemPrompt);
    await langchainAgentPlatform.createAgent();

    logMemoryUsage('After agent creation');

    // ============= AGENT DOMAIN LAYER SETUP =============
    const agentService = new AgentService(langchainAgentPlatform);

    // ============= INTERACTION LAYER SETUP =============
    // Create and configure WhatsApp client
    const whatsappClient = await WhatsappSessionManager.createClient();
    const whatsappDriver = new WhatsappDriver(whatsappClient, BOT_ID);

    logMemoryUsage('After WhatsApp client creation');

    // ============= APPLICATION LAYER SETUP =============
    // Create and configure application services
    const handlerFactory = new HandlerFactory(whatsappDriver, agentService);
    const botLogic = new BotLogic(handlerFactory);

    // Connect bot logic to WhatsApp driver
    whatsappDriver.setBot(botLogic);

    // ============= INITIALIZATION =============
    // Initialize WhatsApp client
    await WhatsappSessionManager.initializeClient(whatsappClient);
    
    logMemoryUsage('After initialization complete');
}

// Run the main function
main().catch(error => {
    console.error('Error in main:', error);
    process.exit(1);
});