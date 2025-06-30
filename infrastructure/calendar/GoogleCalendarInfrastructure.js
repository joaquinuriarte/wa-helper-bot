const ICalendarInfrastructure = require('../../domain/calendar/interfaces/ICalendarInfrastructure');
const DomainEvent = require('../../domain/calendar/models/DomainEvent');
const DomainEventQuery = require('../../domain/calendar/models/DomainEventQuery');
const DomainEventResult = require('../../domain/calendar/models/DomainEventResult');
const DomainEventUpdates = require('../../domain/calendar/models/DomainEventUpdates');
const CalendarContext = require('../../domain/calendar/models/CalendarContext');
const { _combineDateAndTime } = require('./utils/utils');


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
            let googleEvent = {
                summary: event.details.title,
                description: event.details?.description || '',
            };

            // Handle all-day vs timed events
            if (event.details.isAllDay) {
                // All-day event
                googleEvent.start = {
                    date: event.details.startDate,
                    timeZone: context.calendarContext.timezone,
                };

                // For multi-day all-day events, adjust end date for Google's exclusive behavior
                let endDate = event.details.endDate;
                if (event.details.startDate !== event.details.endDate) {
                    const adjustedEndDate = new Date(event.details.endDate);
                    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
                    endDate = adjustedEndDate.toISOString().split('T')[0];
                }

                googleEvent.end = {
                    date: endDate,
                    timeZone: context.calendarContext.timezone,
                };
            } else {
                // Timed event
                googleEvent.start = {
                    dateTime: _combineDateAndTime(event.details.startDate, event.details.startTime),
                    timeZone: context.calendarContext.timezone,
                };
                googleEvent.end = {
                    dateTime: _combineDateAndTime(event.details.startDate, event.details.endTime),
                    timeZone: context.calendarContext.timezone,
                };
            }

            const response = await this.calendarClient.events.insert({
                calendarId: context.calendarContext.calendarId,
                resource: googleEvent,
            });

            // Create appropriate response based on event type
            let responseDetails;
            if (event.details.isAllDay) {
                responseDetails = {
                    date: new Date(response.data.start.date),
                    time: null, // All-day events don't have specific times
                    description: response.data.description || ''
                };
            } else {
                responseDetails = {
                    date: new Date(response.data.start.dateTime),
                    time: new Date(response.data.start.dateTime),
                    description: response.data.description || ''
                };
            }

            return new DomainEventResult(
                true,
                new DomainEvent(
                    response.data.id,
                    response.data.summary,
                    responseDetails
                )
            );
        } catch (error) {
            return new DomainEventResult(false, null, error.message);
        }
    }

    /**
     * Fetches events within a date range.
     * If the caller omits timeMin/timeMax, defaults to today → +6 months (UTC).
     * @param {CalendarContext} context - The calendar context to use
     * @param {DomainEventQuery} query - The query parameters for fetching events
     * @returns {Promise<DomainEventResult>} The query results
     */
    async fetchEvents(context, query) {
        try {
            // build criteria with sensible fallbacks
            const criteria = { ...(query?.criteria ?? {}) };

            // default lower bound: 00:00 today (UTC)
            if (!criteria.timeMin) {
                const now = new Date();
                const startOfTodayUTC = new Date(Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate()
                ));
                criteria.timeMin = startOfTodayUTC.toISOString();
            }

            // default upper bound: +6 calendar months from timeMin
            if (!criteria.timeMax) {
                const max = new Date(criteria.timeMin);
                max.setUTCMonth(max.getUTCMonth() + 6);
                criteria.timeMax = max.toISOString();
            }

            const response = await this.calendarClient.events.list({
                calendarId: context.calendarContext.calendarId,
                ...criteria,            // all caller-supplied / default params
                singleEvents: true      // keep: flattens recurrences for easier mapping
            });

            const events = response.data.items.map(evt => {
                // Determine if this is an all-day event
                const isAllDay = !evt.start.dateTime && evt.start.date;

                if (isAllDay) {
                    // Handle all-day events
                    const startDate = evt.start.date;
                    const endDate = evt.end?.date || startDate; // Google Calendar end date is exclusive for all-day events

                    // Create DomainEventDetails for all-day event
                    const eventDetails = {
                        title: evt.summary || 'Untitled Event',
                        startDate: startDate,
                        isAllDay: true,
                        startTime: null,
                        endTime: null,
                        description: evt.description || '',
                        endDate: endDate
                    };

                    return new DomainEvent(
                        evt.id,
                        evt.summary,
                        eventDetails
                    );
                } else {
                    // Handle timed events
                    const startDateTime = new Date(evt.start.dateTime);
                    const endDateTime = new Date(evt.end.dateTime);

                    // Extract date and time components
                    const startDate = startDateTime.toISOString().split('T')[0];
                    const startTime = startDateTime.toTimeString().substring(0, 5); // HH:MM format
                    const endTime = endDateTime.toTimeString().substring(0, 5); // HH:MM format

                    // Create DomainEventDetails for timed event
                    const eventDetails = {
                        title: evt.summary || 'Untitled Event',
                        startDate: startDate,
                        isAllDay: false,
                        startTime: startTime,
                        endTime: endTime,
                        description: evt.description || '',
                        endDate: startDate // Same as startDate for single-day timed events
                    };

                    return new DomainEvent(
                        evt.id,
                        evt.summary,
                        eventDetails
                    );
                }
            });

            return new DomainEventResult(true, events);
        } catch (err) {
            return new DomainEventResult(false, null, err.message);
        }
    }

    // /**
    //  * Modifies an existing event
    //  * @param {CalendarContext} context - The calendar context to use
    //  * @param {string} eventId - The ID of the event to modify
    //  * @param {DomainEventUpdates} updates - The updates to apply to the event
    //  * @returns {Promise<DomainEventResult>} The result of the operation
    //  */
    // async modifyEvent(context, eventId, updates) {
    //     try {
    //         const googleEvent = {
    //             summary: updates.updates.type,
    //             description: updates.updates.details?.description,
    //             start: updates.updates.details?.date && updates.updates.details?.time ? {
    //                 dateTime: _combineDateAndTime(updates.updates.details.date, updates.updates.details.time),
    //                 timeZone: context.calendarContext.timezone,
    //             } : undefined,
    //             end: updates.updates.details?.date && updates.updates.details?.time ? {
    //                 dateTime: _combineDateAndTime(updates.updates.details.date, updates.updates.details.time, updates.updates.details.durationHours),
    //                 timeZone: context.calendarContext.timezone,
    //             } : undefined,
    //         };

    //         const response = await this.calendarClient.events.update({
    //             calendarId: context.calendarContext.calendarId,
    //             eventId: eventId,
    //             resource: googleEvent,
    //         });

    //         return new DomainEventResult(
    //             true,
    //             new DomainEvent(
    //                 response.data.id,
    //                 response.data.summary,
    //                 {
    //                     date: new Date(response.data.start.dateTime),
    //                     time: new Date(response.data.start.dateTime),
    //                     description: response.data.description || ''
    //                 }
    //             )
    //         );
    //     } catch (error) {
    //         return new DomainEventResult(false, null, error.message);
    //     }
    // }

    // /**
    //  * Removes an event from the calendar
    //  * @param {CalendarContext} context - The calendar context to use
    //  * @param {string} eventId - The ID of the event to remove
    //  * @returns {Promise<DomainEventResult>} The result of the operation
    //  */
    // async removeEvent(context, eventId) {
    //     try {
    //         await this.calendarClient.events.delete({
    //             calendarId: context.calendarContext.calendarId,
    //             eventId: eventId,
    //         });

    //         return new DomainEventResult(true, null);
    //     } catch (error) {
    //         return new DomainEventResult(false, null, error.message);
    //     }
    // }
}

module.exports = GoogleCalendarInfrastructure; 