const fs = require('fs').promises;
/**
 * Manages bot state persistence with async file operations
 */
class StateManager {
    constructor(stateFilePath) {
        this.stateFilePath = stateFilePath;
        this.state = {
            currentPinnedMessageId: null,
            lastUpdated: null,
            lastCheckedMonth: null,
            lastEventsHash: null
        };
    }

    /**
     * Loads state from file asynchronously
     * @returns {Promise<Object>} Current state
     */
    async loadState() {
        try {
            const stateData = await fs.readFile(this.stateFilePath, 'utf8');
            const parsed = JSON.parse(stateData);
            this.state = {
                currentPinnedMessageId: parsed.currentPinnedMessageId ?? null,
                lastUpdated: parsed.lastUpdated ?? null,
                lastCheckedMonth: parsed.lastCheckedMonth ?? null,
                lastEventsHash: parsed.lastEventsHash ?? null
            };
            console.log('Bot state loaded from file');
            return this.state;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No existing state file found, starting fresh');
                return this.state;
            }
            console.error('Error loading bot state:', error.message);
            throw new Error(`Failed to load state: ${error.message}`);
        }
    }

    /**
     * Saves state to file asynchronously
     * @returns {Promise<void>}
     */
    async saveState() {
        try {
            const nextState = {
                ...this.state,
                lastUpdated: new Date().toISOString()
            };
            this.state = nextState;
            await fs.writeFile(this.stateFilePath, JSON.stringify(nextState, null, 2));
            console.log('Bot state saved to file');
        } catch (error) {
            console.error('Error saving bot state:', error.message);
            throw new Error(`Failed to save state: ${error.message}`);
        }
    }

    /**
     * Updates the pinned message ID
     * @param {number} messageId - The message ID to store
     */
    setPinnedMessageId(messageId) {
        this.state.currentPinnedMessageId = messageId;
    }

    /**
     * Gets the current pinned message ID
     * @returns {number|null} Current pinned message ID
     */
    getPinnedMessageId() {
        return this.state.currentPinnedMessageId;
    }

    /**
     * Clears the pinned message ID
     */
    clearPinnedMessageId() {
        this.state.currentPinnedMessageId = null;
    }

    /**
     * Gets the last checked month (YYYY-MM format)
     * @returns {string|null} Last checked month
     */
    getLastCheckedMonth() {
        return this.state.lastCheckedMonth;
    }

    /**
     * Sets the last checked month
     * @param {string} month - Month in YYYY-MM format
     */
    setLastCheckedMonth(month) {
        this.state.lastCheckedMonth = month;
    }

    /**
     * Gets the last events hash
     * @returns {string|null} Last events hash
     */
    getLastEventsHash() {
        return this.state.lastEventsHash;
    }

    /**
     * Sets the last events hash
     * @param {string} hash - Events hash
     */
    setLastEventsHash(hash) {
        this.state.lastEventsHash = hash;
    }
}

module.exports = { StateManager };

