// domain/interfaces/ICalendarInfrastructure.js
const DomainEvent = require('../models/DomainEvent');
const DomainEventQuery = require('../models/DomainEventQuery');
const DomainEventResult = require('../models/DomainEventResult');
const DomainEventUpdates = require('../models/DomainEventUpdates');

class ICalendarInfrastructure {
    async createEvent(event) {
        throw new Error("Method 'createEvent()' must be implemented.");
    }

    async fetchEvents(query) {
        throw new Error("Method 'fetchEvents()' must be implemented.");
    }

    async modifyEvent(eventId, updates) {
        throw new Error("Method 'modifyEvent()' must be implemented.");
    }

    async removeEvent(eventId) {
        throw new Error("Method 'removeEvent()' must be implemented.");
    }
}

module.exports = ICalendarInfrastructure;
