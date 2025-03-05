/**
 * NeobandReader - Interface for interacting with D-Logic NFC reader hardware
 * 
 * This class provides an abstraction layer for communicating with the D-Logic NFC reader,
 * allowing the application to read from and write to Neoband NFC bands. It handles
 * connection management, data operations, and hardware-specific implementations.
 */

// Import MIFARE helper functions
import { 
    checkCardPresence, 
    readBandData, 
    writeBandData,
    resetBand
} from './mifare-helper.js';

// D-Logic Reader Interface
class NeobandReader {
    /**
     * Initialize a new reader instance
     * 
     * Sets up the initial state for the reader, tracking connection status
     * and currently detected band ID.
     */
    constructor() {
        this.isConnected = false;
        this.currentBandId = null;
    }

    /**
     * Initialize connection to D-Logic reader
     * 
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async initialize() {
        try {
            console.log("Initializing D-Logic reader connection...");
            // Try to use the ufRequest function if available (D-Logic reader environment)
            if (typeof ufRequest === 'function') {
                this.isConnected = true;
                console.log("D-Logic reader environment detected");
            } else {
                console.log("D-Logic reader environment not detected, running in simulation mode");
                this.isConnected = false;
            }
            return true;
        } catch (error) {
            console.error("Failed to initialize reader:", error);
            return false;
        }
    }

    /**
     * Check if a Neoband is present on the reader
     * 
     * @returns {Promise<boolean>} True if a band is detected
     */
    async checkForBand() {
        try {
            console.log("Checking for Neoband...");
            const { present } = await checkCardPresence();
            return present;
        } catch (error) {
            console.error("Error checking for band:", error);
            return false;
        }
    }
    
    /**
     * Read the unique ID of the Neoband NFC card
     * 
     * @returns {Promise<string|null>} The card's UID or null if reading fails
     */
    async readBandId() {
        try {
            console.log("Reading Neoband ID...");
            const { present, uid } = await checkCardPresence();
            
            if (present && uid) {
                console.log("Band ID read:", uid);
                this.currentBandId = uid;
                return uid;
            } else {
                console.warn("Failed to read band ID");
                return null;
            }
        } catch (error) {
            console.error("Error reading band ID:", error);
            return null;
        }
    }

    /**
     * Read username from Neoband
     * 
     * @param {string} publicKey - Public key for authentication
     * @returns {Promise<string>} Username or status message
     */
    async readUsername(publicKey) {
        try {
            if (!publicKey) {
                throw new Error("Public key is required to read username");
            }
            
            console.log(`Reading username from Neoband using Public Key: ${publicKey}...`);
            const bandData = await this.readBand(publicKey);
            
            if (bandData && bandData.username) {
                return bandData.username;
            } else {
                console.warn("No username found on this Neoband.");
                return "Unknown User";
            }
        } catch (error) {
            console.error("Error reading username from band:", error);
            return "Error";
        }
    }

    /**
     * Read data from Neoband
     * 
     * @param {string} publicKey - Public key for authentication
     * @returns {Promise<object|null>} Band data object or null if reading fails
     */
    async readBand(publicKey) {
        try {
            if (!publicKey) {
                throw new Error("Public key required for reading band data");
            }
            console.log(`Reading Neoband data using Public Key: ${publicKey}...`);
            
            // Use the MIFARE helper to read band data
            const { success, bandId, data } = await readBandData(publicKey);
            
            if (success && data) {
                console.log("User data read from card:", data);
                return {
                    username: data.username,
                    bandId: bandId,
                    registrationDate: data.registrationDate
                };
            } else if (bandId) {
                // If we can't read data but have a band ID, this might be an unregistered band
                console.log("Unregistered band detected with ID:", bandId);
                return { bandId: bandId };
            } else {
                console.warn("No band detected or reading failed");
                return null;
            }
        } catch (error) {
            console.error("Error reading band:", error);
            return null;
        }
    }

    /**
     * Write data to Neoband
     * 
     * @param {string} privateKey - Private key for authentication
     * @param {object} data - Data to write to the band
     * @returns {Promise<boolean>} True if writing was successful
     */
    async writeBand(privateKey, data) {
        try {
            if (!privateKey) {
                throw new Error("Private key required for writing to band");
            }
            console.log(`Writing to Neoband using Private Key: ${privateKey}...`, data);
            
            // Use the MIFARE helper to write band data
            const success = await writeBandData(privateKey, data);
            
            if (success) {
                console.log("Data successfully written to band");
                return true;
            } else {
                console.error("Failed to write data to band");
                return false;
            }
        } catch (error) {
            console.error("Error writing to band:", error);
            return false;
        }
    }

    /**
     * Reset Neoband to default state
     * 
     * @param {string} privateKey - Private key for authentication
     * @returns {Promise<boolean>} True if reset was successful
     */
    async resetBand(privateKey) {
        try {
            if (!privateKey) {
                throw new Error("Private key required for resetting band");
            }
            console.log(`Resetting Neoband using Private Key: ${privateKey}...`);
            
            // Use the MIFARE helper to reset the band
            const success = await resetBand(privateKey);
            
            if (success) {
                console.log("Band successfully reset");
                return true;
            } else {
                console.error("Failed to reset band");
                return false;
            }
        } catch (error) {
            console.error("Error resetting band:", error);
            return false;
        }
    }
}

// Export the NeobandReader class
export default NeobandReader;