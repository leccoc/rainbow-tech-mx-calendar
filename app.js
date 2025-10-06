const cron = require('node-cron');
const { loadConfig } = require('./config.js');
const { BotService } = require('./bot-service.js');

/**
 * Main application class
 */
class CalendarBotApp {
    constructor() {
        this.config = null;
        this.botService = null;
        this.cronJob = null;
    }

    /**
     * Starts the application
     * @returns {Promise<void>}
     */
    async start() {
        try {
            console.log('Starting Calendar Bot Application...');
            
            // Load and validate configuration
            this.config = loadConfig();
            console.log('Configuration loaded successfully');
            
            // Initialize bot service
            this.botService = new BotService(this.config);
            await this.botService.initialize();
            
            // Set up scheduled task
            this.setupScheduledTask();
            
            // Set up graceful shutdown handlers
            this.setupGracefulShutdown();
            
            // Initial calendar message update
            await this.botService.updateCalendarMessage();
            
            console.log('Calendar bot is running!');
            console.log(`Scheduled to update on: ${this.config.schedule}`);
            
        } catch (error) {
            console.error('Failed to start application:', error.message);
            process.exit(1);
        }
    }

    /**
     * Sets up the scheduled task for monthly updates
     */
    setupScheduledTask() {
        this.cronJob = cron.schedule(this.config.schedule, async () => {
            try {
                console.log('Monthly calendar update triggered');
                await this.botService.updateCalendarMessage();
            } catch (error) {
                console.error('Error in scheduled update:', error.message);
            }
        }, {
            scheduled: false // Don't start immediately
        });

        this.cronJob.start();
        console.log('Scheduled task configured');
    }

    /**
     * Sets up graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
            
            try {
                // Stop cron job
                if (this.cronJob) {
                    this.cronJob.stop();
                    console.log('Cron job stopped');
                }
                
                // Shutdown bot service
                if (this.botService) {
                    await this.botService.shutdown();
                }
                
                console.log('Graceful shutdown completed');
                process.exit(0);
                
            } catch (error) {
                console.error('Error during shutdown:', error.message);
                process.exit(1);
            }
        };

        // Handle different termination signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            shutdown('uncaughtException');
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            shutdown('unhandledRejection');
        });
    }
}

// Start the application
if (require.main === module) {
    const app = new CalendarBotApp();
    app.start().catch((error) => {
        console.error('Application failed to start:', error);
        process.exit(1);
    });
}

module.exports = { CalendarBotApp };
