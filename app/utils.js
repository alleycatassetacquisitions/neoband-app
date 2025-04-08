/**
 * utils.js
 * Utility functions for the Rival App (hex conversion, padding, delays, logging, address calculations).
 */

const utils = {
    MAX_BLOCK_ADDRESS: 255, // MIFARE Classic 4K
    MAX_TEXT_LENGTH: 16, // Bytes per block

    /**
     * Calculates MIFARE Classic 4K sector/block info from a linear address.
     * @param {number} logicalAddress - The linear block address (0-255).
     * @returns {object} { sector: number, blockInSector: number, isTrailerBlock: boolean, absoluteBlock: number }
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
     * Validates if a block address is usable for read/write operations.
     * @param {number} blockAddress - The absolute block address (0-255).
     * @param {boolean} isWriteOperation - True if checking for write permissions (disallows trailer blocks).
     * @returns {boolean} True if the address is valid and usable.
     */
    isValidDataBlock: function(blockAddress, isWriteOperation = false) {
         try {
             const addrInfo = this.calculateMifareAddress(blockAddress);
             // Block 0 of Sector 0 is Manufacturer Block - never writable, often read-protected
             if (addrInfo.sector === 0 && addrInfo.blockInSector === 0) {
                 return false;
             }
              // Reserved sectors - never usable
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
     * Truncates if longer than MAX_TEXT_LENGTH.
     * Improved to ensure consistent handling of ASCII characters.
     * @param {string} text - The input text.
     * @returns {string} The hex string (without 0x prefix).
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
     * Handles mixed FF/00 padding bytes correctly and preserves all valid characters.
     * Enhanced for compatibility with the original Neoband App data format.
     * @param {string} hexStr - The hex string (can start with 0x).
     * @returns {string} The decoded text.
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
     * @param {string} hexStr - The hex string to pad.
     * @param {number} [length=32] - The target length in characters (default: 32 chars = 16 bytes).
     * @returns {string} The padded hex string.
     */
    padHex: function(hexStr, length = 32) {
        // Validate input
        if (!hexStr) {
            utils.log(`Warning: Padding empty hex string with FF`, 'warning');
            // Return all FF padding if no input
            return 'F'.repeat(length);
        }
        
        // Remove 0x prefix if present
        let hex = hexStr.startsWith('0x') || hexStr.startsWith('0X') ? hexStr.slice(2) : hexStr;
        
        // Sanitize to ensure even length
        if (hex.length % 2 !== 0) {
            utils.log(`Warning: Odd-length hex string (${hex.length}): ${hex}`, 'warning');
            hex = hex + '0';  // Append a 0 to make it even
        }
        
        // Debug the length
        utils.log(`Padding hex string from ${hex.length} to ${length} characters`, 'debug');
        utils.log(`Original: ${hex}`, 'debug');
        
        // Get the number of bytes in the input
        const byteCount = hex.length / 2;
        utils.log(`Original contains ${byteCount} bytes of data`, 'debug');
        
        // Calculate padding
        const paddingNeeded = Math.max(0, length - hex.length);
        const padding = 'F'.repeat(paddingNeeded);
        
        // Log the padding details
        if (paddingNeeded > 0) {
            utils.log(`Adding ${paddingNeeded} padding characters (${paddingNeeded/2} bytes)`, 'debug');
        } else {
            utils.log(`No padding needed, hex data is already ${hex.length} characters`, 'debug');
        }
        
        // Pad the hex string on the right with FF
        const padded = hex + padding;
        utils.log(`Padded: ${padded}`, 'debug');
        
        // Check if we need to truncate
        if (padded.length > length) {
            const truncated = padded.substring(0, length);
            utils.log(`Warning: Truncated hex data from ${padded.length} to ${length} characters`, 'warning');
            return truncated;
        }
        
        return padded;
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
        this.logElement = document.getElementById('logDisplay');
        if (!this.logElement) {
            console.error("Log display element (#logDisplay) not found!");
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
            const logEntry = document.createElement('div');
            logEntry.style.color = color;
             const timestamp = new Date().toLocaleTimeString();
             logEntry.textContent = `[${timestamp}] [${prefix}] ${message}`;
             this.logElement.appendChild(logEntry);
             // Auto-scroll to the bottom
             this.logElement.scrollTop = this.logElement.scrollHeight;
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
    }
}; 