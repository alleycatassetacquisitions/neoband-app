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
                    enableNfcSync: false
                });

                if (typeof ui !== 'undefined' && typeof ui.readUsernameAndUpdateFields === 'function') {
                    try { ui.readUsernameAndUpdateFields(uid); } catch (e) {}
                }

                // Only run sync if needed (remove forced debug call)
                // utils.log(`[NFC Sync] Triggering syncFaction1DataToServer for UID: ${uid} (forced for faction1)`, 'info');
                // await operations.syncFaction1DataToServer(uid);
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
     * Reads a block from a given sector using the specified role.
     * Uses NeobandSDK.readUserSectorBlock for per-user access, or blockInSectorRead for admin.
     *
     * @param {number} sector - Sector number (0-39)
     * @param {number} block - Block number within sector
     * @returns {Promise<string|null>} Hex data or null on error
     */
    readSectorBlock: async function(sector, block) {
        // Access control removed for reads, as all roles use the universal read key.
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
            // Call the updated SDK function which now uses the universal read key internally
            return await NeobandSDK.readSectorBlock(sector, block);
        } catch (err) {
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
     * Write data to a specific sector and block using the correct SDK function.
     * Uses NeobandSDK.writeUserSectorBlock for per-user access, or blockInSectorWrite for admin.
     */
    writeSectorBlock: async function(sector, block, hexData, keyHex) {
        // Access control (CredentialMgr check removed) assumes the calling function has validated appropriately.

        // The primary role/sector check should happen BEFORE calling this, when retrieving the keyHex.

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
            // Validate the provided key
            if (!keyHex || !/^[0-9A-Fa-f]{12}$/i.test(keyHex)) {
                throw new Error(`[writeSectorBlock] Invalid or missing keyHex provided for Sector ${sector}, Block ${block}.`);
            }
            // Ensure data is padded to 16 bytes (32 hex chars)
            hexData = hexData.padEnd(32, 'F');
            // Call SDK PK function directly with the provided key and Key B auth mode
            const status = await NeobandSDK.blockInSectorWrite_PK(sector, block, hexData, operations.AUTH_MODE_B, keyHex);
            // Check status (optional, SDK might throw on error)
            const success = status && status.includes('UFR_OK');
            if (!success) {
                throw new Error(`Write operation failed for Sector ${sector}, Block ${block}. SDK Status: ${status}`);
            }
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
            // Read using universal read key (role no longer needed)
            const hexData = await this.readSectorBlock(39, 0);
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
            // Get staff key and call the modified writeSectorBlock
            if (!window.NEOBAND_KEYS?.staff?.user?.neoKey) {
                throw new Error("[writeUsername] Staff key not found in configuration.");
            }
            const staffKeyHex = window.NEOBAND_KEYS.staff.user.neoKey;
            return await this.writeSectorBlock(39, 0, hexData, staffKeyHex);
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
   readFactionField: async function(sector, block, label = 'Faction Field') {
       try {
           // Read using universal read key (role no longer needed)
           const hexData = await this.readSectorBlock(sector, block);
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
     *
     * Uses role-based access. For admin writes, pass 'admin' as the role. For user/faction writes, pass the appropriate role string.
     * The default key is handled internally by writeSectorBlock based on the role.
     */
    writeFactionField: async function(sector, block, data, role, label = 'Faction Field') {
        try {
            // Convert data to hex and pad to 32 characters
            const hexData = utils.textToHex(data).padEnd(32, '0');
            utils.log(`${label} converted text to hex: ${hexData}`, 'debug');
            // Get the specific faction key based on the role identifier
            const factionKeyHex = window.NEOBAND_KEYS?.factions?.[role]?.neoKey;
            if (!factionKeyHex) {
                throw new Error(`[writeFactionField] Faction key not found for role: ${role}`);
            }
            // Call the modified writeSectorBlock with the specific key
            return await this.writeSectorBlock(sector, block, hexData, factionKeyHex);
        } catch (error) {
            utils.log(`${label} write error: ${error}`, 'error');
            throw error;
        }
    },

    /**
     * Read allegiance field.
     */
    readAllegianceField: async function(sector, block, label = 'Allegiance Field') {
        try {
            // Read using universal read key (role no longer needed)
            const hexData = await this.readSectorBlock(sector, block);
            const allegianceText = utils.hexToText(hexData);
            utils.log(`${label} converted hex to text: ${allegianceText}`, 'debug');
            return allegianceText;
        } catch (error) {
            utils.log(`${label} read error: ${error}`, 'error');
            return "";
        }
    },

    /**
     * Write allegiance field.
     */
    writeAllegianceField: async function(sector, block, data, role, label = 'Allegiance Field') {
        try {
            // Original call preserved as backup:
            // const hexData = utils.stringToHex(data).padEnd(32, '0');
            // Updated per static analysis: use correct function textToHex()
            const hexData = utils.textToHex(data).padEnd(32, '0');
            utils.log(`${label} converted text to hex: ${hexData}`, 'debug');
            // Reverted & Corrected: Assume 'role' holds the role string (e.g., 'allegiance1') needed for role-based write.
            if (typeof role !== 'string' || !role) {
                throw new Error(`Invalid or missing role name provided for ${label}: ${role}`);
            }
            // Get the specific allegiance key based on the role identifier
            const allegianceKeyHex = window.NEOBAND_KEYS?.allegiances?.[role]?.neoKey;
            if (!allegianceKeyHex) {
                throw new Error(`[writeAllegianceField] Allegiance key not found for role: ${role}`);
            }
            // Call the modified writeSectorBlock with the specific key
            return await this.writeSectorBlock(sector, block, hexData, allegianceKeyHex);
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
     * TODO: NFC sync functionality is currently disabled. Uncomment to re-enable server sync.
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
    /*
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
    */

    /**
     * Reads the user's currently assigned allegiance from Sector 39, Block 3
     * Uses the FIELD_MAP to ensure the correct sector and block are accessed.
     * 
     * @returns {Promise<string>} - The allegiance name, or '(None)' if no allegiance is assigned
     */
    readCurrentAllegiance: async function() {
        const sector = FIELD_MAP.user.fields.field4.sector; // Should be 39
        const block = FIELD_MAP.user.fields.field4.block;   // Should be 3

        utils.log(`[readCurrentAllegiance] Reading allegiance from Sector ${sector}, Block ${block}`, 'info');

        try {
            // Read hex data from the allegiance block
            const hexData = await this.readSectorBlock(sector, block);
            
            if (!hexData || hexData.trim() === '') {
                utils.log("[readCurrentAllegiance] No data found in allegiance block", 'warning');
                return "(None)";
            }

            // Convert hex to text
            const allegianceText = utils.hexToText(hexData).trim();
            
            if (!allegianceText || allegianceText === '') {
                utils.log("[readCurrentAllegiance] Empty allegiance data", 'info');
                return "(None)";
            }
            
            utils.log("[readCurrentAllegiance] Converted hex to text (allegiance): " + allegianceText, 'debug');
            return allegianceText;
        } catch (error) {
            utils.log("[readCurrentAllegiance] Allegiance read error: " + error, 'error');
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
        // Get the correct sector and block from FIELD_MAP for allegiance field
        const sector = FIELD_MAP.user.fields.field4.sector; // Should be 39
        const block = FIELD_MAP.user.fields.field4.block;   // Should be 3
        // Use the default staff key (defined in keys.js, often FFFFFFFFFFFF)
        // Assume this key is set as Key B for Sector 39 and allows writing to Block 3.
        const key = window.NEOBAND_KEYS.staff.user.neoKey; 
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
            const successStatus = await NeobandSDK.blockInSectorWrite_PK(sector, block, hexData, authMode, key);
            // Check status based on expected SDK response format
            const success = successStatus && successStatus.includes('UFR_OK');

            if (success) {
                utils.log(`[writeUserAllegiance] Successfully wrote allegiance to Sector ${sector}, Block ${block}.`, 'success');
                return true;
            } else {
                utils.log(`[writeUserAllegiance] NeobandSDK.writeSectorBlock failed for Sector ${sector}, Block ${block}.`, 'error');
                // Removed non-existent getLastError call. Error is logged by SDK/readSectorBlock.
                throw new Error(`NFC write failed for user allegiance. Check SDK logs for details.`);
            }
        } catch (error) {
            utils.log(`[writeUserAllegiance] Error writing allegiance to Sector ${sector}, Block ${block}: ${error.message}`, 'error');
            // Consider re-throwing or returning false based on desired error handling
            // Re-throwing allows the UI handler to catch and display the specific error
            throw error; 
        }
    },

    /**
     * Provisions a MIFARE Classic 4K card by formatting it and setting custom keys.
     * Performs a two-stage process:
     * 1. Formats the card using NeobandSDK.formatCard(), setting universalReadKeyA and default Key B.
     * 2. Iterates through factions, allegiances, and staff definitions in NEOBAND_KEYS,
     *    calling NeobandSDK.setUserSectorTrailer() for each to set the specific neoKey (Key B).
     * Includes delays between trailer writes for stability.
     * @returns {Promise<{success: boolean, message: string}>} Object indicating success status and a summary message.
     */
    provisionCardWithCustomKeys: async function() {
        utils.log("[Provisioning] Starting card provisioning process...", 'info');
        let sectorsUpdated = 0;

        try {
            // === Stage 1: Format Card ===
            utils.log("[Provisioning] Stage 1: Formatting card to defaults...", 'info');
            const formatStatus = await NeobandSDK.formatCard();
            if (formatStatus !== 'Success' && !formatStatus?.includes('UFR_OK')) {
                // Check various possible success indicators from SDK responses
                throw new Error(`Card formatting failed. Status: ${formatStatus}`);
            }
            utils.log("[Provisioning] Stage 1: Formatting successful.", 'success');

            // Short delay after formatting
            await utils.sleep(200);

            // === Stage 2: Set Custom Keys ===
            utils.log("[Provisioning] Stage 2: Setting custom keys for defined roles...", 'info');

            // Check if keys are loaded
            if (!window.NEOBAND_KEYS) {
                throw new Error("NEOBAND_KEYS configuration not loaded.");
            }

            const keySettingDelay = 200; // ms delay between sector trailer writes

            // Helper for validation before writing trailer
            const validateTrailerWrite = (sector, role, keyA, keyB) => {
                // Validate sector trailer addressing
                utils.validateSectorTrailerAddressing(sector, true);
                // Validate sector trailer block (should always be last block in sector)
                const trailerBlock = sector < 32 ? 3 : 15;
                if (!utils.isSectorTrailerBlock(sector, trailerBlock)) {
                    const msg = `[Provisioning] Block ${trailerBlock} in sector ${sector} is not a sector trailer block.`;
                    utils.log(msg, 'error');
                    throw new Error(msg);
                }
                // Validate Key A/Key B for this sector/role
                utils.validateKeysForSectorAndUser(sector, keyA, keyB, role, window.NEOBAND_KEYS);
                utils.log(`[Provisioning] Validation passed for sector ${sector}, trailer block ${trailerBlock}, role ${role}.`, 'debug');
            };

            // Set Faction Keys
            if (window.NEOBAND_KEYS.factions) {
                utils.log("[Provisioning] Setting faction keys...", 'debug');
                for (const factionKey in window.NEOBAND_KEYS.factions) {
                    const faction = window.NEOBAND_KEYS.factions[factionKey];
                    if (faction && typeof faction.sector === 'number' && faction.name) {
                        const sector = faction.sector;
                        const role = faction.name;
                        // Get keys for validation
                        const keyA = window.NEOBAND_KEYS.universalReadKeyA;
                        const keyB = faction.neoKey;
                        validateTrailerWrite(sector, role, keyA, keyB);
                        utils.log(`[Provisioning] Setting key for Sector ${sector} (Role: ${role})`, 'debug');
                        await NeobandSDK.sectorTrailerWrite(
                            sector,
                            keyA,
                            utils.getMifareAccessBits('zeroed'),
                            '00',
                            keyB,
                            operations.AUTH_MODE_B,
                            0
                        );
                        sectorsUpdated++;
                        await utils.sleep(keySettingDelay);
                    } else {
                        utils.log(`[Provisioning] Skipping invalid faction entry: ${factionKey}`, 'warning');
                    }
                }
            }

            // Set Allegiance Keys
            if (window.NEOBAND_KEYS.allegiances) {
                utils.log("[Provisioning] Setting allegiance keys...", 'debug');
                for (const allegianceKey in window.NEOBAND_KEYS.allegiances) {
                    const allegiance = window.NEOBAND_KEYS.allegiances[allegianceKey];
                    if (allegiance && typeof allegiance.sector === 'number' && allegiance.name) {
                        const sector = allegiance.sector;
                        const role = allegiance.name;
                        // Get keys for validation
                        const keyA = window.NEOBAND_KEYS.universalReadKeyA;
                        const keyB = allegiance.neoKey;
                        validateTrailerWrite(sector, role, keyA, keyB);
                        utils.log(`[Provisioning] Setting key for Sector ${sector} (Role: ${role})`, 'debug');
                        await NeobandSDK.sectorTrailerWrite(
                            sector,
                            keyA,
                            utils.getMifareAccessBits('zeroed'),
                            '00',
                            keyB,
                            operations.AUTH_MODE_B,
                            0
                        );
                        sectorsUpdated++;
                        await utils.sleep(keySettingDelay);
                    } else {
                        utils.log(`[Provisioning] Skipping invalid allegiance entry: ${allegianceKey}`, 'warning');
                    }
                }
            }

            // Set Staff Key
            if (window.NEOBAND_KEYS.staff && window.NEOBAND_KEYS.staff.user && typeof window.NEOBAND_KEYS.staff.user.sector === 'number') {
                utils.log("[Provisioning] Setting staff key...", 'debug');
                const staffSector = window.NEOBAND_KEYS.staff.user.sector;
                const role = 'staff';
                const keyA = window.NEOBAND_KEYS.universalReadKeyA;
                const keyB = window.NEOBAND_KEYS.staff.user.neoKey;
                validateTrailerWrite(staffSector, role, keyA, keyB);
                utils.log(`[Provisioning] Setting key for Sector ${staffSector} (Role: staff)`, 'debug');
                await NeobandSDK.sectorTrailerWrite(
                    staffSector,
                    keyA,
                    utils.getMifareAccessBits('zeroed'),
                    '00',
                    keyB,
                    operations.AUTH_MODE_B,
                    0
                );
                sectorsUpdated++;
                await utils.sleep(keySettingDelay);
            } else {
                utils.log(`[Provisioning] Skipping staff key - configuration missing`, 'warning');
            }

            const successMsg = `Card provisioning complete. Format OK. Custom keys set for ${sectorsUpdated} sectors.`;
            utils.log(`[Provisioning] ${successMsg}`, 'success');
            return { success: true, message: successMsg };

        } catch (error) {
            const errorMsg = `Card provisioning failed: ${error.message}`;
            utils.log(`[Provisioning] ${errorMsg}`, 'error');
            console.error("[Provisioning] Detailed error:", error);
            return { success: false, message: errorMsg };
        }
    },
};

// Expose config functions for admin.js
window.getServerBaseUrl = operations.getServerBaseUrl;
window.setServerBaseUrl = operations.setServerBaseUrl;

// Add a flag to prevent concurrent provisioning
let isProvisioning = false;

/**
 * Globally accessible event handler for the "Provision Card" button.
 * Calls the operations.provisionCardWithCustomKeys function and provides UI feedback.
 * Intended to be called directly from button onclick attributes.
 */
window.handleGlobalProvisionCard = async function() {
    // Check if provisioning is already in progress
    if (isProvisioning) {
        utils.log("[Global Provision Handler] Provisioning already in progress. Please wait.", 'warning');
        return;
    }

    // Set the flag to indicate provisioning has started
    isProvisioning = true;

    // Use try-catch to ensure dependencies are available
    try {
        if (typeof utils === 'undefined' || typeof core === 'undefined' || typeof ui === 'undefined' || typeof operations === 'undefined') {
            console.error("[Global Provision Handler] Missing critical dependency (utils, core, ui, or operations). Provisioning aborted.");
            alert("Critical error: Application components missing. Cannot provision card.");
            return;
        }

        utils.log("[Global Provision Handler] Provision Card button clicked.", 'info');

        // Ensure a tag is present before attempting provisioning
        if (!core.currentState.isTagPresent || !core.currentState.scannedTagInfo?.uid) {
            utils.log("[Global Provision Handler] Provisioning failed: No tag scanned.", 'warning');
            ui.showVisualConfirmation("Provisioning Error", "Please scan a tag before provisioning.", 'error');
            return;
        }

        // Confirm with the user
        if (!confirm("Are you sure you want to provision this card?\n\nThis will ERASE ALL existing data and set default + custom keys according to the configuration.\n\nTHIS CANNOT BE UNDONE.")) {
            utils.log("[Global Provision Handler] Provisioning cancelled by user.", 'info');
            return;
        }

        ui.showOperationIndicator('Provisioning card...');

        // Ensure the core provisioning function exists
        if (typeof operations.provisionCardWithCustomKeys !== 'function') {
            throw new Error("Provisioning function (operations.provisionCardWithCustomKeys) is not available.");
        }

        const result = await operations.provisionCardWithCustomKeys();

        if (result.success) {
            ui.showVisualConfirmation("Provisioning Complete", result.message, 'success');
        } else {
            throw new Error(result.message || "Provisioning failed for an unknown reason.");
        }
    } catch (error) {
        console.error('Error during card provisioning:', error);
        if (typeof utils !== 'undefined') {
             utils.log(`[Global Provision Handler] Error during card provisioning: ${error.message}`, 'error');
        }
        if (typeof ui !== 'undefined') {
            ui.showVisualConfirmation("Provisioning Error", `Failed: ${error.message}`, 'error');
        }
    } finally {
        if (typeof ui !== 'undefined') {
            ui.hideOperationIndicator();
        }
        // Reset the flag when provisioning is complete or an error occurs
        isProvisioning = false;
    }
};

// Comment out all invocations of operations.syncFaction1DataToServer(uid) in this file
// Example:
// if (uid) /* TODO: NFC sync disabled */ /* operations.syncFaction1DataToServer(uid); */

// Modified reset handler
async function handleReset() {
  try {
    const result = await NeobandSDK.formatCard();
    if (result.includes('UFR_OK')) {
      utils.log('Card formatted successfully', 'success');
      return true;
    }
    throw new Error(`Format failed: ${result}`);
  } catch (err) {
    utils.log(`Format error: ${err.message}`, 'error');
    return false;
  }
}

// Example:
// if (uid) /* TODO: NFC sync disabled */ /* operations.syncFaction1DataToServer(uid); */