const IEventParserInfrastructure = require('../../domain/calendar/interfaces/IEventParserInfrastructure');
const DomainEventDetails = require('../../domain/calendar/models/DomainEventDetails');
const DomainEvent = require('../../domain/calendar/models/DomainEvent');
const { _combineDateAndTime } = require('./utils/utils');
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
     * @param {string} timezone - Optional timezone for date calculations (e.g., 'America/Los_Angeles')
     * @returns {Promise<DomainEvent|null>} - A promise that resolves to a DomainEvent object or null if parsing fails.
     */
    async parseEventDetails(text, timezone = null) {  //TODO: Instead of returning null, we should return the error message somehow.
        try {
            // Handle empty or invalid input early
            if (!text || typeof text !== 'string' || text.trim() === '') {
                return null;
            }

            // Get current date in the specified timezone or return error if no timezone provided
            let currentDate;
            if (timezone) {
                // Use timezone-aware date calculation
                const now = new Date();
                const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
                currentDate = now.toLocaleDateString('en-CA', options); // en-CA gives YYYY-MM-DD format
            } else {
                // Return null if no timezone provided (parsing failure)
                console.log("❌ No timezone provided. Timezone is required for proper date calculations.");
                return null;
            }

            // Define the structured output schema using Zod
            const EventSchema = z.object({
                success: z.boolean().describe("Whether the text contains valid event information with sufficient time details"),
                data: z.object({
                    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Event date in YYYY-MM-DD format"),
                    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).describe("Event start time in HH:MM format (24-hour)"),
                    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().describe("Event end time in HH:MM format (24-hour) - REQUIRED when hasDuration is false"),
                    duration: z.number().optional().describe("Event duration in hours - REQUIRED when hasDuration is true"),
                    hasDuration: z.boolean().describe("Set to true if user explicitly mentioned duration (e.g., 'for 1 hour'), false if user provided time range (e.g., '10-2')"),
                    description: z.string().describe("Be thorough in the description. Include all the details of the event provided to you in a polished and clean way."),
                    title: z.string().describe("Event Title. Should be a short title of the event.")
                }).optional().describe("Event data (only present if success is true)"),
                error: z.string().optional().describe("Error message (only present if success is false)")
            });

            const timezoneInfo = timezone ? ` in timezone ${timezone}` : '';
            const prompt = `Parse the following text into event details. Extract date, start time, end time, duration, description, and title.
                Current date${timezoneInfo} is ${currentDate}. Use this as reference for relative dates like "tomorrow" or "next week".
                
                TIME HANDLING RULES:
                1. If user explicitly mentions duration (e.g., "for 1 hour", "2 hours", "30 minutes"):
                   - Set hasDuration = true
                   - Set duration = the mentioned duration in hours
                   - Set endTime = null (not needed)
                
                2. If user provides time range (e.g., "10-2", "10am to 2pm", "between 3 and 5"):
                   - Set hasDuration = false
                   - Set startTime = start time in HH:MM format
                   - Set endTime = end time in HH:MM format
                   - Set duration = null (not needed)
                
                3. If user provides neither duration nor end time:
                   - Set success = false
                   - Provide error message asking for time details
                
                EXAMPLES:
                - "meeting tomorrow at 2pm for 1 hour" → hasDuration=true, duration=1, endTime=null
                - "meeting tomorrow 10-2" → hasDuration=false, endTime="14:00", duration=null
                - "meeting tomorrow at 2pm" → success=false (no duration or end time)
                
                Rules:
                - If the text contains valid event information with sufficient time details, set success to true
                - If the text is empty, unclear, or missing time details, set success to false and provide an error message
                - Always return valid structured data matching the schema
                - When calculating relative dates like "tomorrow", use the current date as reference
                
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

            // Calculate endTime if hasDuration is true and endTime doesn't exist
            let calculatedEndTime = parsedDetails.endTime;
            if (parsedDetails.hasDuration && !parsedDetails.endTime) {
                // Calculate end time by adding duration to start time
                const combinedDateTime = _combineDateAndTime(parsedDetails.date, parsedDetails.startTime, parsedDetails.duration);
                // Extract just the time part (HH:MM) from the combined datetime
                calculatedEndTime = combinedDateTime.split('T')[1].substring(0, 5);
            }

            // Create DomainEventDetails
            const eventDetails = new DomainEventDetails(
                parsedDetails.title,
                parsedDetails.date,
                parsedDetails.startTime,
                calculatedEndTime,
                parsedDetails.description
            );

            // Create and return DomainEvent
            return new DomainEvent(
                null, // ID is null as it's assigned by the calendar service
                "Add", // Describes type of event (add, update, delete, fetch) //TODO: Add enum control for this.
                eventDetails
            );
        } catch (error) {
            console.error('Error parsing event details:', error);
            return null;
        }
    }
}

module.exports = EventParserInfrastructure;