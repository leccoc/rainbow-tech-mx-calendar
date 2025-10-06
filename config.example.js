// Configuration for the Telegram Calendar Bot
// Values are loaded from environment variables

module.exports = {
    // Your bot token from @BotFather
    token: process.env.TELEGRAM_BOT_TOKEN,
    
    // Your Telegram group ID (can be found by adding @userinfobot to your group)
    chatId: process.env.TELEGRAM_GROUP_ID,
    
    // The topic ID where calendar messages will be posted
    // This is the thread ID for the specific topic in your group
    topicId: process.env.TELEGRAM_TOPIC_ID,
    
    // Schedule for monthly updates (cron format)
    // Default: '0 9 1 * *' (1st of every month at 9:00 AM)
    schedule: process.env.CALENDAR_SCHEDULE || '0 9 1 * *',
    
    // ICS Calendar URL for fetching events
    icsUrl: process.env.ICS_CALENDAR_URL
};
