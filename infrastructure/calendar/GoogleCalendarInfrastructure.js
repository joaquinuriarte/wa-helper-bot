const ICalendarInfrastructure = require('../../domain/interfaces/ICalendarInfrastructure');
const DomainEvent = require('../../domain/models/DomainEvent');
const DomainEventQuery = require('../../domain/models/DomainEventQuery');
const DomainEventResult = require('../../domain/models/DomainEventResult');
const DomainEventUpdates = require('../../domain/models/DomainEventUpdates');

class GoogleCalendarInfrastructure extends ICalendarInfrastructure {
    constructor(calendarClient, calendarId) {
        super();
        if (!calendarClient) {
            throw new Error('Calendar client is required');
        }
        this.calendarClient = calendarClient;
        this.calendarId = calendarId;
    }

    async createEvent(event) {
        try {
            if (!(event instanceof DomainEvent)) {
                throw new Error('Invalid event: Must be an instance of DomainEvent');
            }

            const googleEvent = {
                summary: event.type,
                description: event.details.description,
                start: {
                    dateTime: this._combineDateAndTime(event.details.date, event.details.time),
                    timeZone: 'America/Los_Angeles',
                },
                end: {
                    dateTime: this._combineDateAndTime(event.details.date, event.details.time, 1), // 1 hour duration
                    timeZone: 'America/Los_Angeles',
                },
            };

            const response = await this.calendarClient.events.insert({
                calendarId: this.calendarId,
                resource: googleEvent,
            });

            return new DomainEventResult(
                true,
                new DomainEvent(
                    response.data.id,
                    response.data.summary,
                    {
                        date: new Date(response.data.start.dateTime),
                        time: new Date(response.data.start.dateTime),
                        description: response.data.description
                    }
                )
            );
        } catch (error) {
            return new DomainEventResult(false, null, error.message);
        }
    }

    async fetchEvents(query) {
        try {
            if (!(query instanceof DomainEventQuery)) {
                throw new Error('Invalid query: Must be an instance of DomainEventQuery');
            }

            const response = await this.calendarClient.events.list({
                calendarId: this.calendarId,
                timeMin: new Date().toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                ...query.criteria
            });

            const events = response.data.items.map(event =>
                new DomainEvent(
                    event.id,
                    event.summary,
                    {
                        date: new Date(event.start.dateTime),
                        time: new Date(event.start.dateTime),
                        description: event.description
                    }
                )
            );

            return new DomainEventResult(true, events);
        } catch (error) {
            return new DomainEventResult(false, null, error.message);
        }
    }

    async modifyEvent(eventId, updates) {
        try {
            if (!(updates instanceof DomainEventUpdates)) {
                throw new Error('Invalid updates: Must be an instance of DomainEventUpdates');
            }

            const googleEvent = {
                summary: updates.updates.type,
                description: updates.updates.details?.description,
                start: updates.updates.details?.date && updates.updates.details?.time ? {
                    dateTime: this._combineDateAndTime(updates.updates.details.date, updates.updates.details.time),
                    timeZone: 'America/Los_Angeles',
                } : undefined,
                end: updates.updates.details?.date && updates.updates.details?.time ? {
                    dateTime: this._combineDateAndTime(updates.updates.details.date, updates.updates.details.time, 1),
                    timeZone: 'America/Los_Angeles',
                } : undefined,
            };

            const response = await this.calendarClient.events.update({
                calendarId: this.calendarId,
                eventId: eventId,
                resource: googleEvent,
            });

            return new DomainEventResult(
                true,
                new DomainEvent(
                    response.data.id,
                    response.data.summary,
                    {
                        date: new Date(response.data.start.dateTime),
                        time: new Date(response.data.start.dateTime),
                        description: response.data.description
                    }
                )
            );
        } catch (error) {
            return new DomainEventResult(false, null, error.message);
        }
    }

    async removeEvent(eventId) {
        try {
            await this.calendarClient.events.delete({
                calendarId: this.calendarId,
                eventId: eventId,
            });

            return new DomainEventResult(true, null);
        } catch (error) {
            return new DomainEventResult(false, null, error.message);
        }
    }

    _combineDateAndTime(date, time, hoursToAdd = 0) {
        const combined = new Date(date);
        combined.setHours(time.getHours());
        combined.setMinutes(time.getMinutes());
        if (hoursToAdd > 0) {
            combined.setHours(combined.getHours() + hoursToAdd);
        }
        return combined.toISOString();
    }
}

module.exports = GoogleCalendarInfrastructure; 