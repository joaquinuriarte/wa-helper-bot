const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const fs = require('fs');
const path = require('path');
const { ToolNode } = require("@langchain/langgraph/prebuilt");
const GoogleCalendarInfrastructure = require('../../calendar/GoogleCalendarInfrastructure');
const EventParserInfrastructure = require('../../calendar/EventParserInfrastructure');
const GoogleCalendarSessionManager = require('../../calendar/sessionManagers/googleCalendarSessionManager');
const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { DynamicTool } = require('@langchain/core/tools');
const CalendarContext = require('../../../domain/calendar/models/CalendarContext');
/**
 * Manages the creation of Langchain LLM instances.
 * Provides static methods to create and configure LLMs with consistent settings.
 */
class LangchainAgentSessionManager {

    static async createAgent(apiKeyPath, infrastructureInstances, requestContextObject) {
        console.log("Starting createAgent with instances:", infrastructureInstances.map(i => i.constructor.name));
        const tools = await this.createTools(infrastructureInstances, requestContextObject);
        console.log("Created Tools:", tools.map(t => t.name));
        const model = await this.createLLM(apiKeyPath, tools);
        console.log("Created Model with tools:", model.tools?.length);
        const app = await this.compileAgent(model, tools);
        console.log("Compiled Agent with tools:", app.tools?.length);
        return app;
    }

    static async compileAgent(model, tools) {
        console.log("Compiling agent with tools:", tools.map(t => t.name));
        // Define the function that determines whether to continue or not
        function shouldContinue({ messages }) {
            console.log("shouldContinue called with messages:", messages.length);
            const lastMessage = messages[messages.length - 1];
            console.log("Last message:", lastMessage);

            // If the LLM makes a tool call, then we route to the "tools" node
            if (lastMessage.tool_calls?.length) {
                console.log("Tool calls detected:", lastMessage.tool_calls);
                return "tools";
            }
            // Otherwise, we stop (reply to the user) using the special "__end__" node
            return "__end__";
        }

        // Define the function that calls the model
        async function callModel(state) {
            console.log("callModel called with state:", JSON.stringify(state, null, 2));
            const response = await model.invoke(state.messages);
            console.log("Model response:", response);
            return { messages: [response] };
        }

        const toolNode = new ToolNode(tools);
        // Define a new graph
        const workflow = new StateGraph(MessagesAnnotation)
            .addNode("agent", callModel)
            .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
            .addNode("tools", toolNode)
            .addEdge("tools", "agent")
            .addConditionalEdges("agent", shouldContinue);

        // Finally, we compile it into a LangChain Runnable.
        const app = workflow.compile();

        return app;
    }

    static async createTools(infrastructureInstances, requestContextObject) {
        const calendarInfra = infrastructureInstances.find(instance =>
            instance instanceof GoogleCalendarInfrastructure
        );
        const eventParserInfra = infrastructureInstances.find(instance =>
            instance instanceof EventParserInfrastructure
        );

        const tools = [];
        // Event Parser Tool
        if (eventParserInfra) {
            const eventParserTool = new DynamicTool({
                name: 'parse_event',
                description: `Use this tool to parse natural language text into structured event details.
                    Input should be a string containing event details in natural language.
                    The tool will return a JSON object with date, time, description, and duration.
                    Use this tool ONLY when creating new calendar events from natural language input.`,
                func: async (input) => {
                    try {
                        const eventDetails = await eventParserInfra.parseEventDetails(input);
                        if (!eventDetails) {
                            return 'Failed to parse event details. Please provide clearer information.';
                        }
                        return JSON.stringify(eventDetails);
                    } catch (error) {
                        console.error(`Error in parse_event tool: ${error.message}`, error.stack);
                        return `Error parsing event details: ${error.message}`;
                    }
                }
            });
            tools.push(eventParserTool);
            console.log("Created Event Parser Tool", eventParserTool);
        }

        // Calendar Tool
        if (calendarInfra) {
            const calendarTool = new DynamicTool({
                name: 'calendar',
                description: `Use this tool to manage calendar events. The necessary calendar context (like calendarId) is handled automatically. You can:
                    - Create new events: The input for this action (excluding the 'action' field itself) MUST be the exact JSON object structure returned by the 'parse_event' tool. For example: {"action": "create", "type": "Meeting with team", "details": {"date": "2024-01-01", "time": "10:00", "description": "Discuss project", "durationHours": 1}}
                    - List upcoming events (no parsing needed, input is a JSON object with query parameters, e.g., {} for all upcoming).
                    - Modify existing events (no parsing needed). Input for 'modify' MUST be a JSON string including an 'eventId' and the fields to update within its parameters (e.g., {"action": "modify", "eventId": "xyz", "summary": "New summary"}).
                    - Delete events (no parsing needed). Input for 'delete' MUST be a JSON string including an 'eventId' within its parameters (e.g., {"action": "delete", "eventId": "xyz"}).
                    The general input structure should be a JSON string with an 'action' field ('create', 'list', 'modify', 'delete')
                    and other relevant fields based on the action.`,
                func: async (inputString) => {
                    try {
                        const parsedInput = JSON.parse(inputString);
                        const { action, ...params } = parsedInput;

                        if (!requestContextObject || !requestContextObject.calendarContext) {
                            console.error("Calendar context not found in provided requestContextObject:", requestContextObject);
                            return "Error: Calendar context was not available for this operation. Cannot proceed.";
                        }
                        const calendarContext = requestContextObject.calendarContext;

                        if (!calendarContext.calendarId) {
                            return "Error: Required 'calendarId' is missing from the provided calendarContext.";
                        }

                        switch (action) {
                            case 'create':
                                // params should be the structured event data, potentially from parse_event tool
                                return await calendarInfra.createEvent(calendarContext, params);
                            case 'list':
                                // params should be DomainEventQuery criteria
                                return await calendarInfra.fetchEvents(calendarContext, params);
                            case 'modify': {
                                const { eventId, ...eventDataForUpdates } = params;
                                if (!eventId) {
                                    return "Error: 'eventId' is required for modifying an event and must be provided in the input parameters.";
                                }
                                // Assuming eventDataForUpdates directly matches the structure needed for DomainEventUpdates payload
                                const domainEventUpdatesPayload = { updates: eventDataForUpdates };
                                return await calendarInfra.modifyEvent(calendarContext, eventId, domainEventUpdatesPayload);
                            }
                            case 'delete': {
                                const { eventId } = params;
                                if (!eventId) {
                                    return "Error: 'eventId' is required for deleting an event and must be provided in the input parameters.";
                                }
                                return await calendarInfra.removeEvent(calendarContext, eventId);
                            }
                            default:
                                return `Error: Unknown calendar action '${action}'. Valid actions are 'create', 'list', 'modify', 'delete'.`;
                        }
                    } catch (error) {
                        if (error instanceof SyntaxError) {
                            return `Error: Invalid JSON input for calendar tool: ${error.message}. The input received was: "${inputString}"`;
                        }
                        console.error(`Unexpected error in calendar tool: ${error.message}`, error.stack);
                        return `Error in calendar tool: ${error.message}. Please check the logs.`;
                    }
                }
            });
            tools.push(calendarTool);
        }
        return tools;
    }

    /**
     * Creates and configures the LLM instance
     * @param {string} apiKeyPath - Path to the API key file
     * @returns {Promise<Object>} Configured LLM instance
     */
    static async createLLM(apiKeyPath, tools) {
        if (!apiKeyPath) {
            throw new Error('API key path must be provided');
        }
        const apiKey = await this._getApiKey(apiKeyPath);
        // Instantiate LangChain's ChatGoogleGenerativeAI model
        const llm = new ChatGoogleGenerativeAI({
            model: 'gemini-1.5-pro',
            apiKey: apiKey,
            temperature: 0,
        }).bindTools(tools);
        return llm;
    }

    /**
     * Retrieves the API key from the configuration file
     * @private
     * @param {string} apiKeyPath - Path to the API key file
     * @returns {Promise<string>} The API key
     */
    static async _getApiKey(apiKeyPath) {
        try {
            const resolvedApiKeyPath = path.resolve(apiKeyPath);
            const apiKeyData = JSON.parse(fs.readFileSync(resolvedApiKeyPath, 'utf8'));
            if (!apiKeyData.apiKey) {
                throw new Error('API key is empty in the configuration file');
            }
            return apiKeyData.apiKey;
        } catch (error) {
            throw new Error(`Failed to read Gemini API key: ${error.message}`);
        }
    }
}

module.exports = LangchainAgentSessionManager;

// Example usage
async function main() {
    try {
        const apiKeyPath = path.resolve(__dirname, '../../../env/gemini-api-key.json');
        const credentialsPath = path.resolve(__dirname, '../../../env/lucho-460500-cdb4b1f2ffe0.json');
        const credentials = require(credentialsPath);

        // Create CalendarContext
        const calendarContext = new CalendarContext('8fb11090c390d3c9102c6be314996c37753b1568b77b0b31d9fc4db399b23f6a@group.calendar.google.com', 'America/Los_Angeles');
        const requestContextObject = {
            calendarContext: calendarContext
        };

        // Create and configure calendar infrastructure
        const calendarClient = GoogleCalendarSessionManager.createClient(credentials);
        const calendarInfra = new GoogleCalendarInfrastructure(calendarClient);
        // Create and configure Langchain agent infrastructure
        const llm = new ChatGoogleGenerativeAI({
            model: 'gemini-1.5-pro',
            apiKey: (await LangchainAgentSessionManager._getApiKey(apiKeyPath)),
            temperature: 0,
        });
        const eventParserInfra = new EventParserInfrastructure(llm);
        const app = await LangchainAgentSessionManager.createAgent(apiKeyPath, [calendarInfra, eventParserInfra], requestContextObject);
        // Use the agent
        console.log("Invoking agent with test message...");
        const finalState = await app.invoke(
            {
                messages: [new HumanMessage("Add Irene's birthday on May 24th, 2025 at 10:00am")],
            },
            {
                metadata: { requestContext: requestContextObject }
            }
        );
        console.log("Final state:", JSON.stringify(finalState, null, 2));
    } catch (error) {
        console.error("Error in main:", error);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    }
}

// Run the example
main().catch(console.error);

// TODO: 
// 1. User should be able to specify the time zone for the event. 
// 2. Sys prompt should give time, and day and explain how to handle non-date referneces (add event tomorrow, ect)
// 3. Event parser should add endDate? Right now i can't say set vacation event from May 23 to May 25... What if I say next weekend? 
// 4. No se que es type pero type es titulo de evento y description es descripcion de evento.... fix pq con esto: "Add Irene's birthday on May 24th, 2025 at 10:00am" puso Birthday as title. 