/**
 * Interface for event parser infrastructure implementations.
 * Defines the contract for parsing natural language into structured event details.
 */
class IEventParserInfrastructure {
    /**
     * Parses natural language text into structured event details.
     * @param {string} text - The raw string to parse.
     * @param {string} timezone - Optional timezone for date calculations (e.g., 'America/Los_Angeles')
     * @returns {Promise<DomainEventDetails|null>} - A promise that resolves to a DomainEventDetails object or null if parsing fails.
     */
    async parseEventDetails(text, timezone = null) {
        throw new Error('parseEventDetails must be implemented');
    }
}

module.exports = IEventParserInfrastructure; 