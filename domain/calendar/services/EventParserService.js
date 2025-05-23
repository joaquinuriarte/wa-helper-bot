// domain/services/EventParserService.js
const DomainEvent = require('../models/DomainEvent');
const IEventParserInfrastructure = require('../interfaces/IEventParserInfrastructure');

/**
 * Service for parsing natural language into a structured Calendar Data Model.
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
     * Parses natural language text into a structured DomainEvent object.
     * The ID of the DomainEvent will likely be null at this stage, as it's typically assigned by the calendar service upon creation.
     * The 'type' (summary) of the event should be extracted from the text.
     * @param {string} text - The raw string to parse.
     * @returns {Promise<DomainEvent|null>} - A promise that resolves to a DomainEvent object or null if parsing fails.
     */
    async parseEventDetails(text) {
        return this._eventParserInfrastructure.parseEventDetails(text);
    }
}

module.exports = EventParserService;
