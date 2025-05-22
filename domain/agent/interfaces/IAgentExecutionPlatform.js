const AgentRequest = require('../models/AgentRequest');
const AgentResponse = require('../models/AgentResponse');

/**
 * @interface IAgentExecutionPlatform
 * @description Defines the contract for a platform that can execute agentic tasks,
 * such as understanding user input, reasoning, and invoking tools to respond.
 */
class IAgentExecutionPlatform {
    /**
     * Processes a user request and returns an agent response.
     * This method encapsulates the agent's reasoning loop, tool usage, and response generation.
     *
     * @param {AgentRequest} agentRequest - The request containing user input and context.
     * @returns {Promise<AgentResponse>} A promise that resolves to the agent's response.
     * @throws {Error} If the underlying platform fails to process the request.
     */
    async processRequest(agentRequest) {
        throw new Error("Method 'processRequest()' must be implemented.");
    }

    // Future methods could include:
    // async initialize() { throw new Error("Method 'initialize()' must be implemented."); }
    // async registerTools(tools) { throw new Error("Method 'registerTools()' must be implemented."); }
}

module.exports = IAgentExecutionPlatform; 