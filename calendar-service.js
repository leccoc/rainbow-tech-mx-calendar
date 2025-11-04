const { fetchCalendarData, filterEventsForMonth, formatEventsForDisplay } = require('./ics-fetcher.js');
const { GoogleCalendarService } = require('./google-calendar-service.js');
const { generateCalendarImage } = require('./calendar-image-generator.js');
const path = require('path');

/**
 * Service class for managing calendar operations
 */
class CalendarService {
    constructor(config) {
        this.config = config;
        this.calendarType = config.calendarType || 'ics';
        
        if (this.calendarType === 'google') {
            this.googleCalendarService = new GoogleCalendarService(config.googleCalendar);
        } else {
            this.icsUrl = config.icsUrl;
        }
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
            // Fetch calendar data
            let monthlyEvents;
            if (this.calendarType === 'google') {
                // Fetch directly for the month from Google Calendar
                monthlyEvents = await this.googleCalendarService.fetchEventsForMonth(currentYear, currentMonth);
            } else {
                // Fetch from ICS and filter
                const calendarData = await this.fetchCalendarWithTimeout();
                monthlyEvents = filterEventsForMonth(calendarData.events, currentYear, currentMonth);
            }
            
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
     * Fetches calendar data with timeout (ICS only)
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

    /**
     * Gets current month's events as an array
     * @returns {Promise<Array>} Array of events for current month
     */
    async getCurrentMonthEvents() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        try {
            let monthlyEvents;
            if (this.calendarType === 'google') {
                monthlyEvents = await this.googleCalendarService.fetchEventsForMonth(currentYear, currentMonth);
            } else {
                const calendarData = await this.fetchCalendarWithTimeout();
                monthlyEvents = filterEventsForMonth(calendarData.events, currentYear, currentMonth);
            }
            return monthlyEvents || [];
        } catch (error) {
            console.error('Error fetching current month events:', error.message);
            return [];
        }
    }

    /**
     * Generates calendar image using p5.js
     * @returns {Promise<string|null>} Path to generated image or null if generation fails
     */
    async generateCalendarImage() {
        try {
            console.log('Getting current month events for image generation...');
            // Get current month events
            const monthlyEvents = await this.getCurrentMonthEvents();
            console.log(`Found ${monthlyEvents.length} events for current month`);
            
            // Generate image
            console.log('Calling generateCalendarImage function...');
            const imagePath = await generateCalendarImage(monthlyEvents, __dirname);
            console.log('generateCalendarImage returned:', imagePath);
            return imagePath;
        } catch (error) {
            console.error('❌ Error generating calendar image:', error.message);
            console.error('Stack trace:', error.stack);
            return null;
        }
    }
}

module.exports = { CalendarService };
