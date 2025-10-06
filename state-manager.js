const fs = require('fs').promises;
const path = require('path');

/**
 * Manages bot state persistence with async file operations
 */
class StateManager {
    constructor(stateFilePath) {
        this.stateFilePath = stateFilePath;
        this.state = {
            currentPinnedMessageId: null,
            lastUpdated: null
        };
    }

    /**
     * Loads state from file asynchronously
     * @returns {Promise<Object>} Current state
     */
    async loadState() {
        try {
            const stateData = await fs.readFile(this.stateFilePath, 'utf8');
            this.state = JSON.parse(stateData);
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
            this.state.lastUpdated = new Date().toISOString();
            await fs.writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2));
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
}

module.exports = { StateManager };
