const { fetchCalendarData, filterEventsForMonth, formatEventsForDisplay } = require('./ics-fetcher.js');
const { GoogleCalendarService } = require('./google-calendar-service.js');
const { generateCalendarImage: renderCalendarImage } = require('./calendar-image-generator.js');

class CalendarService {
    constructor(config) {
        this.config = config;
        this.calendarType = config.calendarType || 'ics';
        this.calendarLink = config.calendarLink;
        
        if (this.calendarType === 'google') {
            this.googleCalendarService = new GoogleCalendarService(config.googleCalendar);
        } else {
            this.icsUrl = config.icsUrl;
        }
    }

    async createCalendarMessage(events) {
        const monthEvents = Array.isArray(events) ? events : await this.getCurrentMonthEvents();
        const monthYear = this.getCurrentMonthYear();
        const calendarLink = this.calendarLink || 'https://calendar.google.com/calendar/u/1?cid=cmFpbmJvd3RlY2gubXhAZ21haWwuY29t';
        const header = `👉 **[Calendario - ${monthYear}](${calendarLink})**`;

        if (!monthEvents || monthEvents.length === 0) {
            return `${header}\n\nNo hay eventos programados para este mes.`.trim();
        }

        const headerLength = header.length + 2; // include spacing for "\n\n"
        const maxCaptionLength = 1024 - headerLength;
        const body = formatEventsForDisplay(monthEvents, { maxLength: Math.max(maxCaptionLength, 0) });
        const message = `${header}\n\n${body}`.trim();

        if (message.length <= 1024) {
            return message;
        }

        const adjustedBody = formatEventsForDisplay(monthEvents, { maxLength: Math.max(maxCaptionLength - 50, 0) });
        return `${header}\n\n${adjustedBody}`.trim().slice(0, 1024);
    }

    async fetchCalendarWithTimeout(timeoutMs = 10000) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Calendar fetch timeout')), timeoutMs);
        });

        const fetchPromise = fetchCalendarData(this.icsUrl);
        
        return Promise.race([fetchPromise, timeoutPromise]);
    }

    getCurrentMonthYear() {
        const now = new Date();
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${months[now.getMonth()]} ${now.getFullYear()}`;
    }

    async getCurrentMonthEvents() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        try {
            let monthlyEvents = [];
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

    async generateCalendarImage(events) {
        try {
            const monthEvents = Array.isArray(events) ? events : await this.getCurrentMonthEvents();
            if (!monthEvents || monthEvents.length === 0) {
                return null;
            }

            return await renderCalendarImage(monthEvents, __dirname);
        } catch (error) {
            console.error('Error generating calendar image:', error.message);
            return null;
        }
    }
}

module.exports = { CalendarService };

