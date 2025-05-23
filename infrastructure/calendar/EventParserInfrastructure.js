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

            const resultMessage = await this.llm.invoke(prompt);

            // TODO: WHy we doing this? 
            let responseText;
            if (typeof resultMessage.content === 'string') {
                responseText = resultMessage.content;
            } else if (Array.isArray(resultMessage.content) && resultMessage.content.length > 0 && typeof resultMessage.content[0].text === 'string') {
                responseText = resultMessage.content[0].text;
            } else {
                console.error('Error parsing LLM response: content is not in expected format.', resultMessage);
                return null;
            }

            //TODO: Add better solution
            // Clean the responseText to extract pure JSON
            const jsonMatch = responseText.match(/```(json)?\n(.*)\n```/s);
            const cleanedJsonString = jsonMatch && jsonMatch[2] ? jsonMatch[2].trim() : responseText.trim();

            // Parse the JSON response
            const parsedDetails = JSON.parse(cleanedJsonString);

            // Create DomainEventDetails
            const eventDetails = new DomainEventDetails(
                parsedDetails.date,
                parsedDetails.time,
                parsedDetails.description,
                parsedDetails.durationHours
            );
            console.log("Event Details:", eventDetails);

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