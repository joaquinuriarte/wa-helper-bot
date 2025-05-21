// domain/interfaces/ICalendarInfrastructure.js
const DomainEvent = require('../models/DomainEvent');
const DomainEventQuery = require('../models/DomainEventQuery');
const DomainEventResult = require('../models/DomainEventResult');
const DomainEventUpdates = require('../models/DomainEventUpdates');
const CalendarContext = require('../models/CalendarContext');

class ICalendarInfrastructure {
    /**
     * Creates a new calendar event
     * @param {CalendarContext} context - The calendar context to use
     * @param {DomainEvent} event - The event to create
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async createEvent(context, event) {
        throw new Error("Method 'createEvent()' must be implemented.");
    }

    /**
     * Fetches events based on query parameters
     * @param {CalendarContext} context - The calendar context to use
     * @param {DomainEventQuery} query - The query parameters for fetching events
     * @returns {Promise<DomainEventResult>} The query results
     */
    async fetchEvents(context, query) {
        throw new Error("Method 'fetchEvents()' must be implemented.");
    }

    /**
     * Modifies an existing event
     * @param {CalendarContext} context - The calendar context to use
     * @param {string} eventId - The ID of the event to modify
     * @param {DomainEventUpdates} updates - The updates to apply to the event
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async modifyEvent(context, eventId, updates) {
        throw new Error("Method 'modifyEvent()' must be implemented.");
    }

    /**
     * Removes an event from the calendar
     * @param {CalendarContext} context - The calendar context to use
     * @param {string} eventId - The ID of the event to remove
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async removeEvent(context, eventId) {
        throw new Error("Method 'removeEvent()' must be implemented.");
    }
}

module.exports = ICalendarInfrastructure;
