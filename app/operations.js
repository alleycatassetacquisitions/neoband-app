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
     * DEPRECATED: Legacy readSectorBlock implementation using PK authentication.
     * This version used explicit key authentication and is preserved for reference.
     * See CHANGELOG.md for migration details.
     */
    /*
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
    */

    /**
     * Reads a block from a given sector using NON-PK authentication.
     * MODIFIED: Uses Key A (Auth Mode 0x60) from reader key index 0.
     * This relies on the reader's index 0 Key A matching the card's Key A for the sector.
     * Assumes the default Key A (e.g., FFFFFFFFFFFF) is loaded into reader index 0.
     *
     * @param {number} sector - Sector number (0-39)
     * @param {number} block - Block number within sector
     * @returns {Promise<string|null>} Hex data or null on error
     */
    readSectorBlock: async function(sector, block) {
        const authMode = operations.AUTH_MODE_A; // <<< Use Key A for authentication
        const keyIndex = 0;                     // <<< Use reader slot 0

        utils.log(`[operations.readSectorBlock] Reading Sector ${sector}, Block ${block} using AuthMode A (0x60), KeyIndex 0`, 'debug');

        try {
            // Validate sector and block ranges (allow reading trailer for verification if needed)
             if (typeof sector !== 'number' || typeof block !== 'number' ||
                 sector < 0 || sector > 39 || block < 0 ||
                 (sector < 32 && block > 3) || (sector >= 32 && block > 15) ) { // Allow reading up to block 15 for large sectors
                 throw new Error(
                     `[readSectorBlock] Invalid sector (${sector}) or block (${block}) parameter.`
                 );
             }

            // Call the NON-PK SDK function explicitly with AuthMode A and KeyIndex 0
            const hexData = await NeobandSDK.readSectorBlock(sector, block, authMode, keyIndex);

            utils.log(`[operations.readSectorBlock] Read successful Sector ${sector}, Block ${block}`, 'success');
            return hexData;

        } catch (err) {
            // Log the specific error from the SDK call
            utils.log(
                `[operations.readSectorBlock] Error reading Sector ${sector}, Block ${block}: ${err.message}`,
                'error'
            );
            // Log the stack trace for better debugging
            console.error(err);
            return null; // Return null to indicate failure
        }
    },
    /**
     * Reads a block from a given sector using the specified role.
     * Uses NeobandSDK.readUserSectorBlock for per-user access, or blockInSectorRead for admin.
     *
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
     * Write data to a specific sector and block using NON-PK authentication.
     * MODIFIED: Uses Key A (Auth Mode 0x60) from reader key index 0.
     * Relies on the reader's index 0 Key A matching the card's Key A for the sector.
     * Assumes the default Key A (e.g., FFFFFFFFFFFF) is loaded into reader index 0.
     *
     * @param {number} sector - Sector number (1-39, Sector 0 forbidden).
     * @param {number} block - Block number within sector (excluding trailer block).
     * @param {string} hexData - Hex data string (will be padded to 16 bytes).
     * @returns {Promise<boolean>} True if write successful, false otherwise.
     */
    writeSectorBlock: async function(sector, block, hexData) {
        const authMode = operations.AUTH_MODE_A; // <<< Use Key A for authentication
        const keyIndex = 0;                     // <<< Use reader slot 0

        utils.log(`[operations.writeSectorBlock] Writing to Sector ${sector}, Block ${block} using AuthMode A (0x60), KeyIndex 0`, 'debug');

        try {
            // --- Enhanced Parameter Validation ---
            if (typeof sector !== 'number' || typeof block !== 'number' || typeof hexData !== 'string') {
                throw new Error('[writeSectorBlock] Invalid parameter types.');
            }
            if (sector === 0) {
                // Generally, writing to sector 0 (especially block 0) is discouraged.
                // While technically possible, it contains manufacturer data and can brick the card.
                // However, if absolutely necessary for a specific use case, this check can be modified.
                // For this application, we forbid writing to Sector 0.
                utils.log(`[writeSectorBlock] Attempted write to Sector 0 (Block ${block}) - Forbidden.`, 'warning');
                throw new Error('Writing to Sector 0 is forbidden.');
            }
             if (sector < 0 || sector > 39 || block < 0 ||
                 (sector < 32 && block > 2) || // Blocks 0, 1, 2 are data blocks
                 (sector >= 32 && block > 14)) { // Blocks 0-14 are data blocks
                 // Check if it's a trailer block write attempt
                 const isTrailerBlock = (sector < 32 && block === 3) || (sector >= 32 && block === 15);
                 if (isTrailerBlock) {
                     utils.log(`[writeSectorBlock] Attempted write to trailer block (Sector ${sector}, Block ${block}) - Forbidden by this function. Use dedicated trailer write function if needed.`, 'warning');
                     throw new Error('Direct writing to trailer blocks is forbidden.');
                 }
                 // Otherwise, it's just an invalid block number
                 throw new Error(
                     `[writeSectorBlock] Invalid sector (${sector}) or data block (${block}) parameter.`
                 );
             }
             if (!/^[0-9a-fA-F]*$/.test(hexData)) {
                 throw new Error('[writeSectorBlock] Invalid hexData format.');
             }

            // Pad data to exactly 16 bytes (32 hex characters)
            const paddedHexData = utils.padHex(hexData, 32); // Pad to 16 bytes
            utils.log(`[operations.writeSectorBlock] Padded data: ${paddedHexData}`, 'debug');

            // Call the NON-PK SDK function
            const success = await NeobandSDK.writeSectorBlock(sector, block, paddedHexData, authMode, keyIndex);

            if (success) {
                utils.log(`[operations.writeSectorBlock] Write successful to Sector ${sector}, Block ${block}`, 'success');
                return true;
            } else {
                utils.log(`[operations.writeSectorBlock] Write failed to Sector ${sector}, Block ${block} (SDK returned false)`, 'warning');
                return false;
            }
        } catch (err) {
            utils.log(
                `[operations.writeSectorBlock] Error writing to Sector ${sector}, Block ${block}: ${err.message}`,
                'error'
            );
            console.error(err); // Log stack trace
            return false; // Indicate failure
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
            return await this.writeSectorBlock(39, 0, hexData);
        } catch (error) {
            utils.log("[Username Write] Username write error: " + error, 'error');
            throw error;
        }
    },
    /**
     * Reads a single faction field from the specified sector/block.
     * CORRECTED: Uses blockInSectorRead_PK with universalReadKeyA.
     */
    readFactionField: async function(sector, block, label = 'Faction Field') {
        utils.log(`[operations.readFactionField] Reading ${label} (Sector ${sector}, Block ${block}) using default Key A (Index 0)`, 'debug'); // Updated log message
        try {
            // Validate sector/block for reading
            utils.validateSectorBlock(sector, block, false); 

            // Call the updated readSectorBlock which uses non-PK, Key A, Index 0
            const hexData = await this.readSectorBlock(sector, block);
            
            const factionText = utils.hexToText(hexData);
            utils.log(`[operations.readFactionField] ${label} read successfully. Text: "${factionText}"`, 'success');
            return factionText;

        } catch (error) {
            utils.log(`[operations.readFactionField] ${label} read error: ${error.message}`, 'error');
            console.error(error); // Log stack trace
            return ""; // Return empty on error
        }
    },
/**
     * Gemi V1.
     * Reads a single faction field from the specified sector/block.
     * Uses blockInSectorRead_PK with universalReadKeyA.
     */
    /**
readFactionField: async function(sector, block, label = 'Faction Field') {
    utils.log(`[operations.readFactionField] Reading Sector ${sector}, Block ${block} using PK + Universal Key A`, 'debug');
    try {
        utils.validateSectorBlock(sector, block, false); 

        if (!window.NEOBAND_KEYS?.universalReadKeyA) {
            throw new Error("[readFactionField] Universal Read Key A is missing in configuration.");
        }
        const universalKeyA = window.NEOBAND_KEYS.universalReadKeyA;

        // *** Ensure this uses the PK function ***
        const hexData = await NeobandSDK.blockInSectorRead_PK(sector, block, operations.AUTH_MODE_A, universalKeyA);
        
        const factionText = utils.hexToText(hexData);
        utils.log(`[operations.readFactionField] ${label} converted hex to text: ${factionText}`, 'debug');
        return factionText;

    } catch (error) {
        utils.log(`[operations.readFactionField] ${label} read error: ${error.message}`, 'error');
        console.error(error); 
        return ""; // Return empty on error
    }
},
*/
// OPTION C PK READ
/**
 * Reads a single faction field from the specified sector/block.
 * CORRECTED: Uses blockInSectorRead_PK with universalReadKeyA.
 */
/**
readFactionField: async function(sector, block, label = 'Faction Field') {
    utils.log(`[operations.readFactionField] Reading Sector ${sector}, Block ${block} using PK + Universal Key A`, 'debug');
    try {
        // Validate sector/block
        utils.validateSectorBlock(sector, block, false); // False for read operation

        // Get the universal read key
        if (!window.NEOBAND_KEYS?.universalReadKeyA) {
            throw new Error("[readFactionField] Universal Read Key A is missing in configuration.");
        }
        const universalKeyA = window.NEOBAND_KEYS.universalReadKeyA;

        // Use the _PK variant for reading with the explicitly provided universal Key A
        const hexData = await NeobandSDK.blockInSectorRead_PK(sector, block, operations.AUTH_MODE_A, universalKeyA);
        const factionText = utils.hexToText(hexData);
        utils.log(`${label} converted hex to text: ${factionText}`, 'debug');
        return factionText;

    } catch (error) {
        utils.log(`[operations.readFactionField] ${label} read error: ${error}`, 'error');
        console.error(error); // Log stack trace
        // Return empty string or throw, depending on how UI handles errors
        return ""; 
    }
},
*/
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
   /**
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
 */
   writeFactionField: async function(sector, block, data, role, label = 'Faction Field') { // Takes ROLE
    utils.log(`[operations.writeFactionField] Writing ${label} for role ${role} to Sector ${sector}, Block ${block}`, 'debug');
    try {
        // Convert data to hex and pad to 32 characters
        const hexData = utils.textToHex(data).padEnd(32, '0'); // Pad data with 00
        utils.log(`${label} converted text to hex: ${hexData}`, 'debug');

        // *** Get the specific faction key based on the role identifier ***
        const factionKeyHex = window.NEOBAND_KEYS?.factions?.[role]?.neoKey;
        if (!factionKeyHex) {
            throw new Error(`[writeFactionField] Faction key (neoKey) not found for role: ${role}`);
        }
        // *** End Key Lookup ***

        // Call writeSectorBlock (which uses PK internally), passing the specific key
        return await this.writeSectorBlock(sector, block, hexData);

    } catch (error) {
        utils.log(`[operations.writeFactionField] ${label} write error: ${error.message}`, 'error');
        console.error(error); // Log stack trace
        throw error; // Re-throw error for UI to handle
    }
},
    /**
     * Write faction field.
     *
     * Uses role-based access. For admin writes, pass 'admin' as the role. For user/faction writes, pass the appropriate role string.
     * The default key is handled internally by writeSectorBlock based on the role.
     */
/**
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
            return await this.writeSectorBlock(sector, block, hexData);
        } catch (error) {
            utils.log(`${label} write error: ${error}`, 'error');
            throw error;
        }
    },
    */
     /**
     * Read allegiance field.
     * CORRECTED: Uses blockInSectorRead_PK with universalReadKeyA.
     */
     readAllegianceField: async function(sector, block, label = 'Allegiance Field') {
        utils.log(`[operations.readAllegianceField] Reading ${label} (Sector ${sector}, Block ${block}) using default Key A (Index 0)`, 'debug'); // Updated log message
        try {
            // Validate sector/block for reading
            utils.validateSectorBlock(sector, block, false); 

            // Call the updated readSectorBlock which uses non-PK, Key A, Index 0
            const hexData = await this.readSectorBlock(sector, block);
            
            const allegianceText = utils.hexToText(hexData);
            utils.log(`[operations.readAllegianceField] ${label} read successfully. Text: "${allegianceText}"`, 'success');
            return allegianceText;

        } catch (error) {
            utils.log(`[operations.readAllegianceField] ${label} read error: ${error.message}`, 'error');
            console.error(error); // Log stack trace
            return ""; // Return empty on error
        }
    },
    /**
     * Read allegiance field.
     */
    /**
    readAllegianceField: async function(sector, block, label = 'Allegiance Field') {
        try {
            // Read using universal read key (role no longer needed)
            const hexData = await this.readSectorBlock_PK(sector, block);
            const allegianceText = utils.hexToText(hexData);
            utils.log(`${label} converted hex to text: ${allegianceText}`, 'debug');
            return allegianceText;
        } catch (error) {
            utils.log(`${label} read error: ${error}`, 'error');
            return "";
        }
    },
    */

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
            return await this.writeSectorBlock(sector, block, hexData);
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
     * Uses the staff key for writing, assuming Sector 39 allows Key B writes.
     * 
     * @param {string} allegianceName - The name of the allegiance to write.
     * @returns {Promise<boolean>} - True if the write was successful, false otherwise.
     */
    writeUserAllegiance: async function(allegianceName) {
        // Get the correct sector and block from FIELD_MAP for allegiance field
        const sector = FIELD_MAP.user.fields.field4.sector; // Should be 39
        const block = FIELD_MAP.user.fields.field4.block;   // Should be 3
        // Use the staff key B defined in keys.js
        const key = window.NEOBAND_KEYS?.staff?.user?.neoKey; 
        // const authMode = this.AUTH_MODE_B; // Use Key B for writing - Not needed for PK
        // const keyIndex = 0; // Key index for reader-stored keys - Not needed for PK

        utils.log(`[writeUserAllegiance] Preparing to write "${allegianceName}" to Sector ${sector}, Block ${block} using Staff Key B (PK).`, 'info');

        if (!key) {
            const errMsg = "[writeUserAllegiance] Error: Staff Key B not found in configuration.";
            utils.log(errMsg, 'error');
            throw new Error(errMsg); // Throw error if key is missing
        }

        if (!allegianceName) {
            // If allegianceName is empty, write nulls to clear the block
            allegianceName = ""; 
            utils.log("[writeUserAllegiance] Empty allegiance name provided. Clearing block.", 'warning');
        }

        try {
            // Validate sector/block for writing (no trailer)
            utils.validateSectorBlock(sector, block, true);

            // Convert allegiance name to hex, pad to 16 bytes (32 hex chars)
            let hexData = utils.textToHex(allegianceName.slice(0, 16)); // Ensure max 16 chars
            hexData = hexData.padEnd(32, '0'); // Pad with nulls (0x00)

            utils.log(`[writeUserAllegiance] Writing hex data: ${hexData} to Sector ${sector}, Block ${block}`, 'debug');

            // *** Corrected: Use blockInSectorWrite_PK with Staff Key B ***
            /* --- MODIFICATION START: Change Key B PK write to standard Key A non-PK write --- */
            // const status = await NeobandSDK.blockInSectorWrite_PK(
            //     sector, 
            //     block, 
            //     hexData, 
            //     operations.AUTH_MODE_B, // Authenticate using Key B
            //     key                     // Provide the actual Staff Key B
            // );
            // // Check status based on expected SDK response format
            // const success = status && String(status).includes('UFR_OK');

            // Use the standard non-PK write function (Key A, Index 0)
            const success = await this.writeSectorBlock(sector, block, hexData);
            /* --- MODIFICATION END --- */

            if (success) {
                utils.log(`[writeUserAllegiance] Successfully wrote allegiance to Sector ${sector}, Block ${block}.`, 'success');
                return true;
            } else {
                const errMsg = `[writeUserAllegiance] NeobandSDK.blockInSectorWrite_PK failed for Sector ${sector}, Block ${block}. SDK Status: ${success}`;
                utils.log(errMsg, 'error');
                throw new Error(errMsg); // Throw specific error
            }
        } catch (error) {
            // Catch validation errors or SDK errors
            utils.log(`[writeUserAllegiance] Error writing allegiance to Sector ${sector}, Block ${block}: ${error.message}`, 'error');
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
                            NeobandSDK.getMifareAccessBits('zeroed'),
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
                            NeobandSDK.getMifareAccessBits('zeroed'),
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
                    NeobandSDK.getMifareAccessBits('zeroed'),
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

    /**
     * Resets a provisioned MIFARE Classic 4K tag to factory defaults.
     * This is a standalone operation, separate from provisioning.
     * Iterates through sectors 1-39, authenticates using keys from NEOBAND_KEYS,
     * writes factory default keys (FFFFFFFFFFFF) and access bits (FF078069)
     * to the sector trailer, and overwrites data blocks with zeros.
     *
     * @returns {Promise<{success: boolean, message: string}>} Object indicating success/failure and summary message.
     */
    factoryResetCard: async function() {
        utils.log("[Factory Reset] Starting standalone tag reset to factory defaults...", 'info');

        const factoryKeyA = 'FFFFFFFFFFFF';
        const factoryKeyB = 'FFFFFFFFFFFF';
        const factoryAccessBits = 'FF0780'; // Access Bits part
        const factoryUserByte = '69';     // User Byte / GPB part

        let sectorsProcessed = 0;
        let sectorsSuccess = 0;
        let sectorsFailed = 0;
        let dataBlocksWiped = 0;
        let dataBlockErrors = 0;

        // 1. Create a map of sector -> current Key B from NEOBAND_KEYS
        const sectorKeyMap = {};
        try {
            if (!window.NEOBAND_KEYS) throw new Error("NEOBAND_KEYS configuration not loaded.");

            // Factions
            if (window.NEOBAND_KEYS.factions) {
                for (const key in window.NEOBAND_KEYS.factions) {
                    const item = window.NEOBAND_KEYS.factions[key];
                    if (item && typeof item.sector === 'number' && item.neoKey) {
                        sectorKeyMap[item.sector] = item.neoKey;
                    }
                }
            }
            // Allegiances
            if (window.NEOBAND_KEYS.allegiances) {
                for (const key in window.NEOBAND_KEYS.allegiances) {
                    const item = window.NEOBAND_KEYS.allegiances[key];
                    if (item && typeof item.sector === 'number' && item.neoKey) {
                        sectorKeyMap[item.sector] = item.neoKey;
                    }
                }
            }
            // Staff (Sector 39)
            if (window.NEOBAND_KEYS.staff?.user && typeof window.NEOBAND_KEYS.staff.user.sector === 'number' && window.NEOBAND_KEYS.staff.user.neoKey) {
                sectorKeyMap[window.NEOBAND_KEYS.staff.user.sector] = window.NEOBAND_KEYS.staff.user.neoKey;
            }
             utils.log(`[Factory Reset] Built sector key map. Found keys for ${Object.keys(sectorKeyMap).length} sectors.`, 'debug');
        } catch (e) {
             utils.log(`[Factory Reset] Error building sector key map: ${e.message}`, 'error');
             return { success: false, message: `Error reading key configuration: ${e.message}` };
        }

        // 2. Iterate through sectors 1 to 39 (Skip sector 0 - protected)
        for (let sector = 1; sector <= 39; sector++) {
            sectorsProcessed++;
            const currentKeyB = sectorKeyMap[sector];
            const trailerBlock = sector < 32 ? 3 : 15;

            if (!currentKeyB) {
                utils.log(`[Factory Reset] Skipping Sector ${sector}: No current Key B found in NEOBAND_KEYS configuration. Cannot authenticate for trailer write.`, 'warning');
                sectorsFailed++;
                continue; // Skip to the next sector
            }

            let trailerWriteSuccess = false;
            try {
                // 3. Write Factory Trailer using current Key B for auth via non-PK sectorTrailerWrite
                utils.log(`[Factory Reset] Sector ${sector}: Authenticating with current Key B to write factory trailer using sectorTrailerWrite...`, 'debug');

                // Load the current Key B into reader slot 0 first
                // This step is essential for the non-PK function to work correctly
                await NeobandSDK.loadKey(currentKeyB, 0);
                
                // Now use sectorTrailerWrite with the reader's key slot 0
                const status = await NeobandSDK.sectorTrailerWrite(
                    sector,
                    factoryKeyA,        // New Key A to write
                    factoryAccessBits,  // New Access Bits
                    factoryUserByte,    // New User Byte
                    factoryKeyB,        // New Key B to write
                    operations.AUTH_MODE_A, // <<< MODIFICATION: Use Key A
                    0                   // Use key index 0 (where we loaded the current Key B)
                );

                // Check status carefully
                if (status && String(status).includes('UFR_OK')) {
                    utils.log(`[Factory Reset] Sector ${sector}: Successfully wrote factory trailer.`, 'success');
                    trailerWriteSuccess = true;
                } else {
                    throw new Error(`Failed to write factory trailer. SDK Status: ${status}`);
                }

            } catch (trailerError) {
                utils.log(`[Factory Reset] Sector ${sector}: Error writing factory trailer: ${trailerError.message}`, 'error');
                console.error(`[Factory Reset] Sector ${sector} trailer error details:`, trailerError);
                sectorsFailed++;
                continue; // Skip data block wipe if trailer write failed
            }

            // 4. Overwrite Data Blocks (if trailer write succeeded)
            if (trailerWriteSuccess) {
                const numDataBlocks = trailerBlock; // Blocks 0 to trailerBlock-1
                for (let block = 0; block < numDataBlocks; block++) {
                    try {
                         utils.log(`[Factory Reset] Sector ${sector}, Block ${block}: Wiping data block (auth with FACTORY Key B: ${factoryKeyB})...`, 'debug');
                         const zeroData = '00000000000000000000000000000000'; // 16 bytes of 0x00

                         // Load the FACTORY Key B into reader slot 0 for data block wiping
                         await NeobandSDK.loadKey(factoryKeyB, 0);

                         // Use blockInSectorWrite (non-PK version) with reader key slot 0
                         const writeStatus = await NeobandSDK.blockInSectorWrite(
                             sector,
                             block,
                             zeroData,
                             operations.AUTH_MODE_A, // <<< MODIFICATION: Use Key A
                             0                  // Use key index 0 (where we loaded the FACTORY Key B)
                         );

                         if (writeStatus && String(writeStatus).includes('UFR_OK')) {
                             dataBlocksWiped++;
                         } else {
                            throw new Error(`Data block write failed. SDK Status: ${writeStatus}`);
                         }
                    } catch (dataBlockError) {
                        utils.log(`[Factory Reset] Sector ${sector}, Block ${block}: Error wiping data block: ${dataBlockError.message}`, 'error');
                        dataBlockErrors++;
                        // Optionally break or continue based on desired strictness
                        // break; // Stop wiping blocks in this sector on first error
                    }
                }
                // If we reached here after attempting to wipe blocks, count sector as success
                // even if some data blocks failed (trailer should be reset)
                sectorsSuccess++;
            }
        } // End sector loop

        // 5. Compile results and return
        const totalSectors = 39; // 1 to 39
        let message = `Factory Reset finished. Processed ${sectorsProcessed}/${totalSectors} sectors. ` +
                      `Trailer Success/Proceed: ${sectorsSuccess}, Trailer Hard Fail: ${sectorsFailed}. ` +
                      `Data blocks wiped: ${dataBlocksWiped}, Data block errors: ${dataBlockErrors}.`;
        const overallSuccess = sectorsFailed === 0 && dataBlockErrors === 0; // Define success strictly as no hard fails

        utils.log(`[Factory Reset] ${message}`, overallSuccess ? 'success' : 'warning');
        return { success: overallSuccess, message: message };
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
/* --- MODIFICATION START: Comment out window.handleGlobalProvisionCard --- */
/*
window.handleGlobalProvisionCard = async function() {
    utils.log("'Provision Card' button clicked.", 'info');
    // Optional: Add a confirmation dialog
    if (!confirm("WARNING: This will overwrite NFC tag keys and access settings. Ensure the correct tag is present. Proceed?")) {
        utils.log("Provisioning cancelled by user.", 'info');
        return;
    }

    try {
        ui.showLoading('Provisioning card...');
        const success = await operations.provisionCardWithCustomKeys();
        if (success) {
            ui.showSuccess('Card Provisioned Successfully!');
            utils.log("Card provisioning completed successfully.", 'success');
        } else {
            ui.showError('Card Provisioning Failed. Check logs.');
            utils.log("Card provisioning failed.", 'error');
        }
    } catch (error) {
        ui.showError(`Provisioning Error: ${error.message}`);
        utils.log(`Error during card provisioning: ${error.message}`, 'error');
    } finally {
        ui.hideLoading();
    }
};
*/
/* --- MODIFICATION END: Comment out window.handleGlobalProvisionCard --- */


// ===================== HIGHER-LEVEL OPERATIONS =====================
// These functions use the core read/write block operations
// ... existing code ...