/**
 * D-Logic uFR NFC Reader Library Functions
 * 
 * This file contains the essential functions needed to communicate with D-Logic NFC readers.
 * It provides the interface for sending commands and receiving responses from the NFC hardware.
 */

/**
 * Get response from the NFC reader
 * 
 * @returns {Object} Parsed JSON response from the NFC reader
 */
function ufResponse() {
    return JSON.parse(window.sessionStorage["response"]);
}

/**
 * Send a request to the NFC reader
 * 
 * @param {string} cmd - Command to send to the NFC reader
 * @param {Function} callback - Callback function to handle the response
 */
function ufRequest(cmd, callback) {
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