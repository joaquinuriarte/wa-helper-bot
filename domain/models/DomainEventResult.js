// domain/models/DomainEventResult.js
class DomainEventResult {
    constructor(success, data, error) {
        this.success = success;
        this.data = data; // Can be a single DomainEvent or a list of DomainEvents
        this.error = error; // Error message or object
        // Add other relevant properties as needed
    }
}

module.exports = DomainEventResult;
