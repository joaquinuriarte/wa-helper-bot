// domain/models/DomainEventDetails.js
class DomainEventDetails {
    constructor(date, time, description) {
        this.date = date;
        this.time = time;
        this.description = description;
        // Add other relevant properties as needed
    }
}

module.exports = DomainEventDetails;
