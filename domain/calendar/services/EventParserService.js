// domain/services/EventParserService.js
const DomainEventDetails = require('../models/DomainEventDetails');
const IEventParserInfrastructure = require('../interfaces/IEventParserInfrastructure');

/**
 * Service for parsing natural language into structured event details.
 */
class EventParserService {
    /**
     * @param {IEventParserInfrastructure} eventParserInfrastructure - An instance of a class implementing IEventParserInfrastructure
     */
    constructor(eventParserInfrastructure) {
        if (!(eventParserInfrastructure instanceof IEventParserInfrastructure)) {
            throw new Error('Invalid eventParserInfrastructure: Must be an instance of IEventParserInfrastructure');
        }
        this._eventParserInfrastructure = eventParserInfrastructure;
    }

    /**
     * Parses natural language text into structured event details.
     * @param {string} text - The raw string to parse.
     * @returns {Promise<DomainEventDetails|null>} - A promise that resolves to a DomainEventDetails object or null if parsing fails.
     */
    async parseEventDetails(text) {
        return this._eventParserInfrastructure.parseEventDetails(text);
    }
}

module.exports = EventParserService;
