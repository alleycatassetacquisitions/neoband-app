/**
 * utils.js
 * Utility functions for the Neoband App (hex conversion, padding, delays, logging, address calculations).
 * 
 * This file provides essential utility functions including:
 * - MIFARE address calculations and validation
 * - Text-to-hex and hex-to-text conversions for NFC data
 * - Hex padding and formatting utilities
 * - Logging infrastructure
 * - Timeout and delay management for NFC operations
 */

const utils = {
    /**
     * Constants defining the physical limitations of MIFARE Classic 4K tags.
     * @constant {number} MAX_BLOCK_ADDRESS - address in MIFARE Classic 4K (255)
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
        // Sectors 32-39: 16 blocks each (128-255), but only 0-14 are usable
        else {
            const largeBlockOffset = logicalAddress - 128;
            result.sector = 32 + Math.floor(largeBlockOffset / 16);
            result.blockInSector = largeBlockOffset % 16;
            // Block 15 is a trailer block, but we're treating it as unusable
            // This ensures consistency with validateSectorBlockMapping
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
            // Large sectors: 16 blocks each, but only 0-14 are usable
            const largeBlockOffset = linearBlock - 128;
            sector = 32 + Math.floor(largeBlockOffset / 16);
            block = largeBlockOffset % 16;
            // Ensure block is within valid range (0-14) for sectors 32-39
            if (block > 14) {
                utils.log(`Warning: Block ${block} in sector ${sector} exceeds valid range (0-14)`, 'warning');
            }
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
                // Large sectors: blocks 0-14 only (block 15 is not usable)
                if (block < 0 || block > 14) {
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
              // Check if sector is in the reserved set, but make an exception for sector 39
              // which is used for username storage
              if (core.RESERVED_SECTORS.has(addrInfo.sector) && addrInfo.sector !== 39) {
                  return false;
              }
              // For sectors 32-39, only blocks 0-14 are usable (block 15 is a trailer block)
              if (addrInfo.sector >= 32 && addrInfo.sector <= 39 && addrInfo.blockInSector > 14) {
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

/**
 * Validates sector/block addressing for MIFARE Classic 4K.
 * Throws an error if the sector/block is out of range or forbidden.
 * @param {number} sector - Sector number (0-39)
 * @param {number} block - Block number within sector (0-3 or 0-15)
 * @param {boolean} isWriteOperation - If true, applies write restrictions (no sector 0, no trailer)
 */
validateSectorBlock: function(sector, block, isWriteOperation = false) {
    // Validate sector range
    if (typeof sector !== 'number' || sector < 0 || sector > 39) {
        const msg = `Invalid sector: ${sector}. Must be 0-39.`;
        utils.log(msg, 'error');
        throw new RangeError(msg);
    }
    // Validate block range
    const maxBlock = sector < 32 ? 3 : 15;
    if (typeof block !== 'number' || block < 0 || block > maxBlock) {
        const msg = `Invalid block: ${block} for sector ${sector}. Must be 0-${maxBlock}.`;
        utils.log(msg, 'error');
        throw new RangeError(msg);
    }
    // Write restrictions
    if (isWriteOperation) {
        if (sector === 0) {
            const msg = `Write access denied to sector 0 (manufacturer sector).`;
            utils.log(msg, 'error');
            throw new Error(msg);
        }
        if (utils.isSectorTrailerBlock(sector, block)) {
            const msg = `Write access denied to sector trailer: sector ${sector}, block ${block}.`;
            utils.log(msg, 'error');
            throw new Error(msg);
        }
    }
    utils.log(`Validated sector/block: sector ${sector}, block ${block}, write=${isWriteOperation}`, 'debug');
    return true;
},

/**
 * Returns true if the given sector/block is a sector trailer block.
 * @param {number} sector - Sector number (0-39)
 * @param {number} block - Block number within sector
 * @returns {boolean}
 */
isSectorTrailerBlock: function(sector, block) {
    const isTrailer = (sector < 32 && block === 3) || (sector >= 32 && block === 15);
    utils.log(`isSectorTrailerBlock: sector ${sector}, block ${block} → ${isTrailer}`, 'debug');
    return isTrailer;
},

/**
 * Checks if a sector/block is valid for read/write operations.
 * @param {number} sector - Sector number (0-39)
 * @param {number} block - Block number within sector
 * @param {boolean} isWriteOperation - If true, applies write restrictions
 * @returns {boolean}
 */
isValidSectorBlock: function(sector, block, isWriteOperation = false) {
    try {
        // Validate sector and block range
        const maxBlock = sector < 32 ? 3 : 15;
        if (sector < 0 || sector > 39 || block < 0 || block > maxBlock) {
            utils.log(`isValidSectorBlock: Invalid sector/block: sector ${sector}, block ${block}`, 'warning');
            return false;
        }
        // Write restrictions
        if (isWriteOperation) {
            if (sector === 0) {
                utils.log(`isValidSectorBlock: Write forbidden to sector 0`, 'warning');
                return false;
            }
            if (utils.isSectorTrailerBlock(sector, block)) {
                utils.log(`isValidSectorBlock: Write forbidden to sector trailer: sector ${sector}, block ${block}`, 'warning');
                return false;
            }
        }
        utils.log(`isValidSectorBlock: Valid sector/block: sector ${sector}, block ${block}, write=${isWriteOperation}`, 'debug');
        return true;
    } catch (e) {
        utils.log(`isValidSectorBlock: Exception: ${e.message}`, 'error');
        return false;
    }
},

/**
 * Validates sector trailer addressing (sector-only, no block).
 * Throws if sector is out of range or forbidden.
 * @param {number} sector - Sector number (0-39)
 * @param {boolean} isWriteOperation - If true, applies write restrictions (no sector 0)
 */
validateSectorTrailerAddressing: function(sector, isWriteOperation = false) {
    if (typeof sector !== 'number' || sector < 0 || sector > 39) {
        const msg = `Invalid sector for trailer addressing: ${sector}. Must be 0-39.`;
        utils.log(msg, 'error');
        throw new RangeError(msg);
    }
    if (isWriteOperation && sector === 0) {
        const msg = `Write access denied to sector 0 trailer (manufacturer sector).`;
        utils.log(msg, 'error');
        throw new Error(msg);
    }
    utils.log(`Validated sector trailer addressing: sector ${sector}, write=${isWriteOperation}`, 'debug');
    return true;
},

/**
 * Validates block-in-sector addressing (sector + block).
 * Throws if sector/block is out of range or forbidden.
 * @param {number} sector - Sector number (0-39)
 * @param {number} block - Block number within sector (0-3 or 0-15)
 * @param {boolean} isWriteOperation - If true, applies write restrictions (no sector 0, no trailer)
 */
validateBlockInSectorAddressing: function(sector, block, isWriteOperation = false) {
    // Reuse validateSectorBlock for full validation and logging
    return utils.validateSectorBlock(sector, block, isWriteOperation);
},

/**
 * Validates Key A and Key B for a sector and user/role.
 * Ensures keys are 12 hex chars, not default, and match expected config for the sector/user.
 * @param {number} sector - Sector number (0-39)
 * @param {string} keyA - Key A (12 hex chars)
 * @param {string} keyB - Key B (12 hex chars)
 * @param {string} userOrRole - User or role identifier (e.g., 'staff', 'faction1')
 * @param {object} neobandKeys - NEOBAND_KEYS config object
 * @returns {boolean}
 */
validateKeysForSectorAndUser: function(sector, keyA, keyB, userOrRole, neobandKeys) {
    // Check key format
    const hex12 = /^[0-9A-Fa-f]{12}$/;
    if (!hex12.test(keyA)) {
        const msg = `Key A for sector ${sector} (${userOrRole}) is invalid: ${keyA}`;
        utils.log(msg, 'error');
        throw new Error(msg);
    }
    if (!hex12.test(keyB)) {
        const msg = `Key B for sector ${sector} (${userOrRole}) is invalid: ${keyB}`;
        utils.log(msg, 'error');
        throw new Error(msg);
    }
    // Check for default keys (optionally warn)
    if (keyA.toUpperCase() === 'FFFFFFFFFFFF' || keyB.toUpperCase() === 'FFFFFFFFFFFF') {
        utils.log(`Warning: Using default key (FFFFFFFFFFFF) for sector ${sector}, user/role ${userOrRole}`, 'warning');
    }
    // Check against NEOBAND_KEYS config if provided
    if (neobandKeys) {
        let expectedKeyA = null, expectedKeyB = null;
        if (userOrRole === 'staff' && neobandKeys.staff?.user?.sector === sector) {
            expectedKeyB = neobandKeys.staff.user.neoKey;
            expectedKeyA = neobandKeys.universalReadKeyA;
        } else if (neobandKeys.factions && neobandKeys.factions[userOrRole]?.sector === sector) {
            expectedKeyB = neobandKeys.factions[userOrRole].neoKey;
            expectedKeyA = neobandKeys.universalReadKeyA;
        } else if (neobandKeys.allegiances && neobandKeys.allegiances[userOrRole]?.sector === sector) {
            expectedKeyB = neobandKeys.allegiances[userOrRole].neoKey;
            expectedKeyA = neobandKeys.universalReadKeyA;
        }
        if (expectedKeyA && keyA.toUpperCase() !== expectedKeyA.toUpperCase()) {
            const msg = `Key A mismatch for sector ${sector}, user/role ${userOrRole}: expected ${expectedKeyA}, got ${keyA}`;
            utils.log(msg, 'error');
            throw new Error(msg);
        }
        if (expectedKeyB && keyB.toUpperCase() !== expectedKeyB.toUpperCase()) {
            const msg = `Key B mismatch for sector ${sector}, user/role ${userOrRole}: expected ${expectedKeyB}, got ${keyB}`;
            utils.log(msg, 'error');
            throw new Error(msg);
        }
        utils.log(`Keys for sector ${sector}, user/role ${userOrRole} validated against NEOBAND_KEYS.`, 'debug');
    } else {
        utils.log(`Keys for sector ${sector}, user/role ${userOrRole} validated (no NEOBAND_KEYS check).`, 'debug');
    }
    return true;
},
/**
 * Validates that a provided key is a 12-character hexadecimal string (MIFARE key format).
 * Throws an error if the key is invalid. Used for NFC authentication key validation.
 * @param {string} keyHex - The key to validate (should be 12 hex characters)
 * @throws {Error} If the key is not a valid 12-character hex string
 */

/**
validateKeyHex: function(keyHex) {
    // Validate that the keyHex is a 12-character hexadecimal string (MIFARE key format)
    if (!/^[0-9A-Fa-f]{12}$/.test(keyHex)) {
        // Log the error with detailed information using this.log
        this.log(`[utils] Invalid key format: must be 12 hex characters. Received: ${keyHex}`, 'error');
        // Throw an error to halt execution and notify the caller
        throw new Error(`[utils] Invalid key format: must be 12 hex characters. Received: ${keyHex}`);
    },
    // No return needed; success is implied if no error is thrown.
  }
 */
}

// --- Persistence Functions (Moved from ui-persistence.js) ---

/**
 * Saves the current values of input fields, their labels, and the section title INPUT 
 * within the Faction details container to localStorage.
 * @async
 * @function saveFactionUISettings
 * @description Iterates through input elements and labels in #faction-fields-container, 
 *              saves their id/value/textContent pairs, and saves the title INPUT value using its ID.
 * Logs the save operation. Handles potential errors during saving.
 */
async function saveFactionUISettings() {
    utils.log('Attempting to save Faction UI settings (inputs, labels, title)...', 'info');
    try {
        const fieldsContainer = document.getElementById('faction-fields-container');
        // Target the INPUT inside the H3 for the title
        const titleInputElement = document.getElementById('faction-name-display')?.querySelector('input.faction-title-input'); 

        if (!fieldsContainer) {
            utils.log('Faction fields container not found. Cannot save settings.', 'warn');
            return; 
        }

        const inputs = fieldsContainer.querySelectorAll('input, select, textarea');
        let settings = {};

        // Load existing settings first to merge
        try {
            const existingSettings = localStorage.getItem('factionUISettings');
            if (existingSettings) {
                settings = JSON.parse(existingSettings);
            }
        } catch (e) {
            utils.log(`Error parsing existing faction settings: ${e}. Starting fresh.`, 'warn');
            settings = {};
        }

        // Save title INPUT value using its ID as the key
        if (titleInputElement && titleInputElement.id) {
            settings[titleInputElement.id] = titleInputElement.value; // Use ID as key, store value
            utils.log(`Saving Faction title input (${titleInputElement.id}): ${settings[titleInputElement.id]}`, 'debug');
        } else {
             utils.log('Faction title input element or its ID not found for saving.', 'warn');
        }

        // Save input values and their corresponding label INPUT text
        inputs.forEach(input => {
            if (input.id) {
                 // Find the corresponding label and the title input within it
                 const label = fieldsContainer.querySelector(`label[for="${input.id}"]`);
                 const labelTitleInput = label?.querySelector('input.field-title-input');
                
                 // Ensure we are not processing the main title input again
                 if (titleInputElement && input.id === titleInputElement.id) {
                     return; // Skip main title input, already handled
                 } 
                 // Ensure we are not processing a label's title input directly in this loop
                 else if (labelTitleInput && input.id === labelTitleInput.id) {
                      // This case should ideally not happen if querySelectorAll excludes nested inputs correctly,
                      // but check just in case.
                      return; // Skip label title inputs here, handle below
                 }
                 // Process regular value inputs
                 else {
                    settings[input.id] = input.value;
                    utils.log(`Saving Faction value input ${input.id}: ${input.value}`, 'debug');
                 }

                // Find and save label's title INPUT text
                if (labelTitleInput) {
                    const labelKey = `label-${input.id}`; // Key for the label's content
                    settings[labelKey] = labelTitleInput.value; // Save the *value* of the input inside the label
                     utils.log(`Saving Faction label input content ${labelKey}: ${labelTitleInput.value}`, 'debug');
                } else {
                    // This might be expected if an input has no associated label title input
                    // utils.log(`Label title input for Faction value input ${input.id} not found.`, 'debug'); 
                }
            }
        });

        localStorage.setItem('factionUISettings', JSON.stringify(settings));
        utils.log('Faction UI settings saved successfully.', 'success');
        
        // Optional visual confirmation
        // ...

    } catch (error) {
        utils.log(`Error saving Faction UI settings: ${error}`, 'error');
        console.error(error);
        // Optional visual error confirmation
        // ...
    }
}

/**
 * Loads Faction UI settings (inputs, labels, title) from localStorage and applies them.
 * Should be called *after* the faction fields have been dynamically generated by ui.js.
 * @async
 * @function loadFactionUISettings
 * @description Retrieves settings from localStorage, parses them, and updates inputs, labels, and title in #faction-fields-container.
 * Logs the load operation. Handles potential errors.
 */
async function loadFactionUISettings() {
    utils.log('Attempting to load Faction UI settings (inputs, labels, title)...', 'info');
    let settings = {}; // Define settings in the outer scope
    try {
        const savedSettings = localStorage.getItem('factionUISettings');
        if (!savedSettings) {
            utils.log('No saved Faction UI settings found.', 'info');
            return;
        }
        settings = JSON.parse(savedSettings); // Assign parsed settings

    } catch (parseError) {
        utils.log(`Error parsing saved Faction UI settings from localStorage: ${parseError}`, 'error');
        // Optionally clear corrupted settings
        // localStorage.removeItem('factionUISettings'); 
        return; // Stop if parsing fails
    }

    try { // Add try-catch around DOM manipulation
        const fieldsContainer = document.getElementById('faction-fields-container');
        const titleElement = document.getElementById('faction-name-display')?.querySelector('input.faction-title-input'); // Target the INPUT inside the H3

        if (!fieldsContainer) {
            utils.log('Faction fields container not found during load. Cannot apply settings.', 'debug');
            return; 
        }

        // Load Title
        // Use the placeholder ID for the input element: `faction-${factionKey}-name-display`
        const titleInputId = titleElement?.id; // Get the ID if titleElement exists
        if (titleElement && titleInputId && settings[titleInputId] !== undefined) {
             titleElement.value = settings[titleInputId]; // Set input VALUE
             utils.log(`Loaded Faction title input (${titleInputId}): ${settings[titleInputId]}`, 'debug');
        } else if (!titleElement) {
             utils.log('Faction title input element not found during load.', 'warn');
        }

        // Load input values and label text
        for (const key in settings) {
             // Skip the title key as it's handled above (using its specific input ID)
             if (titleInputId && key === titleInputId) continue; 

            if (key.startsWith('label-')) {
                // Load label text into the title INPUT within the label
                const inputId = key.substring(6); 
                const labelElement = fieldsContainer.querySelector(`label[for="${inputId}"]`);
                const titleInputElement = labelElement?.querySelector('input.field-title-input'); // Target the INPUT inside the label
                if (titleInputElement) {
                    titleInputElement.value = settings[key]; // Set input VALUE
                    utils.log(`Loaded Faction label input for ${inputId}: ${settings[key]}`, 'debug');
                } else {
                    utils.log(`Label title input element for key ${key} (input ID: ${inputId}) not found during load.`, 'warn');
                }
            } else {
                // Load input value
                const inputElement = fieldsContainer.querySelector(`#${CSS.escape(key)}`);
                if (inputElement) {
                     // Ensure we don't accidentally overwrite the title/label inputs again
                    if (!inputElement.classList.contains('faction-title-input') && !inputElement.classList.contains('field-title-input')) {
                        inputElement.value = settings[key];
                        utils.log(`Loaded Faction value input ${key}: ${settings[key]}`, 'debug');
                    }
                } else {
                     utils.log(`Value input element with ID ${key} not found in Faction container during load.`, 'warn');
                }
            }
        }

        utils.log('Faction UI settings applied successfully.', 'info');

    } catch (domError) {
        utils.log(`Error applying Faction UI settings to DOM: ${domError}`, 'error');
        console.error(domError);
    }
}

/**
 * Saves the current values of input fields, their labels, and the section title INPUT
 * within the Allegiance details container to localStorage.
 * @async
 * @function saveAllegianceUISettings
 * @description Iterates through input elements and labels in #allegiance-fields-container, 
 *              saves their id/value/textContent pairs, and saves the title INPUT value using its ID.
 * Logs the save operation. Handles potential errors during saving.
 */
async function saveAllegianceUISettings() {
    utils.log('Attempting to save Allegiance UI settings (inputs, labels, title)...', 'info');
    try {
        const fieldsContainer = document.getElementById('allegiance-fields-container');
        // Target the INPUT inside the H3 for the title
        const titleInputElement = document.getElementById('allegiance-name-display')?.querySelector('input.allegiance-title-input'); 

        if (!fieldsContainer) {
            utils.log('Allegiance fields container not found. Cannot save settings.', 'warn');
            return; 
        }

        const inputs = fieldsContainer.querySelectorAll('input, select, textarea');
        let settings = {};

         // Load existing settings first to merge
        try {
            const existingSettings = localStorage.getItem('allegianceUISettings');
            if (existingSettings) {
                settings = JSON.parse(existingSettings);
            }
        } catch (e) {
            utils.log(`Error parsing existing allegiance settings: ${e}. Starting fresh.`, 'warn');
            settings = {}; 
        }

        // Save title INPUT value using its ID as the key
        if (titleInputElement && titleInputElement.id) {
            settings[titleInputElement.id] = titleInputElement.value; // Use ID as key, store value
            utils.log(`Saving Allegiance title input (${titleInputElement.id}): ${settings[titleInputElement.id]}`, 'debug');
        } else {
            utils.log('Allegiance title input element or its ID not found for saving.', 'warn');
        }

        // Save input values and their corresponding label INPUT text
        inputs.forEach(input => {
            if (input.id) {
                // Find the corresponding label and the title input within it
                const label = fieldsContainer.querySelector(`label[for="${input.id}"]`);
                const labelTitleInput = label?.querySelector('input.field-title-input');

                // Ensure we are not processing the main title input again
                if (titleInputElement && input.id === titleInputElement.id) {
                    return; // Skip main title input, already handled
                }
                // Ensure we are not processing a label's title input directly in this loop
                else if (labelTitleInput && input.id === labelTitleInput.id) {
                     return; // Skip label title inputs here, handle below
                }
                // Process regular value inputs
                else {
                    settings[input.id] = input.value;
                    utils.log(`Saving Allegiance value input ${input.id}: ${input.value}`, 'debug');
                }

                // Find and save label's title INPUT text
                if (labelTitleInput) {
                    const labelKey = `label-${input.id}`; // Key for the label's content
                    settings[labelKey] = labelTitleInput.value; // Save the *value* of the input inside the label
                    utils.log(`Saving Allegiance label input content ${labelKey}: ${labelTitleInput.value}`, 'debug');
                } else {
                    // utils.log(`Label title input for Allegiance value input ${input.id} not found.`, 'debug'); 
                }
            }
        });

        localStorage.setItem('allegianceUISettings', JSON.stringify(settings));
        utils.log('Allegiance UI settings saved successfully.', 'success');

        // Optional visual confirmation
        // ...

    } catch (error) {
        utils.log(`Error saving Allegiance UI settings: ${error}`, 'error');
        console.error(error);
        // Optional visual error confirmation
        // ...
    }
}

/**
 * Loads Allegiance UI settings (inputs, labels, title) from localStorage and applies them.
 * Should be called *after* the allegiance fields have been dynamically generated by ui.js.
 * @async
 * @function loadAllegianceUISettings
 * @description Retrieves settings from localStorage, parses them, and updates inputs, labels, and title in #allegiance-fields-container.
 * Logs the load operation. Handles potential errors.
 */
async function loadAllegianceUISettings() {
    utils.log('Attempting to load Allegiance UI settings (inputs, labels, title)...', 'info');
    let settings = {}; // Define settings in the outer scope
    try {
        const savedSettings = localStorage.getItem('allegianceUISettings');
        if (!savedSettings) {
            utils.log('No saved Allegiance UI settings found.', 'info');
            return;
        }
        settings = JSON.parse(savedSettings); // Assign parsed settings

    } catch (parseError) {
        utils.log(`Error parsing saved Allegiance UI settings from localStorage: ${parseError}`, 'error');
        // Optionally clear corrupted settings
        // localStorage.removeItem('allegianceUISettings');
        return; // Stop if parsing fails
    }

    try { // Add try-catch around DOM manipulation
        const fieldsContainer = document.getElementById('allegiance-fields-container');
        const titleElement = document.getElementById('allegiance-name-display')?.querySelector('input.allegiance-title-input'); // Target the INPUT inside the H3

        if (!fieldsContainer) {
            utils.log('Allegiance fields container not found during load. Cannot apply settings.', 'debug');
            return; 
        }

        // Load Title
        // Use the placeholder ID for the input element: `allegiance-${allegianceKey}-name-display`
        const titleInputId = titleElement?.id;
        if (titleElement && titleInputId && settings[titleInputId] !== undefined) {
            titleElement.value = settings[titleInputId]; // Set input VALUE
            utils.log(`Loaded Allegiance title input (${titleInputId}): ${settings[titleInputId]}`, 'debug');
        } else if (!titleElement) {
            utils.log('Allegiance title input element not found during load.', 'warn');
        }

        // Load input values and label text
        for (const key in settings) {
            // Skip the title key
            if (titleInputId && key === titleInputId) continue;

            if (key.startsWith('label-')) {
                // Load label text into the title INPUT within the label
                const inputId = key.substring(6); 
                const labelElement = fieldsContainer.querySelector(`label[for="${inputId}"]`);
                const titleInputElement = labelElement?.querySelector('input.field-title-input'); // Target the INPUT inside the label
                if (titleInputElement) {
                    titleInputElement.value = settings[key]; // Set input VALUE
                    utils.log(`Loaded Allegiance label input for ${inputId}: ${settings[key]}`, 'debug');
                } else {
                    utils.log(`Label title input element for key ${key} (input ID: ${inputId}) not found during load.`, 'warn');
                }
            } else {
                // Load input value
                const inputElement = fieldsContainer.querySelector(`#${CSS.escape(key)}`);
                if (inputElement) {
                     // Ensure we don't accidentally overwrite the title/label inputs again
                     if (!inputElement.classList.contains('allegiance-title-input') && !inputElement.classList.contains('field-title-input')) {
                        inputElement.value = settings[key];
                        utils.log(`Loaded Allegiance value input ${key}: ${settings[key]}`, 'debug');
                     }
                } else {
                    utils.log(`Value input element with ID ${key} not found in Allegiance container during load.`, 'warn');
                }
            }
        }

        utils.log('Allegiance UI settings applied successfully.', 'info');

    } catch (domError) {
        utils.log(`Error applying Allegiance UI settings to DOM: ${domError}`, 'error');
        console.error(domError);
    }
}

// --- Initialization for Persistence (Moved from ui-persistence.js) ---
document.addEventListener('DOMContentLoaded', () => {
    utils.log('UI Persistence (in utils.js) initializing event listeners...', 'info');

    // NOTE: Load functions (loadFactionUISettings, loadAllegianceUISettings) are now called
    // from ui.js *after* the relevant fields/titles are dynamically generated,
    // ensuring elements exist before settings are applied.
    // We *do not* call them here on initial DOMContentLoaded anymore.

    // Attach event listeners to the save buttons
    const saveFactionBtn = document.getElementById('faction-save-btn');
    const saveAllegianceBtn = document.getElementById('allegiance-save-ui-btn');

    if (saveFactionBtn) {
        saveFactionBtn.addEventListener('click', saveFactionUISettings);
        utils.log('Attached save listener to Faction save button.', 'debug');
        // Enable the button unconditionally
        saveFactionBtn.disabled = false; 
        utils.log('Faction save button enabled.', 'debug');
    } else {
        utils.log('Faction save button (#faction-save-btn) not found.', 'warn');
    }

    if (saveAllegianceBtn) {
        saveAllegianceBtn.addEventListener('click', saveAllegianceUISettings);
        utils.log('Attached save listener to Allegiance save button.', 'debug');
        // Enable the button unconditionally
        saveAllegianceBtn.disabled = false;
        utils.log('Allegiance save button enabled.', 'debug');
    } else {
        utils.log('Allegiance save button (#allegiance-save-ui-btn) not found.', 'warn');
    }
    
    utils.log('UI Persistence (in utils.js) listener initialization complete.', 'info');
});
