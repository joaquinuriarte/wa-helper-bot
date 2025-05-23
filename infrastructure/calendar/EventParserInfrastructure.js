const IEventParserInfrastructure = require('../../domain/calendar/interfaces/IEventParserInfrastructure');
const DomainEventDetails = require('../../domain/calendar/models/DomainEventDetails');
const DomainEvent = require('../../domain/calendar/models/DomainEvent');

/**
 * Concrete implementation of IEventParserInfrastructure using LLM for parsing event details.
 */
class EventParserInfrastructure extends IEventParserInfrastructure {
    /**
     * @param {Object} llm - The language model instance to use for parsing
     */
    constructor(llm) {
        super();
        if (!llm) {
            throw new Error('LLM instance is required');
        }
        this.llm = llm;
    }

    /**
     * Parses natural language text into a structured DomainEvent using LLM.
     * @param {string} text - The raw string to parse.
     * @returns {Promise<DomainEvent|null>} - A promise that resolves to a DomainEvent object or null if parsing fails.
     */
    async parseEventDetails(text) {
        try {
            const prompt = `Parse the following text into event details. Extract date, time, description, and type (summary).
                Return the result as a JSON object with these fields:
                - date: YYYY-MM-DD format
                - time: HH:MM format in 24-hour
                - description: string
                - durationHours: number (default to 1 if not specified)
                - type: string (summary of the event)
                
                Text to parse: "${text}"
                
                Return only the JSON object, nothing else.`;

            const result = await this.llm.generateContent(prompt);
            const response = result.response.text();

            // Parse the JSON response
            const parsedDetails = JSON.parse(response);

            // Create DomainEventDetails
            const eventDetails = new DomainEventDetails(
                parsedDetails.date,
                parsedDetails.time,
                parsedDetails.description,
                parsedDetails.durationHours
            );

            // Create and return DomainEvent
            return new DomainEvent(
                null, // ID is null as it's assigned by the calendar service
                parsedDetails.type, // Event type (summary)
                eventDetails
            );
        } catch (error) {
            console.error('Error parsing event details:', error);
            return null;
        }
    }
}

module.exports = EventParserInfrastructure;