// domain/models/DomainEventQuery.js
class DomainEventQuery {
    /**
     * @param {Object} criteria - Query criteria object
     * @param {string} criteria.timeMin - Start time for query (ISO string)
     * @param {string} criteria.timeMax - End time for query (ISO string)
     */
    constructor(criteria) {
        this.criteria = criteria;
        this.timeMin = criteria?.timeMin;
        this.timeMax = criteria?.timeMax;
        // Add other relevant properties as needed
    }
}

module.exports = DomainEventQuery;
