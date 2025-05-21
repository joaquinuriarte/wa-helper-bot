const { google } = require('googleapis');

/**
 * Helper class for managing Google Calendar client sessions
 */
class GoogleCalendarSessionManager {
    /**
     * Creates a new Google Calendar client instance
     * @param {Object} credentials - The credentials object from your credentials.json
     * @returns {import('googleapis').calendar_v3.Calendar} The configured Google Calendar client
     */
    static createClient(credentials) {
        if (!credentials) {
            throw new Error("Google Calendar credentials are required");
        }

        const auth = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/calendar']
        );

        return google.calendar({ version: 'v3', auth });
    }
}

module.exports = GoogleCalendarSessionManager; 