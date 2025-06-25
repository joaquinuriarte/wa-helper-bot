// domain/models/DomainEventDetails.js
class DomainEventDetails {
    /**
     * @param {string} title - The title of the event
     * @param {Date} date - The date of the event
     * @param {Date} startTime - The start time of the event
     * @param {Date} endTime - The end time of the event
     * @param {string} description - The description of the event
     */
    constructor(title, date, startTime, endTime, description) {
        this.title = title;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.description = description;
        // Add other relevant properties as needed
    }
}

module.exports = DomainEventDetails;
