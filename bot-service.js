const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const { CalendarService } = require('./calendar-service.js');
const { StateManager } = require('./state-manager.js');

/**
 * Service class for managing Telegram bot operations
 */
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

    /**
     * Initializes the bot and loads state
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('Initializing bot...');
            
            // Load previous state
            await this.stateManager.loadState();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Start polling
            await this.bot.startPolling();
            
            this.isInitialized = true;
            console.log('Bot initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize bot:', error.message);
            throw error;
        }
    }

    /**
     * Sets up bot event handlers
     */
    setupEventHandlers() {
        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });

        this.bot.on('error', (error) => {
            console.error('Bot error:', error);
        });
    }

    /**
     * Updates the calendar message with proper error handling
     * @returns {Promise<void>}
     */
    /**
     * Updates the calendar message
     * @param {boolean} shouldDeletePrevious - Whether to delete the previous message (default: true)
     */
    async updateCalendarMessage(shouldDeletePrevious = true) {
        if (!this.isInitialized) {
            throw new Error('Bot not initialized');
        }

        try {
            console.log('Updating calendar message...');
            
            // Clean up previous message only if requested
            if (shouldDeletePrevious) {
                await this.cleanupPreviousMessage();
            }
            
            // Create and send new message
            const messageContent = await this.calendarService.createCalendarMessage();
            const newMessage = await this.bot.sendMessage(this.config.chatId, messageContent, {
                parse_mode: 'Markdown',
                message_thread_id: this.config.topicId
            });
            console.log('Sent calendar message');
            
            // Generate and send calendar image as separate message
            try {
                console.log('Starting calendar image generation...');
                const imagePath = await this.calendarService.generateCalendarImage();
                console.log('Image generation completed. Path:', imagePath);
                if (imagePath) {
                    console.log('Sending calendar image to Telegram...');
                    const imageMessage = await this.bot.sendPhoto(this.config.chatId, imagePath, {
                        message_thread_id: this.config.topicId
                    });
                    console.log('✅ Sent calendar image successfully');
                    // Store image message ID for cleanup
                    this.stateManager.setImageMessageId(imageMessage.message_id);
                } else {
                    console.warn('⚠️ Image generation returned null/undefined');
                }
            } catch (imageError) {
                console.error('❌ Failed to generate or send calendar image:', imageError.message);
                console.error('Stack trace:', imageError.stack);
                // Continue even if image generation fails
            }
            
            // Update state
            this.stateManager.setPinnedMessageId(newMessage.message_id);
            
            // Track current month (YYYY-MM format)
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            this.stateManager.setLastCheckedMonth(currentMonth);
            
            // Update the events hash
            const monthlyEvents = await this.calendarService.getCurrentMonthEvents();
            const currentHash = this.createEventsHash(monthlyEvents);
            this.stateManager.setLastEventsHash(currentHash);
            
            await this.stateManager.saveState();
            
        } catch (error) {
            console.error('Error updating calendar message:', error.message);
            throw error;
        }
    }

    /**
     * Creates a hash of events to detect changes
     * @param {Array} events - Array of calendar events
     * @returns {string} Hash of events
     */
    createEventsHash(events) {
        // Create a string representation of events for hashing
        const eventsString = events
            .map(event => {
                const startDate = event.startDate ? new Date(event.startDate).toISOString() : '';
                const endDate = event.endDate ? new Date(event.endDate).toISOString() : '';
                const summary = event.summary || '';
                return `${startDate}|${endDate}|${summary}`;
            })
            .sort()
            .join('||');
        
        return crypto.createHash('md5').update(eventsString).digest('hex');
    }

    /**
     * Checks if calendar events have changed and updates message if needed
     * @returns {Promise<boolean>} True if message was updated, false otherwise
     */
    async checkAndUpdateIfChanged() {
        if (!this.isInitialized) {
            return false;
        }

        try {
            // Get current month events
            const monthlyEvents = await this.calendarService.getCurrentMonthEvents();
            
            // Create hash of current events
            const currentHash = this.createEventsHash(monthlyEvents);
            const lastHash = this.stateManager.getLastEventsHash();
            
            // Check if events have changed
            if (currentHash === lastHash) {
                // No changes
                return false;
            }
            
            // Events have changed - check if it's a new month
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const lastCheckedMonth = this.stateManager.getLastCheckedMonth();
            
            // Determine if we should delete previous message
            // Delete previous only if same month, keep if new month
            const shouldDeletePrevious = (currentMonth === lastCheckedMonth);
            
            if (!shouldDeletePrevious) {
                console.log(`New month detected (${currentMonth}), keeping previous month's message`);
            } else {
                console.log(`Events changed in same month (${currentMonth}), updating message`);
            }
            
            // Update the message (this will also update the hash)
            await this.updateCalendarMessage(shouldDeletePrevious);
            
            return true;
        } catch (error) {
            console.error('Error checking and updating calendar:', error.message);
            return false;
        }
    }

    /**
     * Cleans up the previous message and image
     * @returns {Promise<void>}
     */
    async cleanupPreviousMessage() {
        const currentPinnedId = this.stateManager.getPinnedMessageId();
        const currentImageId = this.stateManager.getImageMessageId();
        
        // Delete the old text message
        if (currentPinnedId) {
            try {
                await this.bot.deleteMessage(this.config.chatId, currentPinnedId);
                console.log('Deleted previous text message');
            } catch (error) {
                // Silently ignore deletion errors (message might have been deleted manually)
            }
        }
        
        // Delete the old image message
        if (currentImageId) {
            try {
                await this.bot.deleteMessage(this.config.chatId, currentImageId);
                console.log('Deleted previous image message');
            } catch (error) {
                // Silently ignore deletion errors (message might have been deleted manually)
            }
        }
    }

    /**
     * Gracefully shuts down the bot
     * @returns {Promise<void>}
     */
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
