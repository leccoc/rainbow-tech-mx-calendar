const path = require('path');

/**
 * Validates and loads configuration from environment variables
 * @returns {Object} Validated configuration object
 * @throws {Error} If required configuration is missing or invalid
 */
function loadConfig() {
    const requiredEnvVars = [
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_GROUP_ID',
        'TELEGRAM_TOPIC_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate Telegram Group ID format
    const groupId = process.env.TELEGRAM_GROUP_ID;
    if (!groupId.startsWith('-')) {
        throw new Error('TELEGRAM_GROUP_ID must be a negative number (group ID)');
    }

    // Determine calendar source: Google Calendar API (with API key or service account) or ICS URL
    const useGoogleCalendarAPIKey = process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_CALENDAR_API_KEY;
    const useGoogleCalendarServiceAccount = process.env.GOOGLE_CALENDAR_ID && 
                                           process.env.GOOGLE_CALENDAR_CLIENT_EMAIL && 
                                           process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
    const useGoogleCalendar = useGoogleCalendarAPIKey || useGoogleCalendarServiceAccount;
    const useICSCalendar = process.env.ICS_CALENDAR_URL;

    if (!useGoogleCalendar && !useICSCalendar) {
        throw new Error('Either Google Calendar credentials (API key or service account) or ICS_CALENDAR_URL must be provided');
    }

    const config = {
        token: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_GROUP_ID,
        topicId: process.env.TELEGRAM_TOPIC_ID,
        schedule: process.env.CALENDAR_SCHEDULE || '0 9 1 * *',
        stateFile: path.join(__dirname, 'bot-state.json'),
        calendarLink: process.env.CALENDAR_LINK || 'https://calendar.google.com/calendar/u/1?cid=cmFpbmJvd3RlY2gubXhAZ21haWwuY29t'
    };

    // Add calendar-specific configuration
    if (useGoogleCalendar) {
        config.calendarType = 'google';
        config.googleCalendar = {
            calendar_id: process.env.GOOGLE_CALENDAR_ID
        };
        
        // Support both API key and service account authentication
        if (useGoogleCalendarAPIKey) {
            config.googleCalendar.api_key = process.env.GOOGLE_CALENDAR_API_KEY;
            console.log('Using Google Calendar API with API key (public calendar)');
        } else if (useGoogleCalendarServiceAccount) {
            config.googleCalendar.client_email = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
            config.googleCalendar.private_key = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
            console.log('Using Google Calendar API with service account (private calendar)');
        }
    } else if (useICSCalendar) {
        const icsUrl = process.env.ICS_CALENDAR_URL;
        if (!icsUrl.startsWith('http')) {
            throw new Error('ICS_CALENDAR_URL must be a valid HTTP/HTTPS URL');
        }
        config.calendarType = 'ics';
        config.icsUrl = icsUrl;
        console.log('Using ICS Calendar');
    }

    return config;
}

module.exports = { loadConfig };

