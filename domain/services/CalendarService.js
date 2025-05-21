// domain/services/CalendarService.js
const DomainEvent = require('../models/DomainEvent');
const DomainEventQuery = require('../models/DomainEventQuery');
const DomainEventResult = require('../models/DomainEventResult');
const DomainEventUpdates = require('../models/DomainEventUpdates');
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

    async addEvent(event) {
        // Ensure 'event' is of type DomainEvent if necessary, or trust the infrastructure layer to validate.
        return this._calendarInfrastructure.createEvent(event);
    }

    async getEvents(query) {
        // Ensure 'query' is of type DomainEventQuery if necessary.
        return this._calendarInfrastructure.fetchEvents(query);
    }

    async updateEvent(eventId, updates) {
        // Ensure 'updates' is of type DomainEventUpdates if necessary.
        return this._calendarInfrastructure.modifyEvent(eventId, updates);
    }

    async deleteEvent(eventId) {
        return this._calendarInfrastructure.removeEvent(eventId);
    }
}

module.exports = CalendarService;
