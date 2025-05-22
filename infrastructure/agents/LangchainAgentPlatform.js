const { Tool } = require('langchain/tools');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const IAgentExecutionPlatform = require('../../domain/agent/interfaces/IAgentExecutionPlatform');
const AgentRequest = require('../../domain/agent/models/AgentRequest');
const AgentResponse = require('../../domain/agent/models/AgentResponse');
const GoogleCalendarInfrastructure = require('../calendar/GoogleCalendarInfrastructure');

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

        this.infrastructureInstances = infrastructureInstances;
        this.llm = llm;
        this.systemPrompt = systemPrompt;
        this.tools = this._createTools();
        this.executor = this._createExecutor();
    }

    /**
     * Creates Langchain tools that wrap infrastructure instances
     * @private
     */
    _createTools() {
        const tools = [];

        // Calendar Tool
        const calendarInfra = this.infrastructureInstances.find(instance =>
            instance instanceof GoogleCalendarInfrastructure
        );

        if (calendarInfra) {
            const tool = new Tool({
                name: 'calendar',
                description: `Use this tool to manage calendar events. You can:
                    - Create new events
                    - List upcoming events
                    - Modify existing events
                    - Delete events
                    Input should be a JSON string with an 'action' field ('create', 'list', 'modify', 'delete')
                    and other relevant fields based on the action.`,
                func: async (input) => {
                    try {
                        const parsedInput = JSON.parse(input);
                        const { action, ...params } = parsedInput;

                        switch (action) {
                            case 'create':
                                return await calendarInfra.createEvent(params);
                            case 'list':
                                return await calendarInfra.fetchEvents(params);
                            case 'modify':
                                return await calendarInfra.modifyEvent(params);
                            case 'delete':
                                return await calendarInfra.removeEvent(params);
                            default:
                                throw new Error(`Unknown calendar action: ${action}`);
                        }
                    } catch (error) {
                        return `Error in calendar tool: ${error.message}`;
                    }
                }
            });

            // Ensure properties are set on the instance
            tool.name = 'calendar';
            tool.description = tool.lc_kwargs.description;

            tools.push(tool);
        }

        if (tools.length === 0) {
            throw new Error('No valid tools were created from the provided infrastructure instances');
        }

        return tools;
    }

    /**
     * Creates the agent executor
     * @private
     * @returns {Object} The initialized agent executor
     */
    _createExecutor() {
        return initializeAgentExecutorWithOptions(
            this.tools,
            this.llm,
            {
                agentType: 'chat-conversational-react-description',
                verbose: true,
                systemMessage: this.systemPrompt
            }
        );
    }

    /**
     * Processes a user request using Langchain
     * @param {AgentRequest} agentRequest - The request to process
     * @returns {Promise<AgentResponse>} The agent's response
     */
    async processRequest(agentRequest) {
        try {
            // Add conversation history to the context if available
            const context = agentRequest.context.conversationHistory || [];

            // Execute the agent
            const result = await this.executor.call({
                input: agentRequest.userInput,
                chat_history: context
            });

            // Extract actions taken from the agent's execution
            const actionsTaken = this.executor.agent.actions || [];

            // Create and return the response
            return new AgentResponse(
                result.output,
                {
                    actionsTaken: actionsTaken.map(action => ({
                        tool: action.tool,
                        input: action.toolInput,
                        output: action.observation
                    }))
                }
            );
        } catch (error) {
            console.error('Error in LangchainAgentPlatform:', error);
            return new AgentResponse(
                null,
                { errorDetails: error.message },
                error
            );
        }
    }
}

module.exports = LangchainAgentPlatform; 