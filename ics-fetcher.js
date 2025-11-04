const ical = require('cal-parser');
const axios = require('axios');

/**
 * Fetches and parses ICS calendar data
 * @param {string} icsUrl - The URL to the ICS calendar
 * @returns {Promise<Object>} Parsed calendar data
 */
async function fetchCalendarData(icsUrl) {
    if (!icsUrl || typeof icsUrl !== 'string') {
        throw new Error('Invalid ICS URL provided');
    }

    try {
        console.log('Fetching calendar data from:', icsUrl);
        
        const response = await axios({
            method: 'GET',
            url: icsUrl,
            timeout: 10000, // 10 second timeout
            headers: {
                'User-Agent': 'CalendarBot/1.0'
            }
        });

        if (!response.data) {
            throw new Error('Empty response from calendar server');
        }

        const parsed = ical.parseString(response.data);
        
        if (!parsed || !parsed.events) {
            throw new Error('Invalid calendar data received');
        }

        // Normalize events to extract .value properties from nested objects
        parsed.events = parsed.events.map(event => {
            const normalized = {};
            for (const [key, value] of Object.entries(event)) {
                if (value && typeof value === 'object' && 'value' in value) {
                    normalized[key] = value.value;
                } else {
                    normalized[key] = value;
                }
            }
            
            // Map ICS field names to common field names
            normalized.startDate = normalized.dtstart;
            normalized.endDate = normalized.dtend;
            
            return normalized;
        });

        console.log(`Successfully parsed calendar with ${parsed.events.length} events`);
        return parsed;
        
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error('Calendar fetch timeout');
        } else if (error.response) {
            throw new Error(`Calendar server error: ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
            throw new Error('No response from calendar server');
        } else {
            throw new Error(`Calendar fetch error: ${error.message}`);
        }
    }
}

/**
 * Filters events for a specific month
 * @param {Array} events - Array of calendar events
 * @param {number} year - Year to filter for
 * @param {number} month - Month to filter for (0-11, where 0 = January)
 * @returns {Array} Filtered events for the specified month
 */
function filterEventsForMonth(events, year, month) {
    return events.filter(event => {
        if (!event.startDate) return false;
        
        const eventDate = new Date(event.startDate);
        return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
}

/**
 * Formats events for display in Telegram message
 * @param {Array} events - Array of events to format
 * @returns {string} Formatted event list
 */
function formatEventsForDisplay(events) {
    if (!events || events.length === 0) {
        return '📅 No hay eventos programados para este mes.';
    }

    let formattedEvents = '';
    
    // Sort events by date
    const sortedEvents = events.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateA - dateB;
    });

    sortedEvents.forEach((event, index) => {
        const eventDate = new Date(event.startDate);
        const dateStr = eventDate.toLocaleDateString('es-MX', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: 'America/Mexico_City'
        });
        
        const timeStr = eventDate.toLocaleTimeString('es-MX', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        });

        formattedEvents += `${index + 1}. **${event.summary || 'Evento sin título'}**\n`;
        formattedEvents += `   - ${dateStr} a las ${timeStr} (CDMX)\n`;
        
        if (event.description) {
            // Truncate long descriptions
            const description = event.description.length > 100 
                ? event.description.substring(0, 100) + '...'
                : event.description;
            formattedEvents += `   📝 ${description}\n`;
        }
        
        formattedEvents += '\n';
    });

    return formattedEvents;
}

module.exports = {
    fetchCalendarData,
    filterEventsForMonth,
    formatEventsForDisplay
};
