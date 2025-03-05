/**
 * MIFARE Helper Functions for Neoband App
 * 
 * This file provides a set of helper functions for interacting with MIFARE cards
 * through the D-Logic UFR API. It simplifies common operations like authentication,
 * reading, writing, and formatting specifically for the Neoband app's requirements.
 * 
 * These helpers build on top of the basic UFR functions (ufRequest/ufResponse)
 * and provide higher-level abstractions for MIFARE card operations.
 */

/**
 * Checks if a MIFARE card is present on the reader
 * 
 * @returns {Promise<{present: boolean, uid: string|null, type: string|null}>} Card presence and info
 */
async function checkCardPresence() {
    return new Promise((resolve) => {
        if (typeof ufRequest !== 'function') {
            console.warn("D-Logic UFR API not available");
            resolve({ present: false, uid: null, type: null });
            return;
        }

        ufRequest("GetCardIdEx", function() {
            const output = ufResponse();
            console.log("Card presence check response:", output);
            
            if (output && output.Status === "[0x00 (0)] UFR_OK") {
                resolve({ 
                    present: true, 
                    uid: output.CardUid, 
                    type: output.CardType 
                });
            } else {
                resolve({ present: false, uid: null, type: null });
            }
        });
    });
}

/**
 * Authenticates a specific block on the MIFARE card
 * 
 * @param {number} blockNumber - The block number to authenticate
 * @param {string} key - The authentication key (should match key type)
 * @param {string} keyType - The key type ('A' or 'B')
 * @returns {Promise<boolean>} True if authentication was successful
 */
async function authenticateBlock(blockNumber, key, keyType = 'A') {
    return new Promise((resolve) => {
        if (typeof ufRequest !== 'function') {
            console.warn("D-Logic UFR API not available");
            resolve(false);
            return;
        }

        // Determine the auth mode based on key type
        const authMode = keyType.toUpperCase() === 'B' ? "0x61" : "0x60";
        
        // Authenticate using the specified key
        ufRequest(`LinearFormatCard ${key}`, function() {
            const output = ufResponse();
            console.log(`Block ${blockNumber} authentication response:`, output);
            
            if (output && output.Status === "[0x00 (0)] UFR_OK") {
                resolve(true);
            } else {
                console.error(`Failed to authenticate block ${blockNumber} with key type ${keyType}`);
                resolve(false);
            }
        });
    });
}

/**
 * Reads data from a specified block on the MIFARE card
 * 
 * @param {number} blockNumber - The block number to read from
 * @param {string} key - The authentication key
 * @param {string} keyType - The key type ('A' or 'B')
 * @returns {Promise<{success: boolean, data: any|null}>} Read operation result
 */
async function readBlock(blockNumber, key, keyType = 'A') {
    return new Promise((resolve) => {
        if (typeof ufRequest !== 'function') {
            console.warn("D-Logic UFR API not available");
            resolve({ success: false, data: null });
            return;
        }

        // First check if card is present
        checkCardPresence().then(({ present }) => {
            if (!present) {
                console.warn("No card detected for reading");
                resolve({ success: false, data: null });
                return;
            }
            
            // Authenticate block before reading
            authenticateBlock(blockNumber, key, keyType).then((authenticated) => {
                if (!authenticated) {
                    resolve({ success: false, data: null });
                    return;
                }
                
                // Read from the authenticated block
                ufRequest(`LinearRead ${blockNumber} 100`, function() {
                    const output = ufResponse();
                    console.log(`Block ${blockNumber} read response:`, output);
                    
                    if (output && output.Status === "[0x00 (0)] UFR_OK") {
                        try {
                            // Try to parse the data as JSON
                            const jsonData = output.Data.trim();
                            const parsedData = JSON.parse(jsonData);
                            resolve({ success: true, data: parsedData });
                        } catch (error) {
                            console.warn("Failed to parse data as JSON:", error);
                            // Return the raw data if it can't be parsed as JSON
                            resolve({ success: true, data: output.Data });
                        }
                    } else {
                        console.error(`Failed to read from block ${blockNumber}`);
                        resolve({ success: false, data: null });
                    }
                });
            });
        });
    });
}

/**
 * Writes data to a specified block on the MIFARE card
 * 
 * @param {number} blockNumber - The block number to write to
 * @param {any} data - The data to write (will be converted to JSON)
 * @param {string} key - The authentication key
 * @param {string} keyType - The key type ('A' or 'B')
 * @returns {Promise<boolean>} True if write was successful
 */
async function writeBlock(blockNumber, data, key, keyType = 'A') {
    return new Promise((resolve) => {
        if (typeof ufRequest !== 'function') {
            console.warn("D-Logic UFR API not available");
            resolve(false);
            return;
        }

        // First check if card is present
        checkCardPresence().then(({ present }) => {
            if (!present) {
                console.warn("No card detected for writing");
                resolve(false);
                return;
            }
            
            // Authenticate block before writing
            authenticateBlock(blockNumber, key, keyType).then((authenticated) => {
                if (!authenticated) {
                    resolve(false);
                    return;
                }
                
                // Convert data to JSON
                const jsonData = JSON.stringify(data);
                console.log(`Data to write to block ${blockNumber}:`, jsonData);
                
                // Write the data to the card
                ufRequest(`LinearWrite ${blockNumber} "${jsonData}"`, function() {
                    const output = ufResponse();
                    console.log(`Block ${blockNumber} write response:`, output);
                    
                    if (output && output.Status === "[0x00 (0)] UFR_OK") {
                        // Signal success with green light
                        ufRequest("ReaderUISignal 1 2", function() {
                            resolve(true);
                        });
                    } else {
                        console.error(`Failed to write to block ${blockNumber}`);
                        // Signal failure with red light
                        ufRequest("ReaderUISignal 2 2", function() {
                            resolve(false);
                        });
                    }
                });
            });
        });
    });
}

/**
 * Formats a MIFARE card
 * 
 * @param {string} key - The authentication key
 * @param {string} keyType - The key type ('A' or 'B')
 * @returns {Promise<boolean>} True if format was successful
 */
async function formatCard(key, keyType = 'A') {
    return new Promise((resolve) => {
        if (typeof ufRequest !== 'function') {
            console.warn("D-Logic UFR API not available");
            resolve(false);
            return;
        }

        // First check if card is present
        checkCardPresence().then(({ present }) => {
            if (!present) {
                console.warn("No card detected for formatting");
                resolve(false);
                return;
            }
            
            // Format the card using the specified key
            ufRequest(`LinearFormatCard ${key}`, function() {
                const output = ufResponse();
                console.log("Card format response:", output);
                
                if (output && output.Status === "[0x00 (0)] UFR_OK") {
                    // Signal success with green light
                    ufRequest("ReaderUISignal 1 2", function() {
                        resolve(true);
                    });
                } else {
                    console.error("Failed to format card");
                    // Signal failure with red light
                    ufRequest("ReaderUISignal 2 2", function() {
                        resolve(false);
                    });
                }
            });
        });
    });
}

/**
 * Reads band data using the Neoband format
 * 
 * @param {string} publicKey - The public key for authentication
 * @returns {Promise<{success: boolean, bandId: string|null, data: any|null}>} Read operation result
 */
async function readBandData(publicKey) {
    // Check if card is present
    const { present, uid } = await checkCardPresence();
    
    if (!present) {
        console.warn("No band detected");
        return { success: false, bandId: null, data: null };
    }
    
    // Default block where Neoband data is stored
    const dataBlock = 4;
    
    // Read the data block
    const { success, data } = await readBlock(dataBlock, publicKey);
    
    if (!success) {
        return { success: false, bandId: uid, data: null };
    }
    
    // If data is successfully read, include the band ID
    return { success: true, bandId: uid, data: data };
}

/**
 * Writes band data using the Neoband format
 * 
 * @param {string} privateKey - The private key for authentication
 * @param {object} data - The data to write
 * @returns {Promise<boolean>} True if write was successful
 */
async function writeBandData(privateKey, data) {
    // Check if card is present
    const { present, uid } = await checkCardPresence();
    
    if (!present) {
        console.warn("No band detected");
        return false;
    }
    
    // Ensure band ID is included in the data
    const dataToWrite = { ...data, bandId: uid };
    
    // Default block where Neoband data is stored
    const dataBlock = 4;
    
    // Write the data to the band
    return await writeBlock(dataBlock, dataToWrite, privateKey);
}

/**
 * Resets a band to its default state
 * 
 * @param {string} privateKey - The private key for authentication
 * @returns {Promise<boolean>} True if reset was successful
 */
async function resetBand(privateKey) {
    // Check if card is present
    const { present, uid } = await checkCardPresence();
    
    if (!present) {
        console.warn("No band detected");
        return false;
    }
    
    // Format the card
    const formatted = await formatCard(privateKey);
    
    if (!formatted) {
        return false;
    }
    
    // Write empty data to the data block
    const emptyData = { 
        reset: true, 
        bandId: uid, 
        timestamp: new Date().toISOString() 
    };
    
    // Default block where Neoband data is stored
    const dataBlock = 4;
    
    // Write the empty data to the band
    return await writeBlock(dataBlock, emptyData, privateKey);
}

// Export all helper functions
export {
    checkCardPresence,
    authenticateBlock,
    readBlock,
    writeBlock,
    formatCard,
    readBandData,
    writeBandData,
    resetBand
}; 