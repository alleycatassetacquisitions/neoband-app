/**
 * operations.js
 * Handles NFC communication logic (read/write operations) using the uFR API.
 */

/**
 * Resets the authentication state of the card reader and card.
 * This helps isolate operations and prevent data bleeding between blocks.
 * @returns {Promise<void>}
 */
async function resetAuth() {
    return new Promise((resolve, reject) => {
        // First try with ReaderReset which completely resets the reader state
        ufRequest("ReaderReset", function() {
            const response = ufResponse();
            
            if (response.Status === "[0x00 (0)] UFR_OK") {
                utils.log(`Reader reset successful`, 'debug');
                resolve();
            } else {
                // If ReaderReset fails, try to reset auth state with ReaderKeyWrite
                utils.log(`Reader reset failed: ${response.Status}, trying auth reset`, 'debug');
                
                // ReaderSoftRestart is a more gentle way to reset authentication
                ufRequest("ReaderSoftRestart", function() {
                    const softResponse = ufResponse();
                    
                    if (softResponse.Status === "[0x00 (0)] UFR_OK") {
                        utils.log(`Auth reset successful`, 'debug');
                        resolve();
                    } else {
                        // Even if soft restart fails, continue and try to reopen the reader
                        utils.log(`Auth reset failed: ${softResponse.Status}, trying to reopen reader`, 'debug');
                        
                        // ReaderOpen is the last resort to reset everything
                        ufRequest("ReaderOpen", function() {
                            const reopenResponse = ufResponse();
                            
                            if (reopenResponse.Status === "[0x00 (0)] UFR_OK") {
                                utils.log(`Reader reopened successfully`, 'debug');
                                resolve();
                            } else {
                                // If even reopen fails, log but resolve anyway to continue with operations
                                utils.log(`Reader reopen failed: ${reopenResponse.Status}, continuing anyway`, 'warning');
                                resolve();
                            }
                        });
                    }
                });
            }
        });
    });
}

var operations = {
    AUTH_MODE_A: ' 0x60', // MIFARE_AUTHENT1A
    AUTH_MODE_B: ' 0x61', // MIFARE_AUTHENT1B
    // DEFAULT_KEY_INDEX: 0, // No longer needed as we use _PK
    // Note: PK authentication (providing the key directly) is not implemented here
    // as the requirement is to use the stored key "FFFFFFFFFFFF".

    /**
     * Scans for a tag and updates the core application state.
     * @returns {Promise<Object>} Resolves with the scanned tag info or rejects on error.
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
     * Reads data from a block with complete authentication reset before and after
     * @param {number} sector - The sector number
     * @param {number} block - The block number within the sector
     * @param {string} key - The key for the sector (hex format)
     * @param {boolean} [rawData=false] - Whether to return raw hex data (true) or convert to text (false)
     * @param {string} [description=""] - Optional description for logging
     * @returns {Promise<string>} - Promise resolving to the block data (text or hex)
     */
    readBlock: function(sector, block, key, rawData = false, description = "") {
        return new Promise(async (resolve, reject) => {
            const blockAddress = this.calculateBlockAddress(sector, block);
            const delay = this.getSectorDelay(sector);
            
            logger.log(`Reading block ${blockAddress} (Sector ${sector}, Block ${block}) for ${description} with ${delay}ms delay`);
            
            // Reset card session before read to ensure clean authentication
            try {
                await this.resetCardSession();
                logger.log(`Card session reset complete before reading ${description}`);
            } catch (e) {
                logger.error(`Failed to reset card session before reading ${description}`, e);
                // Continue anyway as it might still work
            }
            
            try {
                const readCmd = `LinearRead ${blockAddress} 1 ${key} NCU`;
                logger.log(`Executing command: ${readCmd}`);
                
                nfc.executeCommand(readCmd, (status, data) => {
                    if (status === 0) {
                        logger.log(`Successfully read ${description}: ${data}`);
                        setTimeout(() => resolve(data), delay);
                    } else {
                        const errorMsg = `Failed to read ${description} (status: ${status})`;
                        logger.error(errorMsg);
                        setTimeout(() => reject(new Error(errorMsg)), delay);
                    }
                });
            } catch (error) {
                logger.error(`Exception reading ${description}: ${error}`);
                reject(error);
            }
        });
    },

    /**
     * Writes data to a block with complete authentication reset before and after
     * @param {number} sector - The sector number
     * @param {number} block - The block number within the sector
     * @param {string} data - The data to write (text, will be converted to hex)
     * @param {string} key - The key for the sector (hex format)
     * @param {string} [description=""] - Optional description for logging
     * @returns {Promise<boolean>} - Promise resolving to true if successful
     */
    writeBlock: function(sector, block, data, key, description = "") {
        return new Promise(async (resolve, reject) => {
            try {
                const blockAddress = this.calculateBlockAddress(sector, block);
                const hexData = utils.isHex(data) ? data : utils.textToHex(data);
                const paddedHexData = utils.padHexString(hexData);
                const delay = this.getSectorDelay(sector);
                
                logger.log(`Writing to block ${blockAddress} (Sector ${sector}, Block ${block}) for ${description} with ${delay}ms delay`);
                logger.log(`Input data: "${data}", converted to hex: "${hexData}", padded: "${paddedHexData}"`);
                
                // Reset card session before write to ensure clean authentication
                try {
                    await this.resetCardSession();
                    logger.log(`Card session reset complete before writing ${description}`);
                } catch (e) {
                    logger.error(`Failed to reset card session before writing ${description}`, e);
                    // Continue anyway as it might still work
                }
                
                const writeCmd = `LinearWrite ${blockAddress} ${paddedHexData} ${key} NCU`;
                logger.log(`Executing command: ${writeCmd}`);
                
                nfc.executeCommand(writeCmd, (status, responseData) => {
                    if (status === 0) {
                        logger.log(`Successfully wrote ${description}`);
                        setTimeout(() => resolve(true), delay);
                    } else {
                        const errorMsg = `Failed to write ${description} (status: ${status})`;
                        logger.error(errorMsg);
                        setTimeout(() => reject(new Error(errorMsg)), delay);
                    }
                });
            } catch (error) {
                logger.error(`Exception writing ${description}: ${error.message}`, error);
                reject(error);
            }
        });
    },

    // Potential future operations (Value blocks, Sector trailer modification)
    // readValueBlock: async function(blockAddress, key) { ... }
    // writeValueBlock: async function(blockAddress, value, key) { ... }
    // writeSectorTrailer: async function(sectorAddress, newKeyA, accessBits, newKeyB, key) { ... }

    /**
     * Reads the username from the card (block 240)
     * @returns {Promise<string>} - Username read from the card
     */
    readUsername: function() {
        return new Promise((resolve, reject) => {
            logger.log("[operations.readUsername] Reading username from block 240");
            
            // Block 240 is in sector 60, block 0
            this.readBlock(60, 0, KEYS.USER_KEY, false, "Username")
                .then(textData => {
                    logger.log("[operations.readUsername] Username read successfully: " + textData);
                    resolve(textData.trim());
                })
                .catch(error => {
                    logger.log("[operations.readUsername] ERROR reading username: " + error.message, error);
                    reject(error);
                });
        });
    },

    /**
     * Writes the username to its designated block (240).
     * Implementation matches the original Neoband App exactly.
     * @param {string} username - The username to write (up to 16 characters).
     * @returns {Promise<void>} Resolves when write is complete.
     * @throws {Error} If write fails.
     */
    writeUsername: async function(username) {
        if (username.length > 16) {
            username = username.substring(0, 16);
        }
        
        try {
            utils.log("Writing username to block 240: " + username, 'info');
            
            // CRITICAL FIX: Add a complete authentication reset before username write
            utils.log(`Performing authentication reset before username write`, 'debug');
            await resetAuth();
            
            // Calculate absolute block
            const absoluteBlock = 240;
            
            // Get sector-specific delay
            const sectorDelay = this.getSectorDelay(absoluteBlock);
            
            // Convert text to hex
            const hexData = utils.textToHex(username);
            utils.log(`Converting "${username}" to hex: ${hexData}`, 'debug');
            
            // Pad the hex data
            const paddedHex = utils.padHex(hexData);
            utils.log(`Padded hex data: ${paddedHex}`, 'debug');
            
            // Construct command
            const command = `LinearWrite 0x${paddedHex} ${absoluteBlock} 16 0x60 0`;
            utils.log(`Using command: ${command}`, 'debug');
            
            // Execute with a proper delay
            utils.log(`Using ${sectorDelay}ms delay before write operation`, 'debug');
            await utils.sleep(sectorDelay);
            
            // Perform the write operation
            await new Promise((resolve, reject) => {
                ufRequest(command, function() {
                    const response = ufResponse();
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        utils.log(`Write successful to address 240`, 'success');
                        resolve();
                    } else {
                        utils.log(`Write failed for address 240: ${response.Status}`, 'error');
                        reject(new Error(`Write failed: ${response.Status}`));
                    }
                });
            });
            
            // Add stabilization delay
            await utils.sleep(sectorDelay);
            
            // Reset authentication after write
            utils.log(`Performing authentication reset after username write`, 'debug');
            await resetAuth();
            
            // Verify with read back
            try {
                utils.log(`Verifying username write with read back...`, 'debug');
                
                // Reset authentication before verification read
                await resetAuth();
                
                // Read back for verification
                const verifiedUsername = await this.readUsername();
                if (verifiedUsername === username.trim()) {
                    utils.log(`✓ Username verification confirmed data was written correctly`, 'success');
                } else {
                    utils.log(`⚠ Username verification shows mismatch! Wrote: ${username}, Read: ${verifiedUsername}`, 'warning');
                }
            } catch (verifyError) {
                utils.log(`Username verification read failed: ${verifyError.message}`, 'warning');
            }
            
            utils.log("Successfully wrote username", 'success');
        } catch (error) {
            utils.log("Username write error: " + error, 'error');
            throw new Error("Failed to write username: " + error);
        }
    },

    /**
     * Reads faction field data by field name
     * @param {string} fieldName - The name of the field to read
     * @returns {Promise<string>} - Text data read from the faction field
     */
    readFactionField: function(fieldName) {
        return new Promise((resolve, reject) => {
            try {
                if (!FACTION_FIELDS[fieldName]) {
                    throw new Error("Unknown faction field: " + fieldName);
                }
                
                const fieldConfig = FACTION_FIELDS[fieldName];
                logger.log("[operations.readFactionField] Reading faction field " + fieldName + " from sector " + 
                          fieldConfig.sector + ", block " + fieldConfig.block);
                
                this.readBlock(fieldConfig.sector, fieldConfig.block, fieldConfig.key, false, "Faction " + fieldName)
                    .then(textData => {
                        logger.log("[operations.readFactionField] Faction field " + fieldName + " read successfully: " + textData);
                        resolve(textData.trim());
                    })
                    .catch(error => {
                        logger.log("[operations.readFactionField] ERROR reading faction field " + fieldName + ": " + error.message, error);
                        reject(error);
                    });
            } catch (error) {
                logger.log("[operations.readFactionField] CRITICAL ERROR: " + error.message, error);
                reject(error);
            }
        });
    },

    /**
     * Reads allegiance field data by field name
     * @param {string} fieldName - The name of the field to read
     * @returns {Promise<string>} - Text data read from the allegiance field
     */
    readAllegianceField: function(fieldName) {
        return new Promise((resolve, reject) => {
            try {
                if (!ALLEGIANCE_FIELDS[fieldName]) {
                    throw new Error("Unknown allegiance field: " + fieldName);
                }
                
                const fieldConfig = ALLEGIANCE_FIELDS[fieldName];
                logger.log("[operations.readAllegianceField] Reading allegiance field " + fieldName + " from sector " + 
                          fieldConfig.sector + ", block " + fieldConfig.block);
                
                this.readBlock(fieldConfig.sector, fieldConfig.block, fieldConfig.key, false, "Allegiance " + fieldName)
                    .then(textData => {
                        logger.log("[operations.readAllegianceField] Allegiance field " + fieldName + " read successfully: " + textData);
                        resolve(textData.trim());
                    })
                    .catch(error => {
                        logger.log("[operations.readAllegianceField] ERROR reading allegiance field " + fieldName + ": " + error.message, error);
                        reject(error);
                    });
            } catch (error) {
                logger.log("[operations.readAllegianceField] CRITICAL ERROR: " + error.message, error);
                reject(error);
            }
        });
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
            
            // CRITICAL FIX: Add a complete authentication reset before each operation
            utils.log(`Performing authentication reset before write operation`, 'debug');
            await resetAuth();
            
            // CRITICAL FIX: For all faction blocks, use direct write approach with isolation
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
            
            // CRITICAL FIX: Add another authentication reset after the operation
            utils.log(`Performing authentication reset after write operation`, 'debug');
            await resetAuth();
            
            // Step 7: Verify write with read back (with its own auth cycle)
            try {
                utils.log(`Verifying write with read back...`, 'debug');
                
                // Wait again before reading to ensure card stability
                await utils.sleep(sectorDelay / 2);
                
                // CRITICAL FIX: Reset authentication again before verification read
                await resetAuth();
                
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
                
                // CRITICAL FIX: Reset authentication again after verification read
                await resetAuth();
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
            
            // CRITICAL FIX: Add a complete authentication reset before each operation
            utils.log(`Performing authentication reset before allegiance read operation`, 'debug');
            await resetAuth();
            
            // Use isolated read approach with authentication reset
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
                    } else {
                        utils.log(`Read failed: ${response.Status}`, 'error');
                        reject(new Error(`Read failed: ${response.Status}`));
                    }
                });
            });
            
            // Step 4: Add mandatory delay AFTER operation to allow card to stabilize
            utils.log(`Adding post-read stabilization delay (${sectorDelay/2}ms)`, 'debug');
            await utils.sleep(sectorDelay/2);
            
            // CRITICAL FIX: Add another authentication reset after the operation
            utils.log(`Performing authentication reset after allegiance read operation`, 'debug');
            await resetAuth();
            
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
            
            // CRITICAL FIX: Add a complete authentication reset before each operation
            utils.log(`Performing authentication reset before allegiance write operation`, 'debug');
            await resetAuth();
            
            // Use isolated write approach with authentication reset
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
            
            // CRITICAL FIX: Add another authentication reset after the operation
            utils.log(`Performing authentication reset after allegiance write operation`, 'debug');
            await resetAuth();
            
            // Step 7: Verify write with read back (with its own auth cycle)
            try {
                utils.log(`Verifying write with read back...`, 'debug');
                
                // Wait again before reading to ensure card stability
                await utils.sleep(sectorDelay / 2);
                
                // Reset authentication again before verification read
                await resetAuth();
                
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
                
                // Reset authentication again after verification read
                await resetAuth();
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
     * Resets the authentication state of the card reader and card.
     * This helps isolate operations and prevent data bleeding between blocks.
     * @returns {Promise<void>}
     */
    resetCardSession: async function() {
        utils.log("Resetting card session for clean authentication state", 'debug');
        return resetAuth();
    }
}; // End of operations object definition

// Add these new functions to operations directly with absolute block addressing

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
 * Gets the appropriate delay time for a given sector
 * @param {number} sector - The sector number
 * @returns {number} - Delay in milliseconds
 */
operations.getSectorDelay = function(sector) {
    // Use longer delays for more reliable operation
    // Especially important for faction and allegiance sectors
    if (sector === 1 || (sector >= 1 && sector <= 15)) {
        // Faction sectors
        return 2900;
    } else if (sector >= 36 && sector <= 38) {
        // Allegiance sectors
        return 2900;
    } else if (sector === 39) {
        // User data sector
        return 600;
    } else {
        // Default for other sectors
        return 600;
    }
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
    
    // Add an initial delay before first attempt (like the original app)
    await utils.sleep(sectorDelay);
    
    while (attempts < maxAttempts) {
        try {
            // Progressive backoff for retries
            if (attempts > 0) {
                const backoffMultiplier = addrInfo.sector === 36 ? 2.0 : 1.5;
                const backoffDelay = Math.min(sectorDelay * backoffMultiplier, 5000);
                utils.log(`Retry attempt ${attempts}/${retryCount} after ${backoffDelay}ms delay...`, 'info');
                await utils.sleep(backoffDelay);
            }
            
            // Build command exactly as in the original app
            const command = `LinearRead h ${address} 16${auth_mode} ${key_index}`;
            
            const rawHex = await new Promise((resolve, reject) => {
                ufRequest(command, function() {
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
    
    // DEBUGGING: Check the command format
    const command = `LinearWrite 0x${hexData} ${address} 16${auth_mode} ${key_index}`;
    utils.log(`Command to be executed: ${command}`, 'debug');
    
    let attempts = 0;
    const maxAttempts = retryCount + 1; // Initial attempt + retries
    
    // Add an initial delay before first attempt (like the original app)
    await utils.sleep(sectorDelay);
    
    while (attempts < maxAttempts) {
        try {
            // Progressive backoff for retries
            if (attempts > 0) {
                const backoffMultiplier = addrInfo.sector === 36 ? 2.0 : 1.5;
                const backoffDelay = Math.min(sectorDelay * backoffMultiplier, 5000);
                utils.log(`Retry attempt ${attempts}/${retryCount} after ${backoffDelay}ms delay...`, 'info');
                await utils.sleep(backoffDelay);
            }
            
            // Execute command and check response
            const result = await new Promise((resolve, reject) => {
                ufRequest(command, function() {
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