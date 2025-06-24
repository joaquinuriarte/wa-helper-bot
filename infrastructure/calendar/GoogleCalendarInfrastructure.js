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
                description: event.details?.description || '',
                start: {
                    dateTime: this._combineDateAndTime(event.details.date, event.details.time),
                    timeZone: context.calendarContext.timezone,
                },
                end: {
                    dateTime: this._combineDateAndTime(event.details.date, event.details.time, event.details.durationHours),
                    timeZone: context.calendarContext.timezone,
                },
            };

            const response = await this.calendarClient.events.insert({
                calendarId: context.calendarContext.calendarId,
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
                        description: response.data.description || ''
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
                calendarId: context.calendarContext.calendarId,
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
                    timeZone: context.calendarContext.timezone,
                } : undefined,
                end: updates.updates.details?.date && updates.updates.details?.time ? {
                    dateTime: this._combineDateAndTime(updates.updates.details.date, updates.updates.details.time, updates.updates.details.durationHours),
                    timeZone: context.calendarContext.timezone,
                } : undefined,
            };

            const response = await this.calendarClient.events.update({
                calendarId: context.calendarContext.calendarId,
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
                        description: response.data.description || ''
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
                calendarId: context.calendarContext.calendarId,
                eventId: eventId,
            });

            return new DomainEventResult(true, null);
        } catch (error) {
            return new DomainEventResult(false, null, error.message);
        }
    }

    _combineDateAndTime(dateString, timeString, hoursToAdd = 0) {
        // dateString is like "2025-05-23"
        // timeString is like "14:00"
        // hoursToAdd is a number, e.g., 1

        const [year, month, day] = dateString.split('-').map(Number);
        const [hour, minute] = timeString.split(':').map(Number);

        // Create a Date object using Date.UTC to ensure all components are treated as UTC parts.
        // Month is 0-indexed for Date.UTC (0 for January, 11 for December).
        const dateObj = new Date(Date.UTC(year, month - 1, day, hour, minute));

        if (hoursToAdd > 0) {
            // Add hours in UTC to handle date rollovers correctly
            dateObj.setUTCHours(dateObj.getUTCHours() + parseFloat(hoursToAdd));
        }

        // Extract components from the UTC date object and format them as a local time string.
        // This string, when sent to Google Calendar with a specific timeZone, will be interpreted correctly.
        const resYear = dateObj.getUTCFullYear();
        const resMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth is 0-indexed
        const resDay = String(dateObj.getUTCDate()).padStart(2, '0');
        const resHour = String(dateObj.getUTCHours()).padStart(2, '0');
        const resMinute = String(dateObj.getUTCMinutes()).padStart(2, '0');

        return `${resYear}-${resMonth}-${resDay}T${resHour}:${resMinute}:00`;
    }
}

module.exports = GoogleCalendarInfrastructure; 