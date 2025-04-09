/**
 * operations.js
 * Handles NFC communication logic (read/write operations) using the uFR API.
 * 
 * This file provides MIFARE Classic 4K tag operations including:
 * - Tag scanning and detection
 * - Block reading with authentication
 * - Block writing with authentication
 * - User data and faction/allegiance field operations
 * - Helper functions for reliable NFC operations
 */

const operations = {
    /**
     * Authentication mode constants for MIFARE Classic cards.
     * These values are passed to the uFR API to indicate which authentication method to use.
     * - AUTH_MODE_A (0x60): Uses Key A for authentication (standard approach)
     * - AUTH_MODE_B (0x61): Uses Key B for authentication (offers more security options)
     * 
     * The authentication mode determines which key (A or B) from the sector trailer is used
     * for authenticating access to a specific sector in the MIFARE Classic card.
     */
    AUTH_MODE_A: ' 0x60', // MIFARE_AUTHENT1A
    AUTH_MODE_B: ' 0x61', // MIFARE_AUTHENT1B
    // DEFAULT_KEY_INDEX: 0, // No longer needed as we use _PK
    // Note: PK authentication (providing the key directly) is not implemented here
    // as the requirement is to use the stored key "FFFFFFFFFFFF".

    /**
     * Scans for a tag and updates the core application state.
     * Uses the uFR API's GetCardIdEx command to detect an NFC tag in the reader's field.
     * When a tag is detected, it updates the application state and attempts to read username data.
     * 
     * @returns {Promise<Object>} Resolves with the scanned tag info (primarily UID) or rejects on error.
     * 
     * @throws {Error} If tag scanning fails or no tag is detected
     * 
     * Technical Notes:
     * - GetCardIdEx returns extended tag information including UID, SAK, and ATQA values
     * - For MIFARE Classic tags, only the UID is currently used in the application
     * - After successful scan, triggers an attempt to read the username (handled by UI module)
     */
    scanTag: async function() {
        utils.log("Scanning for tag...", 'info');
        
        // Use GetCardIdEx command as in original app
        const command = "GetCardIdEx";
        
        return new Promise((resolve, reject) => {
            ufRequest(command, function() {
                const response = ufResponse();
                
                if (response.Status && response.Status.indexOf("UFR_OK") !== -1) {
                    const uid = response.CardUid || response.Data;
                    utils.log(`Tag detected. UID: ${uid}`, 'success');
                    
                    // Update core state with minimal info, like original app
                    core.updateState({
                        isTagPresent: true,
                        scannedTagInfo: { uid: uid },
                        bandStatus: "Detected (Unregistered)" // Default status after scan
                    });
                    
                    // After successful scan, try to read username and update fields across the app
                    if (typeof ui !== 'undefined' && typeof ui.readUsernameAndUpdateFields === 'function') {
                        try {
                            // Don't await here since we want to resolve the UID immediately
                            // The UI updates will happen asynchronously
                            ui.readUsernameAndUpdateFields(uid);
                        } catch (error) {
                            utils.log(`Error reading username after scan: ${error.message}`, 'warning');
                            // Continue even if username read fails
                        }
                    }
                    
                    resolve(uid);
                } else {
                    utils.log("No tag detected or scan failed.", 'warning');
                    core.updateState({ 
                        isTagPresent: false,
                        scannedTagInfo: {},
                        bandStatus: "No Tag"
                    });
                    reject(new Error("Tag scan failed: " + response.Status));
                }
            });
        });
    },

    /**
     * Reads a single block from the MIFARE Classic card.
     * Uses linear/absolute addressing to access any block on the MIFARE Classic 4K card.
     * Handles authentication and data retrieval in one operation.
     * 
     * @param {number} sector - The sector number (0-39).
     * @param {number} block - The block number within the sector (0-3 for sectors 0-31, 0-15 for sectors 32-39).
     * @param {string} key - The 12-character hex key string (e.g., "FFFFFFFFFFFF").
     * @param {string} operationDesc - A description of the operation being performed (for logging).
     * @returns {Promise<string>} Resolves with the raw hex data string (without '0x').
     * @throws {Error} - If read operation fails.
     * 
     * Technical Notes:
     * - MIFARE Classic 4K has 40 sectors: sectors 0-31 have 4 blocks each, sectors 32-39 have 16 blocks each
     * - Block 3 in sectors 0-31 and block 15 in sectors 32-39 are sector trailers containing keys and access conditions
     * - Linear/absolute addressing maps: block = (sector * 4) + block for sectors 0-31
     *                                    block = 128 + ((sector - 32) * 16) + block for sectors 32-39
     * - Each block contains 16 bytes of data
     */
    readBlock: async function(sector, block, key, operationDesc = 'Block') {
        utils.log(`Executing read command for ${operationDesc} (Sector ${sector}, Block ${block}) with key ${key ? '[REDACTED]' : 'NONE'}...`, 'debug');

        // Calculate the absolute block address
        let absoluteBlock;
        if (sector <= 31) {
            absoluteBlock = (sector * 4) + block;
                    } else {
            absoluteBlock = 128 + ((sector - 32) * 16) + block;
        }

        try {
            // Use readFieldWithRetry but get only the raw hex, not converted to text
            const rawHexData = await this.readFieldWithRetryRaw(absoluteBlock.toString(), 2);
            utils.log(`Successfully read from Sector ${sector}, Block ${block} (Absolute: ${absoluteBlock})`, 'success');
            return rawHexData;
            } catch (error) {
            utils.log(`Failed to read ${operationDesc} (Sector ${sector}, Block ${block}): ${error.message}`, 'error');
            throw error;
        }
    },

    /**
     * Writes a 16-byte data block to the specified sector and block.
     * Uses linear/absolute addressing to access any data block on the MIFARE Classic 4K card.
     * Handles authentication, data formatting, and writing in one operation.
     *
     * @param {number} sector - The target sector number (0-39).
     * @param {number} block - The target block number within the sector (0-3 for sectors 0-31, 0-15 for sectors 32-39).
     * @param {string} data - The 16-byte data to write (as a UTF-8 string or hex).
     * @param {string} key - The 12-character hex key string (e.g., "FFFFFFFFFFFF").
     * @param {string} fieldDescription - A description of the field being written (for logging).
     * @param {number} [retryCount=2] - Maximum number of retries on failure.
     * @returns {Promise<boolean>} - True if write was successful.
     * @throws {Error} - If write operation fails.
     * 
     * Technical Notes:
     * - Data will be converted to hex and padded to 16 bytes (FF padding)
     * - Sector trailers (block 3 of each sector in sectors 0-31, block 15 in sectors 32-39) should NOT be written 
     *   with this method as they require special formatting for keys and access conditions
     * - The method uses the LinearWrite command which requires absolute block addressing
     * - IMPORTANT: Never write to block 0 of sector 0 (manufacturer data)
     */
    writeBlock: async function(sector, block, data, key, fieldDescription, retryCount = 2) {
        // Check if FIELD_MAP is defined
        if (typeof FIELD_MAP === 'undefined') {
            const errorMsg = "Error: FIELD_MAP is not defined. Ensure map.js is loaded before operations are called.";
            utils.log(errorMsg, 'error');
            throw new Error(errorMsg);
        }

        // Calculate the absolute block address
        let absoluteBlock;
        if (sector <= 31) {
            absoluteBlock = (sector * 4) + block;
        } else {
            absoluteBlock = 128 + ((sector - 32) * 16) + block;
        }

        try {
            // Always use writeFieldWithRetry with absolute addressing (LinearWrite)
            await this.writeFieldWithRetry(absoluteBlock.toString(), data, retryCount);
            utils.log(`Successfully wrote to Sector ${sector}, Block ${block} (Absolute: ${absoluteBlock})`, 'success');
            return true;
            } catch (error) {
            utils.log(`Failed to write ${fieldDescription} (Sector ${sector}, Block ${block}): ${error.message}`, 'error');
            throw error;
        }
    },

    // Potential future operations (Value blocks, Sector trailer modification)
    // readValueBlock: async function(blockAddress, key) { ... }
    // writeValueBlock: async function(blockAddress, value, key) { ... }
    // writeSectorTrailer: async function(sectorAddress, newKeyA, accessBits, newKeyB, key) { ... }

    /**
     * Reads the username from its designated block (240).
     * Block 240 is a standardized location for storing the user's name in this application.
     * 
     * @returns {Promise<string|null>} Username text or null if read fails.
     * @throws {Error} If the read operation fails after retry attempts
     * 
     * Technical Notes:
     * - Block 240 is located in Sector 60, Block 0 (large sector region)
     * - The username is stored as plain ASCII text
     * - Maximum username length is 16 characters (16 bytes per block)
     * - The method trims whitespace from the result for consistent display
     */
    readUsername: async function() {
        try {
            utils.log("Reading username from block 240...", 'info');
            
            // Read from block 240 using the same method as the original app
            const username = await this.readFieldWithRetry("240");
            utils.log("Successfully read username: " + username, 'success');
            
            // Return username (trimmed, as in the original app)
            return username.trim();
        } catch (error) {
            utils.log("Username read error: " + error, 'error');
            throw new Error("Failed to read username: " + error);
        }
    },

    /**
     * Writes the username to its designated block (240).
     * Ensures the username fits within the 16-byte block size constraint.
     * 
     * @param {string} username - The username to write (up to 16 characters).
     * @returns {Promise<void>} Resolves when write is complete.
     * @throws {Error} If write fails after retry attempts.
     * 
     * Technical Notes:
     * - If username exceeds 16 characters, it will be truncated
     * - Block 240 is in Sector 60, Block 0
     * - Data is automatically padded with FF bytes by the writeFieldWithRetry method
     * - Username is stored as plain ASCII text for compatibility
     */
    writeUsername: async function(username) {
        if (username.length > 16) {
            username = username.substring(0, 16);
        }
        
        try {
            utils.log("Writing username to block 240: " + username, 'info');
            
            // Write username to block 240 using the same method as the original app
            await this.writeFieldWithRetry("240", username);
            utils.log("Successfully wrote username", 'success');
        } catch (error) {
            utils.log("Username write error: " + error, 'error');
            throw new Error("Failed to write username: " + error);
        }
    },

    /**
     * Reads a faction field from the specified sector and block.
     * Used to retrieve faction-specific data from a tag.
     * 
     * @param {number} sector - The faction sector number
     * @param {number} block - The block number within the sector
     * @param {string} key - The key to use for authentication
     * @param {string} fieldName - Name of the field for logging
     * @returns {Promise<string>} The text data from the field
     * 
     * Technical Notes:
     * - Faction data is stored in blocks 0-2 of sectors 1-30 (avoiding sector trailers)
     * - Each faction uses a complete sector for its data
     * - This function converts the raw hex data to text for display
     * - The function follows the same pattern as readUsername for consistency
     */
    readFactionField: async function(sector, block, key, fieldName = 'Faction Field') {
        try {
            // Calculate absolute block
            let absoluteBlock;
            if (sector <= 31) {
                absoluteBlock = (sector * 4) + block;
            } else {
                absoluteBlock = 128 + ((sector - 32) * 16) + block;
            }
            
            utils.log(`Reading ${fieldName} from Sector ${sector}, Block ${block} (Absolute: ${absoluteBlock})...`, 'info');
            
            // Get sector-specific delay
            const sectorDelay = this.getSectorDelay(absoluteBlock);
            
            // CRITICAL FIX: For all faction blocks, use direct read approach
            // This ensures each block operation is completely isolated with its own authentication
            utils.log(`Using isolated read approach for ${fieldName}`, 'debug');
            
            // Step 1: Construct the read command with proper authentication
            const command = `LinearRead h ${absoluteBlock} 16 0x60 0`;
            utils.log(`Using command: ${command}`, 'debug');
            
            // Step 2: Execute with a proper delay BEFORE operation
            utils.log(`Using ${sectorDelay}ms delay before read operation`, 'debug');
            await utils.sleep(sectorDelay);
            
            // Step 3: Perform the read operation
            const rawHex = await new Promise((resolve, reject) => {
                ufRequest(command, function() {
                    const response = ufResponse();
                    
                    utils.log(`Read response: ${JSON.stringify(response)}`, 'debug');
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        let hexData = response.Data;
                        if (hexData.startsWith("0x") || hexData.startsWith("0X")) {
                            hexData = hexData.slice(2);
                        }
                        
                        utils.log(`Read successful! Raw hex: ${hexData}`, 'success');
                        
                        // Detailed hex analysis 
                        utils.log(`Hex data analysis:`, 'debug');
                        
                        // Convert each byte to character codes and ASCII
                        let byteAnalysis = '';
                        for (let i = 0; i < hexData.length; i += 2) {
                            if (i + 2 <= hexData.length) {
                                const byte = hexData.substring(i, i + 2);
                                const charCode = parseInt(byte, 16);
                                let char = '';
                                if (charCode >= 32 && charCode <= 126) { // Printable ASCII
                                    char = String.fromCharCode(charCode);
                                } else {
                                    char = '.'; // Non-printable
                                }
                                byteAnalysis += `${byte}(${charCode}='${char}') `;
                                
                                // Check for FF padding to help debugging
                                if (byte === 'FF' && i === 2) {
                                    utils.log(`WARNING: FF padding found after just 1 byte!`, 'warning');
                                }
                            }
                        }
                        
                        utils.log(byteAnalysis, 'debug');
                        
                        resolve(hexData);
                    } else {
                        utils.log(`Read failed: ${response.Status}`, 'error');
                        reject(new Error(`Read failed: ${response.Status}`));
                    }
                });
            });
            
            // Step 4: Add mandatory delay AFTER operation to allow card to stabilize
            utils.log(`Adding post-read stabilization delay (${sectorDelay/2}ms)`, 'debug');
            await utils.sleep(sectorDelay/2);
            
            // Step 5: Convert the raw hex to text
            const textData = utils.hexToText(rawHex);
            utils.log(`Successfully read ${fieldName}: "${textData}"`, 'success');
            
            // Return text data (trimmed, as in username)
            return textData.trim();
        } catch (error) {
            utils.log(`${fieldName} read error: ${error}`, 'error');
            throw new Error(`Failed to read ${fieldName}: ${error}`);
        }
    },

    /**
     * Writes a faction field to the specified sector and block.
     * Implementation follows the same pattern as writeUsername for consistency.
     * @param {number} sector - The faction sector number
     * @param {number} block - The block number within the sector
     * @param {string} data - The data to write (up to 16 characters)
     * @param {string} key - The key to use for authentication
     * @param {string} fieldName - Name of the field for logging
     * @returns {Promise<void>} Resolves when write is complete
     */
    writeFactionField: async function(sector, block, data, key, fieldName = 'Faction Field') {
        // Log the raw input data before any processing
        utils.log(`[DEBUG] Raw input to writeFactionField for ${fieldName}: "${data}" (length: ${data ? data.length : 0})`, 'debug');

        // Trim data to max length, like in writeUsername
        if (data && data.length > 16) {
            data = data.substring(0, 16);
        }

        utils.log(`[DEBUG] Trimmed input to writeFactionField for ${fieldName}: "${data}" (length: ${data ? data.length : 0})`, 'debug');
        
        try {
            // Calculate absolute block
            let absoluteBlock;
            if (sector <= 31) {
                absoluteBlock = (sector * 4) + block;
            } else {
                absoluteBlock = 128 + ((sector - 32) * 16) + block;
            }
            
            utils.log(`Writing ${fieldName} to Sector ${sector}, Block ${block} (Absolute: ${absoluteBlock}): ${data}`, 'info');
            
            // Get sector-specific delay
            const sectorDelay = this.getSectorDelay(absoluteBlock);
            
            // CRITICAL FIX: For all faction blocks, use direct write approach
            // This ensures each block operation is completely isolated with its own authentication
            utils.log(`Using isolated write approach for ${fieldName}`, 'debug');
            
            // Step 1: Convert text data to hex
            const hexData = utils.textToHex(data);
            utils.log(`Converting "${data}" to hex: ${hexData}`, 'debug');
            
            // Step 2: Pad the hex data properly
            const paddedHex = utils.padHex(hexData);
            utils.log(`Padded hex data: ${paddedHex}`, 'debug');
            
            // Step 3: Construct the command with proper authentication
            const command = `LinearWrite 0x${paddedHex} ${absoluteBlock} 16 0x60 0`;
            utils.log(`Using command: ${command}`, 'debug');
            
            // Step 4: Execute with a proper delay BEFORE operation
            utils.log(`Using ${sectorDelay}ms delay before write operation`, 'debug');
            await utils.sleep(sectorDelay);
            
            // Step 5: Perform the write operation
            await new Promise((resolve, reject) => {
                ufRequest(command, function() {
                    const response = ufResponse();
                    
                    utils.log(`Write response: ${JSON.stringify(response)}`, 'debug');
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        utils.log(`Write successful!`, 'success');
                        resolve();
                    } else {
                        utils.log(`Write failed: ${response.Status}`, 'error');
                        reject(new Error(`Write failed: ${response.Status}`));
                    }
                });
            });
            
            // Step 6: Add mandatory delay AFTER operation to allow card to stabilize
            utils.log(`Adding post-write stabilization delay (${sectorDelay}ms)`, 'debug');
            await utils.sleep(sectorDelay);
            
            // Step 7: Verify write with read back
            try {
                utils.log(`Verifying write with read back...`, 'debug');
                
                // Wait again before reading to ensure card stability
                await utils.sleep(sectorDelay / 2);
                
                // Construct a fresh read command with new authentication
                const readCommand = `LinearRead h ${absoluteBlock} 16 0x60 0`;
                
                const readHex = await new Promise((resolve, reject) => {
                    ufRequest(readCommand, function() {
                        const response = ufResponse();
                        
                        if (response.Status === "[0x00 (0)] UFR_OK") {
                            let hexData = response.Data;
                            if (hexData.startsWith("0x") || hexData.startsWith("0X")) {
                                hexData = hexData.slice(2);
                            }
                            utils.log(`Verification read successful: ${hexData}`, 'success');
                            resolve(hexData);
                        } else {
                            utils.log(`Verification read failed: ${response.Status}`, 'warning');
                            reject(new Error(`Verification read failed: ${response.Status}`));
                        }
                    });
                });
                
                // Check if the written data matches what was read
                if (readHex.substring(0, paddedHex.length).toUpperCase() === paddedHex.toUpperCase()) {
                    utils.log(`✓ Verification confirmed data was written correctly`, 'success');
                } else {
                    utils.log(`⚠ Verification shows data mismatch!`, 'warning');
                    utils.log(`  Wrote: ${paddedHex.toUpperCase()}`, 'warning');
                    utils.log(`  Read: ${readHex.substring(0, paddedHex.length).toUpperCase()}`, 'warning');
                }
            } catch (verifyError) {
                // Log but don't fail the operation if verification fails
                utils.log(`Verification read failed: ${verifyError.message}`, 'warning');
            }
            
            utils.log(`Successfully wrote ${fieldName}`, 'success');
        } catch (error) {
            utils.log(`${fieldName} write error: ${error}`, 'error');
            throw new Error(`Failed to write ${fieldName}: ${error}`);
        }
    },

    /**
     * Reads an allegiance field from the specified sector and block.
     * Implementation follows the same pattern as readUsername for consistency.
     * @param {number} sector - The allegiance sector number
     * @param {number} block - The block number within the sector
     * @param {string} key - The key to use for authentication
     * @param {string} fieldName - Name of the field for logging
     * @returns {Promise<string>} The text data from the field
     */
    readAllegianceField: async function(sector, block, key, fieldName = 'Allegiance Field') {
        try {
            // Calculate absolute block
            let absoluteBlock;
            if (sector <= 31) {
                absoluteBlock = (sector * 4) + block;
            } else {
                absoluteBlock = 128 + ((sector - 32) * 16) + block;
            }
            
            utils.log(`Reading ${fieldName} from Sector ${sector}, Block ${block} (Absolute: ${absoluteBlock})...`, 'info');
            
            // Get sector-specific delay
            const sectorDelay = this.getSectorDelay(absoluteBlock);
            
            // Use isolated read approach, same as faction fields
            utils.log(`Using isolated read approach for ${fieldName}`, 'debug');
            
            // Step 1: Construct the read command with proper authentication
            const command = `LinearRead h ${absoluteBlock} 16 0x60 0`;
            utils.log(`Using command: ${command}`, 'debug');
            
            // Step 2: Execute with a proper delay BEFORE operation
            utils.log(`Using ${sectorDelay}ms delay before read operation`, 'debug');
            await utils.sleep(sectorDelay);
            
            // Step 3: Perform the read operation
            const rawHex = await new Promise((resolve, reject) => {
                ufRequest(command, function() {
                    const response = ufResponse();
                    
                    utils.log(`Read response: ${JSON.stringify(response)}`, 'debug');
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        let hexData = response.Data;
                        if (hexData.startsWith("0x") || hexData.startsWith("0X")) {
                            hexData = hexData.slice(2);
                        }
                        
                        utils.log(`Read successful! Raw hex: ${hexData}`, 'success');
                        
                        // Detailed hex analysis for debugging
                        utils.log(`Hex data analysis:`, 'debug');
                        let byteAnalysis = '';
                        for (let i = 0; i < hexData.length; i += 2) {
                            if (i + 2 <= hexData.length) {
                                const byte = hexData.substring(i, i + 2);
                                const charCode = parseInt(byte, 16);
                                let char = '';
                                if (charCode >= 32 && charCode <= 126) { // Printable ASCII
                                    char = String.fromCharCode(charCode);
                                } else {
                                    char = '.'; // Non-printable
                                }
                                byteAnalysis += `${byte}(${charCode}='${char}') `;
                                
                                // Check for FF padding to help debugging
                                if (byte === 'FF' && i === 2) {
                                    utils.log(`WARNING: FF padding found after just 1 byte!`, 'warning');
                                }
                            }
                        }
                        utils.log(byteAnalysis, 'debug');
                        
                        resolve(hexData);
                    } else {
                        utils.log(`Read failed: ${response.Status}`, 'error');
                        reject(new Error(`Read failed: ${response.Status}`));
                    }
                });
            });
            
            // Step 4: Add mandatory delay AFTER operation to allow card to stabilize
            utils.log(`Adding post-read stabilization delay (${sectorDelay/2}ms)`, 'debug');
            await utils.sleep(sectorDelay/2);
            
            // Step 5: Convert the raw hex to text
            const textData = utils.hexToText(rawHex);
            utils.log(`Successfully read ${fieldName}: "${textData}"`, 'success');
            
            // Return text data (trimmed, as in username)
            return textData.trim();
        } catch (error) {
            utils.log(`${fieldName} read error: ${error}`, 'error');
            throw new Error(`Failed to read ${fieldName}: ${error}`);
        }
    },

    /**
     * Writes an allegiance field to the specified sector and block.
     * Implementation follows the same pattern as writeUsername for consistency.
     * @param {number} sector - The allegiance sector number
     * @param {number} block - The block number within the sector
     * @param {string} data - The data to write (up to 16 characters)
     * @param {string} key - The key to use for authentication
     * @param {string} fieldName - Name of the field for logging
     * @returns {Promise<void>} Resolves when write is complete
     */
    writeAllegianceField: async function(sector, block, data, key, fieldName = 'Allegiance Field') {
        // Trim data to max length, like in writeUsername
        if (data && data.length > 16) {
            data = data.substring(0, 16);
        }
        
        try {
            // Calculate absolute block
            let absoluteBlock;
            if (sector <= 31) {
                absoluteBlock = (sector * 4) + block;
            } else {
                absoluteBlock = 128 + ((sector - 32) * 16) + block;
            }
            
            utils.log(`Writing ${fieldName} to Sector ${sector}, Block ${block} (Absolute: ${absoluteBlock}): ${data}`, 'info');
            
            // Get sector-specific delay
            const sectorDelay = this.getSectorDelay(absoluteBlock);
            
            // Use isolated write approach, same as faction fields
            utils.log(`Using isolated write approach for ${fieldName}`, 'debug');
            
            // Step 1: Convert text data to hex
            const hexData = utils.textToHex(data);
            utils.log(`Converting "${data}" to hex: ${hexData}`, 'debug');
            
            // Step 2: Pad the hex data properly
            const paddedHex = utils.padHex(hexData);
            utils.log(`Padded hex data: ${paddedHex}`, 'debug');
            
            // Step 3: Construct the command with proper authentication
            const command = `LinearWrite 0x${paddedHex} ${absoluteBlock} 16 0x60 0`;
            utils.log(`Using command: ${command}`, 'debug');
            
            // Step 4: Execute with a proper delay BEFORE operation
            utils.log(`Using ${sectorDelay}ms delay before write operation`, 'debug');
            await utils.sleep(sectorDelay);
            
            // Step 5: Perform the write operation
            await new Promise((resolve, reject) => {
                ufRequest(command, function() {
                    const response = ufResponse();
                    
                    utils.log(`Write response: ${JSON.stringify(response)}`, 'debug');
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        utils.log(`Write successful!`, 'success');
                        resolve();
                    } else {
                        utils.log(`Write failed: ${response.Status}`, 'error');
                        reject(new Error(`Write failed: ${response.Status}`));
                    }
                });
            });
            
            // Step 6: Add mandatory delay AFTER operation to allow card to stabilize
            utils.log(`Adding post-write stabilization delay (${sectorDelay}ms)`, 'debug');
            await utils.sleep(sectorDelay);
            
            // Step 7: Verify write with read back
            try {
                utils.log(`Verifying write with read back...`, 'debug');
                
                // Wait again before reading to ensure card stability
                await utils.sleep(sectorDelay / 2);
                
                // Construct a fresh read command with new authentication
                const readCommand = `LinearRead h ${absoluteBlock} 16 0x60 0`;
                
                const readHex = await new Promise((resolve, reject) => {
                    ufRequest(readCommand, function() {
                        const response = ufResponse();
                        
                        if (response.Status === "[0x00 (0)] UFR_OK") {
                            let hexData = response.Data;
                            if (hexData.startsWith("0x") || hexData.startsWith("0X")) {
                                hexData = hexData.slice(2);
                            }
                            utils.log(`Verification read successful: ${hexData}`, 'success');
                            resolve(hexData);
                        } else {
                            utils.log(`Verification read failed: ${response.Status}`, 'warning');
                            reject(new Error(`Verification read failed: ${response.Status}`));
                        }
                    });
                });
                
                // Check if the written data matches what was read
                if (readHex.substring(0, hexData.length).toUpperCase() === hexData.toUpperCase()) {
                    utils.log(`✓ Verification confirmed data was written correctly`, 'success');
                } else {
                    utils.log(`⚠ Verification shows data mismatch!`, 'warning');
                    utils.log(`  Wrote: ${hexData.toUpperCase()}`, 'warning');
                    utils.log(`  Read: ${readHex.substring(0, hexData.length).toUpperCase()}`, 'warning');
                }
            } catch (verifyError) {
                // Log but don't fail the operation if verification fails
                utils.log(`Verification read failed: ${verifyError.message}`, 'warning');
            }
            
            utils.log(`Successfully wrote ${fieldName}`, 'success');
        } catch (error) {
            utils.log(`${fieldName} write error: ${error}`, 'error');
            throw new Error(`Failed to write ${fieldName}: ${error}`);
        }
    }
}; // End of operations object definition

// Add these new functions to operations directly with absolute block addressing
// These functions are for backward compatibility with existing code using absolute block addresses

/**
 * Reads a block using LinearRead method with key index 0 (for registration page).
 * Uses absolute block addressing (0-255) compatible with the original app.
 * 
 * @param {number} blockNumber - The absolute block number (0-255)
 * @param {string} key - The 12-character hex key (unused, kept for compatibility)
 * @returns {Promise<string>} The hex data from the block
 */
operations.readAbsoluteBlock = async function(blockNumber, key) {
    utils.log(`Reading block ${blockNumber}...`, 'info');
    
    // Format block number as hex
    const blockHex = blockNumber.toString(16).padStart(2, '0');
    
    // Command format from original Neoband App: "LinearRead h [address] 16[auth_mode] [key_index]"
    // Note the subtle difference - the auth_mode has no space before it
    const auth_mode = " 0x60"; // Space before auth mode matches original app
    const key_index = "0";
    const command = `LinearRead h ${blockHex} 16${auth_mode} ${key_index}`;
    
    return new Promise((resolve, reject) => {
        ufRequest(command, function() {
            const response = ufResponse();
            
            if (response.Status && response.Status.indexOf("UFR_OK") !== -1) {
                const hexData = response.Data;
                utils.log(`Read successful from block ${blockNumber}: ${hexData}`, 'success');
                resolve(hexData);
            } else {
                utils.log(`Read failed for block ${blockNumber}: ${response.Status}`, 'error');
                reject(new Error("Read failed: " + response.Status));
            }
        });
    });
};

/**
 * Writes to a block using LinearWrite method with key index 0 (for registration page).
 * Uses absolute block addressing (0-255) compatible with the original app.
 * 
 * @param {number} blockNumber - The absolute block number (0-255)
 * @param {string} data - The string data to write
 * @param {string} key - The 12-character hex key (unused, kept for compatibility)
 * @returns {Promise<boolean>} True if successful
 */
operations.writeAbsoluteBlock = async function(blockNumber, data, key) {
    utils.log(`Writing to block ${blockNumber}...`, 'info');
    
    // Convert data to hex if it's not already
    const hexData = typeof data === 'string' && !data.startsWith('0x') ? 
        utils.textToHex(data) : data;
    
    // Format block number as hex
    const blockHex = blockNumber.toString(16).padStart(2, '0');
    
    // Command format from original Neoband App: "LinearWrite 0x[hexData] [address] 16[auth_mode] [key_index]"
    // Note the address is not preceded by 'h'
    const auth_mode = " 0x60"; // Space before auth mode matches original app
    const key_index = "0";
    const command = `LinearWrite 0x${hexData} ${blockHex} 16${auth_mode} ${key_index}`;
    
    return new Promise((resolve, reject) => {
        ufRequest(command, function() {
            const response = ufResponse();
            
            if (response.Status && response.Status.indexOf("UFR_OK") !== -1) {
                utils.log(`Write successful to block ${blockNumber}`, 'success');
                resolve(true);
            } else {
                utils.log(`Write failed for block ${blockNumber}: ${response.Status}`, 'error');
                reject(new Error("Write failed: " + response.Status));
            }
        });
    });
};

/**
 * Gets the appropriate delay for a specific block based on its sector type
 * @param {number} blockNumber - The absolute block number
 * @returns {number} The delay in milliseconds
 */
operations.getSectorDelay = function(blockNumber) {
    // Convert block number to sector
    const addrInfo = utils.calculateMifareAddress(blockNumber);
    const sector = addrInfo.sector;
    
    // Determine sector type
    let sectorType = 'default';
    
    // Sectors 1-15, 17-31 are faction sectors
    if ((sector >= 1 && sector <= 15) || (sector >= 17 && sector <= 31)) {
        sectorType = 'faction';
    }
    // Sectors 36-38 are allegiance sectors
    else if (sector >= 36 && sector <= 38) {
        sectorType = 'allegiance';
    }
    // Sector 39 is user data
    else if (sector === 39) {
        sectorType = 'user';
    }
    
    // Get delay from core configuration or use default
    const delay = core.SECTOR_DELAYS[sectorType] || core.SECTOR_DELAYS.default;
    
    utils.log(`Using ${delay}ms delay for block ${blockNumber} (Sector ${sector}, type: ${sectorType})`, 'debug');
    return delay;
};

/**
 * Reads a block using LinearRead method with retry mechanism, returning raw hex data
 * This version doesn't convert hex to text, to avoid double conversion issues
 * 
 * @param {string|number} address - The absolute block number (0-255)
 * @param {number} retryCount - Maximum number of retries on failure (default: 3)
 * @returns {Promise<string>} The raw hex data from the block (without conversion to text)
 */
operations.readFieldWithRetryRaw = async function(address, retryCount = 3) {
    // Convert block number to string if it's not already
    address = address.toString();
    
    utils.log(`Reading from address ${address}...`, 'info');
    
    // Validate the address before proceeding
    const blockNumber = parseInt(address);
    const addrInfo = utils.calculateMifareAddress(blockNumber);
    
    // Get sector-specific delay
    const sectorDelay = this.getSectorDelay(blockNumber);
    
    // DEBUGGING: Add detailed sector information
    utils.log(`Reading from sector ${addrInfo.sector}, block ${addrInfo.blockInSector} (Absolute: ${blockNumber})`, 'debug');
    if (blockNumber === 240) {
        utils.log(`This is a USERNAME block`, 'debug');
    } else if (addrInfo.sector === 1) {
        utils.log(`This is a FACTION block`, 'debug');
    } else if (addrInfo.sector >= 36 && addrInfo.sector <= 38) {
        utils.log(`This is an ALLEGIANCE block`, 'debug');
    }
    
    // Prepare authentication parameters for the command
    const auth_mode = " 0x60"; // Space before auth mode matches original app
    const key_index = "0";
    
    // Log the sector we're accessing for debugging
    utils.log(`Reading from address ${address} (Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector})`, 'info');
    utils.log(`Using auth mode: 0x60, delay: ${sectorDelay}ms`, 'info');
    
    let attempts = 0;
    const maxAttempts = retryCount + 1; // Initial attempt + retries
    
    // Add an initial delay before first attempt and extra delay for allegiance sectors
    const initialDelay = addrInfo.sector >= 36 && addrInfo.sector <= 38 ? sectorDelay * 1.5 : sectorDelay;
    utils.log(`Using ${initialDelay}ms delay for read operation from block ${blockNumber}`, 'debug');
    await utils.sleep(initialDelay);
    
    while (attempts < maxAttempts) {
        try {
            // Build the command with proper authentication parameters
            const readCommand = `LinearRead h ${address} 16${auth_mode} ${key_index}`;
            utils.log(`Command to be executed: ${readCommand}`, 'debug');
            
            if (attempts > 0) {
                // Progressive backoff for retries
                const backoffMultiplier = addrInfo.sector >= 36 && addrInfo.sector <= 38 ? 2.5 : 1.5;
                const backoffDelay = Math.min(sectorDelay * backoffMultiplier, 5000);
                utils.log(`Retry attempt ${attempts}/${retryCount} after ${backoffDelay}ms delay...`, 'info');
                await utils.sleep(backoffDelay);
            }
            
            // Perform the read operation with the proper command
            const rawHex = await new Promise((resolve, reject) => {
                ufRequest(readCommand, function() {
                    const response = ufResponse();
                    
                    // DEBUGGING: Log the full response
                    utils.log(`Read response: ${JSON.stringify(response)}`, 'debug');
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        let hexData = response.Data;
                        if (hexData.startsWith("0x") || hexData.startsWith("0X")) {
                            hexData = hexData.slice(2);
                        }
                        
                        // Log the raw hex data before conversion
                        utils.log(`Read successful from address ${address}: ${hexData}`, 'success');
                        
                        // DEBUGGING: Analyze the hex data
                        let byteLog = '';
                        for (let i = 0; i < hexData.length; i += 2) {
                            if (i + 2 <= hexData.length) {
                                byteLog += hexData.substring(i, i + 2) + ' ';
                                if ((i/2 + 1) % 8 === 0) byteLog += '| ';
                            }
                        }
                        utils.log(`Read hex bytes: ${byteLog}`, 'debug');
                        
                        // DEBUGGING: Check if we got truncated data
                        if (hexData.length < 32) {
                            utils.log(`WARNING: Read data is shorter than expected (${hexData.length} chars)`, 'warning');
                        }
                        
                        // Check for unusual patterns
                        if (hexData.indexOf('FF') === 2) {
                            utils.log(`WARNING: FF padding starts after just 1 byte (single character)!`, 'warning');
                        }
                        
                        // Return the raw hex data without conversion
                        resolve(hexData);
                    } else if (response.Status && response.Status.includes("UFR_AUTH_ERROR") && attempts === 0) {
                        // Try with Key B on first auth error (like original app)
                        utils.log(`Auth failed with Key A for address ${address}, trying Key B...`, 'warning');
                        reject({ tryKeyB: true, status: response.Status });
                    } else {
                        utils.log(`Read failed for address ${address}: ${response.Status}`, 'warning');
                        reject(new Error(`Read failed: ${response.Status}`));
                    }
                });
            });
            
            // Special handling for allegiance fields - ensure proper logging
            if (addrInfo.sector >= 36 && addrInfo.sector <= 38) {
                utils.log(`Additional validation for allegiance sector ${addrInfo.sector}`, 'debug');
                utils.log(`Raw hex data: ${rawHex}`, 'debug');
            }
            
            // Return the raw hex data without conversion
            return rawHex;
            
        } catch (error) {
            // Check if we should try with Key B
            if (error.tryKeyB) {
                try {
                    // Try with Key B authentication
                    await utils.sleep(sectorDelay); // Use sector-specific delay before trying Key B
                    const keyB_command = `LinearRead h ${address} 16 0x61 ${key_index}`;
                    
                    const rawHex = await new Promise((resolve, reject) => {
                        ufRequest(keyB_command, function() {
                            const response = ufResponse();
                            
                            if (response.Status === "[0x00 (0)] UFR_OK") {
                                let hexData = response.Data;
                                if (hexData.startsWith("0x") || hexData.startsWith("0X")) {
                                    hexData = hexData.slice(2);
                                }
                                utils.log(`Read successful from address ${address} using Key B: ${hexData}`, 'success');
                                resolve(hexData);
                            } else {
                                utils.log(`Read failed with Key B for address ${address}: ${response.Status}`, 'warning');
                                reject(new Error(`Read failed with both Key A and Key B at address ${address}: ${response.Status}`));
                            }
                        });
                    });
                    
                    // Same special handling for Key B reads
                    if (addrInfo.sector >= 36 && addrInfo.sector <= 38) {
                        utils.log(`Additional validation for allegiance sector ${addrInfo.sector} (Key B)`, 'debug');
                        utils.log(`Raw hex data (Key B): ${rawHex}`, 'debug');
                    }
                    
                    // Return the raw hex without conversion
                    return rawHex;
                    
                } catch (keyBError) {
                    // Both Key A and Key B failed, continue with normal retry
                }
            }
            
            attempts++;
            
            // If we've exhausted all retries, throw the final error
            if (attempts >= maxAttempts) {
                utils.log(`Read failed permanently for address ${address} after ${retryCount} retries`, 'error');
                throw new Error(`Read failed after ${retryCount} retries: ${error.message || error}`);
            }
        }
    }
},

/**
 * Reads a block using LinearRead method with retry mechanism, matching original Neoband App behavior
 * Uses absolute block addressing (0-255)
 * 
 * @param {string|number} address - The absolute block number (0-255)
 * @param {number} retryCount - Maximum number of retries on failure (default: 3)
 * @returns {Promise<string>} The text data from the block
 */
operations.readFieldWithRetry = async function(address, retryCount = 3) {
    // Get the raw hex data first
    const rawHex = await this.readFieldWithRetryRaw(address, retryCount);
    
    // Convert the raw hex to text using enhanced hexToText function
    const text = utils.hexToText(rawHex);
    
    // Special logging for allegiance sectors
    const blockNumber = parseInt(address);
    const addrInfo = utils.calculateMifareAddress(blockNumber);
    if (addrInfo.sector >= 36 && addrInfo.sector <= 38) {
        if (!text || text.length === 0) {
            utils.log(`Warning: Empty text result from non-empty hex data in sector ${addrInfo.sector}`, 'warning');
        }
    }
    
    return text;
};

/**
 * Writes to a block using LinearWrite method with retry mechanism, matching original Neoband App behavior
 * Uses absolute block addressing (0-255)
 * 
 * @param {string|number} address - The absolute block number (0-255)
 * @param {string} text - The text data to write
 * @param {number} retryCount - Maximum number of retries on failure (default: 3)
 * @returns {Promise<void>} Resolves when write is complete
 */
operations.writeFieldWithRetry = async function(address, text, retryCount = 3) {
    // Convert block number to string if it's not already
    address = address.toString();
    
    utils.log(`Writing to address ${address}...`, 'info');
    
    // Validate the address
    const blockNumber = parseInt(address);
    const addrInfo = utils.calculateMifareAddress(blockNumber);
    
    // Get sector-specific delay
    const sectorDelay = this.getSectorDelay(blockNumber);
    
    // DEBUGGING: Add detailed sector information
    utils.log(`Writing to sector ${addrInfo.sector}, block ${addrInfo.blockInSector} (Absolute: ${blockNumber})`, 'debug');
    if (blockNumber === 240) {
        utils.log(`This is a USERNAME block`, 'debug');
    } else if (addrInfo.sector === 1) {
        utils.log(`This is a FACTION block`, 'debug');
    } else if (addrInfo.sector >= 36 && addrInfo.sector <= 38) {
        utils.log(`This is an ALLEGIANCE block`, 'debug');
    }
    
    // Prepare authentication parameters for the command
    const auth_mode = " 0x60"; // Space before auth mode matches original app
    const key_index = "0";
    
    // Log the sector we're accessing for debugging
    utils.log(`Writing to address ${address} (Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector})`, 'info');
    utils.log(`Using auth mode: 0x60, delay: ${sectorDelay}ms`, 'info');
    
    // DEBUGGING: Log the input text details
    if (text) {
        utils.log(`Input text details:`, 'debug');
        utils.log(`  Length: ${text.length} characters`, 'debug');
        utils.log(`  Content: "${text}"`, 'debug');
        const textBytes = [...text].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        utils.log(`  Bytes: ${textBytes}`, 'debug');
    } else {
        utils.log(`Input text is empty or null`, 'debug');
    }
    
    // Enhanced text-to-hex conversion for Neoband compatibility
    // First, convert input text to proper hex representation
    let hexData = "";
    if (text) {
        // Ensure we're working with a string
        const textStr = String(text || "");
        
        // Limit to max length for a block (16 chars)
        const limitedText = textStr.slice(0, utils.MAX_TEXT_LENGTH);
        
        // Convert to hex using the utility function
        hexData = utils.textToHex(limitedText);
        
        utils.log(`Converting "${limitedText}" to hex: ${hexData}`, 'debug');
    }
    
    // Ensure consistent padding - always pad to 32 hex chars (16 bytes) with FF
    const originalHexData = hexData;
    hexData = utils.padHex(hexData);
    utils.log(`Padded hex data: ${hexData}`, 'debug');
    
    // DEBUGGING: Check for specific issues
    if (originalHexData.length !== hexData.length) {
        utils.log(`Padding added ${hexData.length - originalHexData.length} bytes`, 'debug');
    }
    
    let attempts = 0;
    const maxAttempts = retryCount + 1; // Initial attempt + retries
    
    // Add an initial delay before first attempt and extra delay for allegiance sectors
    const initialDelay = addrInfo.sector >= 36 && addrInfo.sector <= 38 ? sectorDelay * 1.5 : sectorDelay;
    
    utils.log(`Using ${initialDelay}ms delay for write operation to block ${blockNumber}`, 'debug');
    await utils.sleep(initialDelay);
    
    while (attempts < maxAttempts) {
        try {
            // Build the command with proper authentication parameters
            const writeCommand = `LinearWrite 0x${hexData} ${address} 16${auth_mode} ${key_index}`;
            utils.log(`Command to be executed: ${writeCommand}`, 'debug');
            
            if (attempts > 0) {
                // Progressive backoff for retries
                const backoffMultiplier = addrInfo.sector >= 36 && addrInfo.sector <= 38 ? 2.5 : 1.5;
                const backoffDelay = Math.min(sectorDelay * backoffMultiplier, 5000);
                utils.log(`Retry attempt ${attempts}/${retryCount} after ${backoffDelay}ms delay...`, 'info');
                await utils.sleep(backoffDelay);
            }
            
            // Perform the write operation with the proper command
            await new Promise((resolve, reject) => {
                ufRequest(writeCommand, function() {
                    const response = ufResponse();
                    
                    // DEBUGGING: Log the full response
                    utils.log(`Write response: ${JSON.stringify(response)}`, 'debug');
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        utils.log(`Write successful to address ${address}`, 'success');
                        resolve(true);
                    } else if (response.Status && response.Status.includes("UFR_AUTH_ERROR") && attempts === 0) {
                        // Try with Key B on first auth error (like original app)
                        utils.log(`Auth failed with Key A for address ${address}, trying Key B...`, 'warning');
                        reject({ tryKeyB: true, status: response.Status });
                    } else {
                        utils.log(`Write failed for address ${address}: ${response.Status}`, 'warning');
                        reject(new Error(`Write failed: ${response.Status}`));
                    }
                });
            });
            
            // DEBUGGING: Verify the write with a read back if we want to be extra careful
            if (blockNumber === 4 || blockNumber === 240) { // Only for faction Block 0 or username
                try {
                    utils.log(`Verifying write with immediate read back...`, 'debug');
                    const readBack = await this.readFieldWithRetryRaw(address, 1);
                    utils.log(`Read back hex: ${readBack}`, 'debug');
                    
                    // Compare with what we tried to write
                    if (readBack.substring(0, originalHexData.length).toUpperCase() === originalHexData.toUpperCase()) {
                        utils.log(`Verification successful - data matches what was written`, 'success');
                    } else {
                        utils.log(`WARNING: Read back data differs from what was written!`, 'warning');
                        utils.log(`  Wrote: ${originalHexData.toUpperCase()}`, 'warning');
                        utils.log(`  Read:  ${readBack.substring(0, originalHexData.length).toUpperCase()}`, 'warning');
                        utils.log(`  Full:  ${readBack}`, 'warning');
                    }
                } catch (verifyError) {
                    utils.log(`Verification read failed: ${verifyError.message}`, 'warning');
                }
            }
            
            return; // Success, exit the function
            
        } catch (error) {
            // Check if we should try with Key B
            if (error.tryKeyB) {
                try {
                    // Try with Key B authentication
                    await utils.sleep(sectorDelay); // Use sector-specific delay before trying Key B
                    const keyB_command = `LinearWrite 0x${hexData} ${address} 16 0x61 ${key_index}`;
                    
                    await new Promise((resolve, reject) => {
                        ufRequest(keyB_command, function() {
                            const response = ufResponse();
                            
                            if (response.Status === "[0x00 (0)] UFR_OK") {
                                utils.log(`Write successful to address ${address} using Key B`, 'success');
                                resolve();
                            } else {
                                utils.log(`Write failed with Key B for address ${address}: ${response.Status}`, 'warning');
                                reject(new Error(`Write failed with both Key A and Key B at address ${address}: ${response.Status}`));
                            }
                        });
                    });
                    
                    return; // Success with Key B, exit the function
                } catch (keyBError) {
                    // Both Key A and Key B failed, continue with normal retry
                }
            }
            
            attempts++;
            
            // If we've exhausted all retries, throw the final error
            if (attempts >= maxAttempts) {
                utils.log(`Write failed permanently for address ${address} after ${retryCount} retries`, 'error');
                throw new Error(`Write failed after ${retryCount} retries: ${error.message || error}`);
            }
        }
    }
}; 