const IEventParserInfrastructure = require('../../domain/calendar/interfaces/IEventParserInfrastructure');
const DomainEventDetails = require('../../domain/calendar/models/DomainEventDetails');
const DomainEvent = require('../../domain/calendar/models/DomainEvent');
const { z } = require('zod');

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
            // Handle empty or invalid input early
            if (!text || typeof text !== 'string' || text.trim() === '') {
                return null;
            }

            const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

            // Define the structured output schema using Zod
            const EventSchema = z.object({
                success: z.boolean().describe("Whether the text contains valid event information"),
                data: z.object({
                    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Event date in YYYY-MM-DD format"),
                    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).describe("Event time in HH:MM format (24-hour)"),
                    description: z.string().describe("Event description"),
                    durationHours: z.number().default(1).describe("Event duration in hours (default: 1)"),
                    type: z.string().describe("Event type/summary")
                }).optional().describe("Event data (only present if success is true)"),
                error: z.string().optional().describe("Error message (only present if success is false)")
            });

            const prompt = `Parse the following text into event details. Extract date, time, description, and type (summary).
                Current date is ${currentDate}. Use this as reference for relative dates like "tomorrow" or "next week".
                
                Rules:
                - If the text contains valid event information, set success to true and provide the data
                - If the text is empty, unclear, or doesn't contain event information, set success to false and provide an error message
                - Always return valid structured data matching the schema
                
                Text to parse: "${text}"`;

            // Use structured output with LangChain
            const structuredLLM = this.llm.withStructuredOutput(EventSchema);
            const response = await structuredLLM.invoke(prompt);

            // Check if the LLM indicated failure
            if (!response.success) {
                console.log('LLM indicated parsing failure:', response.error);
                return null;
            }

            const parsedDetails = response.data;

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