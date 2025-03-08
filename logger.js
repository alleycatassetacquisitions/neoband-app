/**
 * NeobandLogger - Manages logging activity in the Neoband application
 * 
 * This class handles event logging for the Neoband app, providing methods for
 * recording user actions and system events with proper security measures.
 * It implements a queue system for logs with a flush mechanism for persistent storage.
 */
class NeobandLogger {
    /**
     * Initialize a new logger instance with an empty log queue
     */
    constructor() {
        this.logQueue = [];
    }

    /**
     * Log an action with associated details
     * 
     * @param {string} action - The action being performed (e.g., 'login', 'username_read')
     * @param {object} details - Additional information about the action
     * @returns {Promise<void>}
     * 
     * This method creates a timestamped log entry, masks any sensitive data,
     * adds it to the log queue, and will auto-flush if the queue gets too large.
     */
    async log(action, details) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            action,
            // Mask sensitive key data in logs
            details: this.maskSensitiveData(details)
        };

        // Add to queue
        this.logQueue.push(logEntry);

        // Automatically flush if queue gets too large
        if (this.logQueue.length > 100) {
            await this.flush();
        }

        // TODO: Add code to write to SD card when available
        console.log("Log Entry:", logEntry);
    }

    /**
     * Mask sensitive data to prevent security breaches in logs
     * 
     * @param {object} details - Object containing potentially sensitive information
     * @returns {object} - Copy of the details with sensitive fields masked
     * 
     * This method creates a safe copy of the details object with sensitive fields
     * like public/private keys partially masked to prevent exposure in logs.
     */
    maskSensitiveData(details) {
        if (!details) return details;
        
        const maskedDetails = { ...details };
        
        // Mask sensitive key data if present
        if (maskedDetails.publicKey) {
            maskedDetails.publicKey = `${maskedDetails.publicKey.substring(0, 4)}...`;
        }
        if (maskedDetails.privateKey) {
            maskedDetails.privateKey = `${maskedDetails.privateKey.substring(0, 4)}...`;
        }
        
        return maskedDetails;
    }

    /**
     * Flush the log queue to permanent storage
     * 
     * @returns {Promise<void>}
     * 
     * This method attempts to write all queued logs to persistent storage (SD card),
     * then clears the queue. Currently, the actual writing is a placeholder (TODO).
     */
    async flush() {
        try {
            // TODO: Add code to write queued logs to SD card
            console.log("Flushing logs to SD card...");
            this.logQueue = [];
        } catch (error) {
            console.error("Error flushing logs:", error);
        }
    }
} 