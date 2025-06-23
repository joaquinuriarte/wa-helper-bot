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
                func: async (input, config) => {
                    console.log("🔧 Tool 'create_calendar_event' called with input:", input);
                    console.log("🔧 Tool config:", config);

                    try {
                        // Step 1: Parse the natural language input
                        console.log("📝 Step 1: Parsing event details...");
                        const eventDetails = await this.eventParserService.parseEventDetails(input);
                        if (!eventDetails) {
                            console.log("❌ Failed to parse event details");
                            return 'ERROR: Failed to parse event details. Please provide clearer information about the event.';
                        }
                        console.log("✅ Event details parsed:", eventDetails);

                        // Step 2: Get calendar context from config
                        console.log("📅 Step 2: Getting calendar context...");
                        console.log("🔍 Config 123:", config);
                        const requestContext = config?.metadata?.requestContext;
                        if (!requestContext || !requestContext.calendarContext) {
                            console.log("❌ Calendar context not available");
                            return 'ERROR: Calendar context was not available for this operation. The calendar service is not properly configured.';
                        }
                        const calendarContext = requestContext.calendarContext;
                        console.log("✅ Calendar context found");

                        // Step 3: Create the calendar event directly
                        console.log("➕ Step 3: Creating calendar event...");
                        const result = await this.calendarService.addEvent(calendarContext, eventDetails);

                        if (result.success) {
                            console.log("✅ Calendar event created successfully");
                            return `SUCCESS: Calendar event "${eventDetails.type}" has been created for ${eventDetails.details.date} at ${eventDetails.details.time} (${eventDetails.details.durationHours} hour duration).`;
                        } else {
                            console.log("❌ Failed to create calendar event:", result.error);
                            return `ERROR: Failed to create calendar event: ${result.error}`;
                        }
                    } catch (error) {
                        console.log("💥 Tool execution error:", error);
                        return `ERROR: Unexpected error creating calendar event: ${error.message}`;
                    }
                }
            });
            tools.push(createEventTool);
            console.log("Created Combined Event Parser + Calendar Tool", createEventTool);
        }

        return tools;
    }

    async compileAgent(model, tools) {
        console.log("Compiling agent with tools:", tools.map(t => t.name));

        // Define the function that determines whether to continue or not
        const shouldContinue = ({ messages }) => {
            const lastMessage = messages[messages.length - 1];
            console.log("🔍 shouldContinue called with lastMessage:", {
                content: lastMessage.content,
                tool_calls: lastMessage.tool_calls,
                type: lastMessage.constructor.name
            });

            // If the LLM makes a tool call, then we route to the "tools" node
            if (lastMessage.tool_calls?.length) {
                console.log("🛠️  Routing to tools node - tool calls found:", lastMessage.tool_calls.length);
                return "tools";
            }
            // Otherwise, we stop (reply to the user) using the special "__end__" node
            console.log("✅ Routing to __end__ - no tool calls found");
            return "__end__";
        };

        // Define the function that calls the model
        const callModel = async (state) => {
            console.log("🤖 callModel called with state:", {
                messageCount: state.messages.length,
                lastMessageContent: state.messages[state.messages.length - 1]?.content?.substring(0, 100) + "..."
            });

            // Add system prompt to the beginning of messages
            const messagesWithSystemPrompt = [
                { role: "system", content: this.systemPrompt },
                ...state.messages
            ];

            console.log("📝 Invoking model with messages:", messagesWithSystemPrompt.length);
            const response = await model.invoke(messagesWithSystemPrompt);

            console.log("📤 Model response:", {
                content: response.content,
                tool_calls: response.tool_calls,
                type: response.constructor.name
            });

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
        console.log("🏗️  Agent workflow compiled successfully");

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

            console.log("🔍 Invoking agent with user input:", userInput);
            console.log("🔍 Invoking agent with request context:", requestContextObject);
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

            // Better (more robust)
            const finalMessage = messages[messages.length - 1];
            if (finalMessage?.content && !finalMessage.tool_calls?.length) {
                finalResponse = finalMessage.content;
            } else {
                // Handle case where agent didn't finish properly
                finalResponse = "I'm having trouble processing your request. Please try again.";
            }


            return new AgentResponse(
                finalResponse
            );
        } catch (error) {
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