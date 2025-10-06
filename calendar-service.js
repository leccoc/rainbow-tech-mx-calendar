const { fetchCalendarData, filterEventsForMonth, formatEventsForDisplay } = require('./ics-fetcher.js');

/**
 * Service class for managing calendar operations
 */
class CalendarService {
    constructor(icsUrl) {
        this.icsUrl = icsUrl;
    }

    /**
     * Creates a formatted calendar message for the current month
     * @returns {Promise<string>} Formatted calendar message
     */
    async createCalendarMessage() {
        const monthYear = this.getCurrentMonthYear();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        let message = `📅 **Calendario - ${monthYear}**\n\n`;
        
        try {
            // Fetch calendar data with timeout
            const calendarData = await this.fetchCalendarWithTimeout();
            
            // Filter events for current month
            const monthlyEvents = filterEventsForMonth(calendarData.events, currentYear, currentMonth);
            
            // Format events for display
            const eventsDisplay = formatEventsForDisplay(monthlyEvents);
            
            message += eventsDisplay;
            message += '\n';
            
        } catch (error) {
            console.error('Error creating calendar message:', error.message);
            // Don't throw error, just return message without events
            message += '📅 No se pudieron cargar eventos para este mes.\n\n';
        }
        
        return message;
    }

    /**
     * Fetches calendar data with timeout
     * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
     * @returns {Promise<Object>} Calendar data
     */
    async fetchCalendarWithTimeout(timeoutMs = 10000) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Calendar fetch timeout')), timeoutMs);
        });

        const fetchPromise = fetchCalendarData(this.icsUrl);
        
        return Promise.race([fetchPromise, timeoutPromise]);
    }

    /**
     * Gets current month and year in Spanish
     * @returns {string} Formatted month and year
     */
    getCurrentMonthYear() {
        const now = new Date();
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${months[now.getMonth()]} ${now.getFullYear()}`;
    }
}

module.exports = { CalendarService };
