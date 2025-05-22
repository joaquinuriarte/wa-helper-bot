// domain/models/DomainEvent.js
class DomainEvent {
    constructor(id, type, details) {
        this.id = id;
        this.type = type;
        this.details = details; // This would be an instance of DomainEventDetails
        // Add other relevant properties as needed
    }
}

module.exports = DomainEvent;
