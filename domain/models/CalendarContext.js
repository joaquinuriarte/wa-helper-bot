// domain/models/CalendarContext.js
class CalendarContext {
    /**
     * @param {string} calendarId - The ID of the calendar to use
     * @param {string} timezone - The timezone for the calendar operations
     */
    constructor(calendarId, timezone = 'America/Los_Angeles') {
        if (!calendarId) {
            throw new Error('Calendar ID is required');
        }
        this.calendarId = calendarId;
        this.timezone = timezone;
    }
}

module.exports = CalendarContext; 