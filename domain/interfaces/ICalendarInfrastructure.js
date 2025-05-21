// domain/interfaces/ICalendarInfrastructure.js
const DomainEvent = require('../models/DomainEvent');
const DomainEventQuery = require('../models/DomainEventQuery');
const DomainEventResult = require('../models/DomainEventResult');
const DomainEventUpdates = require('../models/DomainEventUpdates');

class ICalendarInfrastructure {
    /**
     * Creates a new calendar event
     * @param {DomainEvent} event - The event to create
     */
    async createEvent(event) {
        throw new Error("Method 'createEvent()' must be implemented.");
    }

    /**
     * Fetches events based on query parameters
     * @param {DomainEventQuery} query - The query parameters for fetching events
     * @returns {Promise<DomainEventResult>} The query results
     */
    async fetchEvents(query) {
        throw new Error("Method 'fetchEvents()' must be implemented.");
    }

    /**
     * Modifies an existing event
     * @param {string} eventId - The ID of the event to modify
     * @param {DomainEventUpdates} updates - The updates to apply to the event
     */
    async modifyEvent(eventId, updates) {
        throw new Error("Method 'modifyEvent()' must be implemented.");
    }

    /**
     * Removes an event from the calendar
     * @param {string} eventId - The ID of the event to remove
     */
    async removeEvent(eventId) {
        throw new Error("Method 'removeEvent()' must be implemented.");
    }
}

module.exports = ICalendarInfrastructure;
