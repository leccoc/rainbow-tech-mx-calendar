const { google } = require('googleapis');
const axios = require('axios');

/**
 * Service for fetching calendar data from Google Calendar API
 */
class GoogleCalendarService {
    constructor(credentials) {
        this.credentials = credentials;
        this.auth = null;
        this.calendar = null;
    }

    /**
     * Authenticates with Google Calendar API
     * @returns {Promise<void>}
     */
    async authenticate() {
        try {
            const { client_email, private_key, calendar_id, api_key } = this.credentials;

            // Support both API key (for public calendars) and service account (for private)
            if (api_key) {
                // API key doesn't need authentication setup - we'll use direct HTTP requests
                return;
            } else if (client_email && private_key && calendar_id) {
                // Use JWT service account authentication (for private calendars)
                this.auth = new google.auth.JWT(
                    client_email,
                    null,
                    private_key.replace(/\\n/g, '\n'),
                    ['https://www.googleapis.com/auth/calendar.readonly']
                );
                this.calendar = google.calendar({ version: 'v3', auth: this.auth });
            } else {
                throw new Error('Missing required Google Calendar credentials (either API key or service account credentials)');
            }
        } catch (error) {
            console.error('Google Calendar authentication error:', error.message);
            throw error;
        }
    }

    /**
     * Fetches calendar events from Google Calendar API
     * @param {Date} timeMin - Minimum time for events
     * @param {Date} timeMax - Maximum time for events
     * @returns {Promise<Array>} Array of calendar events
     */
    async fetchCalendarEvents(timeMin, timeMax) {
        try {
            const { api_key, calendar_id } = this.credentials;

            console.log('Fetching Google Calendar events...');

            // Use API key with direct HTTP request for public calendars
            if (api_key) {
                const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`;
                const params = {
                    key: api_key,
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: 'true',
                    orderBy: 'startTime',
                    maxResults: 50
                };

                const response = await axios.get(url, { params });
                const events = response.data.items || [];
                console.log(`Successfully fetched ${events.length} events from Google Calendar using API key`);
                
                return this.formatEvents(events);
            } else {
                // Use service account with SDK
                if (!this.auth || !this.calendar) {
                    await this.authenticate();
                }
                
                const response = await this.calendar.events.list({
                    calendarId: calendar_id,
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 50
                });

                const events = response.data.items || [];
                console.log(`Successfully fetched ${events.length} events from Google Calendar using service account`);
                
                return this.formatEvents(events);
            }
        } catch (error) {
            console.error('Error fetching Google Calendar events:', error.message);
            throw new Error(`Google Calendar fetch error: ${error.message}`);
        }
    }

    /**
     * Formats Google Calendar API events to match ICS format
     * @param {Array} events - Raw events from Google Calendar API
     * @returns {Array} Formatted events
     */
    formatEvents(events) {
        return events.map(event => {
            const startDate = event.start.dateTime || event.start.date;
            const endDate = event.end.dateTime || event.end.date;
            
            return {
                summary: event.summary || 'Evento sin título',
                description: event.description || '',
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                location: event.location || '',
                organizer: event.organizer ? {
                    email: event.organizer.email,
                    displayName: event.organizer.displayName
                } : null
            };
        });
    }

    /**
     * Fetches events for a specific month
     * @param {number} year - Year (e.g., 2024)
     * @param {number} month - Month (0-11, where 0 = January)
     * @returns {Promise<Array>} Events for the specified month
     */
    async fetchEventsForMonth(year, month) {
        const timeMin = new Date(year, month, 1);
        const timeMax = new Date(year, month + 1, 0, 23, 59, 59);
        
        return await this.fetchCalendarEvents(timeMin, timeMax);
    }
}

/**
 * Fetches calendar data from Google Calendar API
 * @param {Object} credentials - Google Calendar API credentials
 * @param {Date} timeMin - Minimum time for events
 * @param {Date} timeMax - Maximum time for events
 * @returns {Promise<Array>} Array of calendar events
 */
async function fetchGoogleCalendarData(credentials, timeMin, timeMax) {
    const service = new GoogleCalendarService(credentials);
    return await service.fetchCalendarEvents(timeMin, timeMax);
}

module.exports = {
    GoogleCalendarService,
    fetchGoogleCalendarData
};

