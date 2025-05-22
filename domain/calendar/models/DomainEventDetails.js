// domain/models/DomainEventDetails.js
class DomainEventDetails {
    /**
     * @param {Date} date - The date of the event
     * @param {Date} time - The time of the event
     * @param {string} description - The description of the event
     * @param {number} durationHours - The duration of the event in hours
     */
    constructor(date, time, description, durationHours = 1) {
        this.date = date;
        this.time = time;
        this.description = description;
        this.durationHours = durationHours;
        // Add other relevant properties as needed
    }
}

module.exports = DomainEventDetails;
