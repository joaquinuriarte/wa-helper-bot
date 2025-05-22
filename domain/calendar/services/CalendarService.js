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

    async addEvent(event) {
        return this._calendarInfrastructure.createEvent(event);
    }

    async getEvents(query) {
        return this._calendarInfrastructure.fetchEvents(query);
    }

    async updateEvent(eventId, updates) {
        return this._calendarInfrastructure.modifyEvent(eventId, updates);
    }

    async deleteEvent(eventId) {
        return this._calendarInfrastructure.removeEvent(eventId);
    }
}

module.exports = CalendarService;
