/**
 * core.js
 * Main application logic, state management, memory map definition, and initialization for the Rival App.
 */

const core = {
    // --- Application State ---
    currentState: {
        activePage: 'registrationPage', // Initial page
        isTagPresent: false,
        scannedTagInfo: { uid: null, sak: null, type: null, uidSize: null },
        currentUsername: null,
        currentAllegiance: null,
        selectedFaction: null, // Key like 'faction1', 'faction2', etc.
        selectedAllegiance: null, // Key like 'allegiance1', 'allegiance2', etc.
        isOperationInProgress: false,
        lastOperationStatus: 'idle', // 'idle', 'pending', 'success', 'error'
    },

    // --- Constants & Configuration ---
    NFC_KEY: "FFFFFFFFFFFF", // Standard key for operations - Ensure this matches the key in map.js if different
    RESERVED_SECTORS: new Set([0, 16, 32, 33, 34, 35]),
    SECTOR_DELAYS: {
        faction: 2900,
        allegiance: 2900,
        user: 600,
        default: 50
    },

    // --- MEMORY MAP is now defined externally in map.js as FIELD_MAP ---
    // MEMORY_MAP: { ... removed ... },

    /**
     * Initializes the core application logic.
     */
    init: function() {
        utils.log("Rival App Core Initializing...", 'info');

        // Check if FIELD_MAP from map.js is loaded
        if (typeof FIELD_MAP === 'undefined') {
            console.error("CRITICAL ERROR: FIELD_MAP is not defined. Ensure map.js is loaded before core.js.");
            utils.log("FIELD_MAP loading failed. Application might not function correctly.", 'error');
            // Optionally, display a user-facing error and halt further initialization
            // ui.showFatalError("Application configuration failed to load.");
            return; // Stop initialization if map is missing
        } else {
             // Optional: You could still run the validation from map.js here if desired
             // if (typeof validateFieldMap === 'function') {
             //     validateFieldMap(); // Run validation defined in map.js
             // } else {
             //     console.warn("validateFieldMap function not found. Skipping map validation.");
             // }
             utils.log("FIELD_MAP loaded successfully.", 'success');
        }

        // Attempt to initialize the UI module
        if (typeof ui !== 'undefined' && typeof ui.init === 'function') {
            try {
                ui.init(); // Initialize UI components and listeners
            } catch (error) {
                console.error("Error during UI initialization:", error);
                utils.log("UI Initialization failed.", 'error');
                // Handle UI init error gracefully if needed
            }
        } else {
            console.error("UI module (ui.js) not found or not initialized correctly!");
            utils.log("UI module loading failed. UI interactions might not work.", 'error');
            // Handle missing UI module case if needed
        }

        // Other core initializations (e.g., setting up uFR listeners if applicable)
        // ... setup uFR communication listeners ...

        utils.log("Core Initialization Complete.", 'success');
        // Trigger initial render if UI is available
        if (typeof ui !== 'undefined' && typeof ui.render === 'function') {
             ui.render();
        } else {
            utils.log("UI render skipped as UI module is unavailable.", 'warning');
        }
    },

    /**
     * Updates the application state and optionally triggers a UI re-render.
     * @param {object} newState - An object containing the state properties to update.
     * @param {boolean} [triggerRender=true] - Whether to call ui.render() after updating state.
     */
    updateState: function(newState, triggerRender = true) {
        const oldState = { ...this.currentState };
        this.currentState = { ...this.currentState, ...newState };
        utils.log("State updated:", 'debug', { old: oldState, new: this.currentState });

        if (triggerRender) {
            if (typeof ui !== 'undefined' && typeof ui.render === 'function') {
                ui.render();
            } else {
                 utils.log("UI render skipped during state update - UI module unavailable.", 'warning');
            }
        }
    },

    /**
     * Resets the state related to a scanned tag.
     */
    resetTagState: function() {
        this.updateState({
            isTagPresent: false,
            scannedTagInfo: { uid: null, sak: null, type: null, uidSize: null },
            currentUsername: null,
            currentAllegiance: null,
            selectedFaction: null, // Also clear selections when tag is gone
            selectedAllegiance: null,
            isOperationInProgress: false,
            lastOperationStatus: 'idle'
        });
         utils.log("Tag state reset.", 'info');
    },

    /**
     * Sets the operation status, optionally triggering a render.
     * @param {string} status - 'idle', 'pending', 'success', 'error'
     * @param {boolean} [triggerRender=true]
     */
    setOperationStatus: function(status, triggerRender = true) {
        utils.log(`Operation status set to: ${status}`, 'debug');
        this.updateState({ isOperationInProgress: status === 'pending', lastOperationStatus: status }, triggerRender);
    }

    // --- Removed validateMemoryMap function ---

};

// --- Initialization Trigger ---
// Ensure core.init runs after the DOM is fully loaded and all scripts are parsed
document.addEventListener('DOMContentLoaded', () => {
    utils.log("DOM fully loaded and parsed.", 'debug');
    utils.initLogger(); // Initialize logger after DOM is ready
    core.init();
});