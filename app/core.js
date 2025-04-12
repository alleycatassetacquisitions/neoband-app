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
 * Key Features:
 * - Centralized state management
 * - Controlled UI updates
 * - NFC operation coordination
 * - Error handling and recovery
 * - Logging and debugging
 * 
 * State Management:
 * The application uses a centralized state object (currentState) that tracks:
 * - Active page and UI state
 * - NFC tag presence and data
 * - Operation status and progress
 * - User selections and inputs
 * 
 * NFC Operation Timing:
 * Critical timing requirements for stable NFC operations:
 * - Sector 1 (Factions): 2900ms delay
 * - Sectors 36-38 (Allegiances): 2900ms delay
 * - Sector 39 (User data): 600ms delay
 * - Fresh authentication required for each block
 * 
 * Error Handling Strategy:
 * 1. Preserve UI state on errors
 * 2. Provide clear user feedback
 * 3. Log detailed debug information
 * 4. Implement automatic recovery where possible
 * 
 * @version 3.0.3
 * @lastUpdated 2025-04-11
 */
/**
 * === Dependency Checks for core.js ===
 * These guards detect missing dependencies early to prevent uncaught ReferenceErrors.
 * Original logic preserved below as comments.
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

    /*
    if (typeof BlockInSectorRead !== 'function') {
        console.error('D-Logic SDK function BlockInSectorRead is missing.');
        if (typeof utils !== 'undefined') utils.log('D-Logic SDK BlockInSectorRead missing.', 'error');
    }
    if (typeof BlockInSectorWrite !== 'function') {
        console.error('D-Logic SDK function BlockInSectorWrite is missing.');
        if (typeof utils !== 'undefined') utils.log('D-Logic SDK BlockInSectorWrite missing.', 'error');
    }
    if (typeof ufRequest !== 'function') {
        console.error('D-Logic SDK function ufRequest is missing.');
        if (typeof utils !== 'undefined') utils.log('D-Logic SDK ufRequest missing.', 'error');
    }
    if (typeof ufResponse !== 'function') {
        console.error('D-Logic SDK function ufResponse is missing.');
        if (typeof utils !== 'undefined') utils.log('D-Logic SDK ufResponse missing.', 'error');
    }
    */
} catch (e) {
    console.error('Error during dependency checks in core.js:', e);
}

const core = {
    // --- Application State ---
    /**
     * Current application state object containing all runtime state variables.
     * This centralized state management approach enables consistent UI updates.
     * 
     * @property {Object} currentState - Global application state
     * @property {string} currentState.activePage - Current active page ID
     * @property {boolean} currentState.isTagPresent - NFC tag detection status
     * @property {Object} currentState.scannedTagInfo - Detailed tag information
     * @property {string} currentState.currentUsername - Current tag's username
     * @property {string} currentState.currentAllegiance - Current tag's allegiance
     * @property {string} currentState.selectedFaction - Selected faction key
     * @property {string} currentState.selectedAllegiance - Selected allegiance key
     * @property {boolean} currentState.isOperationInProgress - Operation status flag
     * @property {string} currentState.lastOperationStatus - Last operation result
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
        if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
            utils.log("Rival App Core Initializing...", 'info');
        } else {
            console.log("Rival App Core Initializing...");
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
             // Optional: You could still run the validation from map.js here if desired
             // if (typeof validateFieldMap === 'function') {
             //     validateFieldMap(); // Run validation defined in map.js
             // } else {
             //     console.warn("validateFieldMap function not found. Skipping map validation.");
             // }
             if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
                 utils.log("FIELD_MAP loaded successfully.", 'success');
             }
        }
// --- Original D-Logic/uFR SDK presence check preserved as backup ---
/*
// Check if D-Logic SDK NFC functions are loaded
try {
    // Defensive SDK presence check with detailed comments and error handling
    if (typeof BlockInSectorRead !== 'function' || typeof BlockInSectorWrite !== 'function') {
        if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
            utils.log('D-Logic SDK functions missing. NFC will be disabled.', 'error');
        } else {
            console.error('D-Logic SDK functions missing. NFC will be disabled.');
        }
        if (typeof ui !== 'undefined' && typeof ui.disableNfcButtons === 'function') {
            ui.disableNfcButtons();
        }
        alert('D-Logic SDK is missing or not loaded. NFC functionality will be disabled.');
        return;
    }
} catch (sdkCheckError) {
    console.error('Error during SDK presence check:', sdkCheckError);
    if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
        utils.log('Error during SDK presence check: ' + sdkCheckError.message, 'error');
    }
    // Disable NFC buttons as a precaution
    if (typeof ui !== 'undefined' && typeof ui.disableNfcButtons === 'function') {
        ui.disableNfcButtons();
    }
    alert('An error occurred while checking for the D-Logic SDK. NFC functionality will be disabled.');
    return;
}
*/
// --- New: Check for neoband-sdk presence and functions ---
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
                console.error("Error during UI initialization:", error);
                utils.log("UI Initialization failed.", 'error');
                // Handle UI init error gracefully if needed
            }
        } else {
            console.error("UI module (ui.js) not found or not initialized correctly!");
            utils.log("UI module loading failed. UI interactions might not work.", 'error');
            // Handle missing UI module case if needed

        // --- Original D-Logic NFC API check preserved as backup ---
        /*
        // Check if D-Logic NFC API is available
        if (typeof window.dlogic === 'undefined') {
            console.error("D-Logic NFC API (dlogic) is not available.");
            utils.log("D-Logic NFC API (dlogic) is not available. Please ensure the D-Logic browser extension or app shell is installed and enabled.", 'error');
            alert("D-Logic NFC API is not available. Please ensure the D-Logic browser extension or app shell is installed and enabled.");
            if (typeof ui !== 'undefined' && typeof ui.disableNfcButtons === 'function') {
                ui.disableNfcButtons();
            }
            // Skip any NFC initialization here if needed
        } else {
            utils.log("D-Logic NFC API detected successfully.", 'success');
        }
        */
        // No browser extension or external SDK required; all NFC handled by neoband-sdk.
        // If neoband-sdk is present, NFC is enabled. Otherwise, NFC is disabled above.
        }

        // Other core initializations (e.g., setting up uFR listeners if applicable)
        // ... setup uFR communication listeners ...

        if (typeof utils !== 'undefined' && typeof utils.log === 'function') {
            utils.log("Core Initialization Complete.", 'success');
        }
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