const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const config = require('./config.example.js');
const { fetchCalendarData, filterEventsForMonth, formatEventsForDisplay } = require('./ics-fetcher.js');

// Initialize the bot
const bot = new TelegramBot(config.token, { polling: true });

// File path for storing bot state
const STATE_FILE = path.join(__dirname, 'bot-state.json');

// Store the current pinned message ID
let currentPinnedMessageId = null;

// Function to load bot state from file
function loadBotState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const stateData = fs.readFileSync(STATE_FILE, 'utf8');
            const state = JSON.parse(stateData);
            currentPinnedMessageId = state.currentPinnedMessageId || null;
            console.log('Bot state loaded from file');
            return state;
        }
    } catch (error) {
        console.error('Error loading bot state:', error.message);
    }
    return { currentPinnedMessageId: null };
}

// Function to save bot state to file
function saveBotState() {
    try {
        const state = {
            currentPinnedMessageId: currentPinnedMessageId,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        console.log('Bot state saved to file');
    } catch (error) {
        console.error('Error saving bot state:', error.message);
    }
}

// Function to get current month and year
function getCurrentMonthYear() {
    const now = new Date();
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// Function to create calendar message content
async function createCalendarMessage() {
    const monthYear = getCurrentMonthYear();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let message = `📅 **Calendario - ${monthYear}**\n\n`;
    
    try {
        // Fetch calendar data
        const calendarData = await fetchCalendarData(config.icsUrl);
        
        // Filter events for current month
        const monthlyEvents = filterEventsForMonth(calendarData.events, currentYear, currentMonth);
        
        // Format events for display
        const eventsDisplay = formatEventsForDisplay(monthlyEvents);
        
        message += eventsDisplay;
        message += '\n';

    } catch (error) {
        console.error('Error creating calendar message:', error.message);
    }
    
    return message;
}

// Function to update the calendar message
async function updateCalendarMessage() {
    try {
        console.log('Updating calendar message...');
        
        // Unpin the current message if it exists
        if (currentPinnedMessageId) {
            try {
                await bot.unpinChatMessage(config.chatId, currentPinnedMessageId);
                console.log('Unpinned previous message');
            } catch (error) {
                console.log('Could not unpin previous message:', error.message);
            }
            
            // Delete the old message
            try {
                await bot.deleteMessage(config.chatId, currentPinnedMessageId);
                console.log('Deleted previous message');
            } catch (error) {
                console.log('Could not delete previous message:', error.message);
            }
        }
        
        // Create and send new message
        const messageContent = await createCalendarMessage();
        const newMessage = await bot.sendMessage(config.chatId, messageContent, {
            parse_mode: 'Markdown',
            message_thread_id: config.topicId
        });
        
        // Pin the new message
        await bot.pinChatMessage(config.chatId, newMessage.message_id);
        console.log('Pinned new calendar message');
        
        // Store the new message ID and save to file
        currentPinnedMessageId = newMessage.message_id;
        saveBotState();
        
    } catch (error) {
        console.error('Error updating calendar message:', error.message);
    }
}

// Schedule the monthly update (runs on the 1st of every month at 9:00 AM)
cron.schedule('0 9 1 * *', () => {
    console.log('Monthly calendar update triggered');
    updateCalendarMessage();
});

// Bot event handlers
bot.on('message', (msg) => {
    console.log('Received message:', msg.text);
});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

// Initialize the calendar message when bot starts
console.log('Bot started! Loading previous state...');
loadBotState();
console.log('Initializing calendar message...');
updateCalendarMessage();

console.log('Calendar bot is running!');
console.log('The bot will automatically update the calendar message on the 1st of every month at 9:00 AM.');
