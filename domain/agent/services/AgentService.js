const AgentRequest = require('../models/AgentRequest');
const AgentResponse = require('../models/AgentResponse');
const IAgentExecutionPlatform = require('../interfaces/IAgentExecutionPlatform');

/**
 * @class AgentService
 * @description Domain service responsible for orchestrating interactions with an agent execution platform.
 * It uses an implementation of IAgentExecutionPlatform to process user requests.
 */
class AgentService {
    /**
     * @param {IAgentExecutionPlatform} agentPlatform - An instance of a class implementing IAgentExecutionPlatform.
     */
    constructor(agentPlatform) {
        if (!(agentPlatform instanceof IAgentExecutionPlatform)) {
            throw new Error("Invalid agentPlatform: Must be an instance of IAgentExecutionPlatform.");
        }
        this.agentPlatform = agentPlatform;
    }

    /**
     * Processes a user's textual input via the configured agent platform.
     *
     * @param {AgentRequest} agentRequest - The request containing user input and context.
     * @returns {Promise<AgentResponse>} A promise that resolves to the agent's structured response.
     */
    async handleUserQuery(agentRequest) {
        try {
            const agentResponse = await this.agentPlatform.processRequest(agentRequest);
            return agentResponse;
        } catch (error) {
            console.error('Error in AgentService while handling user query:', error);
            // Return a structured error response
            return new AgentResponse(null, { errorDetails: error.message }, error);
        }
    }
}

module.exports = AgentService; 