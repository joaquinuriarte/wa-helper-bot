// domain/models/DomainEventDetails.js
class DomainEventDetails {
    /**
     * @param {string} title - The title of the event
     * @param {string} startDate - The start date of the event in YYYY-MM-DD format
     * @param {boolean} isAllDay - Whether this is an all-day event
     * @param {string} startTime - The start time in HH:MM format (24-hour), null for all-day events
     * @param {string} endTime - The end time in HH:MM format (24-hour), null for all-day events
     * @param {string} description - The description of the event
     * @param {string} endDate - The end date in YYYY-MM-DD format, same as startDate for single-day events
     */
    constructor(title, startDate, isAllDay, startTime, endTime, description, endDate) {
        this.title = title;
        this.startDate = startDate;
        this.isAllDay = isAllDay;
        this.startTime = startTime;
        this.endTime = endTime;
        this.description = description;
        this.endDate = endDate;
        // Add other relevant properties as needed
    }
}

module.exports = DomainEventDetails;
