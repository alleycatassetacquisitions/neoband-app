/**
 * @file utils.js
 * @description Utility Functions and Data Conversion
 * 
 * This module provides utility functions for:
 * 1. Data conversion between text and hex formats
 * 2. Logging and debugging
 * 3. Memory address calculations
 * 4. Error handling and validation
 * 
 * Data Conversion:
 * - Text to Hex: Converts text data to MIFARE-compatible hex format
 * - Hex to Text: Converts hex data back to readable text
 * - Padding: Handles FF padding for MIFARE blocks
 * 
 * Memory Addressing:
 * 1. Linear to Sector/Block:
 *    - Converts absolute block numbers to sector/block pairs
 *    - Handles different sector sizes (4 vs 16 blocks)
 *    - Validates address bounds
 * 
 * 2. Sector/Block to Linear:
 *    - Converts sector/block pairs to absolute block numbers
 *    - Accounts for sector trailer blocks
 *    - Validates input ranges
 * 
 * Logging System:
 * - Debug: Detailed operation information
 * - Info: Normal operation events
 * - Warning: Non-critical issues
 * - Error: Critical problems
 * 
 * Validation Functions:
 * - Input validation for all operations
 * - Address range checking
 * - Data format verification
 * 
 * @version 3.0.3
 * @lastUpdated 2025-04-11
 */

/**
 * Utility functions module
 * @namespace
 */
const utils = {
    /**
     * Constants defining the physical limitations of MIFARE Classic 4K tags.
     * @constant {number} MAX_BLOCK_ADDRESS - Maximum linear block address in MIFARE Classic 4K (255)
     * @constant {number} MAX_TEXT_LENGTH - Maximum bytes per block (16 bytes)
     */
    MAX_BLOCK_ADDRESS: 255, // MIFARE Classic 4K
    MAX_TEXT_LENGTH: 16, // Bytes per block

    /**
     * Calculates MIFARE Classic 4K sector/block info from a linear address.
     * Converts an absolute/linear block address to sector, block-within-sector, and identifies trailer blocks.
     * 
     * @param {number} logicalAddress - The linear block address (0-255).
     * @returns {object} Address information object with the following properties:
     *   - sector {number}: The sector number (0-39)
     *   - blockInSector {number}: The block number within the sector (0-3 or 0-15)
     *   - isTrailerBlock {boolean}: Whether this is a sector trailer block
     *   - absoluteBlock {number}: The original logical address (unchanged)
     * @throws {RangeError} If the provided address is outside valid range
     * 
     * Technical Notes:
     * - MIFARE Classic 4K has 40 sectors total (0-39)
     * - Sectors 0-31 have 4 blocks each (0-127)
     * - Sectors 32-39 have 16 blocks each (128-255)
     * - Sector trailer blocks (block 3 in sectors 0-31, block 15 in sectors 32-39) contain keys and access bits
     */
    calculateMifareAddress: function(logicalAddress) {
        logicalAddress = parseInt(logicalAddress);
        if (isNaN(logicalAddress) || logicalAddress < 0 || logicalAddress > this.MAX_BLOCK_ADDRESS) {
            throw new RangeError('Invalid logical address: ' + logicalAddress);
        }

        const result = {
            sector: 0,
            blockInSector: 0,
            isTrailerBlock: false,
            absoluteBlock: logicalAddress
        };

        // Sectors 0-31: 4 blocks each (0-127)
        if (logicalAddress < 128) {
            result.sector = Math.floor(logicalAddress / 4);
            result.blockInSector = logicalAddress % 4;
            result.isTrailerBlock = (result.blockInSector === 3);
        }
        // Sectors 32-39: 16 blocks each (128-255)
        else {
            const largeBlockOffset = logicalAddress - 128;
            result.sector = 32 + Math.floor(largeBlockOffset / 16);
            result.blockInSector = largeBlockOffset % 16;
            result.isTrailerBlock = (result.blockInSector === 15);
        }
        return result;
    },

    /**
     * Converts a linear block number to sector and block coordinates within that sector.
     * This is the reverse operation of the linear block calculation.
     * 
     * @param {number} linearBlock - The linear block address (0-255)
     * @returns {Object} An object with sector and block properties
     * @throws {RangeError} If the linear block number is invalid
     */
    reverseLinearToSectorBlock: function(linearBlock) {
        // Ensure we have a valid number
        linearBlock = parseInt(linearBlock);
        if (isNaN(linearBlock) || linearBlock < 0 || linearBlock > this.MAX_BLOCK_ADDRESS) {
            throw new RangeError('Invalid linear block address: ' + linearBlock);
        }
        
        let sector, block;
        
        // Check if block is in the small sectors (0-31) or large sectors (32-39)
        if (linearBlock < 128) {
            // Small sectors: 4 blocks each
            sector = Math.floor(linearBlock / 4);
            block = linearBlock % 4;
        } else {
            // Large sectors: 16 blocks each
            const largeBlockOffset = linearBlock - 128;
            sector = 32 + Math.floor(largeBlockOffset / 16);
            block = largeBlockOffset % 16;
        }
        
        return { sector, block };
    },
    
    /**
     * Validate if a sector/block combination maps to the expected linear block address.
     * This function helps catch inconsistencies between sector/block addressing and linear addressing.
     * 
     * @param {number} sector - The sector number (0-39)
     * @param {number} block - The block number within the sector
     * @param {number} expectedLinearBlock - The expected linear block address
     * @returns {boolean} True if the sector/block correctly maps to the expected linear address
     */
    validateSectorBlockMapping: function(sector, block, expectedLinearBlock) {
        try {
            // Calculate what the linear block should be
            let calculatedLinearBlock;
            
            // Validate sector and block ranges
            if (sector < 0 || sector > 39) {
                return false;
            }
            
            if (sector < 32) {
                // Small sectors: blocks 0-3 only
                if (block < 0 || block > 3) {
                    return false;
                }
                calculatedLinearBlock = (sector * 4) + block;
            } else {
                // Large sectors: blocks 0-15 only
                if (block < 0 || block > 15) {
                    return false;
                }
                calculatedLinearBlock = 128 + ((sector - 32) * 16) + block;
            }
            
            // Check if calculated linear block matches the expected one
            return calculatedLinearBlock === parseInt(expectedLinearBlock);
        } catch (e) {
            return false; // Any error means validation failed
        }
    },

    /**
     * Validates if a block address is usable for read/write operations.
     * Checks whether a block is valid for data storage based on its location and role.
     * 
     * @param {number} blockAddress - The absolute block address (0-255).
     * @param {boolean} isWriteOperation - True if checking for write permissions (disallows trailer blocks).
     * @returns {boolean} True if the address is valid and usable.
     * 
     * Technical Notes:
     * - Block 0 of Sector 0 (manufacturer block) is never writable and often read-protected
     * - Reserved sectors (0, 16, 32-35) should be avoided for general data storage
     * - Sector trailer blocks should not be written to with normal data write operations
     * - Reading from sector trailers may be allowed depending on access conditions
     */
    isValidDataBlock: function(blockAddress, isWriteOperation = false) {
         try {
             const addrInfo = this.calculateMifareAddress(blockAddress);
             // Block 0 of Sector 0 is Manufacturer Block - never writable, often read-protected
             if (addrInfo.sector === 0 && addrInfo.blockInSector === 0) {
                 return false;
             }
              // Reserved sectors - never usable
              // Guard against undefined 'core' or 'core.RESERVED_SECTORS'
              if (typeof core === 'undefined' || !core.RESERVED_SECTORS) {
                  utils.log("ERROR: 'core' or 'core.RESERVED_SECTORS' is undefined in utils.isValidDataBlock(). Assuming reserved sector.", 'error');
                  return false; // Fail safe: treat as reserved/invalid
              }
              // Original logic preserved for reference:
              // if (core.RESERVED_SECTORS.has(addrInfo.sector)) { return false; }
              if (core.RESERVED_SECTORS.has(addrInfo.sector)) {
                  return false;
              }
              // Trailer blocks - not usable for general data, especially writes
              if (addrInfo.isTrailerBlock) {
                  return !isWriteOperation; // Allow reading trailers, disallow writing
              }
              return true; // Regular data block
         } catch (e) {
             return false; // Invalid address calculation
         }
     },

    /**
     * Converts a text string to its hexadecimal representation.
     * Ensures consistent handling of ASCII characters for compatibility with NFC storage.
     * 
     * @param {string} text - The input text.
     * @returns {string} The hex string (without 0x prefix).
     * 
     * Technical Notes:
     * - Each character is converted to its ASCII value, then to a two-digit hex representation
     * - Result is a string of hex digits without spaces or 0x prefix
     * - Text is truncated if longer than MAX_TEXT_LENGTH (16 characters)
     * - Empty/null input returns an empty string
     * - Handles basic ASCII characters reliably, extended characters may vary by encoding
     */
    textToHex: function(text) {
        // Handle empty/null/undefined input
        if (!text) return '';
        
        // Convert to string, limit length, and ensure proper encoding
        let str = String(text || "").slice(0, this.MAX_TEXT_LENGTH);
        
        // Convert each character to its hex representation
        let hex = "";
        for (let i = 0; i < str.length; i++) {
            // Get character code and convert to hex, ensuring 2 digits
            const charCode = str.charCodeAt(i);
            hex += charCode.toString(16).padStart(2, '0');
        }
        
        console.debug("Converting text to hex:", text, "→", hex);
        return hex;
    },

    /**
     * Converts a hexadecimal string back to text.
     * Handles MIFARE Classic data format with mixed FF/00 padding bytes.
     * 
     * @param {string} hexStr - The hex string (can start with 0x).
     * @returns {string} The decoded text.
     * 
     * Technical Notes:
     * - Removes 0x prefix if present
     * - Skips FF bytes (padding) and 00 bytes (null terminators)
     * - Only converts printable ASCII characters (32-126)
     * - Logs detailed debugging information about the conversion process
     * - Handles edge cases like odd-length hex strings and mixed padding
     * - IMPORTANT: Designed specifically for compatibility with the original Neoband App data format
     */
    hexToText: function(hex) {
        // Add debugging information at the start
        utils.log(`Converting hex to text (input): ${hex}`, 'info');
        
        if (!hex || typeof hex !== 'string') {
            utils.log(`Invalid hex input: ${typeof hex} ${hex}`, 'error');
            return '';
        }
        
        // Sanitize the input: remove '0x' prefix if present
        if (hex.startsWith('0x') || hex.startsWith('0X')) {
            hex = hex.slice(2);
        }
        
        // Sanitize the input: ensure even length
        if (hex.length % 2 !== 0) {
            utils.log(`WARNING: Odd-length hex string (${hex.length}): ${hex}`, 'warning');
            hex = '0' + hex;
        }

        // DEBUG: Log the actual hex bytes being processed
        utils.log(`Hex bytes breakdown:`, 'debug');
        let byteLog = '';
        for (let i = 0; i < hex.length; i += 2) {
            byteLog += hex.substring(i, i + 2) + ' ';
            if ((i/2 + 1) % 8 === 0) byteLog += '| ';
        }
        utils.log(byteLog, 'debug');
        
        // Process the hex string
        let text = '';
        let foundFF = false;
        let textChars = [];
        
        try {
            for (let i = 0; i < hex.length; i += 2) {
                const hexByte = hex.substring(i, i + 2).toUpperCase();
                
                // Track when we see FF bytes to help with debugging
                if (hexByte === 'FF') {
                    foundFF = true;
                    if (textChars.length === 0) {
                        utils.log('Found FF at start of data', 'debug');
                    } else if (textChars.length === 1) {
                        utils.log(`Found FF after single character ${textChars[0]}`, 'debug');
                    }
                    continue; // Skip all FF padding bytes
                }
                
                // Skip 00 bytes
                if (hexByte === '00') {
                    continue;
                }
                
                // If we've found FF padding but then find a non-FF byte, this is unusual
                // Report it for debugging purposes
                if (foundFF && hexByte !== 'FF') {
                    utils.log(`Warning: Found non-FF byte ${hexByte} after FF padding at position ${i}`, 'warning');
                }
                
                // Convert the current byte to a character and add it to our result
                const charCode = parseInt(hexByte, 16);
                if (charCode >= 32 && charCode <= 126) { // printable ASCII
                    const char = String.fromCharCode(charCode);
                    textChars.push(char);
                    text += char;
                }
            }
        } catch (e) {
            utils.log(`Error in hexToText: ${e.message}`, 'error');
        }
        
        // DEBUG: Log detailed information about what we extracted
        utils.log(`Characters found in hex: [${textChars.join(', ')}]`, 'debug');
        if (textChars.length === 1) {
            utils.log(`WARNING: Only one character (${textChars[0]}) found in hex data!`, 'warning');
        }
        utils.log(`Converting hex to text (output): ${text}`, 'info');
        
        return text;
    },

    /**
     * Pads a hex string to the specified length with FF bytes.
     * Used to ensure block data has the correct length for MIFARE Classic blocks.
     * 
     * @param {string} hexStr - The hex string to pad.
     * @param {number} [length=32] - The target length in characters (default: 32 chars = 16 bytes).
     * @returns {string} The padded hex string.
     * 
     * Technical Notes:
     * - Default padding is with FF bytes, which is standard for MIFARE Classic
     * - If input is empty/null, returns all FF padding
     * - Length parameter should be even (multiple of 2) since each byte is 2 hex chars
     * - Default length of 32 characters represents 16 bytes (full MIFARE block)
     */
    padHex: function(hexStr, length = 32) {
        // Validate input
        if (!hexStr) {
            utils.log(`Warning: Padding empty hex string with FF`, 'warning');
            // Return all FF padding if no input
            return 'F'.repeat(length);
        }
        
        // Remove 0x prefix if present
        if (hexStr.startsWith('0x') || hexStr.startsWith('0X')) {
            hexStr = hexStr.slice(2);
        }
        
        // Ensure proper length
        if (hexStr.length > length) {
            utils.log(`Warning: Hex string (${hexStr.length} chars) exceeds target length (${length})`, 'warning');
            // Truncate if too long
            return hexStr.substring(0, length);
        }
        
        // Pad with FF to target length
        const paddedHex = hexStr + 'F'.repeat(length - hexStr.length);
        return paddedHex;
    },

    /**
     * Creates a promise that resolves after a specified time.
     * @param {number} ms - Milliseconds to wait.
     * @returns {Promise<void>}
     */
    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // --- Logging --- //
    logElement: null,
    logLevelThreshold: 2, // 0: Error, 1: Warning, 2: Info, 3: Debug

    /**
     * Initializes the logger by getting the log display element.
     */
    initLogger: function() {
        try {
            this.logElement = document.getElementById('logDisplay');
            if (!this.logElement) {
                console.error("Log display element (#logDisplay) not found!");
            }
        } catch (e) {
            console.error("Error initializing logger:", e);
        }
    },

    /**
     * Logs a message to the UI log display and console.
     * @param {string} message - The message to log.
     * @param {string} level - 'error', 'warning', 'info', 'debug' (or 'success' as alias for info).
     */
    log: function(message, level = 'info') {
        let levelNum = 2;
        let color = 'var(--text-color)'; // Default text color
        let prefix = 'INFO';

        switch (level.toLowerCase()) {
            case 'error':
                levelNum = 0;
                color = 'var(--error-color)'; // Use CSS variable
                prefix = 'ERROR';
                console.error(message);
                break;
            case 'warning':
                levelNum = 1;
                color = 'var(--warning-color)'; // Use CSS variable
                prefix = 'WARN';
                console.warn(message);
                break;
             case 'success': // Treat success as info for logging level
                 levelNum = 2;
                 color = 'var(--success-color)'; // Use CSS variable
                 prefix = 'SUCCESS';
                 console.log(message);
                 break;
            case 'debug':
                levelNum = 3;
                 color = 'var(--debug-color)'; // Use CSS variable
                prefix = 'DEBUG';
                console.debug(message);
                break;
            case 'info':
            default:
                levelNum = 2;
                 color = 'var(--info-color)'; // Use CSS variable for info
                 prefix = 'INFO';
                console.log(message);
                break;
        }

        if (levelNum <= this.logLevelThreshold && this.logElement) {
            try {
                const logEntry = document.createElement('div');
                logEntry.style.color = color;
                const timestamp = new Date().toLocaleTimeString();
                logEntry.textContent = `[${timestamp}] [${prefix}] ${message}`;
                this.logElement.appendChild(logEntry);
                // Auto-scroll to the bottom
                this.logElement.scrollTop = this.logElement.scrollHeight;
            } catch (e) {
                console.error("Error updating log display:", e);
            }
        }
    },

    /**
     * Clears the log display in the UI.
     */
    clearLog: function() {
        if (this.logElement) {
            this.logElement.innerHTML = '';
            this.log("Log cleared.", 'info');
        }
    },

    /**
     * Identifies inconsistencies between block address systems and provides corrected mappings.
     * This utility function is used to help migrate data between different block addressing schemes
     * and to detect potential issues with block addressing.
     * 
     * @param {Object} blockMap - Map of block addresses to check { "linearBlock": expectedSector, ... }
     * @returns {Object} Report of inconsistencies with corrected mappings
     */
    detectBlockMappingIssues: function(blockMap) {
        const report = {
            validMappings: [],
            invalidMappings: [],
            correctedMappings: []
        };
        
        for (const [linearBlock, expectedSector] of Object.entries(blockMap)) {
            try {
                const blockNum = parseInt(linearBlock);
                const calculatedInfo = this.reverseLinearToSectorBlock(blockNum);
                
                if (calculatedInfo.sector === parseInt(expectedSector)) {
                    report.validMappings.push({
                        linearBlock: blockNum,
                        sector: calculatedInfo.sector,
                        block: calculatedInfo.block,
                        status: 'valid'
                    });
                } else {
                    report.invalidMappings.push({
                        linearBlock: blockNum,
                        expectedSector: parseInt(expectedSector),
                        actualSector: calculatedInfo.sector,
                        actualBlock: calculatedInfo.block,
                        status: 'invalid'
                    });
                    
                    // Calculate the correct linear block for the expected sector and same block
                    let correctedLinearBlock;
                    if (parseInt(expectedSector) < 32) {
                        correctedLinearBlock = (parseInt(expectedSector) * 4) + calculatedInfo.block;
                    } else {
                        correctedLinearBlock = 128 + ((parseInt(expectedSector) - 32) * 16) + calculatedInfo.block;
                    }
                    
                    report.correctedMappings.push({
                        originalLinearBlock: blockNum,
                        correctedLinearBlock: correctedLinearBlock,
                        sector: parseInt(expectedSector),
                        block: calculatedInfo.block
                    });
                }
            } catch (error) {
                this.log(`Error checking block mapping for ${linearBlock}: ${error.message}`, 'error');
            }
        }
        
        return report;
    },
/**
 * Converts a 12-character hex key string (e.g., "FFFFFFFFFFFF") to a 6-byte Uint8Array.
 * @param {string} hexStr - 12-character hex string representing the key.
 * @returns {Uint8Array} 6-byte key array.
 */
hexKeyToBytes: function(hexStr) {
    const result = new Uint8Array(6);
    for(let i = 0; i < 6; i++){
        const byteStr = hexStr.substr(i*2,2);
        const byteVal = parseInt(byteStr, 16);
        if (isNaN(byteVal)) {
            utils.log(`Invalid hex byte '${byteStr}' in hexKeyToBytes() at position ${i}`, 'warning');
            result[i] = 0; // Default to 0 on invalid byte
        } else {
            result[i] = byteVal;
        }
    }
    return result;
},

/**
 * Converts a hex string (any length) to a Uint8Array.
 * @param {string} hexStr - Hex string.
 * @returns {Uint8Array} Byte array.
 */
hexToBytes: function(hexStr){
    const result = [];
    for(let i=0; i<hexStr.length; i+=2){
        const byteStr = hexStr.substr(i,2);
        const byteVal = parseInt(byteStr, 16);
        if (isNaN(byteVal)) {
            utils.log(`Invalid hex byte '${byteStr}' in hexToBytes() at position ${i}`, 'warning');
            result.push(0); // Default to 0 on invalid byte
        } else {
            result.push(byteVal);
        }
    }
    return new Uint8Array(result);
},

/**
 * Converts a byte array (Uint8Array) to a hex string (uppercase).
 * @param {Uint8Array} byteArray - Byte array.
 * @returns {string} Hex string.
 */
bytesToHex: function(byteArray){
    return Array.from(byteArray).map(b => ('0'+b.toString(16)).slice(-2)).join('').toUpperCase();
},
}; 