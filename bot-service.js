const TelegramBot = require('node-telegram-bot-api');
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
        this.calendarService = new CalendarService(config.icsUrl);
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
    async updateCalendarMessage() {
        if (!this.isInitialized) {
            throw new Error('Bot not initialized');
        }

        try {
            console.log('Updating calendar message...');
            
            // Clean up previous message
            await this.cleanupPreviousMessage();
            
            // Create and send new message
            const messageContent = await this.calendarService.createCalendarMessage();
            const newMessage = await this.bot.sendMessage(this.config.chatId, messageContent, {
                parse_mode: 'Markdown',
                message_thread_id: this.config.topicId
            });
            
            // Pin the new message
            await this.bot.pinChatMessage(this.config.chatId, newMessage.message_id);
            console.log('Pinned new calendar message');
            
            // Update state
            this.stateManager.setPinnedMessageId(newMessage.message_id);
            await this.stateManager.saveState();
            
        } catch (error) {
            console.error('Error updating calendar message:', error.message);
            throw error;
        }
    }

    /**
     * Cleans up the previous pinned message
     * @returns {Promise<void>}
     */
    async cleanupPreviousMessage() {
        const currentPinnedId = this.stateManager.getPinnedMessageId();
        
        if (!currentPinnedId) {
            console.log('No previous message to clean up');
            return;
        }

        try {
            // Unpin the current message
            await this.bot.unpinChatMessage(this.config.chatId, currentPinnedId);
            console.log('Unpinned previous message');
        } catch (error) {
            console.log('Could not unpin previous message:', error.message);
        }
        
        try {
            // Delete the old message
            await this.bot.deleteMessage(this.config.chatId, currentPinnedId);
            console.log('Deleted previous message');
        } catch (error) {
            console.log('Could not delete previous message:', error.message);
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
