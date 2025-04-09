/**
 * core.js
 * Main application logic, state management, memory map definition, and initialization for the Neoband App.
 * 
 * This file provides the central functionality for the Neoband App, including:
 * - Application state management and initialization
 * - Constants and configuration for NFC operations
 * - Interface with memory map defined in map.js
 * - Tag state tracking and management
 * - Operation status tracking
 */

const core = {
    // --- Application State ---
    /**
     * Current application state object containing all runtime state variables.
     * This centralized state management approach enables consistent UI updates.
     * 
     * @property {string} activePage - Current active page ID in the UI
     * @property {boolean} isTagPresent - Flag indicating if an NFC tag is currently detected
     * @property {Object} scannedTagInfo - Information about the currently scanned tag
     * @property {string|null} scannedTagInfo.uid - Unique identifier of the scanned tag
     * @property {string|null} scannedTagInfo.sak - Select Acknowledge (SAK) value from tag
     * @property {string|null} scannedTagInfo.type - NFC tag type identification
     * @property {number|null} scannedTagInfo.uidSize - Size of the tag's UID in bytes
     * @property {string|null} currentUsername - Username read from the currently scanned tag
     * @property {string|null} currentAllegiance - Allegiance read from the currently scanned tag
     * @property {string|null} selectedFaction - Selected faction key (e.g., 'faction1')
     * @property {string|null} selectedAllegiance - Selected allegiance key (e.g., 'allegiance1')
     * @property {boolean} isOperationInProgress - Flag indicating if an NFC operation is running
     * @property {string} lastOperationStatus - Status of last operation ('idle'|'pending'|'success'|'error')
     */
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
    /**
     * Default authentication key for MIFARE Classic 4K operations.
     * This is the standard factory key (FF FF FF FF FF FF) used for sectors that have not been secured.
     * IMPORTANT: This key should match the key defined in map.js for consistency across operations.
     */
    NFC_KEY: "FFFFFFFFFFFF", // Standard key for operations - Ensure this matches the key in map.js if different
    
    /**
     * Set of reserved sectors that should not be used for general data storage.
     * These sectors are used by the system or reserved for special purposes:
     * - Sector 0: Contains manufacturer data and card identification
     * - Sector 16: Reserved for the MIFARE Application Directory (MAD)
     * - Sectors 32-35: Reserved for system use in this application
     */
    RESERVED_SECTORS: new Set([0, 16, 32, 33, 34, 35]),
    
    /**
     * Delay times (in milliseconds) for various NFC operations.
     * These delays help ensure proper operation with the uFR reader by:
     * - Allowing the reader to recover between operations
     * - Preventing command conflicts when operations are executed in sequence
     * - Ensuring proper authentication and data transfer for different data types
     * 
     * @property {number} faction - Delay for faction-related operations (2900ms)
     * @property {number} allegiance - Delay for allegiance-related operations (2900ms)
     * @property {number} user - Delay for user data operations (600ms)
     * @property {number} default - Default delay for other operations (50ms)
     */
    SECTOR_DELAYS: {
        faction: 2900,
        allegiance: 4000,
        user: 1200,
        default: 100
    },

    // --- MEMORY MAP is now defined externally in map.js as FIELD_MAP ---
    // MEMORY_MAP: { ... removed ... },

    /**
     * Initializes the core application logic.
     * This function is called when the DOM is fully loaded and:
     * 1. Verifies that the FIELD_MAP from map.js is properly loaded
     * 2. Initializes the UI module if available
     * 3. Sets up any necessary event listeners or configurations
     * 4. Completes initialization with appropriate logging
     * 
     * @throws {Error} Implicitly if the required modules or configurations are missing
     * @returns {void}
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
     * This is the primary method for modifying application state to ensure consistency.
     * 
     * @param {object} newState - An object containing the state properties to update.
     * @param {boolean} [triggerRender=true] - Whether to call ui.render() after updating state.
     * @returns {void}
     * 
     * @example
     * // Update just one property
     * core.updateState({ selectedFaction: 'faction1' });
     * 
     * @example
     * // Update multiple properties without triggering render
     * core.updateState({
     *   isTagPresent: true,
     *   scannedTagInfo: { uid: '04A2B3C4' }
     * }, false);
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
     * Called when a tag is removed or when starting fresh for a new tag.
     * This method clears all tag-specific information and UI selections.
     * 
     * @returns {void}
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
     * This provides a standardized way to update the operation status throughout the app,
     * which affects button states, visual indicators, and error handling.
     * 
     * @param {string} status - Operation status: 'idle'|'pending'|'success'|'error'
     * @param {boolean} [triggerRender=true] - Whether to trigger UI update after status change
     * @returns {void}
     * 
     * @example
     * // Set status to pending (e.g., at the start of an async operation)
     * core.setOperationStatus('pending');
     * 
     * @example
     * // Set status to success or error based on operation result
     * try {
     *   // ... perform NFC operation ...
     *   core.setOperationStatus('success');
     * } catch (error) {
     *   core.setOperationStatus('error');
     * }
     */
    setOperationStatus: function(status, triggerRender = true) {
        utils.log(`Operation status set to: ${status}`, 'debug');
        this.updateState({ isOperationInProgress: status === 'pending', lastOperationStatus: status }, triggerRender);
    }

    // --- Removed validateMemoryMap function ---

};

// --- Initialization Trigger ---
/**
 * Event listener for DOMContentLoaded event.
 * This ensures the core application is initialized only after the DOM is fully loaded and all scripts are parsed.
 * The sequence is:
 * 1. DOM fully loaded event fires
 * 2. Logger is initialized (for capturing early events)
 * 3. Core init() is called, which then initializes UI and other components
 */
document.addEventListener('DOMContentLoaded', () => {
    utils.log("DOM fully loaded and parsed.", 'debug');
    utils.initLogger(); // Initialize logger after DOM is ready
    core.init();
});