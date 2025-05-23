const { Tool } = require('langchain/tools');
const { initializeAgentExecutorWithOptions, AgentExecutor, createReactAgent } = require('langchain/agents');
const IAgentExecutionPlatform = require('../../domain/agent/interfaces/IAgentExecutionPlatform');
const AgentRequest = require('../../domain/agent/models/AgentRequest');
const AgentResponse = require('../../domain/agent/models/AgentResponse');
const GoogleCalendarInfrastructure = require('../calendar/GoogleCalendarInfrastructure');
const EventParserInfrastructure = require('../calendar/EventParserInfrastructure');

const { PromptTemplate } = require('@langchain/core/prompts'); // Import PromptTemplate

/**
 * Langchain implementation of the IAgentExecutionPlatform interface.
 * This class integrates with Langchain to provide agent capabilities using Google's Gemini model.
 */
class LangchainAgentPlatform extends IAgentExecutionPlatform {
    /**
     * @param {Array} infrastructureInstances - Array of infrastructure instances (e.g., [GoogleCalendarInfrastructure])
     * @param {Object} llm - The Langchain LLM instance
     * @param {string} systemPrompt - The system prompt to guide the agent's behavior
     */
    constructor(infrastructureInstances, llm, systemPrompt) {
        super();
        if (!Array.isArray(infrastructureInstances) || infrastructureInstances.length === 0) {
            throw new Error('At least one infrastructure instance must be provided');
        }
        if (!llm) {
            throw new Error('LLM instance must be provided');
        }
        if (!systemPrompt) {
            throw new Error('System prompt must be provided');
        }

        // Store calendarInfra for direct use in the tool function
        this.calendarInfra = infrastructureInstances.find(instance =>
            instance instanceof GoogleCalendarInfrastructure
        );
        this.eventParserInfra = infrastructureInstances.find(instance =>
            instance instanceof EventParserInfrastructure
        );

        this.llm = llm;
        this.systemPrompt = systemPrompt;
        this.tools = this._createTools();
        // Executor initialization in an async initialize() method
        this.executor = null;
    }

    /**
     * Creates Langchain tools that wrap infrastructure instances
     * @private
     */
    _createTools() {
        const tools = [];

        // Event Parser Tool
        if (this.eventParserInfra) {
            const eventParserTool = new Tool({
                name: 'parse_event',
                description: `Use this tool to parse natural language text into structured event details.
                    Input should be a string containing event details in natural language.
                    The tool will return a JSON object with date, time, description, and duration.
                    Use this tool ONLY when creating new calendar events from natural language input.`,
                func: async (input) => {
                    try {
                        const eventDetails = await this.eventParserInfra.parseEventDetails(input);
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

            // Ensure properties are set on the instance
            eventParserTool.name = 'parse_event';
            eventParserTool.description = eventParserTool.lc_kwargs.description;
            tools.push(eventParserTool);
        }

        // Calendar Tool
        if (this.calendarInfra) {
            const calendarToolInstance = this; // To access this.calendarInfra inside func
            const calendarTool = new Tool({
                name: 'calendar',
                description: `Use this tool to manage calendar events. The necessary calendar context (like calendarId) is handled automatically. You can:
                    - Create new events (MUST use parse_event tool first if input is natural language, the output of parse_event is the input for this tool\'s 'create' action).
                    - List upcoming events (no parsing needed, input is a JSON object with query parameters, e.g., {} for all upcoming).
                    - Modify existing events (no parsing needed). Input for 'modify' MUST be a JSON string including an 'eventId' and the fields to update within its parameters (e.g., {"action": "modify", "eventId": "xyz", "summary": "New summary"}).
                    - Delete events (no parsing needed). Input for 'delete' MUST be a JSON string including an 'eventId' within its parameters (e.g., {"action": "delete", "eventId": "xyz"}).
                    The general input structure should be a JSON string with an 'action' field ('create', 'list', 'modify', 'delete')
                    and other relevant fields based on the action.`,
                func: async (inputString, runManager) => {
                    try {
                        const parsedInput = JSON.parse(inputString);
                        const { action, ...params } = parsedInput;

                        const requestContext = runManager?.config?.metadata?.requestContext;

                        if (!requestContext || !requestContext.calendarContext) {
                            return "Error: Calendar context was not available for this operation. Cannot proceed.";
                        }
                        const calendarContext = requestContext.calendarContext;

                        if (!calendarContext.calendarId) {
                            return "Error: Required 'calendarId' is missing from the provided calendarContext.";
                        }

                        switch (action) {
                            case 'create':
                                // params should be the structured event data, potentially from parse_event tool
                                return await calendarToolInstance.calendarInfra.createEvent(calendarContext, params);
                            case 'list':
                                // params should be DomainEventQuery criteria
                                return await calendarToolInstance.calendarInfra.fetchEvents(calendarContext, params);
                            case 'modify': {
                                const { eventId, ...eventDataForUpdates } = params;
                                if (!eventId) {
                                    return "Error: 'eventId' is required for modifying an event and must be provided in the input parameters.";
                                }
                                // Assuming eventDataForUpdates directly matches the structure needed for DomainEventUpdates payload
                                const domainEventUpdatesPayload = { updates: eventDataForUpdates };
                                return await calendarToolInstance.calendarInfra.modifyEvent(calendarContext, eventId, domainEventUpdatesPayload);
                            }
                            case 'delete': {
                                const { eventId } = params;
                                if (!eventId) {
                                    return "Error: 'eventId' is required for deleting an event and must be provided in the input parameters.";
                                }
                                return await calendarToolInstance.calendarInfra.removeEvent(calendarContext, eventId);
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

            // Ensure properties are set on the instance
            calendarTool.name = 'calendar';
            calendarTool.description = calendarTool.lc_kwargs.description;

            tools.push(calendarTool);
        }

        if (tools.length === 0) {
            console.warn('No tools were created from the provided infrastructure instances. The agent might not be able to perform any actions.');
        }

        return tools;
    }

    /**
     * Creates the agent executor
     * @private
     * @returns {Promise<Object>} The initialized agent executor
     */
    async _createExecutor() {
        if (!this.tools || this.tools.length === 0) {
            console.warn("Attempting to create executor without tools. Agent will have no capabilities.");
        }
        // Create the agent
        const agent = await createReactAgent({
            llm: this.llm,
            tools: this.tools,
            prompt: PromptTemplate.fromTemplate(this.systemPrompt.trim()),
        });

        // Create the agent executor
        return new AgentExecutor({
            agent,
            tools: this.tools,
            verbose: process.env.LANGCHAIN_VERBOSE === 'true' || true,
            // handleParsingErrors: true, // Optional: useful for debugging tool input issues
        });
    }

    /**
     * Initializes the agent executor. Separated to allow constructor to be synchronous.
     */
    async initialize() {
        this.executor = await this._createExecutor();
        if (!this.executor) {
            throw new Error("Failed to initialize agent executor.");
        }
    }

    /**
     * Processes a user request using Langchain
     * @param {AgentRequest} agentRequest - The request to process
     * @returns {Promise<AgentResponse>} The agent's response
     */
    async processRequest(agentRequest) {
        if (!this.executor) {
            const error = new Error("Agent executor is not initialized. Call platform.initialize() before using processRequest.");
            console.error('Error in LangchainAgentPlatform:', error.message, error.stack);
            return new AgentResponse(null, { errorDetails: error.message }, error);
        }

        try {
            const { userInput, context: requestContextObject } = agentRequest;

            const result = await this.executor.call(
                {
                    input: userInput
                },
                {
                    metadata: { requestContext: requestContextObject }
                }
            );

            const actionsTaken = result.intermediate_steps || [];

            return new AgentResponse(
                result.output,
                {
                    actionsTaken: actionsTaken.map(actionStep => ({
                        tool: actionStep.action.tool,
                        toolInput: actionStep.action.toolInput,
                        log: actionStep.action.log,
                        observation: actionStep.observation
                    }))
                }
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