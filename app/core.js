/**
 * @file core.js
 * @description Core Application Logic and State Management
 * 
 * This module serves as the central controller for the Neoband App, managing:
 * 1. Application state and UI synchronization
 * 2. NFC operation timing and coordination
 * 3. Error handling and recovery
 * 4. Cross-component communication
 * 
 * @version 3.0.4
 * @lastUpdated 2025-04-12
 */
/**
 * === Dependency Checks for core.js ===
 * These guards detect missing dependencies early to prevent uncaught ReferenceErrors.
 */

try {
    if (typeof utils === 'undefined') {
        console.error('CRITICAL: utils.js is not loaded before core.js');
    } else {
        utils.log('utils.js loaded successfully.', 'debug');
    }

    if (typeof FIELD_MAP === 'undefined') {
        console.error('CRITICAL: FIELD_MAP is not defined. map.js may be missing.');
        if (typeof utils !== 'undefined') utils.log('FIELD_MAP missing.', 'error');
    } else {
        if (typeof utils !== 'undefined') utils.log('FIELD_MAP loaded successfully.', 'debug');
    }

    if (typeof operations === 'undefined') {
        console.error('CRITICAL: operations.js is not loaded before core.js');
        if (typeof utils !== 'undefined') utils.log('operations.js missing.', 'error');
    } else {
        if (typeof utils !== 'undefined') utils.log('operations.js loaded successfully.', 'debug');
    }

    // The check for ui.js must be deferred until after all scripts are loaded.
    // This warning is expected at initial load and does not indicate an error.
    document.addEventListener('DOMContentLoaded', function () {
        if (typeof ui === 'undefined') {
            console.error('CRITICAL: ui.js is missing after DOMContentLoaded.');
            if (typeof utils !== 'undefined') utils.log('ui.js missing after DOMContentLoaded.', 'error');
        } else {
            if (typeof utils !== 'undefined') utils.log('ui.js loaded successfully.', 'debug');
        }
    });
} catch (e) {
    console.error('Error during dependency checks in core.js:', e);
}

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
        admin: {
            enableNfcSync: false,
            selectedFaction: null
        },
        faction: {
            enableNfcSync: false,
            selectedFaction: null
        },
        shared: {
            activePage: 'loginPage',
            isTagPresent: false,
            scannedTagInfo: { uid: null, sak: null, type: null, uidSize: null },
            currentUsername: null,
            currentAllegiance: null,
            isOperationInProgress: false,
            lastOperationStatus: 'idle'
        }
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
        core.currentState = {
            activePage: 'loginPage',
            scannedTagInfo: { uid: null },
            isTagPresent: false,
            isOperationInProgress: false,
            currentUsername: null,
            selectedFaction: null,
            admin: {
                enableNfcSync: false
            }
        };
        if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
            utils.log("Neoband App Core Initializing...", 'info');
        } else {
            console.log("Neoband App Core Initializing...");
        }
        // Check if FIELD_MAP from map.js is loaded
        if (typeof FIELD_MAP === 'undefined') {
            console.error("CRITICAL ERROR: FIELD_MAP is not defined. Ensure map.js is loaded before core.js.");
            if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
                utils.log("FIELD_MAP loading failed. Application might not function correctly.", 'error');
            }
            // Optionally, display a user-facing error and halt further initialization
            // ui.showFatalError("Application configuration failed to load.");
            return; // Stop initialization if map is missing
        } else {
             if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
                 utils.log("FIELD_MAP loaded successfully.", 'success');
             }
        }

        // --- Check for neoband-sdk presence and functions ---
        try {
            if (
                typeof NeobandSDK === 'undefined' ||
                typeof NeobandSDK.readSectorBlock !== 'function' ||
                typeof NeobandSDK.writeSectorBlock !== 'function'
            ) {
                if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
                    utils.log('neoband-sdk functions missing. NFC will be disabled.', 'error');
                } else {
                    console.error('neoband-sdk functions missing. NFC will be disabled.');
                }
                if (typeof ui !== 'undefined' && typeof ui.disableNfcButtons === 'function') {
                    ui.disableNfcButtons();
                }
                alert('neoband-sdk is missing or not loaded. NFC functionality will be disabled.');
                return;
            }
        } catch (sdkCheckError) {
            console.error('Error during neoband-sdk presence check:', sdkCheckError);
            if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
                utils.log('Error during neoband-sdk presence check: ' + sdkCheckError.message, 'error');
            }
            // Disable NFC buttons as a precaution
            if (typeof ui !== 'undefined' && typeof ui.disableNfcButtons === 'function') {
                ui.disableNfcButtons();
            }
            alert('An error occurred while checking for neoband-sdk. NFC functionality will be disabled.');
            return;
        }

        // Attempt to initialize the UI module
        if (typeof ui !== 'undefined' && typeof ui.init === 'function') {
            try {
                ui.init(); // Initialize UI components and listeners
            } catch (error) {
                console.error('Error initializing UI:', error);
                if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
                    utils.log('Error initializing UI: ' + error.message, 'error');
                }
            }
        } else {
            console.warn('ui.js is not loaded or ui.init is not a function.');
            if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
                utils.log('ui.js is not loaded or ui.init is not a function.', 'warning');
            }
        }

        // Trigger initial render if UI is available
        if (typeof ui !== 'undefined' && typeof ui.render === 'function') {
             ui.render();
        } else {
            utils.log("UI render skipped as UI module is unavailable.", 'warning');
        }

        // --- Initialize server sync at app start ---
        // if (typeof operations !== 'undefined' && typeof operations.syncFaction1DataToServer === 'function') {
        //     utils.log('[Startup] Initializing server sync at app start (no tag present, placeholder UID)...', 'info');
        //     // Use null or empty string as UID since no tag is present yet
        //     operations.syncFaction1DataToServer(''); // TODO: NFC sync disabled
        // }
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
        const oldState = { ...core.currentState };
        core.currentState = { ...core.currentState, ...newState };
        utils.log("State updated:", 'debug', { old: oldState, new: core.currentState });

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
    if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
        utils.log("DOM fully loaded and parsed.", 'debug');
    } else {
        console.warn('utils.log is not available.');
    }

    if (typeof utils !== 'undefined' && typeof utils.initLogger === 'function') {
        utils.initLogger(); // Initialize logger after DOM is ready
    } else {
        console.warn('utils.initLogger is not available.');
    }

    try {
        core.init();
    } catch (error) {
        console.error('Error during core.init():', error);
        if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
            utils.log(`Error during core.init(): ${error.message}`, 'error');
        }
    }
});

// NOTE: Server sync operations (e.g., triggered after tag scan or data update)
// use operations.syncFaction1DataToServer, which sends data to the backend server
// using the dynamic server IP set in the Admin page (stored in localStorage).
// See admin.js and operations.js for configuration and logging details.