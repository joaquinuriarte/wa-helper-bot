/**
 * Combines date and time strings and optionally adds hours
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:MM format
 * @param {number} hoursToAdd - Hours to add (default: 0)
 * @returns {string} Combined date-time in YYYY-MM-DDTHH:MM:SS format
 */
function _combineDateAndTime(dateString, timeString, hoursToAdd = 0) {
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

/**
 * Gets timezone-aware current date and day information
 * @param {string} timezone - Timezone for date calculations (e.g., 'America/Los_Angeles')
 * @returns {Object} Object containing currentDate (YYYY-MM-DD) and currentDayName (e.g., "Tuesday")
 */
function getCurrentDateInfo(timezone) {
    if (!timezone) {
        throw new Error('Timezone is required for date calculations');
    }

    const now = new Date();

    // Get date in YYYY-MM-DD format
    const dateOptions = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
    const currentDate = now.toLocaleDateString('en-CA', dateOptions); // en-CA gives YYYY-MM-DD format

    // Get day name for weekend calculations
    const dayOptions = { timeZone: timezone, weekday: 'long' };
    const currentDayName = now.toLocaleDateString('en-US', dayOptions); // e.g., "Tuesday"

    return {
        currentDate,
        currentDayName
    };
}

module.exports = {
    _combineDateAndTime,
    getCurrentDateInfo
};