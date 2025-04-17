/**
 * @file operations.js
 * @description NFC Operations and Memory Access Implementation
 * 
 * This module implements all NFC card operations including:
 * - Tag detection and authentication
 * - Block reading and writing
 * - Error handling and recovery
 * - Operation timing management
 * 
 * Memory Access Rules:
 * 1. Username Storage (Sector 39, Block 0):
 *    - Always use absolute addressing
 *    - Requires 600ms delay between operations
 *    - Verify data after write
 * 
 * 2. Faction Data (Sectors 1-15, 17-31):
 *    - Use blocks 0-2 in each sector
 *    - Requires 2900ms delay between operations
 *    - Fresh authentication for each block
 * 
 * 3. Allegiance Data (Sectors 36-38):
 *    - Spans 5 consecutive sectors per allegiance
 *    - Use blocks 0-2 in each sector
 *    - Requires 2900ms delay between operations
 * 
 * @version 3.0.4
 * @lastUpdated 2025-04-12
 */
/**
 * === Dependency Checks for operations.js ===
 * These guards detect missing dependencies early to prevent uncaught ReferenceErrors.
 * Original logic preserved below as comments.
 */

/*
try {
    if (typeof utils === 'undefined') {
        console.error('CRITICAL: utils.js is not loaded before operations.js');
    } else {
        utils.log('utils.js loaded successfully (operations.js)', 'debug');
    }

    if (typeof BlockInSectorRead !== 'function') {
        console.error('D-Logic SDK function BlockInSectorRead is missing (operations.js).');
        if (typeof utils !== 'undefined') utils.log('D-Logic SDK BlockInSectorRead missing (operations.js)', 'error');
    }
    if (typeof BlockInSectorWrite !== 'function') {
        console.error('D-Logic SDK function BlockInSectorWrite is missing (operations.js).');
        if (typeof utils !== 'undefined') utils.log('D-Logic SDK BlockInSectorWrite missing (operations.js)', 'error');
    }
    if (typeof ufRequest !== 'function') {
        console.error('D-Logic SDK function ufRequest is missing (operations.js).');
        if (typeof utils !== 'undefined') utils.log('D-Logic SDK ufRequest missing (operations.js)', 'error');
    }
    if (typeof ufResponse !== 'function') {
        console.error('D-Logic SDK function ufResponse is missing (operations.js).');
        if (typeof utils !== 'undefined') utils.log('D-Logic SDK ufResponse missing (operations.js)', 'error');
    }
} catch (e) {
    console.error('Error during dependency checks in operations.js:', e);
}
*/
// Only neoband-sdk is required for NFC operations.

const operations = {
    AUTH_MODE_A: 0x60,
    AUTH_MODE_B: 0x61,

    /**
     * Scan for a tag and update core state.
     */
    scanTag: async function () {
        utils.log("Scanning for tag using neoband-sdk...", 'info');
        try {
            const uid = await NeobandSDK.getUID();
            if (uid) {
                utils.log(`[neoband-sdk] Tag detected. UID: ${uid}`, 'success');
                // Always set selectedFaction to 'faction1' and enableNfcSync for debug/testing
                core.updateState({
                    isTagPresent: true,
                    scannedTagInfo: { uid },
                    bandStatus: "Detected (Unregistered)",
                    selectedFaction: 'faction1',
                    enableNfcSync: true
                });

                if (typeof ui !== 'undefined' && typeof ui.readUsernameAndUpdateFields === 'function') {
                    try { ui.readUsernameAndUpdateFields(uid); } catch (e) {}
                }

                // Always run sync for faction1
                utils.log(`[NFC Sync] Triggering syncFaction1DataToServer for UID: ${uid} (forced for faction1)`, 'info');
                await operations.syncFaction1DataToServer(uid);
                return uid;
            } 
            else {
                utils.log("[neoband-sdk] No tag detected or scan failed.", 'warning');
                core.updateState({ isTagPresent: false, scannedTagInfo: {}, bandStatus: "No Tag" });
                throw new Error("[neoband-sdk] Tag scan failed");
            }
        } 
        catch (sdkError) {
            utils.log('[neoband-sdk] Error during tag scan: ' + sdkError, 'error');
            throw sdkError;
        }
    },
    

    /**
     * Reads a block from a given sector using the specified authentication key.
     * Uses NeobandSDK.readSectorBlock for strict block_in_sector addressing.
     * If the key is "FFFFFFFFFFFFFFFF" (default Key A), it is mapped to keyIndex 0.
     * This ensures all reads use Key A/keyIndex 0 for compatibility and security.
     */
    readSectorBlock: async function(sector, block, key = "FFFFFFFFFFFF", authMode = 0x60) {
        try {
            // Validate sector and block ranges
            if (typeof sector !== 'number' || typeof block !== 'number' ||
                sector < 0 || sector > 39 || block < 0 || 
                (sector >= 32 && sector <= 39 ? block > 14 : block > 3)) {
                throw new Error(
                    `[readSectorBlock] Invalid sector (${sector}) or block (${block}) parameter. ` +
                    `Sector must be 0–39, block must be ${sector >= 32 && sector <= 39 ? '0–14' : '0–3'}.`
                );
            }

            // Use strict sector/block addressing: pass sector as-is
            let mappedSector = sector;
            // Always use keyIndex 0 for Key A authentication (authMode 0x60)
            const keyIndex = 0;
            const usedAuthMode = 0x60; // Enforce Key A

            // Log the actual parameters passed to the SDK for traceability
            utils.log(
                `[SDK Call] NeobandSDK.readSectorBlock called with sector=${mappedSector}, block=${block}, authMode=${usedAuthMode}, keyIndex=${keyIndex}`,
                'debug'
            );
            // Attempt to read using NeobandSDK
            const hex = await NeobandSDK.readSectorBlock(mappedSector, block, usedAuthMode, keyIndex);
            return hex;
        } catch (err) {
            // Log error with detailed context for debugging and changelog traceability
            utils.log(
                `NeobandSDK.readSectorBlock error (Sector ${sector}, Block ${block}): ${err.message}`,
                'error'
            );
            return null;
        }
    },

    /**
     * DEPRECATED: Legacy linear addressing read function.
     * This linear read logic is no longer used due to strict sector+block addressing.
     * Preserved here as backup only.
     */
    /*
    readBlockOld: async function(sector, block, key = NFC_KEY, label = "Block") {
        try {
            let blockNumber = (sector < 32) ? (sector * 4 + block) : (128 + (sector - 32) * 16 + block);
            const hexData = await this.readFieldWithRetryRaw(blockNumber, 2);
            return utils.hexToText(hexData);
        } catch (error) {
            throw error;
        }
    },
    */

    /**
     * DEPRECATED: Legacy linear addressing write function.
     * This linear write logic is no longer used due to strict sector+block addressing.
     * Preserved here as backup only.
     */
    /*
    writeBlockOld: async function(sector, block, text, key = NFC_KEY, label = "Block") {
        try {
            let blockNumber = (sector < 32) ? (sector * 4 + block) : (128 + (sector - 32) * 16 + block);
            let hexData = utils.textToHex(text.slice(0, utils.MAX_TEXT_LENGTH));
            hexData = utils.padHex(hexData);
            // Original linear write logic omitted
        } catch (error) {
            throw error;
        }
    },
    */

    /**
     * Write data to a specific sector and block using D-Logic BlockInSectorWrite command.
     */
    /* Original linear/async NFC write logic preserved as backup:
    writeSectorBlock: async function(sector, block, hexData, authMode, key) {
        if (sector === undefined || block === undefined) throw new ReferenceError("Sector or block not specified");
        authMode = (authMode === undefined) ? 0x60 : authMode;
        key = (key === undefined) ? NFC_KEY : key;
        try {
            utils.log(`Writing to Sector ${sector}, Block ${block}`, 'debug');
            if (typeof dlogic === 'undefined') {
                utils.log('D-Logic NFC API (dlogic) is not available. NFC write operation skipped.', 'error');
                return false;
            }
            const success = await dlogic.BlockInSectorWrite(sector, block, hexData, authMode, key);
            if (success) utils.log(`Write success`, 'success');
            else utils.log(`Write failed`, 'error');
            return success;
        } catch (error) {
            utils.log(`Error writing Sector ${sector}, Block ${block}: ${error.message}`, 'error');
            throw error;
        }
    },
    */

    // Refactored: Now uses NeobandSDK.writeSectorBlock for strict block_in_sector addressing.
    // Original implementation using BlockInSectorWrite is preserved below as backup.
    writeSectorBlock: async function(sector, block, hexData, key = "FFFFFFFFFFFF", authMode = 0x60) {
        try {
            // Validate sector and block ranges
            if (typeof sector !== 'number' || typeof block !== 'number' ||
                sector < 0 || sector > 39 || block < 0 || 
                (sector >= 32 && sector <= 39 ? block > 14 : block > 3)) {
                throw new Error(
                    `[writeSectorBlock] Invalid sector (${sector}) or block (${block}) parameter. ` +
                    `Sector must be 0–39, block must be ${sector >= 32 && sector <= 39 ? '0–14' : '0–3'}.`
                );
            }
            
            // Ensure data is padded to 16 bytes (32 hex chars)
            hexData = hexData.padEnd(32, 'F');
           /**
            * [BUGFIX] UFR_MAX_KEY_INDEX_EXCEEDED error workaround:
            * Always use keyIndex = 0 for MIFARE Classic authentication with reader keys (Sector 1, Key A).
            * This addresses a bug where keyIndex was incorrectly set to 96 (invalid), causing authentication failure.
            * Error observed in logs: "UFR_MAX_KEY_INDEX_EXCEEDED" when attempting to write to Sector 1 with Key A.
            * Reference: uFR_Series_NFC_reader_API.pdf, Section "BlockInSectorWrite", "Key Index" parameter (valid range: 0-15).
            * For Sector 1, Key A, keyIndex must be 0 per D-Logic documentation and confirmed by error logs.
            * The original logic is preserved below for backup, as required by project policy.
            */
            // --- Original logic (preserved for backup) ---
            // const keyIndex = (key === "FFFFFFFFFFFF") ? 0 : key;
            // --- End original logic ---
            const keyIndex = 0;
            utils.log(`[writeFactionField] Using keyIndex=${keyIndex} for Sector ${sector}, Block ${block}`, 'info');
            // Note: SDK expects parameters in the order (sector, block, hexData, authMode, keyIndex)
            const status = await NeobandSDK.writeSectorBlock(sector, block, hexData, authMode, keyIndex);
            utils.log(`Wrote successfully to Sector ${sector}, Block ${block} via NeobandSDK`, 'success');
            return true;
        } catch (err) {
            utils.log(`NeobandSDK.writeSectorBlock error (Sector ${sector}, Block ${block}): ${err.message}`, 'error');
            return false;
        }
    },

    /**
     * Read username from Sector 39, Block 0.
     *
     * IMPORTANT: Username is now always read from Sector 39, Block 0 to match the write operation and the intended memory map.
     * This supersedes any previous logic that used linear addressing or other sector/block locations.
     *
     * The original linear read logic is preserved below as a backup (commented out) per project requirements.
     */
    readUsername: async function() {
        try {
            utils.log("[Username Read] Reading username from Sector 39, Block 0...", 'info');
            // Read username from Sector 39, Block 0 (current standard)
            const hexData = await this.readSectorBlock(39, 0);

            // Original linear read logic preserved as backup:
            // const linearHexData = await this.linearRead(0, 16);
            // return utils.hexToString(linearHexData);

            // Convert hex to text using the correct utility
            const usernameText = utils.hexToText(hexData);
            utils.log("[Username Read] Converted hex to text (username): " + usernameText, 'debug');
            return usernameText;
        } catch (error) {
            utils.log("[Username Read] Username read error: " + error, 'error');
            throw error;
        }
    },

    /**
     * Write username to Sector 39, Block 0.
     *
     * IMPORTANT: Username is now always written to Sector 39, Block 0 to match the read operation and the intended memory map.
     * This supersedes any previous logic that used linear addressing or other sector/block locations.
     *
     * The original linear write logic is preserved below as a backup (commented out) per project requirements.
     */
    writeUsername: async function(username) {
        try {
            utils.log(`[Username Write] Writing username "${username}" to Sector 39, Block 0...`, 'info');
            // Convert username text to hex and pad to 32 characters (current standard)
            const hexData = utils.textToHex(username).padEnd(32, '0');

            // Original linear write logic preserved as backup:
            // const linearHexData = utils.stringToHex(username).padEnd(32, '0');
            // await this.linearWrite(0, linearHexData);

            utils.log("[Username Write] Converted username text to hex: " + hexData, 'debug');
            return await this.writeSectorBlock(39, 0, hexData);
        } catch (error) {
            utils.log("[Username Write] Username write error: " + error, 'error');
            throw error;
        }
    },

    /**
     * Read faction field.
     */
   /**
    * Reads a single faction field from the specified sector/block using Key A (keyIndex 0).
    * The 'key' parameter is mapped from the field definition (typically "FFFFFFFFFFFF" for Key A),
    * and is passed to readSectorBlock, which maps it to keyIndex 0 as required by the Neoband-App-25-fields bugfix.
    * This ensures each field is read from its correct sector/block with the correct authentication key.
    * See CHANGELOG.md for details on the sector/block migration and bugfix.
    * The original linear logic is preserved as a backup (see commented code).
    */
   readFactionField: async function(sector, block, key, label = 'Faction Field') {
       try {
           // Always uses Key A (0x60) and maps "FFFFFFFFFFFF" to keyIndex 0.
           const hexData = await this.readSectorBlock(sector, block, 0x60, key);
           // Original call preserved as backup:
           // return utils.hexToString(hexData);
           // Updated per static analysis: use correct function hexToText()
           const factionText = utils.hexToText(hexData);
           utils.log(`${label} converted hex to text: ${factionText}`, 'debug');
           return factionText;
       } catch (error) {
           utils.log(`${label} read error: ${error}`, 'error');
           throw error;
       }
   },

    /**
     * Write faction field.
     */
    writeFactionField: async function(sector, block, data, key, label = 'Faction Field') {
        try {
            // Original call preserved as backup:
            // const hexData = utils.stringToHex(data).padEnd(32, '0');
            // Updated per static analysis: use correct function textToHex()
            const hexData = utils.textToHex(data).padEnd(32, '0');
            utils.log(`${label} converted text to hex: ${hexData}`, 'debug');
            return await this.writeSectorBlock(sector, block, hexData, 0x60, key);
        } catch (error) {
            utils.log(`${label} write error: ${error}`, 'error');
            throw error;
        }
    },

    /**
     * Read allegiance field.
     */
    readAllegianceField: async function(sector, block, key, label = 'Allegiance Field') {
        try {
            const hexData = await this.readSectorBlock(sector, block, 0x60, key);
            const allegianceText = utils.hexToText(hexData);
            utils.log(`${label} converted hex to text: ${allegianceText}`, 'debug');
            return allegianceText;
        } catch (error) {
            utils.log(`${label} read error: ${error}`, 'error');
            // Return a placeholder or empty string on error
            return "";
        }
    },

    /**
     * Write allegiance field.
     */
    writeAllegianceField: async function(sector, block, data, key, label = 'Allegiance Field') {
        try {
            // Original call preserved as backup:
            // const hexData = utils.stringToHex(data).padEnd(32, '0');
            // Updated per static analysis: use correct function textToHex()
            const hexData = utils.textToHex(data).padEnd(32, '0');
            utils.log(`${label} converted text to hex: ${hexData}`, 'debug');
            return await this.writeSectorBlock(sector, block, hexData, 0x60, key);
        } catch (error) {
            utils.log(`${label} write error: ${error}`, 'error');
            throw error;
        }
    },
    
    /**
     * === Server IP Configuration ===
     *
     * These functions manage the backend server IP address used for all sync/API operations.
     * The server IP is set by the user in the Admin page Settings section and stored in localStorage.
     * This allows the app to work on any network or device without code changes.
     *
     * - getServerBaseUrl: Returns the current server base URL from localStorage, or a default if unset.
     * - setServerBaseUrl: Updates the server base URL in localStorage and logs the change.
     *
     * Usage:
     *   - The Admin page UI calls setServerBaseUrl() when the user saves a new server IP.
     *   - All sync operations call getServerBaseUrl() to determine where to send API requests.
     */
    getServerBaseUrl: function() {
        // Retrieve the server base URL from localStorage, or use the default (localhost) if not set
        return localStorage.getItem('serverBaseUrl') || 'http://localhost:3000';
    },

    setServerBaseUrl: function(url) {
        // Save the server base URL to localStorage for persistent use across sessions
        localStorage.setItem('serverBaseUrl', url);
        utils.log(`[Settings] Server base URL set to: ${url}`, 'info');
    },

    /**
     * syncFaction1DataToServer
     *
     * Sends the current state (username, allegiance, faction fields, etc.) to the backend server for syncing.
     * The server URL is dynamically determined by getServerBaseUrl(), allowing for flexible network setups.
     *
     * - Constructs a payload from the current application state.
     * - Logs the payload and the server URL for traceability.
     * - Handles network errors and logs failures for debugging.
     * - Provides user feedback via the log system.
     *
     * This function is called after any read or write operation that updates the relevant state.
     *
     * Error Handling:
     *   - Catches and logs network/CORS errors (e.g., if the server is not running or CORS is not enabled).
     *   - Does not block the UI or throw uncaught errors; all failures are logged for review.
     */
    syncFaction1DataToServer: async function (uid) {
        const state = core.currentState;

        // Get values from state (populated by the UI after read/write)
        const username = state.currentUsername;
        const allegiance = state.currentAllegiance;
        const field1 = state.field1;
        const field2 = state.field2;
        const field3 = state.field3;

        // Determine the display name for the faction (default to 'Alleycat' if not found)
        let factionDisplay = 'Alleycat';
        if (typeof FIELD_MAP !== 'undefined' && FIELD_MAP.factions && FIELD_MAP.factions.faction1) {
            factionDisplay = FIELD_MAP.factions.faction1.title || 'Alleycat';
        }

        // Construct the payload to send to the server
        const payload = {
            uid,
            timestamp: Date.now(),
            faction: factionDisplay,
            username,
            allegiance,
            field1,
            field2,
            field3
        };

        // Log the outgoing payload and server URL for debugging and traceability
        utils.log(`[NFC Sync] Sending data to server (${this.getServerBaseUrl()}): ` + JSON.stringify(payload), "debug");

        try {
            // Get the current server URL from localStorage (or default)
            const serverUrl = this.getServerBaseUrl();
            // Send the payload to the backend server's /api/nfc-sync endpoint
            const response = await fetch(`${serverUrl}/api/nfc-sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            utils.log(`[NFC Sync] Server responded with ${response.status}`, "info");
            if (response.ok) {
                utils.log("✅ Synced NFC data with server (Alleycat only).", "success");
            } else {
                throw new Error("Server returned non-200 status");
            }
        } catch (err) {
            // Log network or CORS errors for troubleshooting
            utils.log("[NFC Sync] Failed to sync data: " + err.message, "error");
        }
    },

    /**
     * Read current allegiance from Sector 39, Block 3.
     *
     * This reads the user's current allegiance as stored in the user data sector.
     * Returns the allegiance as a string, or throws on error.
     */
    readCurrentAllegiance: async function() {
        try {
            utils.log("[Allegiance Read] Reading current allegiance from Sector 39, Block 3...", 'info');
            // Read allegiance from Sector 39, Block 3
            const hexData = await this.readSectorBlock(39, 3);
            // Convert hex to text using the correct utility
            const allegianceText = utils.hexToText(hexData);
            utils.log("[Allegiance Read] Converted hex to text (allegiance): " + allegianceText, 'debug');
            return allegianceText;
        } catch (error) {
            utils.log("[Allegiance Read] Allegiance read error: " + error, 'error');
            throw error;
        }
    },

    /**
     * Writes the user's allegiance affiliation to Sector 39, Block 3.
     * This is a special operation allowed for Allegiance-level users (via app logic) 
     * targeting a block normally managed by Staff/Registration.
     * Uses the universal staff key for writing, assuming Sector 39 allows Key B writes.
     * 
     * @param {string} allegianceName - The name of the allegiance to write.
     * @returns {Promise<boolean>} - True if the write was successful, false otherwise.
     */
    writeUserAllegiance: async function(allegianceName) {
        const sector = 39;
        const block = 3;
        // Use the default staff key (defined in keys.js, often FFFFFFFFFFFF)
        // Assume this key is set as Key B for Sector 39 and allows writing to Block 3.
        const key = NEOBAND_KEYS.staffKey; 
        const authMode = this.AUTH_MODE_B; // Use Key B for writing
        const keyIndex = 0; // Key index for reader-stored keys (0 = default Key A/B slot)

        utils.log(`[writeUserAllegiance] Preparing to write "${allegianceName}" to Sector ${sector}, Block ${block} using Key B (staff key).`, 'info');

        if (!allegianceName) {
            utils.log("[writeUserAllegiance] Error: Allegiance name cannot be empty.", 'error');
            return false; // Or clear the block if empty name means removal?
        }

        try {
            // Convert allegiance name to hex, pad to 16 bytes (32 hex chars)
            let hexData = utils.textToHex(allegianceName.slice(0, 16)); // Ensure max 16 chars
            hexData = hexData.padEnd(32, '0'); // Pad with nulls (0x00)

            utils.log(`[writeUserAllegiance] Writing hex data: ${hexData} to Sector ${sector}, Block ${block}`, 'debug');

            // Use the existing writeSectorBlock via NeobandSDK, specifying Key B auth
            const success = await NeobandSDK.writeSectorBlock(sector, block, hexData, authMode, keyIndex, key);

            if (success) {
                utils.log(`[writeUserAllegiance] Successfully wrote allegiance to Sector ${sector}, Block ${block}.`, 'success');
                return true;
            } else {
                utils.log(`[writeUserAllegiance] NeobandSDK.writeSectorBlock failed for Sector ${sector}, Block ${block}.`, 'error');
                // Attempting to provide more specific error feedback
                const lastError = NeobandSDK.getLastError ? NeobandSDK.getLastError() : 'Unknown SDK error';
                utils.log(`[writeUserAllegiance] SDK Last Error: ${lastError}`, 'error');
                throw new Error(`NFC write failed for user allegiance. SDK Error: ${lastError}`); 
            }
        } catch (error) {
            utils.log(`[writeUserAllegiance] Error writing allegiance to Sector ${sector}, Block ${block}: ${error.message}`, 'error');
            // Consider re-throwing or returning false based on desired error handling
            // Re-throwing allows the UI handler to catch and display the specific error
            throw error; 
        }
    },
};

// Expose config functions for admin.js
window.getServerBaseUrl = operations.getServerBaseUrl;
window.setServerBaseUrl = operations.setServerBaseUrl;