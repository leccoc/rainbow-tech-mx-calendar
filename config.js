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
        'TELEGRAM_TOPIC_ID',
        'ICS_CALENDAR_URL'
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

    // Validate ICS URL format
    const icsUrl = process.env.ICS_CALENDAR_URL;
    if (!icsUrl.startsWith('http')) {
        throw new Error('ICS_CALENDAR_URL must be a valid HTTP/HTTPS URL');
    }

    return {
        token: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_GROUP_ID,
        topicId: process.env.TELEGRAM_TOPIC_ID,
        icsUrl: process.env.ICS_CALENDAR_URL,
        schedule: process.env.CALENDAR_SCHEDULE || '0 9 1 * *',
        stateFile: path.join(__dirname, 'bot-state.json')
    };
}

module.exports = { loadConfig };
