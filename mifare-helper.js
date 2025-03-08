/**
 * MIFARE Helper Functions
 * 
 * This module provides utility functions for working with MIFARE Classic 1K cards
 * using the D-Logic uFR reader. It includes functions for authentication, reading,
 * writing, and formatting cards.
 * 
 * Based on D-Logic examples and MIFARE Classic 1K documentation.
 */

// Default key for MIFARE Classic 1K cards (FF FF FF FF FF FF)
export const DEFAULT_KEY = "FFFFFFFFFFFF";

// Address map for different data types
export const ADDRESS_MAP = {
    USERNAME: { linearAddress: 4, dataLength: 16 },
    BAND_ID: { linearAddress: 8, dataLength: 16 },
    HUNTER_BOUNTY: { linearAddress: 8, dataLength: 16 },
    WINS: { linearAddress: 9, dataLength: 16 },
    DRAW_TIME: { linearAddress: 10, dataLength: 16 },
    ALLEGIANCE1: { linearAddress: 12, dataLength: 16 },
    ALLEGIANCE2: { linearAddress: 13, dataLength: 16 },
    ALLEGIANCE3: { linearAddress: 14, dataLength: 16 },
    ALLEGIANCE4: { linearAddress: 16, dataLength: 16 },
    ALLEGIANCE5: { linearAddress: 17, dataLength: 16 },
    ALLEGIANCE6: { linearAddress: 18, dataLength: 16 },
    ALLEGIANCE7: { linearAddress: 20, dataLength: 16 },
    ALLEGIANCE8: { linearAddress: 21, dataLength: 16 },
    ALLEGIANCE9: { linearAddress: 22, dataLength: 16 },
    ALLEGIANCE10: { linearAddress: 24, dataLength: 16 },
    ALLEGIANCE11: { linearAddress: 25, dataLength: 16 },
    ALLEGIANCE12: { linearAddress: 26, dataLength: 16 },
    ALLEGIANCE13: { linearAddress: 28, dataLength: 16 },
    ALLEGIANCE14: { linearAddress: 29, dataLength: 16 },
    ALLEGIANCE15: { linearAddress: 30, dataLength: 16 },
    ALLEGIANCE16: { linearAddress: 32, dataLength: 16 }
};

/**
 * Convert text to hexadecimal representation
 * 
 * @param {string} text - Text to convert to hex
 * @returns {string} - Hexadecimal representation of the text
 */
export function textToHex(text) {
    let hex = '';
    for (let i = 0; i < text.length; i++) {
        hex += text.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * Convert hexadecimal to text
 * 
 * @param {string} hex - Hexadecimal string to convert to text
 * @returns {string} - Text representation of the hex
 */
export function hexToText(hex) {
    let text = '';
    for (let i = 0; i < hex.length; i += 2) {
        const hexChar = hex.substr(i, 2);
        if (hexChar === '00') continue; // Skip null bytes
        text += String.fromCharCode(parseInt(hexChar, 16));
    }
    return text;
}

/**
 * Check if a card is present on the reader
 * 
 * @returns {Promise<Object>} - Object with present (boolean) and uid (string) properties
 */
export async function checkCardPresence() {
    return new Promise((resolve) => {
        ufRequest("GetCardIdEx", function() {
            const output = ufResponse();
            if (output && output.Status === "[0x00 (0)] UFR_OK") {
                resolve({ present: true, uid: output.CardUid });
            } else {
                resolve({ present: false, uid: null });
            }
        });
    });
}

/**
 * Authenticate a specific block on the card
 * 
 * @param {number} block - Block number to authenticate
 * @param {string} key - Authentication key (hex string)
 * @param {string} keyType - Key type ('A' or 'B')
 * @returns {Promise<Object>} - Object with success (boolean) and status (string) properties
 */
export async function authenticateBlock(block, key = DEFAULT_KEY, keyType = 'A') {
    return new Promise((resolve) => {
        const authCommand = keyType.toUpperCase() === 'B' 
            ? `BlockAuthB ${block} ${key}` 
            : `BlockAuthA ${block} ${key}`;
        
        ufRequest(authCommand, function() {
            const output = ufResponse();
            const success = output && output.Status === "[0x00 (0)] UFR_OK";
            
            resolve({
                success,
                status: output ? output.Status : "Unknown error",
                block
            });
        });
    });
}

/**
 * Read data from a specific block on the card
 * 
 * @param {number} block - Block number to read
 * @param {string} key - Authentication key (hex string)
 * @param {string} keyType - Key type ('A' or 'B')
 * @returns {Promise<Object>} - Object with success, hexData, and textData properties
 */
export async function readBlock(block, key = DEFAULT_KEY, keyType = 'A') {
    try {
        // First authenticate the block
        const authResult = await authenticateBlock(block, key, keyType);
        if (!authResult.success) {
            console.error(`Authentication failed for block ${block}:`, authResult.status);
            return {
                success: false,
                status: authResult.status,
                hexData: null,
                textData: null,
                block
            };
        }
        
        // Then read the block
        return new Promise((resolve) => {
            ufRequest(`BlockRead ${block}`, function() {
                const output = ufResponse();
                const success = output && output.Status === "[0x00 (0)] UFR_OK";
                
                if (success && output.Data) {
                    // Convert hex data to text
                    const hexData = output.Data.replace(/\s/g, '');
                    const textData = hexToText(hexData);
                    
                    resolve({
                        success: true,
                        status: output.Status,
                        hexData,
                        textData,
                        block
                    });
                } else {
                    resolve({
                        success: false,
                        status: output ? output.Status : "Unknown error",
                        hexData: null,
                        textData: null,
                        block
                    });
                }
            });
        });
    } catch (error) {
        console.error(`Error reading block ${block}:`, error);
        return {
            success: false,
            status: error.message,
            hexData: null,
            textData: null,
            block
        };
    }
}

/**
 * Write data to a specific block on the card
 * 
 * @param {string} data - Data to write (hex string or text)
 * @param {number} block - Block number to write
 * @param {boolean} isHex - Whether the data is already in hex format
 * @param {string} key - Authentication key (hex string)
 * @param {string} keyType - Key type ('A' or 'B')
 * @returns {Promise<Object>} - Object with success and status properties
 */
export async function writeBlock(data, block, isHex = false, key = DEFAULT_KEY, keyType = 'A') {
    try {
        // First authenticate the block
        const authResult = await authenticateBlock(block, key, keyType);
        if (!authResult.success) {
            console.error(`Authentication failed for block ${block}:`, authResult.status);
            return {
                success: false,
                status: authResult.status,
                block
            };
        }
        
        // Convert text to hex if needed
        const hexData = isHex ? data : textToHex(data);
        
        // Pad the hex data to 32 characters (16 bytes)
        const paddedHexData = hexData.padEnd(32, '0');
        
        // Then write the block
        return new Promise((resolve) => {
            ufRequest(`BlockWrite ${block} ${paddedHexData}`, function() {
                const output = ufResponse();
                const success = output && output.Status === "[0x00 (0)] UFR_OK";
                
                resolve({
                    success,
                    status: output ? output.Status : "Unknown error",
                    block,
                    hexData: paddedHexData
                });
            });
        });
    } catch (error) {
        console.error(`Error writing to block ${block}:`, error);
        return {
            success: false,
            status: error.message,
            block
        };
    }
}

/**
 * Format a MIFARE Classic 1K card
 * 
 * @param {string} key - Authentication key (hex string)
 * @returns {Promise<Object>} - Object with success and status properties
 */
export async function formatCard(key = DEFAULT_KEY) {
    return new Promise((resolve) => {
        ufRequest(`LinearFormatCard ${key} ${key}`, function() {
            const output = ufResponse();
            const success = output && output.Status === "[0x00 (0)] UFR_OK";
            
            resolve({
                success,
                status: output ? output.Status : "Unknown error"
            });
        });
    });
}

/**
 * Read data from a linear address on the card
 * 
 * @param {string} linearAddress - Linear address to read from
 * @param {string} dataLength - Length of data to read
 * @param {string} key - Authentication key (hex string)
 * @param {string} keyType - Key type ('A' or 'B')
 * @returns {Promise<Object>} - Object with success, data, and hexData properties
 */
export async function linearRead(linearAddress, dataLength, key = DEFAULT_KEY, keyType = 'A') {
    try {
        return new Promise((resolve) => {
            const command = `LinearRead ${linearAddress} ${dataLength} ${key} ${keyType}`;
            
            ufRequest(command, function() {
                const output = ufResponse();
                const success = output && output.Status === "[0x00 (0)] UFR_OK";
                
                if (success && output.Data) {
                    // Convert hex data to text
                    const hexData = output.Data.replace(/\s/g, '');
                    
                    try {
                        // Try to parse as JSON
                        const textData = hexToText(hexData);
                        let data = null;
                        
                        try {
                            data = JSON.parse(textData);
                        } catch (jsonError) {
                            // If JSON parsing fails, return the raw text
                            data = { rawData: textData };
                        }
                        
                        resolve({
                            success: true,
                            status: output.Status,
                            data,
                            hexData,
                            linearAddress,
                            dataLength
                        });
                    } catch (parseError) {
                        console.error("Error parsing data:", parseError);
                        resolve({
                            success: true,
                            status: output.Status,
                            data: { rawData: hexData },
                            hexData,
                            linearAddress,
                            dataLength
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        status: output ? output.Status : "Unknown error",
                        data: null,
                        hexData: null,
                        linearAddress,
                        dataLength
                    });
                }
            });
        });
    } catch (error) {
        console.error(`Error reading from linear address ${linearAddress}:`, error);
        return {
            success: false,
            status: error.message,
            data: null,
            hexData: null,
            linearAddress,
            dataLength
        };
    }
}

/**
 * Write data to a linear address on the card
 * 
 * @param {Object|string} data - Data to write (object or string)
 * @param {string} linearAddress - Linear address to write to
 * @param {string} dataLength - Length of data to write
 * @param {string} key - Authentication key (hex string)
 * @param {string} keyType - Key type ('A' or 'B')
 * @returns {Promise<Object>} - Object with success and status properties
 */
export async function linearWrite(data, linearAddress, dataLength, key = DEFAULT_KEY, keyType = 'A') {
    try {
        // Convert data to JSON string if it's an object
        const jsonData = typeof data === 'object' ? JSON.stringify(data) : data;
        
        // Convert JSON string to hex
        const hexData = textToHex(jsonData);
        
        // Pad the hex data if needed
        const paddedHexData = hexData.padEnd(parseInt(dataLength) * 2, '0');
        
        return new Promise((resolve) => {
            const command = `LinearWrite ${linearAddress} ${dataLength} ${paddedHexData} ${key} ${keyType}`;
            
            ufRequest(command, function() {
                const output = ufResponse();
                const success = output && output.Status === "[0x00 (0)] UFR_OK";
                
                resolve({
                    success,
                    status: output ? output.Status : "Unknown error",
                    linearAddress,
                    dataLength,
                    hexData: paddedHexData
                });
            });
        });
    } catch (error) {
        console.error(`Error writing to linear address ${linearAddress}:`, error);
        return {
            success: false,
            status: error.message,
            linearAddress,
            dataLength
        };
    }
}

/**
 * Read band data from the card
 * 
 * @param {string} key - Authentication key (hex string)
 * @returns {Promise<Object>} - Object with success, bandId, and data properties
 */
export async function readBandData(key = DEFAULT_KEY) {
    try {
        // Check if a card is present
        const { present, uid } = await checkCardPresence();
        if (!present) {
            return {
                success: false,
                status: "No card detected",
                bandId: null,
                data: null
            };
        }
        
        // Read username from block 4
        const usernameResult = await linearRead(
            ADDRESS_MAP.USERNAME.linearAddress.toString(),
            ADDRESS_MAP.USERNAME.dataLength.toString(),
            key,
            'A'
        );
        
        if (!usernameResult.success) {
            return {
                success: false,
                status: usernameResult.status,
                bandId: uid,
                data: null
            };
        }
        
        return {
            success: true,
            status: "Data read successfully",
            bandId: uid,
            data: usernameResult.data
        };
    } catch (error) {
        console.error("Error reading band data:", error);
        return {
            success: false,
            status: error.message,
            bandId: null,
            data: null
        };
    }
}

/**
 * Write data to the band
 * 
 * @param {Object} data - Data to write to the band
 * @param {string} key - Authentication key (hex string)
 * @returns {Promise<Object>} - Object with success and status properties
 */
export async function writeBandData(data, key = DEFAULT_KEY) {
    try {
        // Check if a card is present
        const { present, uid } = await checkCardPresence();
        if (!present) {
            return {
                success: false,
                status: "No card detected"
            };
        }
        
        // Write username to block 4
        const usernameResult = await linearWrite(
            data,
            ADDRESS_MAP.USERNAME.linearAddress.toString(),
            ADDRESS_MAP.USERNAME.dataLength.toString(),
            key,
            'A'
        );
        
        if (!usernameResult.success) {
            return {
                success: false,
                status: usernameResult.status
            };
        }
        
        return {
            success: true,
            status: "Data written successfully"
        };
    } catch (error) {
        console.error("Error writing band data:", error);
        return {
            success: false,
            status: error.message
        };
    }
}

/**
 * Reset the band by clearing all user data
 * 
 * @param {string} key - Authentication key (hex string)
 * @returns {Promise<Object>} - Object with success and status properties
 */
export async function resetBand(key = DEFAULT_KEY) {
    try {
        // Check if a card is present
        const { present, uid } = await checkCardPresence();
        if (!present) {
            return {
                success: false,
                status: "No card detected"
            };
        }
        
        // Clear username block
        const emptyData = { username: "", status: "Unregistered" };
        const usernameResult = await linearWrite(
            emptyData,
            ADDRESS_MAP.USERNAME.linearAddress.toString(),
            ADDRESS_MAP.USERNAME.dataLength.toString(),
            key,
            'A'
        );
        
        if (!usernameResult.success) {
            return {
                success: false,
                status: usernameResult.status
            };
        }
        
        return {
            success: true,
            status: "Band reset successfully"
        };
    } catch (error) {
        console.error("Error resetting band:", error);
        return {
            success: false,
            status: error.message
        };
    }
} 