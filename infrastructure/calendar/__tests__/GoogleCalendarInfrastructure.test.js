const GoogleCalendarInfrastructure = require('../GoogleCalendarInfrastructure');
const DomainEvent = require('../../../domain/calendar/models/DomainEvent');
const DomainEventQuery = require('../../../domain/calendar/models/DomainEventQuery');
const DomainEventUpdates = require('../../../domain/calendar/models/DomainEventUpdates');
const CalendarContext = require('../../../domain/calendar/models/CalendarContext');

describe('GoogleCalendarInfrastructure', () => {
    let mockCalendarClient;
    let calendarInfra;
    let calendarContext;

    beforeEach(() => {
        // Mock calendar client with all required methods
        mockCalendarClient = {
            events: {
                insert: jest.fn(),
                list: jest.fn(),
                update: jest.fn(),
                delete: jest.fn()
            }
        };

        calendarInfra = new GoogleCalendarInfrastructure(mockCalendarClient);
        calendarContext = new CalendarContext('test-calendar-id', 'America/Los_Angeles');
    });

    describe('createEvent', () => {
        it('should create an event successfully', async () => {
            const mockResponse = {
                data: {
                    id: 'event123',
                    summary: 'Test Event',
                    description: 'Test Description',
                    start: { dateTime: '2024-03-20T14:30:00' },
                    end: { dateTime: '2024-03-20T15:30:00' }
                }
            };

            mockCalendarClient.events.insert.mockResolvedValue(mockResponse);

            const event = new DomainEvent(
                null,
                'Test Event',
                {
                    date: '2024-03-20',
                    time: '14:30',
                    description: 'Test Description',
                    durationHours: 1
                }
            );

            const result = await calendarInfra.createEvent(calendarContext, event);

            expect(result.success).toBe(true);
            expect(result.data).toBeInstanceOf(DomainEvent);
            expect(result.data.id).toBe('event123');
            expect(result.data.type).toBe('Test Event');
            expect(mockCalendarClient.events.insert).toHaveBeenCalledWith({
                calendarId: 'test-calendar-id',
                resource: expect.objectContaining({
                    summary: 'Test Event',
                    description: 'Test Description'
                })
            });
        });

        it('should handle creation errors', async () => {
            mockCalendarClient.events.insert.mockRejectedValue(new Error('API Error'));

            const event = new DomainEvent(
                null,
                'Test Event',
                {
                    date: '2024-03-20',
                    time: '14:30',
                    description: 'Test Description',
                    durationHours: 1
                }
            );

            const result = await calendarInfra.createEvent(calendarContext, event);

            expect(result.success).toBe(false);
            expect(result.data).toBeNull();
            expect(result.error).toBe('API Error');
        });
    });

    describe('fetchEvents', () => {
        it('should fetch events successfully', async () => {
            const mockResponse = {
                data: {
                    items: [
                        {
                            id: 'event1',
                            summary: 'Event 1',
                            description: 'Description 1',
                            start: { dateTime: '2024-03-20T14:30:00' },
                            end: { dateTime: '2024-03-20T15:30:00' }
                        },
                        {
                            id: 'event2',
                            summary: 'Event 2',
                            description: 'Description 2',
                            start: { dateTime: '2024-03-21T10:00:00' },
                            end: { dateTime: '2024-03-21T11:00:00' }
                        }
                    ]
                }
            };

            mockCalendarClient.events.list.mockResolvedValue(mockResponse);

            const query = new DomainEventQuery({ maxResults: 10 });
            const result = await calendarInfra.fetchEvents(calendarContext, query);

            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data.length).toBe(2);
            expect(result.data[0]).toBeInstanceOf(DomainEvent);
            expect(result.data[0].id).toBe('event1');
            expect(result.data[1].id).toBe('event2');
        });
    });

    describe('modifyEvent', () => {
        it('should modify an event successfully', async () => {
            const mockResponse = {
                data: {
                    id: 'event123',
                    summary: 'Updated Event',
                    description: 'Updated Description',
                    start: { dateTime: '2024-03-20T15:00:00' },
                    end: { dateTime: '2024-03-20T16:00:00' }
                }
            };

            mockCalendarClient.events.update.mockResolvedValue(mockResponse);

            const updates = new DomainEventUpdates({
                type: 'Updated Event',
                details: {
                    date: '2024-03-20',
                    time: '15:00',
                    description: 'Updated Description',
                    durationHours: 1
                }
            });

            const result = await calendarInfra.modifyEvent(calendarContext, 'event123', updates);

            expect(result.success).toBe(true);
            expect(result.data).toBeInstanceOf(DomainEvent);
            expect(result.data.id).toBe('event123');
            expect(result.data.type).toBe('Updated Event');
        });
    });

    describe('removeEvent', () => {
        it('should remove an event successfully', async () => {
            mockCalendarClient.events.delete.mockResolvedValue({});

            const result = await calendarInfra.removeEvent(calendarContext, 'event123');

            expect(result.success).toBe(true);
            expect(result.data).toBeNull();
            expect(mockCalendarClient.events.delete).toHaveBeenCalledWith({
                calendarId: 'test-calendar-id',
                eventId: 'event123'
            });
        });

        it('should handle removal errors', async () => {
            mockCalendarClient.events.delete.mockRejectedValue(new Error('Delete Error'));

            const result = await calendarInfra.removeEvent(calendarContext, 'event123');

            expect(result.success).toBe(false);
            expect(result.data).toBeNull();
            expect(result.error).toBe('Delete Error');
        });
    });

    describe('constructor', () => {
        it('should throw error when calendar client is not provided', () => {
            expect(() => new GoogleCalendarInfrastructure(null)).toThrow('Calendar client is required');
        });
    });
}); 