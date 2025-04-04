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
    hexToText: function(hexStr) {
        // Handle empty input
        if (!hexStr) return '';
        
        // Remove 0x prefix if present
        let hex = hexStr.startsWith('0x') || hexStr.startsWith('0X') ? hexStr.slice(2) : hexStr;
        
        // For debugging purposes, print the full hex string
        console.debug("Converting hex to text (input):", hex);
        
        // Special handling for Neoband's FF-padding convention
        // First pass: identify the usable data by finding where FF padding starts consistently
        // Look for the first index where we start seeing only FF bytes to the end
        let effectiveLength = hex.length;
        for (let i = 0; i < hex.length; i += 2) {
            // If we've reached the end of data or have less than 2 chars left, stop
            if (i + 2 > hex.length) break;
            
            const byte = hex.substring(i, i + 2).toUpperCase();
            
            // Skip individual FF/00 bytes that might be part of actual data
            if (byte === 'FF' || byte === '00') continue;
        }
        
        // Second pass: convert all valid bytes to characters
        let result = '';
        for (let i = 0; i < hex.length; i += 2) {
            if (i + 2 <= hex.length) {
                const byte = hex.substring(i, i + 2).toUpperCase();
                
                // Skip any FF padding or 00 null bytes
                if (byte !== 'FF' && byte !== '00') {
                    try {
                        const charCode = parseInt(byte, 16);
                        // Only add printable ASCII characters (avoid control characters)
                        if (charCode >= 32 && charCode <= 126) {
                            result += String.fromCharCode(charCode);
                        }
                    } catch (e) {
                        console.warn(`Invalid hex byte encountered: ${byte}`);
                    }
                }
            }
        }
        
        // Log the result for debugging
        console.debug("Converting hex to text (output):", result);
        
        // Return the result, even if it's just a single character
        return result;
    },

    /**
     * Pads a hex string to 16 bytes (32 hex chars) using 'FF' padding.
     * Truncates if longer than 16 bytes.
     * @param {string} hexStr - The input hex string.
     * @returns {string} The padded/truncated hex string.
     */
    padHex: function(hexStr) {
        const targetLength = this.MAX_TEXT_LENGTH * 2; // 32 hex chars
        let hex = hexStr.startsWith('0x') || hexStr.startsWith('0X') ? hexStr.slice(2) : hexStr;
        if (hex.length > targetLength) {
            return hex.substring(0, targetLength);
        }
        while (hex.length < targetLength) {
            hex += 'FF'; // Pad with FF bytes to match original app
        }
        return hex;
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