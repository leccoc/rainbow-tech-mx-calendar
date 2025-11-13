const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const { CalendarService } = require('./calendar-service.js');
const { StateManager } = require('./state-manager.js');

class BotService {
    constructor(config) {
        this.config = config;
        this.bot = new TelegramBot(config.token, { 
            polling: {
                interval: 1000,
                autoStart: false
            }
        });
        this.calendarService = new CalendarService(config);
        this.stateManager = new StateManager(config.stateFile);
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('Initializing bot...');
            await this.stateManager.loadState();
            this.setupEventHandlers();
            await this.bot.startPolling();
            this.isInitialized = true;
            console.log('Bot initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize bot:', error.message);
            throw error;
        }
    }

    setupEventHandlers() {
        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });

        this.bot.on('error', (error) => {
            console.error('Bot error:', error);
        });
    }

    async updateCalendarMessage(shouldDeletePrevious = true, events = null) {
        if (!this.isInitialized) {
            throw new Error('Bot not initialized');
        }

        try {
            console.log('Updating calendar message...');
            if (shouldDeletePrevious) {
                await this.cleanupPreviousMessage();
            }

            const monthlyEvents = Array.isArray(events) ? events : await this.calendarService.getCurrentMonthEvents();
            const messageContent = await this.calendarService.createCalendarMessage(monthlyEvents);
            const imagePath = await this.calendarService.generateCalendarImage(monthlyEvents);

            let sentMessage;
            if (imagePath && messageContent.length <= 1024) {
                sentMessage = await this.bot.sendPhoto(this.config.chatId, imagePath, {
                    caption: messageContent,
                    parse_mode: 'Markdown',
                    message_thread_id: this.config.topicId
                });
            } else {
                if (messageContent.length > 4096) {
                    throw new Error('Calendar message exceeds Telegram message length limit');
                }
                sentMessage = await this.bot.sendMessage(this.config.chatId, messageContent, {
                    parse_mode: 'Markdown',
                    message_thread_id: this.config.topicId
                });
            }

            this.stateManager.setPinnedMessageId(sentMessage.message_id);

            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            this.stateManager.setLastCheckedMonth(currentMonth);

            const currentHash = this.createEventsHash(monthlyEvents);
            this.stateManager.setLastEventsHash(currentHash);

            await this.stateManager.saveState();
            
        } catch (error) {
            console.error('Error updating calendar message:', error.message);
            throw error;
        }
    }

    createEventsHash(events) {
        if (!Array.isArray(events) || events.length === 0) {
            return '';
        }

        const payload = events
            .map(event => {
                const startDate = event.startDate ? new Date(event.startDate).toISOString() : '';
                const endDate = event.endDate ? new Date(event.endDate).toISOString() : '';
                const summary = (event.summary || '').trim();
                const description = (event.description || '').trim();
                const location = (event.location || '').trim();
                return `${startDate}|${endDate}|${summary}|${description}|${location}`;
            })
            .sort()
            .join('||');

        return crypto.createHash('md5').update(payload).digest('hex');
    }

    async checkAndUpdateIfChanged() {
        if (!this.isInitialized) {
            return false;
        }

        try {
            const monthlyEvents = await this.calendarService.getCurrentMonthEvents();
            const currentHash = this.createEventsHash(monthlyEvents);
            const lastHash = this.stateManager.getLastEventsHash();

            if (currentHash === lastHash) {
                return false;
            }

            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const lastCheckedMonth = this.stateManager.getLastCheckedMonth();
            const shouldDeletePrevious = (currentMonth === lastCheckedMonth);

            await this.updateCalendarMessage(shouldDeletePrevious, monthlyEvents);
            
            return true;
        } catch (error) {
            console.error('Error checking and updating calendar:', error.message);
            return false;
        }
    }

    async cleanupPreviousMessage() {
        const pinnedId = this.stateManager.getPinnedMessageId();

        if (pinnedId) {
            try {
                await this.bot.deleteMessage(this.config.chatId, pinnedId);
            } catch (error) {
                // ignore
            }
        }

        this.stateManager.setPinnedMessageId(null);
    }

    async shutdown() {
        try {
            console.log('Shutting down bot...');
            await this.bot.stopPolling();
            console.log('Bot stopped successfully');
        } catch (error) {
            console.error('Error shutting down bot:', error.message);
        }
    }

}

module.exports = { BotService };
