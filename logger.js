class NeobandLogger {
    constructor() {
        this.logQueue = [];
    }

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