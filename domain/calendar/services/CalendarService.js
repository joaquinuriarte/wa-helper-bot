// domain/services/CalendarService.js
const ICalendarInfrastructure = require('../interfaces/ICalendarInfrastructure');

class CalendarService {
    /**
     * @param {ICalendarInfrastructure} calendarInfrastructure - An instance of a class implementing ICalendarInfrastructure.
     */
    constructor(calendarInfrastructure) {
        if (!(calendarInfrastructure instanceof ICalendarInfrastructure)) {
            throw new Error("Invalid calendarInfrastructure: Must be an instance of ICalendarInfrastructure.");
        }
        this._calendarInfrastructure = calendarInfrastructure;
    }

    /**
     * @param {CalendarContext} context - The calendar context to use
     * @param {DomainEvent} event - The event to create
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async addEvent(context, event) {
        return this._calendarInfrastructure.createEvent(context, event);
    }

    /**
     * @param {CalendarContext} context - The calendar context to use
     * @param {DomainEventQuery} query - The query parameters for fetching events
     * @returns {Promise<DomainEventResult>} The query results
     */
    async getEvents(context, query) {
        return this._calendarInfrastructure.fetchEvents(context, query);
    }

    /**
     * @param {CalendarContext} context - The calendar context to use
     * @param {string} eventId - The ID of the event to modify
     * @param {DomainEventUpdates} updates - The updates to apply to the event
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async updateEvent(context, eventId, updates) {
        return this._calendarInfrastructure.modifyEvent(context, eventId, updates);
    }

    /**
     * @param {CalendarContext} context - The calendar context to use
     * @param {string} eventId - The ID of the event to remove
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async deleteEvent(context, eventId) {
        return this._calendarInfrastructure.removeEvent(context, eventId);
    }
}

module.exports = CalendarService;
