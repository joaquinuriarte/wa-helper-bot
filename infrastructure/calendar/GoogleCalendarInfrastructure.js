const ICalendarInfrastructure = require('../../domain/calendar/interfaces/ICalendarInfrastructure');
const DomainEvent = require('../../domain/calendar/models/DomainEvent');
const DomainEventQuery = require('../../domain/calendar/models/DomainEventQuery');
const DomainEventResult = require('../../domain/calendar/models/DomainEventResult');
const DomainEventUpdates = require('../../domain/calendar/models/DomainEventUpdates');
const CalendarContext = require('../../domain/calendar/models/CalendarContext');

class GoogleCalendarInfrastructure extends ICalendarInfrastructure {
    constructor(calendarClient) {
        super();
        if (!calendarClient) {
            throw new Error('Calendar client is required');
        }
        this.calendarClient = calendarClient;
    }

    /**
     * Creates a new calendar event
     * @param {CalendarContext} context - The calendar context to use
     * @param {DomainEvent} event - The event to create
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async createEvent(context, event) {
        try {
            const googleEvent = {
                summary: event.type,
                description: event.details.description,
                start: {
                    dateTime: this._combineDateAndTime(event.details.date, event.details.time),
                    timeZone: context.timezone,
                },
                end: {
                    dateTime: this._combineDateAndTime(event.details.date, event.details.time, event.details.durationHours),
                    timeZone: context.timezone,
                },
            };

            const response = await this.calendarClient.events.insert({
                calendarId: context.calendarId,
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

    /**
     * Fetches events based on query parameters
     * @param {CalendarContext} context - The calendar context to use
     * @param {DomainEventQuery} query - The query parameters for fetching events
     * @returns {Promise<DomainEventResult>} The query results
     */
    async fetchEvents(context, query) {
        try {
            const response = await this.calendarClient.events.list({
                calendarId: context.calendarId,
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

    /**
     * Modifies an existing event
     * @param {CalendarContext} context - The calendar context to use
     * @param {string} eventId - The ID of the event to modify
     * @param {DomainEventUpdates} updates - The updates to apply to the event
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async modifyEvent(context, eventId, updates) {
        try {
            const googleEvent = {
                summary: updates.updates.type,
                description: updates.updates.details?.description,
                start: updates.updates.details?.date && updates.updates.details?.time ? {
                    dateTime: this._combineDateAndTime(updates.updates.details.date, updates.updates.details.time),
                    timeZone: context.timezone,
                } : undefined,
                end: updates.updates.details?.date && updates.updates.details?.time ? {
                    dateTime: this._combineDateAndTime(updates.updates.details.date, updates.updates.details.time, updates.updates.details.durationHours),
                    timeZone: context.timezone,
                } : undefined,
            };

            const response = await this.calendarClient.events.update({
                calendarId: context.calendarId,
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

    /**
     * Removes an event from the calendar
     * @param {CalendarContext} context - The calendar context to use
     * @param {string} eventId - The ID of the event to remove
     * @returns {Promise<DomainEventResult>} The result of the operation
     */
    async removeEvent(context, eventId) {
        try {
            await this.calendarClient.events.delete({
                calendarId: context.calendarId,
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