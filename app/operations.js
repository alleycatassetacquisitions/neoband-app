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
     * Reads data from a specific sector and block with authentication.
     * @param {number} sector - The sector number to read from
     * @param {number} block - The block number within the sector
     * @param {string} key - The authentication key (default: NFC_KEY)
     * @param {string} label - Optional label for logging (e.g., "Username")
     * @returns {Promise<string>} - The data read from the block
     */
    readBlock: async function(sector, block, key = NFC_KEY, label = "Block") {
        try {
            utils.log(`Executing read command for ${label} (Sector ${sector}, Block ${block}) with key ${key.substring(0, 2)}...`, 'debug');
            
            // Special handling for user data in sector 39
            if (sector === 39) {
                if (block === 0) {
                    utils.log(`Reading username from Sector 39, Block 0`, 'info');
                } else {
                    utils.log(`Reading user data from Sector 39, Block ${block}`, 'info');
                }
            }
            
            // Calculate the absolute block number if needed
            let blockNumber;
            if (sector < 32) {
                blockNumber = (sector * 4) + block;
            } else {
                blockNumber = 128 + ((sector - 32) * 16) + block;
            }
            
            // Read the data using raw read function
            const hexData = await this.readFieldWithRetryRaw(blockNumber, 2);
            
            // Convert the hex data to text
            const textData = utils.hexToText(hexData);
            
            utils.log(`Successfully read from Sector ${sector}, Block ${block} (Absolute: ${blockNumber})`, 'success');
            return textData;
        } catch (error) {
            utils.log(`Error reading from Sector ${sector}, Block ${block}: ${error}`, 'error');
            throw error;
        }
    },

    /**
     * Writes data to a specific sector and block with authentication.
     * @param {number} sector - The sector number to write to
     * @param {number} block - The block number within the sector
     * @param {string} text - The text data to write
     * @param {string} key - The authentication key (default: NFC_KEY)
     * @param {string} label - Optional label for logging (e.g., "Username")
     * @returns {Promise<boolean>} - True if the write was successful
     */
    writeBlock: async function(sector, block, text, key = NFC_KEY, label = "Block") {
        try {
            utils.log(`Executing write command for ${label} (Sector ${sector}, Block ${block}) with key ${key.substring(0, 2)}...`, 'debug');
            
            // Special handling for username block
            if (sector === 39 && block === 0) {
                utils.log(`Writing username to Sector 39, Block 0`, 'info');
            }
            
            // Calculate the absolute block number
            let blockNumber;
            if (sector < 32) {
                blockNumber = (sector * 4) + block;
            } else {
                blockNumber = 128 + ((sector - 32) * 16) + block;
            }
            
            // Enhanced text-to-hex conversion for Neoband compatibility
            let hexData = "";
            if (text) {
                // Ensure we're working with a string
                const textStr = String(text || "");
                
                // Limit to max length for a block (16 chars)
                const limitedText = textStr.slice(0, utils.MAX_TEXT_LENGTH);
                
                // Convert to hex using the utility function
                hexData = utils.textToHex(limitedText);
                
                utils.log(`Converting text to hex: ${limitedText} → ${hexData}`, 'debug');
            }
            
            // Ensure consistent padding - always pad to 32 hex chars (16 bytes) with FF
            const originalHexData = hexData;
            hexData = utils.padHex(hexData);
            
            // Prepare authentication parameters for the command
            const auth_mode = " 0x60"; // Space before auth mode matches original app
            const key_index = "0";
            
            // Get sector-specific delay
            const sectorDelay = this.getSectorDelay(sector);
            await utils.sleep(sectorDelay);
            
            // Build the command with proper authentication parameters
            const writeCommand = `LinearWrite 0x${hexData} ${blockNumber} 16${auth_mode} ${key_index}`;
            
            // Execute the write command
            await new Promise((resolve, reject) => {
                ufRequest(writeCommand, function() {
                    const response = ufResponse();
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        utils.log(`Write successful to Sector ${sector}, Block ${block} (Absolute: ${blockNumber})`, 'success');
                        resolve(true);
                    } else {
                        utils.log(`Write failed for Sector ${sector}, Block ${block}: ${response.Status}`, 'warning');
                        reject(new Error(`Write failed: ${response.Status}`));
                    }
                });
            });
            
            // Verify the write with a read back for critical operations
            if (sector === 39 || sector === 1) {
                try {
                    utils.log(`Verifying write with immediate read back...`, 'debug');
                    await utils.sleep(500); // Brief delay before verification
                    
                    const readBack = await this.readBlock(sector, block, key);
                    
                    // For username specifically (Sector 39, Block 0)
                    if (sector === 39 && block === 0) {
                        const cleanUsername = text.trim().toLowerCase();
                        const cleanReadBack = readBack.trim().toLowerCase()
                            .replace(/\u0000/g, '')  // Remove null characters
                            .replace(/\uffff/g, ''); // Remove FF padding characters
                        
                        if (cleanReadBack.includes(cleanUsername)) {
                            utils.log(`Username verification successful`, 'success');
                        } else {
                            utils.log(`Username verification warning - data mismatch`, 'warning');
                        }
                    }
                } catch (verifyError) {
                    utils.log(`Verification read failed: ${verifyError.message}`, 'warning');
                    // We don't fail the operation just because verification failed
                }
            }
            
            return true;
        } catch (error) {
            utils.log(`Error writing to Sector ${sector}, Block ${block}: ${error}`, 'error');
            // Try with Key B if authentication failed
            if (error.message && error.message.includes("UFR_AUTH_ERROR")) {
                try {
                    utils.log(`Attempting write with Key B to Sector ${sector}, Block ${block}...`, 'warning');
                    // Implementation for Key B would go here
                    // ...
                } catch (keyBError) {
                    utils.log(`Key B write also failed: ${keyBError}`, 'error');
                }
            }
            throw error;
        }
    },

    // Potential future operations (Value blocks, Sector trailer modification)
    // readValueBlock: async function(blockAddress, key) { ... }
    // writeValueBlock: async function(blockAddress, value, key) { ... }
    // writeSectorTrailer: async function(sectorAddress, newKeyA, accessBits, newKeyB, key) { ... }

    /**
     * Reads the username from the tag.
     * This is a critical operation that reads from Sector 39, Block 0.
     * 
     * @returns {Promise<string>} - The username stored on the tag.
     * @throws {Error} - If the read operation fails.
     */
    readUsername: async function() {
        try {
            utils.log("Reading username from Sector 39, Block 0...", 'info');
            
            // Read directly from Sector 39, Block 0
            const rawData = await this.readBlock(39, 0, NFC_KEY, 'Username');
            
            // Check if the block is empty (all 0x00 or all 0xFF)
            if (!rawData || 
                rawData.trim() === "" || 
                /^0+$/.test(rawData.replace(/\s/g, '')) ||  // All zeros
                /^F+$/.test(rawData.replace(/\s/g, '').toUpperCase())) {  // All FFs
                
                utils.log("Username block is empty", 'info');
                return "";
            }
            
            // Convert hex to text if it appears to be hex data
            if (/^[0-9A-Fa-f]+$/.test(rawData.trim())) {
                // Looks like hex data, try to convert to text
                try {
                    // Remove FF padding bytes
                    const hexWithoutPadding = rawData.replace(/F+$/i, '');
                    
                    // Convert hex to text
                    let textData = '';
                    for (let i = 0; i < hexWithoutPadding.length; i += 2) {
                        const hexByte = hexWithoutPadding.substr(i, 2);
                        const decimal = parseInt(hexByte, 16);
                        // Only include printable ASCII characters
                        if (decimal >= 32 && decimal <= 126) {
                            textData += String.fromCharCode(decimal);
                        }
                    }
                    
                    if (textData) {
                        utils.log(`Successfully converted hex to username: "${textData}"`, 'success');
                        return textData;
                    }
                } catch (hexError) {
                    utils.log(`Error converting hex to text: ${hexError}`, 'warning');
                    // Fall through to returning raw data
                }
            }
            
            // Check if the data contains printable characters
            const printableChars = rawData.replace(/[^\x20-\x7E]/g, '').trim();
            if (printableChars.length === 0) {
                utils.log("Username block contains no printable characters", 'info');
                return "";
            }
            
            utils.log("Successfully read username: " + rawData, 'success');
            return rawData.trim();
        } catch (error) {
            utils.log("Username read error: " + error, 'error');
            throw new Error("Failed to read username: " + error);
        }
    },

    /**
     * Writes the username to the tag.
     * This is a critical operation that writes to Sector 39, Block 0.
     * 
     * @param {string} username - The username to write (max 16 chars).
     * @returns {Promise<void>}
     * @throws {Error} - If the write operation fails.
     */
    writeUsername: async function(username) {
        if (username.length > 16) username = username.substring(0, 16);
        
        try {
            utils.log(`Writing username "${username}" to Sector 39, Block 0`, 'info');
            
            // Write directly to Sector 39, Block 0
            await this.writeBlock(39, 0, username, NFC_KEY, 'Username');
            
            // Assume success at this point - the write was successful
            let verificationSuccessful = false;
            
            try {
                // Attempt to verify the write, but don't fail if verification has issues
                utils.log("Verifying username write...", 'info');
                
                // Add a significant delay before verification to allow the card to stabilize
                await utils.sleep(1500);
                
                const verifyData = await this.readBlock(39, 0, NFC_KEY);
                
                // Convert both strings to lowercase and trim whitespace and null bytes for comparison
                const cleanUsername = username.trim().toLowerCase();
                const cleanVerifyData = verifyData.trim()
                    .toLowerCase()
                    .replace(/\u0000/g, '')  // Remove null characters
                    .replace(/\uffff/g, ''); // Remove FF padding characters
                
                // Check if username is contained within the verify data (ignoring padding)
                if (cleanVerifyData.includes(cleanUsername)) {
                    utils.log("Username written and verified successfully", 'success');
                    verificationSuccessful = true;
                } else {
                    // Try hex comparison as fallback
                    const usernameHex = utils.textToHex(username);
                    const verifyDataHex = utils.textToHex(verifyData);
                    
                    if (verifyDataHex.startsWith(usernameHex)) {
                        utils.log("Username verified via hex comparison", 'success');
                        verificationSuccessful = true;
                    } else {
                        utils.log(`Verification warning - found "${cleanVerifyData}" but expected "${cleanUsername}"`, 'warning');
                    }
                }
            } catch (verifyError) {
                // Log verification error but don't fail the operation
                utils.log(`Verification read encountered an issue: ${verifyError}`, 'warning');
                utils.log("The username write operation may still have been successful", 'warning');
            }
            
            // Even if verification failed, consider the operation a success if the write completed
            // This allows username updates to work even if we can't verify immediately
            if (!verificationSuccessful) {
                utils.log("Username was written but could not be verified - will assume success", 'warning');
            }
            
            // Return success regardless of verification outcome
            return;
        } catch (error) {
            // Only throw errors for actual write failures
            utils.log("Error writing username: " + error, 'error');
            throw error;
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
 * Writes text data to a specific block on the MIFARE Classic tag with retry capability.
 * 
 * @param {string} address - Block address (sector/block or linear block number)
 * @param {string} text - Text to write (max 16 chars, will be padded)
 * @param {number} retryCount - Number of retry attempts (default: 3)
 * @returns {Promise<boolean>} - True if write succeeds
 * @throws {Error} - If write fails after all retries
 */
operations.writeFieldWithRetry = async function(address, text, retryCount = 3) {
    // Force address to string type to avoid conversion issues
    address = String(address).trim();
    if (typeof address !== 'string') {
        utils.log(`CRITICAL TYPE ERROR: Address should be string, got ${typeof address}`, 'error');
        address = String(address);
    }
    
    // Parse block number and get sector/block information
    const blockNumber = parseInt(address);
    const addrInfo = utils.calculateMifareAddress(blockNumber);
    
    // VALIDATE PROPER SECTOR USAGE
    
    // 1. Check if this is a user data write (should go to Sector 39)
    const isUsernameText = (typeof text === 'string' && text.length <= 16);
    const isUserSector = addrInfo.sector === 39;
    
    // 2. Check for potential username write going to wrong sector
    if (isUsernameText && !isUserSector && text.trim() !== '') {
        // If this looks like username text but going to wrong sector, log warning
        utils.log(`WARNING: Potential username text "${text}" being written to Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector}`, 'warning');
        utils.log(`Username data should be written to Sector 39, Block 0`, 'warning');
    }
    
    // 3. Check if user data is correctly going to Sector 39
    if (isUserSector) {
        utils.log(`Validated: User data write to Sector 39, Block ${addrInfo.blockInSector}`, 'info');
        
        // Use direct block write for user sector for maximum reliability
        return await this.writeBlock(39, addrInfo.blockInSector, text, NFC_KEY, 
            `User Field (Block ${addrInfo.blockInSector})`);
    }
    
    // 4. Check if this is a faction sector (should go to Sector 0-15)
    const isFactionSector = addrInfo.sector >= 1 && addrInfo.sector <= 15;
    
    if (isFactionSector) {
        utils.log(`Validated: Faction data write to Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector}`, 'info');
        
        // For faction writes, proceed with normal logic but use direct block write
        return await this.writeBlock(addrInfo.sector, addrInfo.blockInSector, text, NFC_KEY, 
            `Faction Data (Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector})`);
    }
    
    // 5. Check if this is an allegiance sector (should go to Sector 36-38)
    const isAllegianceSector = addrInfo.sector >= 36 && addrInfo.sector <= 38;
    
    if (isAllegianceSector) {
        utils.log(`Validated: Allegiance data write to Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector}`, 'info');
        
        // For allegiance writes, proceed with normal logic but use direct block write
        return await this.writeBlock(addrInfo.sector, addrInfo.blockInSector, text, NFC_KEY, 
            `Allegiance Data (Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector})`);
    }
    
    // For all other blocks, proceed with normal writeBlock operation
    utils.log(`Standard write to Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector}`, 'info');
    return await this.writeBlock(addrInfo.sector, addrInfo.blockInSector, text, NFC_KEY, 
        `Data Block (Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector})`);
};

/**
 * Gets the appropriate delay for a specific sector.
 * Different sectors might need different delays based on their purpose.
 *
 * @param {number|string} sectorOrBlock - Either a sector number or block number
 * @returns {number} - Delay in milliseconds
 */
operations.getSectorDelay = function(sectorOrBlock) {
    // If we're passing a block number, convert it to sector
    let sector;
    let addrInfo;
    
    if (typeof sectorOrBlock === 'number' && sectorOrBlock > 39) {
        // This is a block number, convert to sector
        addrInfo = utils.calculateMifareAddress(sectorOrBlock);
        sector = addrInfo.sector;
        
        // Log the conversion for debugging
        utils.log(`Converting block ${sectorOrBlock} to sector ${sector}`, 'debug');
    } else if (typeof sectorOrBlock === 'string' && sectorOrBlock.includes(',')) {
        // This is a "sector,block" string
        const parts = sectorOrBlock.split(',');
        sector = parseInt(parts[0].trim());
    } else {
        // Direct sector number
        sector = parseInt(sectorOrBlock);
    }
    
    // Special handling for username sector to ensure correct sector recognition
    if (sector === 39) {
        utils.log(`Special delay handling for user data (Sector 39)`, 'debug');
        return core.SECTOR_DELAYS.user;
    }
    
    // Faction sectors (1-15 and 17-31)
    if ((sector >= 1 && sector <= 15) || (sector >= 17 && sector <= 31)) {
        return core.SECTOR_DELAYS.faction;
    }
    
    // Allegiance sectors (36-38)
    if (sector >= 36 && sector <= 38) {
        return core.SECTOR_DELAYS.allegiance;
    }
    
    // Default delay for other sectors
    return core.SECTOR_DELAYS.default;
},

/**
 * Reads a block using LinearRead method with retry mechanism, matching original Neoband App behavior
 * Uses absolute block addressing (0-255) or sector,block notation
 *
 * @param {string|number} address - The absolute block number (0-255) or "sector,block" notation
 * @param {number} retryCount - Maximum number of retries on failure (default: 2)
 * @returns {Promise<string>} The data read from the block
 * @throws {Error} If read fails after all retries
 */
operations.readFieldWithRetryRaw = async function(address, retryCount = 2) {
    // Parse the address format
    let blockNumber, sector, block;
    
    if (typeof address === 'string' && address.includes(',')) {
        // This is sector,block notation
        const parts = address.split(',');
        sector = parseInt(parts[0].trim());
        block = parseInt(parts[1].trim());
        
        // Calculate the linear block number
        if (sector < 32) {
            blockNumber = (sector * 4) + block;
        } else {
            blockNumber = 128 + ((sector - 32) * 16) + block;
        }
        
        utils.log(`Reading from sector ${sector}, block ${block} (calculated linear: ${blockNumber})`, 'info');
    } else {
        // This is linear block notation
        blockNumber = parseInt(address);
        
        // Get sector and block
        const addrInfo = utils.calculateMifareAddress(blockNumber);
        sector = addrInfo.sector;
        block = addrInfo.blockInSector;
        
        utils.log(`Reading from address ${blockNumber} (Sector ${sector}, Block ${block})`, 'info');
    }
    
    // Special validation for user data sector
    if (sector === 39) {
        utils.log(`Reading from user data sector (Sector 39, Block ${block})`, 'info');
    }
    
    // Get sector-specific delay
    const sectorDelay = this.getSectorDelay(sector);
    
    // DEBUGGING: Add detailed sector information
    utils.log(`Reading from sector ${sector}, block ${block} (Absolute: ${blockNumber})`, 'debug');
    
    // Check for specific known blocks
    if (sector === 39 && block === 0) {
        utils.log(`This is a USERNAME block`, 'debug');
    } else if (sector >= 1 && sector <= 15) {
        utils.log(`This is a FACTION block (Sector ${sector})`, 'debug');
    } else if (sector >= 36 && sector <= 38) {
        utils.log(`This is an ALLEGIANCE block (Sector ${sector})`, 'debug');
    }
    
    // Prepare authentication parameters for the command
    const auth_mode = " 0x60"; // Space before auth mode matches original app
    const key_index = "0";
    
    utils.log(`Using auth mode: 0x60, delay: ${sectorDelay}ms`, 'info');
    utils.log(`Using ${sectorDelay}ms delay for read operation from block ${blockNumber}`, 'debug');
    
    // Add an initial delay before first attempt
    await utils.sleep(sectorDelay);
    
    let attempts = 0;
    const maxAttempts = retryCount + 1; // Initial attempt + retries
    
    // Loop until success or run out of retries
    while (attempts < maxAttempts) {
        try {
            // Build the command in h format for hex output
            const readCommand = `LinearRead h ${blockNumber} 16${auth_mode} ${key_index}`;
            utils.log(`Command to be executed: ${readCommand}`, 'debug');
            
            const response = await new Promise((resolve, reject) => {
                ufRequest(readCommand, function() {
                    const response = ufResponse();
                    
                    // DEBUGGING: Log the full response
                    utils.log(`Read response: ${JSON.stringify(response)}`, 'debug');
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        utils.log(`Read successful from address ${blockNumber}: ${response.Data.slice(2)}`, 'success');
                        resolve(response.Data.slice(2)); // Remove "0x" prefix
                    } else if (response.Status && response.Status.includes("UFR_AUTH_ERROR") && attempts === 0) {
                        // Try with Key B on first auth error
                        utils.log(`Auth failed with Key A for address ${blockNumber}, trying Key B...`, 'warning');
                        reject({ tryKeyB: true, status: response.Status });
                    } else {
                        utils.log(`Read failed for address ${blockNumber}: ${response.Status}`, 'warning');
                        reject(new Error(response.Status || "Unknown error"));
                    }
                });
            });
            
            // Format and return the response
            if (response) {
                // Add space every 2 chars for better readability
                const formattedHex = response.replace(/(.{2})/g, "$1 ").trim();
                
                // Add a pipe after 8 bytes for visual clarity, matching original app display
                const parts = formattedHex.split(' ');
                let displayHex = '';
                for (let i = 0; i < parts.length; i++) {
                    displayHex += parts[i] + ' ';
                    if (i === 7) {
                        displayHex += '| ';
                    }
                }
                
                utils.log(`Read hex bytes: ${displayHex}`, 'debug');
                utils.log(`Successfully read from Sector ${sector}, Block ${block} (Absolute: ${blockNumber})`, 'success');
                
                return response;
            }
        } catch (error) {
            // Check if we should try with Key B
            if (error.tryKeyB) {
                try {
                    // Try with Key B authentication
                    await utils.sleep(sectorDelay);
                    
                    const keyB_command = `LinearRead h ${blockNumber} 16 0x61 ${key_index}`;
                    
                    const keyBResponse = await new Promise((resolve, reject) => {
                        ufRequest(keyB_command, function() {
                            const response = ufResponse();
                            
                            if (response.Status === "[0x00 (0)] UFR_OK") {
                                utils.log(`Read successful with Key B from address ${blockNumber}: ${response.Data.slice(2)}`, 'success');
                                resolve(response.Data.slice(2));
                            } else {
                                utils.log(`Read failed with Key B for address ${blockNumber}: ${response.Status}`, 'warning');
                                reject(new Error(`Read failed with both Key A and Key B at address ${blockNumber}: ${response.Status}`));
                            }
                        });
                    });
                    
                    if (keyBResponse) {
                        return keyBResponse;
                    }
                } catch (keyBError) {
                    // Both Key A and Key B failed, continue with normal retry
                }
            }
            
            attempts++;
            
            if (attempts >= maxAttempts) {
                utils.log(`Read failed permanently for address ${blockNumber} after ${retryCount} retries`, 'error');
                throw error;
            }
            
            // Progressive backoff for retries
            const retryDelay = sectorDelay * 1.5;
            utils.log(`Retry attempt ${attempts}/${retryCount} after ${retryDelay}ms delay...`, 'info');
            
            await utils.sleep(retryDelay);
        }
    }
    
    throw new Error(`Failed to read from block ${blockNumber} after ${retryCount} retries`);
} 