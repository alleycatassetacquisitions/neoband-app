/**
 * D-Logic uFR NFC Reader Library Functions
 * 
 * This file contains the comprehensive functions needed to communicate with D-Logic NFC readers.
 * It provides a complete interface for sending commands and receiving responses from the NFC hardware,
 * allowing the application to work offline without external dependencies.
 * 
 * Based on D-Logic examples and documentation.
 */

// Constants for authentication modes
const MIFARE_AUTHENT1A = 0x60;
const MIFARE_AUTHENT1B = 0x61;

// Default key for MIFARE Classic cards
const DEFAULT_KEY = "FFFFFFFFFFFF";

/**
 * Get response from the NFC reader
 * 
 * @returns {Object} Parsed JSON response from the NFC reader
 */
function ufResponse() {
    try {
        return JSON.parse(window.sessionStorage["response"]);
    } catch (error) {
        console.error("Error parsing response:", error);
        return { Status: "Error parsing response", Error: error.message };
    }
}

/**
 * Send a request to the NFC reader
 * 
 * @param {string} cmd - Command to send to the NFC reader
 * @param {Function} callback - Callback function to handle the response
 */
function ufRequest(cmd, callback) {
    try {
        var event = new CustomEvent("send-ufr", {
            detail: cmd,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
        var counter = 0;
        document.addEventListener("get-ufr", function (e) {
            if (counter == 0) callback(e);
            counter++;
        });
    } catch (error) {
        console.error("Error sending request:", error);
        window.sessionStorage["response"] = JSON.stringify({ 
            Status: "Error sending request", 
            Error: error.message 
        });
        if (callback) callback();
    }
}

/**
 * Promise-based response handler
 * 
 * @returns {Promise<Object>} Promise resolving to parsed response
 */
async function uFR_Response() {
    return new Promise(resolve => {
        document.addEventListener("get-ufr", function (e) {
            resolve(JSON.parse(window.sessionStorage.response));
        });
    });
}

/**
 * Promise-based request handler
 * 
 * @param {string} cmd - Command to send to the NFC reader
 * @returns {Promise<Object>} Promise resolving to parsed response
 */
function uFR_Request(cmd) {
    return new Promise(resolve => {
        request(cmd, async function () {
            let response = await uFR_Response();
            resolve(response);
        });
    });
}

/**
 * Low-level request handler
 * 
 * @param {string} cmd - Command to send to the NFC reader
 * @param {Function} callback - Callback function to handle the response
 */
function request(cmd, callback) {
    let counter = 0;
    let event = new CustomEvent("send-ufr", {
        detail: cmd,
        bubbles: false,
        cancelable: true
    });
    if (counter == 0) callback(cmd);
    counter++;
    document.dispatchEvent(event);
}

/**
 * Utility function to convert decimal to hexadecimal
 * 
 * @param {number} d - Decimal number to convert
 * @returns {string} Hexadecimal representation
 */
function decimalToHex(d) {
    var h = (+d).toString(16).toUpperCase();
    return h.length === 1 ? '0' + h : h;
}

/**
 * Check if a string is valid hexadecimal
 * 
 * @param {string} h - String to check
 * @returns {boolean} True if valid hex, false otherwise
 */
function isHex(h) {
    const regexp = /^[0-9a-fA-F]+$/;
    return regexp.test(h);
}

/**
 * Convert text to hexadecimal
 * 
 * @param {string} text - Text to convert
 * @returns {string} Hexadecimal representation
 */
function textToHex(text) {
    let hex = '';
    for (let i = 0; i < text.length; i++) {
        hex += text.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex.toUpperCase();
}

/**
 * Convert hexadecimal to text
 * 
 * @param {string} hex - Hexadecimal string to convert
 * @returns {string} Text representation
 */
function hexToText(hex) {
    let text = '';
    for (let i = 0; i < hex.length; i += 2) {
        const hexChar = hex.substr(i, 2);
        if (hexChar === '00') continue; // Skip null bytes
        text += String.fromCharCode(parseInt(hexChar, 16));
    }
    return text;
}

/**
 * Sleep/delay utility function
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Open connection to the reader
 * 
 * @param {Object} options - Optional parameters for advanced opening
 * @returns {Promise<Object>} Promise resolving to the reader response
 */
async function readerOpen(options = null) {
    return new Promise((resolve) => {
        let command = "ReaderOpen";
        
        if (options) {
            command = "ReaderOpenEx " + 
                      options.readerType + " " + 
                      options.portName + " " + 
                      options.portInterface + " " + 
                      options.additionalArg;
        }
        
        ufRequest(command, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Close connection to the reader
 * 
 * @returns {Promise<Object>} Promise resolving to the reader response
 */
async function readerClose() {
    return new Promise((resolve) => {
        ufRequest("ReaderClose", function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Get reader type information
 * 
 * @returns {Promise<Object>} Promise resolving to the reader type information
 */
async function getReaderType() {
    return new Promise((resolve) => {
        ufRequest("GetReaderType", function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Get reader serial number
 * 
 * @returns {Promise<Object>} Promise resolving to the reader serial information
 */
async function getReaderSerial() {
    return new Promise((resolve) => {
        ufRequest("GetReaderSerial", function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Control the reader's UI signals (LEDs, beeper)
 * 
 * @param {number} lightSignal - Light signal control (0-3)
 * @param {number} beepSignal - Beep signal control (0-3)
 * @returns {Promise<Object>} Promise resolving to the reader response
 */
async function readerUISignal(lightSignal = 1, beepSignal = 1) {
    return new Promise((resolve) => {
        const command = `ReaderUISignal ${lightSignal} ${beepSignal}`;
        ufRequest(command, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Get card ID and type information
 * 
 * @returns {Promise<Object>} Promise resolving to the card information
 */
async function getCardIdEx() {
    return new Promise((resolve) => {
        ufRequest("GetCardIdEx", function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Get card size information
 * 
 * @returns {Promise<Object>} Promise resolving to the card size information
 */
async function getCardSize() {
    return new Promise((resolve) => {
        ufRequest("GetCardSize d d", function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Authenticate a block using key A or B
 * 
 * @param {number} blockNumber - Block number to authenticate
 * @param {string} key - Authentication key (hex string)
 * @param {number} authMode - Authentication mode (MIFARE_AUTHENT1A or MIFARE_AUTHENT1B)
 * @param {number} keyIndex - Key index in the reader
 * @returns {Promise<Object>} Promise resolving to the authentication result
 */
async function authenticateBlock(blockNumber, key = DEFAULT_KEY, authMode = MIFARE_AUTHENT1A, keyIndex = 0) {
    return new Promise((resolve) => {
        const command = `BlockAuthenticate ${blockNumber} ${authMode} ${keyIndex}`;
        ufRequest(command, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Read a block from the card
 * 
 * @param {number} blockNumber - Block number to read
 * @param {string} key - Authentication key (hex string)
 * @param {number} authMode - Authentication mode (MIFARE_AUTHENT1A or MIFARE_AUTHENT1B)
 * @param {number} keyIndex - Key index in the reader
 * @returns {Promise<Object>} Promise resolving to the block data
 */
async function readBlock(blockNumber, key = DEFAULT_KEY, authMode = MIFARE_AUTHENT1A, keyIndex = 0) {
    return new Promise(async (resolve) => {
        // First authenticate
        const authResult = await authenticateBlock(blockNumber, key, authMode, keyIndex);
        
        if (authResult.Status !== "[0x00 (0)] UFR_OK") {
            resolve({
                Status: authResult.Status,
                Error: "Authentication failed",
                Data: null
            });
            return;
        }
        
        // Then read the block
        ufRequest(`BlockRead ${blockNumber}`, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Write data to a block
 * 
 * @param {number} blockNumber - Block number to write
 * @param {string} data - Data to write (hex string)
 * @param {string} key - Authentication key (hex string)
 * @param {number} authMode - Authentication mode (MIFARE_AUTHENT1A or MIFARE_AUTHENT1B)
 * @param {number} keyIndex - Key index in the reader
 * @returns {Promise<Object>} Promise resolving to the write result
 */
async function writeBlock(blockNumber, data, key = DEFAULT_KEY, authMode = MIFARE_AUTHENT1A, keyIndex = 0) {
    return new Promise(async (resolve) => {
        // First authenticate
        const authResult = await authenticateBlock(blockNumber, key, authMode, keyIndex);
        
        if (authResult.Status !== "[0x00 (0)] UFR_OK") {
            resolve({
                Status: authResult.Status,
                Error: "Authentication failed"
            });
            return;
        }
        
        // Ensure data is in hex format
        if (!isHex(data)) {
            data = textToHex(data);
        }
        
        // Pad data to 32 characters (16 bytes)
        const paddedData = data.padEnd(32, '0');
        
        // Then write the block
        ufRequest(`BlockWrite ${blockNumber} ${paddedData}`, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Format a MIFARE Classic card
 * 
 * @param {string} newKeyA - New key A (hex string)
 * @param {string} newKeyB - New key B (hex string)
 * @param {number} blockAccessBits - Block access bits (0-7)
 * @param {number} sectorTrailersAccessBits - Sector trailer access bits (0-7)
 * @param {number} sectorTrailersByte9 - Sector trailer byte 9 value
 * @param {number} authMode - Authentication mode (MIFARE_AUTHENT1A or MIFARE_AUTHENT1B)
 * @param {number} keyIndex - Key index in the reader
 * @returns {Promise<Object>} Promise resolving to the format result
 */
async function formatCard(newKeyA = DEFAULT_KEY, newKeyB = DEFAULT_KEY, blockAccessBits = 0, 
                         sectorTrailersAccessBits = 1, sectorTrailersByte9 = 0x69, 
                         authMode = MIFARE_AUTHENT1A, keyIndex = 0) {
    return new Promise((resolve) => {
        const command = `LinearFormatCard ${newKeyA} ${blockAccessBits} ${sectorTrailersAccessBits} ${sectorTrailersByte9} ${newKeyB} ${authMode} ${keyIndex}`;
        
        ufRequest(command, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Read data from a linear address
 * 
 * @param {number} linearAddress - Linear address to read from
 * @param {number} dataLength - Length of data to read
 * @param {string} key - Authentication key (hex string)
 * @param {number} authMode - Authentication mode (MIFARE_AUTHENT1A or MIFARE_AUTHENT1B)
 * @param {number} keyIndex - Key index in the reader
 * @returns {Promise<Object>} Promise resolving to the read data
 */
async function linearRead(linearAddress, dataLength, key = DEFAULT_KEY, authMode = MIFARE_AUTHENT1A, keyIndex = 0) {
    return new Promise((resolve) => {
        const command = `LinearRead h ${linearAddress} ${dataLength} ${authMode} ${keyIndex}`;
        
        ufRequest(command, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Write data to a linear address
 * 
 * @param {string} data - Data to write (hex string)
 * @param {number} linearAddress - Linear address to write to
 * @param {number} dataLength - Length of data to write
 * @param {string} key - Authentication key (hex string)
 * @param {number} authMode - Authentication mode (MIFARE_AUTHENT1A or MIFARE_AUTHENT1B)
 * @param {number} keyIndex - Key index in the reader
 * @returns {Promise<Object>} Promise resolving to the write result
 */
async function linearWrite(data, linearAddress, dataLength, key = DEFAULT_KEY, authMode = MIFARE_AUTHENT1A, keyIndex = 0) {
    return new Promise((resolve) => {
        // Ensure data is in hex format
        if (!isHex(data)) {
            data = textToHex(data);
        }
        
        const command = `LinearWrite 0x${data} ${linearAddress} ${dataLength} ${authMode} ${keyIndex}`;
        
        ufRequest(command, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Write a key to the reader
 * 
 * @param {string} key - Key to write (hex string)
 * @param {number} keyIndex - Key index in the reader
 * @returns {Promise<Object>} Promise resolving to the write result
 */
async function readerKeyWrite(key, keyIndex) {
    return new Promise((resolve) => {
        const command = `ReaderKeyWrite ${key} ${keyIndex}`;
        
        ufRequest(command, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

/**
 * Write a sector trailer
 * 
 * @param {number} sector - Sector number
 * @param {string} keyA - Key A (hex string)
 * @param {number} block0AccessBits - Access bits for block 0
 * @param {number} block1AccessBits - Access bits for block 1
 * @param {number} block2AccessBits - Access bits for block 2
 * @param {number} sectorTrailerAccessBits - Access bits for sector trailer
 * @param {number} sectorTrailerByte9 - Sector trailer byte 9 value
 * @param {string} keyB - Key B (hex string)
 * @param {number} authMode - Authentication mode (MIFARE_AUTHENT1A or MIFARE_AUTHENT1B)
 * @param {number} keyIndex - Key index in the reader
 * @returns {Promise<Object>} Promise resolving to the write result
 */
async function sectorTrailerWrite(sector, keyA, block0AccessBits, block1AccessBits, block2AccessBits, 
                                 sectorTrailerAccessBits, sectorTrailerByte9, keyB, 
                                 authMode = MIFARE_AUTHENT1A, keyIndex = 0) {
    return new Promise((resolve) => {
        const command = `SectorTrailerWrite 1 ${sector} ${keyA} ${block0AccessBits} ${block1AccessBits} ${block2AccessBits} ${sectorTrailerAccessBits} ${sectorTrailerByte9} ${keyB} ${authMode} ${keyIndex}`;
        
        ufRequest(command, function() {
            const response = ufResponse();
            resolve(response);
        });
    });
}

// Export functions to the global scope for use in the application
window.ufResponse = ufResponse;
window.ufRequest = ufRequest;
window.uFR_Response = uFR_Response;
window.uFR_Request = uFR_Request;
window.request = request;
window.decimalToHex = decimalToHex;
window.isHex = isHex;
window.textToHex = textToHex;
window.hexToText = hexToText;
window.sleep = sleep;
window.readerOpen = readerOpen;
window.readerClose = readerClose;
window.getReaderType = getReaderType;
window.getReaderSerial = getReaderSerial;
window.readerUISignal = readerUISignal;
window.getCardIdEx = getCardIdEx;
window.getCardSize = getCardSize;
window.authenticateBlock = authenticateBlock;
window.readBlock = readBlock;
window.writeBlock = writeBlock;
window.formatCard = formatCard;
window.linearRead = linearRead;
window.linearWrite = linearWrite;
window.readerKeyWrite = readerKeyWrite;
window.sectorTrailerWrite = sectorTrailerWrite;
window.MIFARE_AUTHENT1A = MIFARE_AUTHENT1A;
window.MIFARE_AUTHENT1B = MIFARE_AUTHENT1B;
window.DEFAULT_KEY = DEFAULT_KEY; 