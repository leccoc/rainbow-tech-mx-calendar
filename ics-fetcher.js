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
/**
 * Escapes Markdown special characters for Telegram
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
    if (!text) return '';
    // Escape special Markdown characters: _ * [ ] ( ) ` ~
    return String(text)
        .replace(/\_/g, '\\_')
        .replace(/\*/g, '\\*')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\`/g, '\\`')
        .replace(/\~/g, '\\~');
}

/**
 * Formats description text, converting HTML links and plain URLs to Markdown format
 * @param {string} description - Description text that may contain HTML links or plain URLs
 * @returns {string} Formatted description with Markdown links
 */
function findFirstUrl(text) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s<>"')]+)/i;
    const match = String(text).match(urlRegex);
    return match ? match[0] : null;
}

function sanitizeLink(link) {
    if (!link) return null;
    try {
        return new URL(link).toString();
    } catch (error) {
        return null;
    }
}

function formatEventsForDisplay(events = [], options = {}) {
    if (!Array.isArray(events) || events.length === 0) {
        return 'No hay eventos programados para este mes.';
    }

    const { maxEvents = null, maxLength = Infinity } = options;

    const sortedEvents = [...events].sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateA - dateB;
    });

    const sections = [];

    sortedEvents.forEach((event, index) => {
        const eventDate = new Date(event.startDate);
        const dateStr = eventDate.toLocaleDateString('es-MX', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: 'America/Mexico_City'
        });

        const hasTime = eventDate.getHours() !== 0 || eventDate.getMinutes() !== 0;
        const timeStr = hasTime
            ? eventDate.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'America/Mexico_City'
            })
            : null;

        const lines = [];
        const escapedSummary = escapeMarkdown(event.summary || 'Evento sin título');
        lines.push(`${index + 1}. ${escapedSummary}`);
        lines.push(`   Fecha: ${dateStr}${timeStr ? ` a las ${timeStr}` : ''}`);

        const link =
            sanitizeLink(event.url) ||
            sanitizeLink(event.htmlLink) ||
            sanitizeLink(findFirstUrl(event.description)) ||
            sanitizeLink(findFirstUrl(event.location));

        if (link) {
            lines.push(`   [Ver más](${link})`);
        }

        lines.push('');
        sections.push(lines);
    });

    let limitedSections = sections;
    if (typeof maxEvents === 'number' && maxEvents > 0) {
        limitedSections = sections.slice(0, maxEvents);
    }

    const resultLines = ['**Próximos eventos**', ''];

    for (const section of limitedSections) {
        for (const line of section) {
            const candidateLength = [...resultLines, line].join('\n').length;
            if (candidateLength > maxLength) {
                return resultLines.join('\n').trimEnd();
            }
            resultLines.push(line);
        }
    }

    return resultLines.join('\n').trimEnd();
}

module.exports = {
    fetchCalendarData,
    filterEventsForMonth,
    formatEventsForDisplay
};
