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
const { DynamicTool, tool } = require('@langchain/core/tools');
const CalendarContext = require('../../../domain/calendar/models/CalendarContext');

/**
 * Manages the creation of Langchain LLM instances.
 * Provides static methods to create and configure LLMs with consistent settings.
 */
class LangchainAgentSessionManager {

    static async createAgent(apiKeyPath, infrastructureInstances) {
        console.log("Starting createAgent with instances:", infrastructureInstances.map(i => i.constructor.name));
        const tools = await this.createTools(infrastructureInstances);

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

    static async createTools(infrastructureInstances) {
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
            const calendarTool = tool(
                async (inputString, config) => {
                    console.log("Calendar tool (via factory) received config DFDRDS:", JSON.stringify(config, null, 2));
                    const requestContext = config?.metadata?.requestContext;

                    if (!requestContext || !requestContext.calendarContext) {
                        console.error("Calendar context not found in tool config.metadata. requestContext:", requestContext);
                        return "Error: Calendar context was not available for this operation. Cannot proceed.";
                    }
                    const calendarContext = requestContext.calendarContext;

                    if (!calendarContext.calendarId) {
                        return "Error: Required 'calendarId' is missing from the provided calendarContext.";
                    }

                    try {
                        const parsedInput = JSON.parse(inputString);
                        const { action, ...params } = parsedInput;
                        let result;
                        switch (action) {
                            case 'create':
                                result = await calendarInfra.createEvent(calendarContext, params);
                                break;
                            case 'list':
                                result = await calendarInfra.fetchEvents(calendarContext, params);
                                break;
                            case 'modify': {
                                const { eventId, ...eventDataForUpdates } = params;
                                if (!eventId) {
                                    return "Error: 'eventId' is required for modifying an event and must be provided in the input parameters.";
                                }
                                const domainEventUpdatesPayload = { updates: eventDataForUpdates };
                                result = await calendarInfra.modifyEvent(calendarContext, eventId, domainEventUpdatesPayload);
                                break;
                            }
                            case 'delete': {
                                const { eventId } = params;
                                if (!eventId) {
                                    return "Error: 'eventId' is required for deleting an event and must be provided in the input parameters.";
                                }
                                result = await calendarInfra.removeEvent(calendarContext, eventId);
                                break;
                            }
                            default:
                                return `Error: Unknown calendar action '${action}'. Valid actions are 'create', 'list', 'modify', 'delete'.`;
                        }
                        return JSON.stringify(result);
                    } catch (error) {
                        if (error instanceof SyntaxError) {
                            return `Error: Invalid JSON input for calendar tool: ${error.message}. The input received was: "${inputString}"`;
                        }
                        console.error(`Unexpected error in calendar tool: ${error.message}`, error.stack);
                        return `Error in calendar tool: ${error.message}. Please check the logs.`;
                    }
                },
                {
                    name: 'calendar',
                    description: `Use this tool to manage calendar events. The necessary calendar context (like calendarId) is handled automatically via request metadata. You can:
                        - Create new events: The input for this action (excluding the 'action' field itself) MUST be the exact JSON object structure returned by the 'parse_event' tool. For example: {"action": "create", "type": "Meeting with team", "details": {"date": "2024-01-01", "time": "10:00", "description": "Discuss project", "durationHours": 1}}
                        - List upcoming events (no parsing needed, input is a JSON object with query parameters, e.g., {} for all upcoming).
                        - Modify existing events (no parsing needed). Input for 'modify' MUST be a JSON string including an 'eventId' and the fields to update within its parameters (e.g., {"action": "modify", "eventId": "xyz", "summary": "New summary"}).
                        - Delete events (no parsing needed). Input for 'delete' MUST be a JSON string including an 'eventId' within its parameters (e.g., {"action": "delete", "eventId": "xyz"}).
                        The general input structure should be a JSON string with an 'action' field ('create', 'list', 'modify', 'delete')
                        and other relevant fields based on the action.`,
                }
            );
            tools.push(calendarTool);
            console.log("Created Calendar Tool (using tool() factory)", calendarTool);
        }
        return tools;
    }

    //TODO: USED BY EventParserInfrastructure. 
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

        const calendarContext = new CalendarContext('8fb11090c390d3c9102c6be314996c37753b1568b77b0b31d9fc4db399b23f6a@group.calendar.google.com', 'America/Los_Angeles');
        const requestContextObject = {
            calendarContext: calendarContext
        };

        const calendarClient = GoogleCalendarSessionManager.createClient(credentials);
        const calendarInfra = new GoogleCalendarInfrastructure(calendarClient);

        const llmForEventParser = new ChatGoogleGenerativeAI({
            model: 'gemini-1.5-pro',
            apiKey: (await LangchainAgentSessionManager._getApiKey(apiKeyPath)),
            temperature: 0,
        });
        const eventParserInfra = new EventParserInfrastructure(llmForEventParser);

        const app = await LangchainAgentSessionManager.createAgent(apiKeyPath, [calendarInfra, eventParserInfra]);

        console.log("Invoking agent with test message...");
        const finalState = await app.invoke(
            {
                messages: [new HumanMessage("Add Irene's birthday on May 27th, 2025 at 10:00am")],
            },
            {
                metadata: { requestContext: requestContextObject }
            }
        );
        console.log("Final state:", JSON.stringify(finalState, null, 2));

        const messages = finalState.messages;
        let finalResponse = "";

        if (messages && messages.length > 0) {
            console.log("Inside messages check - messages array is valid.");
            const lastMessage = messages[messages.length - 1];

            // Based on the latest log, lastMessage.id is a string GUID.
            // A final AIMessage to the user will have string content and an empty tool_calls array.
            if (lastMessage && typeof lastMessage.content === 'string' &&
                lastMessage.hasOwnProperty('tool_calls') && lastMessage.tool_calls.length === 0) {
                console.log("Last message appears to be a final AIMessage to the user.");
                finalResponse = lastMessage.content;
            } else {
                console.log("Last message is not structured as a final AIMessage response to the user (e.g., content not string, or has tool_calls, or tool_calls property missing).", lastMessage);
            }
        } else {
            console.log("Messages array is undefined or empty.");
        }

        console.log("Model's final response (programmatic):", finalResponse);

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
// 5. Como hago higher level calendar shit como "who is here this weekend" o "month with most people here". Needs context about people in gc. Needs filtering tool. 


// const response = {
//     "messages": [
//         {
//             "lc": 1,
//             "type": "constructor",
//             "id": [
//                 "langchain_core",
//                 "messages",
//                 "HumanMessage"
//             ],
//             "kwargs": {
//                 "content": "Add Irene's birthday on May 27th, 2025 at 10:00am",
//                 "additional_kwargs": {},
//                 "response_metadata": {},
//                 "id": "94f7843a-98ba-4324-8538-76d3e6998919"
//             }
//         },
//         {
//             "lc": 1,
//             "type": "constructor",
//             "id": [
//                 "langchain_core",
//                 "messages",
//                 "AIMessage"
//             ],
//             "kwargs": {
//                 "content": [
//                     {
//                         "functionCall": {
//                             "name": "parse_event",
//                             "args": {
//                                 "input": "Irene's birthday on May 27th, 2025 at 10:00am"
//                             }
//                         }
//                     }
//                 ],
//                 "tool_calls": [
//                     {
//                         "name": "parse_event",
//                         "args": {
//                             "input": "Irene's birthday on May 27th, 2025 at 10:00am"
//                         },
//                         "type": "tool_call",
//                         "id": "4e3f72f7-2e0c-47f1-b2fd-8d93d34b0b51"
//                     }
//                 ],
//                 "additional_kwargs": {
//                     "finishReason": "STOP",
//                     "avgLogprobs": -3.576119524950627e-7
//                 },
//                 "usage_metadata": {
//                     "input_tokens": 395,
//                     "output_tokens": 28,
//                     "total_tokens": 423
//                 },
//                 "invalid_tool_calls": [],
//                 "response_metadata": {
//                     "tokenUsage": {
//                         "promptTokens": 395,
//                         "completionTokens": 28,
//                         "totalTokens": 423
//                     },
//                     "finishReason": "STOP",
//                     "avgLogprobs": -3.576119524950627e-7
//                 },
//                 "id": "9fd87d46-145a-4c05-8e60-028c3f4953c6"
//             }
//         },
//         {
//             "lc": 1,
//             "type": "constructor",
//             "id": [
//                 "langchain_core",
//                 "messages",
//                 "ToolMessage"
//             ],
//             "kwargs": {
//                 "content": "{\"id\":null,\"type\":\"Birthday\",\"details\":{\"date\":\"2025-05-27\",\"time\":\"10:00\",\"description\":\"Irene's birthday\",\"durationHours\":1}}",
//                 "tool_call_id": "4e3f72f7-2e0c-47f1-b2fd-8d93d34b0b51",
//                 "name": "parse_event",
//                 "additional_kwargs": {},
//                 "response_metadata": {},
//                 "id": "890a7cce-53fb-4a2b-8c3d-57640586168d"
//             }
//         },
//         {
//             "lc": 1,
//             "type": "constructor",
//             "id": [
//                 "langchain_core",
//                 "messages",
//                 "AIMessage"
//             ],
//             "kwargs": {
//                 "content": [
//                     {
//                         "functionCall": {
//                             "name": "calendar",
//                             "args": {
//                                 "input": "{\"action\": \"create\", \"type\": \"Birthday\", \"details\": {\"date\": \"2025-05-27\", \"time\": \"10:00\", \"description\": \"Irene's birthday\", \"durationHours\": 1}}"
//                             }
//                         }
//                     }
//                 ],
//                 "tool_calls": [
//                     {
//                         "name": "calendar",
//                         "args": {
//                             "input": "{\"action\": \"create\", \"type\": \"Birthday\", \"details\": {\"date\": \"2025-05-27\", \"time\": \"10:00\", \"description\": \"Irene's birthday\", \"durationHours\": 1}}"
//                         },
//                         "type": "tool_call",
//                         "id": "39ec4ae3-e943-4ec1-9799-5d155e29cf6a"
//                     }
//                 ],
//                 "additional_kwargs": {
//                     "finishReason": "STOP",
//                     "avgLogprobs": -0.00023240034050982575
//                 },
//                 "usage_metadata": {
//                     "input_tokens": 471,
//                     "output_tokens": 58,
//                     "total_tokens": 529
//                 },
//                 "invalid_tool_calls": [],
//                 "response_metadata": {
//                     "tokenUsage": {
//                         "promptTokens": 471,
//                         "completionTokens": 58,
//                         "totalTokens": 529
//                     },
//                     "finishReason": "STOP",
//                     "avgLogprobs": -0.00023240034050982575
//                 },
//                 "id": "e756ef4b-4df1-41e4-b2d7-1b53d468a970"
//             }
//         },
//         {
//             "lc": 1,
//             "type": "constructor",
//             "id": [
//                 "langchain_core",
//                 "messages",
//                 "ToolMessage"
//             ],
//             "kwargs": {
//                 "content": "{\"success\":true,\"data\":{\"id\":\"nioe7tdf4lp940brq8un3dng64\",\"type\":\"Birthday\",\"details\":{\"date\":\"2025-05-27T17:00:00.000Z\",\"time\":\"2025-05-27T17:00:00.000Z\",\"description\":\"Irene's birthday\"}}}",
//                 "tool_call_id": "39ec4ae3-e943-4ec1-9799-5d155e29cf6a",
//                 "name": "calendar",
//                 "additional_kwargs": {},
//                 "response_metadata": {},
//                 "id": "8ab719cd-7cd5-4293-9a94-a76d16ee3884"
//             }
//         },
//         {
//             "lc": 1,
//             "type": "constructor",
//             "id": [
//                 "langchain_core",
//                 "messages",
//                 "AIMessage"
//             ],
//             "kwargs": {
//                 "content": "OK. I've added it to your calendar.\n",
//                 "tool_calls": [],
//                 "additional_kwargs": {
//                     "finishReason": "STOP",
//                     "avgLogprobs": -0.018464192748069763
//                 },
//                 "usage_metadata": {
//                     "input_tokens": 628,
//                     "output_tokens": 12,
//                     "total_tokens": 640
//                 },
//                 "invalid_tool_calls": [],
//                 "response_metadata": {
//                     "tokenUsage": {
//                         "promptTokens": 628,
//                         "completionTokens": 12,
//                         "totalTokens": 640
//                     },
//                     "finishReason": "STOP",
//                     "avgLogprobs": -0.018464192748069763
//                 },
//                 "id": "6b0eaea3-1fde-4e44-9b05-22b3468eadc4"
//             }
//         }
//     ]
// }

// response.messages[5].kwargs.content