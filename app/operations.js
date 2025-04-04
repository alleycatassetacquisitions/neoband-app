/**
 * operations.js
 * Handles NFC communication logic (read/write operations) using the uFR API.
 */

const operations = {
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
     * Reads a single block from the MIFARE Classic card.
     * Now always uses absolute addressing with LinearRead for consistent behavior.
     * @param {number} sector - The sector number (0-39).
     * @param {number} block - The block number within the sector (0-3 or 0-15).
     * @param {string} key - The 12-character hex key string (e.g., "FFFFFFFFFFFF").
     * @param {string} operationDesc - A description of the operation being performed (for logging).
     * @returns {Promise<string>} Resolves with the block data as a hex string (without '0x').
     * @throws {Error} - If read operation fails.
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
            // Always use readFieldWithRetry with absolute addressing (LinearRead)
            const hexData = await this.readFieldWithRetry(absoluteBlock.toString(), 2);
            utils.log(`Successfully read from Sector ${sector}, Block ${block} (Absolute: ${absoluteBlock})`, 'success');
            return hexData;
            } catch (error) {
            utils.log(`Failed to read ${operationDesc} (Sector ${sector}, Block ${block}): ${error.message}`, 'error');
            throw error;
        }
    },

    /**
     * Writes a 16-byte data block to the specified sector and block.
     * Now always uses absolute addressing with LinearWrite for consistent behavior.
     *
     * @param {number} sector - The target sector number.
     * @param {number} block - The target block number within the sector.
     * @param {string} data - The 16-byte data to write (as a UTF-8 string or hex).
     * @param {string} key - The 12-character hex key string (e.g., "FFFFFFFFFFFF").
     * @param {string} fieldDescription - A description of the field being written (for logging).
     * @param {number} [retryCount=2] - Maximum number of retries on failure.
     * @returns {Promise<boolean>} - True if write was successful.
     * @throws {Error} - If write operation fails.
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
     * Implementation matches the original Neoband App exactly.
     * @returns {Promise<string|null>} Username text or null if read fails.
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
            
            // Write username to block 240 using the same method as the original app
            await this.writeFieldWithRetry("240", username);
            utils.log("Successfully wrote username", 'success');
        } catch (error) {
            utils.log("Username write error: " + error, 'error');
            throw new Error("Failed to write username: " + error);
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
 * Reads a block using LinearRead method with retry mechanism, matching original Neoband App behavior
 * Uses absolute block addressing (0-255)
 * 
 * @param {string|number} address - The absolute block number (0-255)
 * @param {number} retryCount - Maximum number of retries on failure (default: 3)
 * @returns {Promise<string>} The hex data from the block
 */
operations.readFieldWithRetry = async function(address, retryCount = 3) {
    // Convert block number to string if it's not already
    address = address.toString();
    
    utils.log(`Reading from address ${address}...`, 'info');
    
    // Validate the address before proceeding
    const blockNumber = parseInt(address);
    const addrInfo = utils.calculateMifareAddress(blockNumber);
    
    // Get sector-specific delay
    const sectorDelay = this.getSectorDelay(blockNumber);
    
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
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        let hexData = response.Data;
                        if (hexData.startsWith("0x") || hexData.startsWith("0X")) {
                            hexData = hexData.slice(2);
                        }
                        // Log the raw hex data before conversion
                        utils.log(`Read successful from address ${address}: ${hexData}`, 'success');
                        
                        // Return the raw hex data - we'll convert it properly later
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
            
            // Special handling for allegiance fields - ensure proper conversion
            // When reading from allegiance sectors (36-38), perform additional data validation
            if (addrInfo.sector >= 36 && addrInfo.sector <= 38) {
                utils.log(`Additional validation for allegiance sector ${addrInfo.sector}`, 'debug');
                
                // Log raw hex data for debugging
                utils.log(`Raw hex data before conversion: ${rawHex}`, 'debug');
            }
            
            // Convert the raw hex to text using enhanced hexToText function
            const text = utils.hexToText(rawHex);
            
            // Sector-specific logging for troubleshooting
            if (addrInfo.sector >= 36 && addrInfo.sector <= 38) {
                if (!text || text.length === 0) {
                    utils.log(`Warning: Empty text result from non-empty hex data in sector ${addrInfo.sector}`, 'warning');
                }
            }
            
            return text;
            
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
                        utils.log(`Raw hex data before conversion (Key B): ${rawHex}`, 'debug');
                    }
                    
                    // Convert the raw hex to text
                    const text = utils.hexToText(rawHex);
                    
                    // Sector-specific logging for troubleshooting
                    if (addrInfo.sector >= 36 && addrInfo.sector <= 38) {
                        if (!text || text.length === 0) {
                            utils.log(`Warning: Empty text result from non-empty hex data in sector ${addrInfo.sector} (Key B)`, 'warning');
                        }
                    }
                    
                    return text;
                    
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
    
    // Prepare authentication parameters for the command
    const auth_mode = " 0x60"; // Space before auth mode matches original app
    const key_index = "0";
    
    // Log the sector we're accessing for debugging
    utils.log(`Writing to address ${address} (Sector ${addrInfo.sector}, Block ${addrInfo.blockInSector})`, 'info');
    utils.log(`Using auth mode: 0x60, delay: ${sectorDelay}ms`, 'info');
    
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
    hexData = utils.padHex(hexData);
    utils.log(`Padded hex data: ${hexData}`, 'debug');
    
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
            const command = `LinearWrite 0x${hexData} ${address} 16${auth_mode} ${key_index}`;
            
            await new Promise((resolve, reject) => {
                ufRequest(command, function() {
                    const response = ufResponse();
                    
                    if (response.Status === "[0x00 (0)] UFR_OK") {
                        utils.log(`Write successful to address ${address}`, 'success');
                        resolve();
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