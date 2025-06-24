const IAgentExecutionPlatform = require('../../domain/agent/interfaces/IAgentExecutionPlatform');
const AgentRequest = require('../../domain/agent/models/AgentRequest');
const AgentResponse = require('../../domain/agent/models/AgentResponse');
const { ToolNode } = require("@langchain/langgraph/prebuilt");
const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph");
const { HumanMessage } = require("@langchain/core/messages");
const { DynamicTool, tool } = require('@langchain/core/tools');
const CalendarService = require('../../domain/calendar/services/CalendarService');
const EventParserService = require('../../domain/calendar/services/EventParserService');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const fs = require('fs');
const path = require('path');

/**
 * Langchain implementation of the IAgentExecutionPlatform interface.
 * This class integrates with Langchain to provide agent capabilities using Google's Gemini model.
 */
class LangchainAgentPlatform extends IAgentExecutionPlatform {
    /**
     * @param {Array} domainInstances - Array of domain instances (e.g., [CalendarService, EventParserService])
     * @param {String} apiKeyPath - The path to the API key file
     * @param {string} systemPrompt - The system prompt to guide the agent's behavior
     */
    constructor(domainInstances, apiKeyPath, systemPrompt) {
        super();
        if (!Array.isArray(domainInstances) || domainInstances.length === 0) {
            throw new Error('At least one infrastructure instance must be provided');
        }
        if (!apiKeyPath) {
            throw new Error('apiKeyPath must be provided');
        }
        if (!systemPrompt) {
            throw new Error('System prompt must be provided');
        }

        // Store calendarInfra for direct use in the tool function
        this.calendarService = domainInstances.find(instance =>
            instance instanceof CalendarService
        );
        this.eventParserService = domainInstances.find(instance =>
            instance instanceof EventParserService
        );
        this.apiKeyPath = apiKeyPath;
        this.systemPrompt = systemPrompt;
        this.agent = null;
        this.calendarContext = null;
    }

    async createAgent() {
        const tools = await this.createTools();

        const model = await this.createLLM(this.apiKeyPath, tools);

        const app = await this.compileAgent(model, tools);

        this.agent = app;
    }

    async createLLM(apiKeyPath, tools) {
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
    async _getApiKey(apiKeyPath) {
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

    async createTools() {
        const tools = [];

        // Combined Event Parser + Calendar Tool
        if (this.eventParserService && this.calendarService) {
            const createEventTool = new DynamicTool({
                name: 'create_calendar_event',
                description: `Use this tool to create calendar events from natural language text.
                    Input should be a string containing event details in natural language.
                    The tool will parse the text and create the calendar event automatically.
                    Use this tool for creating new calendar events from natural language input.`,
                func: async (input) => {
                    console.log("🛠️  [TOOL] create_calendar_event called");
                    console.log("   📝 Input:", input);

                    try {
                        // Step 1: Parse the natural language input
                        console.log("   🔍 Step 1: Parsing event details...");
                        const timezone = this.calendarContext?.calendarContext?.timezone;
                        const eventDetails = await this.eventParserService.parseEventDetails(input, timezone);
                        if (!eventDetails) {
                            console.log("   ❌ Step 1: Failed to parse event details");
                            return 'ERROR: Failed to parse event details. Please provide clearer information about the event.';
                        }
                        console.log("   ✅ Step 1: Event parsed successfully");
                        console.log("      📅 Date:", eventDetails.details.date);
                        console.log("      🕐 Time:", eventDetails.details.time);
                        console.log("      🕐 Duration:", eventDetails.details.durationHours);
                        console.log("      📝 Description:", eventDetails.details.description);
                        console.log("      📝 Type:", eventDetails.type);

                        // Step 2: Get calendar context from config
                        //TODO: this is a temporary fix to get the calendar context. We need to find a better way to do this.
                        // We could build a dictionary that retains per chat agents with expiration time. Chathandlers, when invoking agnet, 
                        // find their agent or create a new one, add to queue, and then invoke the agent.
                        // This would allow us to supply calendar context and chat specific context to the agent at creation time which is a better solution.
                        // Step 2: Get calendar context from config
                        const calendarContext = this.calendarContext;
                        if (!calendarContext) {
                            console.log("   ❌ Step 2: Calendar context not available");
                            return 'ERROR: Calendar context was not available for this operation. The calendar service is not properly configured.';
                        }
                        console.log("   ✅ Step 2: Calendar context ready");

                        // Step 3: Create the calendar event
                        console.log("   🔄 Step 3: Creating calendar event...");
                        const result = await this.calendarService.addEvent(calendarContext, eventDetails);

                        if (result.success) {
                            console.log("   ✅ Step 3: Calendar event created successfully");
                            return `SUCCESS: Calendar event "${eventDetails.type}" has been created for ${eventDetails.details.date} at ${eventDetails.details.time} (${eventDetails.details.durationHours} hour duration).`;
                        } else {
                            console.log("   ❌ Step 3: Failed to create calendar event:", result.error);
                            return `ERROR: Failed to create calendar event: ${result.error}`;
                        }
                    } catch (error) {
                        console.log("   💥 Tool execution error:", error.message);
                        return `ERROR: Unexpected error creating calendar event: ${error.message}`;
                    }
                }
            });
            tools.push(createEventTool);
        }

        return tools;
    }

    async compileAgent(model, tools) {
        // Define the function that determines whether to continue or not
        const shouldContinue = ({ messages }) => {
            const lastMessage = messages[messages.length - 1];

            // If the LLM makes a tool call, then we route to the "tools" node
            if (lastMessage.tool_calls?.length) {
                console.log("🔄 [AGENT] Routing to tools - tool calls detected");
                return "tools";
            }
            // Otherwise, we stop (reply to the user) using the special "__end__" node
            console.log("✅ [AGENT] Routing to end - no tool calls");
            return "__end__";
        };

        // Define the function that calls the model
        const callModel = async (state) => {
            console.log("🤖 [AGENT] Processing user input...");

            // Add system prompt to the beginning of messages
            const messagesWithSystemPrompt = [
                { role: "system", content: this.systemPrompt },
                ...state.messages
            ];

            const response = await model.invoke(messagesWithSystemPrompt);

            if (response.tool_calls?.length) {
                console.log("🛠️  [AGENT] Tool calls requested:", response.tool_calls.map(tc => tc.name));
            } else {
                console.log("💬 [AGENT] Generating response to user");
            }

            return { messages: [response] };
        };

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

            console.log("🚀 [REQUEST] Processing new request");
            console.log("   📝 User input:", userInput);

            //TODO: this is a temporary fix to get the calendar context. We need to find a better way to do this.
            // We could build a dictionary that retains per chat agents with expiration time. Chathandlers, when invoking agnet, 
            // find their agent or create a new one, add to queue, and then invoke the agent.
            // This would allow us to supply calendar context and chat specific context to the agent at creation time which is a better solution.
            this.calendarContext = requestContextObject;

            const result = await this.agent.invoke(
                {
                    messages: [new HumanMessage(userInput)],
                }
            );

            const messages = result.messages;
            let finalResponse = "";

            // Better (more robust)
            const finalMessage = messages[messages.length - 1];
            if (finalMessage?.content && !finalMessage.tool_calls?.length) {
                finalResponse = finalMessage.content.trim(); // Trim trailing whitespace and newlines
                console.log("✅ [REQUEST] Request completed successfully");
            } else {
                // Handle case where agent didn't finish properly
                finalResponse = "I'm having trouble processing your request. Please try again.";
                console.log("❌ [REQUEST] Request failed - agent didn't complete properly");
            }

            //TODO: this is a temporary fix to get the calendar context. We need to find a better way to do this.
            // We could build a dictionary that retains per chat agents with expiration time. Chathandlers, when invoking agnet, 
            // find their agent or create a new one, add to queue, and then invoke the agent.
            // This would allow us to supply calendar context and chat specific context to the agent at creation time which is a better solution.   
            this.calendarContext = null;
            return new AgentResponse(finalResponse);
        } catch (error) {
            //TODO: this is a temporary fix to get the calendar context. We need to find a better way to do this.
            // We could build a dictionary that retains per chat agents with expiration time. Chathandlers, when invoking agnet, 
            // find their agent or create a new one, add to queue, and then invoke the agent.
            // This would allow us to supply calendar context and chat specific context to the agent at creation time which is a better solution.   
            this.calendarContext = null;
            console.log("💥 [REQUEST] Request failed with error:", error.message);
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