const { Tool } = require('langchain/tools');
const { initializeAgentExecutorWithOptions, AgentExecutor, createReactAgent } = require('langchain/agents');
const IAgentExecutionPlatform = require('../../domain/agent/interfaces/IAgentExecutionPlatform');
const AgentRequest = require('../../domain/agent/models/AgentRequest');
const AgentResponse = require('../../domain/agent/models/AgentResponse');

const { PromptTemplate } = require('@langchain/core/prompts'); // Import PromptTemplate




const CalendarService = require('../../domain/calendar/services/CalendarService');
const EventParserService = require('../../domain/calendar/services/EventParserService');
const { ToolNode } = require("@langchain/langgraph/prebuilt");

/**
 * Langchain implementation of the IAgentExecutionPlatform interface.
 * This class integrates with Langchain to provide agent capabilities using Google's Gemini model.
 */
class LangchainAgentPlatform extends IAgentExecutionPlatform {
    /**
     * @param {Array} infrastructureInstances - Array of infrastructure instances (e.g., [CalendarService, EventParserService])
     * @param {Object} model - The Langchain LLM instance
     * @param {string} systemPrompt - The system prompt to guide the agent's behavior
     */
    constructor(infrastructureInstances, model, systemPrompt) {
        super();
        if (!Array.isArray(infrastructureInstances) || infrastructureInstances.length === 0) {
            throw new Error('At least one infrastructure instance must be provided');
        }
        if (!model) {
            throw new Error('LLM instance must be provided');
        }
        if (!systemPrompt) {
            throw new Error('System prompt must be provided');
        }

        // Store calendarInfra for direct use in the tool function
        this.calendarService = infrastructureInstances.find(instance =>
            instance instanceof CalendarService
        );
        this.eventParserService = infrastructureInstances.find(instance =>
            instance instanceof EventParserService
        );
        this.model = model;
        this.systemPrompt = systemPrompt;
        this.agent = null;
    }

    async createAgent() {
        const tools = await this.createTools();

        const app = await this.compileAgent(this.model, tools);

        this.agent = app;
    }

    async createTools() {

        const tools = [];

        // Event Parser Tool
        if (this.eventParserService) {
            const eventParserTool = new DynamicTool({
                name: 'parse_event',
                description: `Use this tool to parse natural language text into structured event details.
                    Input should be a string containing event details in natural language.
                    The tool will return a JSON object with date, time, description, and duration.
                    Use this tool ONLY when creating new calendar events from natural language input.`,
                func: async (input) => {
                    try {
                        const eventDetails = await this.eventParserService.parseEventDetails(input);
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
        if (this.calendarService) {
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
                                result = await this.calendarService.addEvent(calendarContext, params);
                                break;
                            case 'list':
                                result = await this.calendarService.getEvents(calendarContext, params);
                                break;
                            case 'modify': {
                                const { eventId, ...eventDataForUpdates } = params;
                                if (!eventId) {
                                    return "Error: 'eventId' is required for modifying an event and must be provided in the input parameters.";
                                }
                                const domainEventUpdatesPayload = { updates: eventDataForUpdates };
                                result = await this.calendarService.updateEvent(calendarContext, eventId, domainEventUpdatesPayload);
                                break;
                            }
                            case 'delete': {
                                const { eventId } = params;
                                if (!eventId) {
                                    return "Error: 'eventId' is required for deleting an event and must be provided in the input parameters.";
                                }
                                result = await this.calendarService.deleteEvent(calendarContext, eventId);
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

    async compileAgent(model, tools) {
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


    /**
     * Processes a user request using Langchain
     * @param {AgentRequest} agentRequest - The request to process
     * @returns {Promise<AgentResponse>} The agent's response
     */
    async processRequest(agentRequest) {
        if (!this.agent) {
            throw new Error('Agent not created. Call createAgent() first.');
        }
        try {

            const { userInput, context: requestContextObject } = agentRequest;


            const result = await this.agent.invoke(
                {
                    messages: [new HumanMessage(userInput)],
                },
                {
                    metadata: { requestContext: requestContextObject }
                }
            );

            const messages = result.messages;
            let finalResponse = "";

            if (messages && messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && typeof lastMessage.content === 'string' &&
                    lastMessage.hasOwnProperty('tool_calls') && lastMessage.tool_calls.length === 0) {
                    console.log("Last message appears to be a final AIMessage to the user.");
                    finalResponse = lastMessage.content;
                }
            } else {
                finalResponse = "Error: Last message is not structured as a final AIMessage response to the user (e.g., content not string, or has tool_calls, or tool_calls property missing).";
            }


            return new AgentResponse(
                finalResponse
            );
        } catch (error) {
            console.error('Error in LangchainAgentPlatform processRequest:', error.message, error.stack);
            const errorDetails = error.cause instanceof Error ? error.cause.message : error.message;
            return new AgentResponse(
                `An error occurred: ${error.message}`,
                { errorDetails: errorDetails },
                error
            );
        }
    }
}

module.exports = LangchainAgentPlatform; 