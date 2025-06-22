const EventParserInfrastructure = require('../EventParserInfrastructure');
const DomainEvent = require('../../../domain/calendar/models/DomainEvent');
const LLMSessionManager = require('../sessionManagers/LLMSessionManager');
const path = require('path');

describe('EventParserInfrastructure', () => {
    let llm;
    let eventParser;

    beforeAll(async () => {
        const apiKeyPath = path.resolve(__dirname, '../../../env/gemini-api-key.json');
        llm = await LLMSessionManager.createLLM(apiKeyPath);
    });

    beforeEach(() => {
        eventParser = new EventParserInfrastructure(llm);
    });

    describe('parseEventDetails', () => {
        it('should successfully parse event with full date and time', async () => {
            const result = await eventParser.parseEventDetails('Team meeting June 20, 2025 at 2:30 PM');

            expect(result).toBeInstanceOf(DomainEvent);
            expect(result.type).toBeTruthy();
            expect(result.details).toBeTruthy();
            expect(result.details.date).toBe('2025-06-20');
            expect(result.details.time).toBe('14:30');
            expect(result.details.description).toBeTruthy();
            expect(typeof result.details.durationHours).toBe('number');
        });

        it('should handle missing year by using current year', async () => {
            const result = await eventParser.parseEventDetails('Team meeting June 20 at 2:30 PM');

            expect(result).toBeInstanceOf(DomainEvent);
            const currentYear = new Date().getFullYear();
            expect(result.details.date).toBe(`${currentYear}-06-20`);
            expect(result.details.time).toBe('14:30');
        });

        it('should handle relative dates correctly', async () => {
            const result = await eventParser.parseEventDetails('Team meeting tomorrow at 2:30 PM');

            expect(result).toBeInstanceOf(DomainEvent);
            // Get tomorrow's date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const expectedDate = tomorrow.toISOString().split('T')[0];

            expect(result.details.date).toBe(expectedDate);
            expect(result.details.time).toBe('14:30');
        });

        it('should handle events with duration', async () => {
            const result = await eventParser.parseEventDetails('Team meeting June 20, 2025 at 2:30 PM for 2 hours');

            expect(result).toBeInstanceOf(DomainEvent);
            expect(result.details.date).toBe('2025-06-20');
            expect(result.details.time).toBe('14:30');
            expect(result.details.durationHours).toBe(2);
        });

        it('should handle different event types correctly', async () => {
            const result = await eventParser.parseEventDetails(
                'Birthday party for John on June 20, 2025 at 2:30 PM at Central Park'
            );

            expect(result).toBeInstanceOf(DomainEvent);
            expect(result.type.toLowerCase()).toBe('birthday party');
            expect(result.details.description.toLowerCase()).toBe('birthday party for john at central park');
        });

        it('should return null for empty input', async () => {
            const result = await eventParser.parseEventDetails('');
            expect(result).toBeNull();
        });

        it('should return null for invalid/malformed input', async () => {
            const result = await eventParser.parseEventDetails('this is not an event');
            expect(result).toBeNull();
        });

        it('should return null for input with missing required fields', async () => {
            const result = await eventParser.parseEventDetails('meeting');
            expect(result).toBeNull();
        });
    });

    describe('constructor', () => {
        it('should throw error when LLM instance is not provided', () => {
            expect(() => new EventParserInfrastructure(null)).toThrow('LLM instance is required');
        });
    });
}); 