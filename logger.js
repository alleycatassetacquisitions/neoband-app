class NeobandLogger {
    constructor() {
        this.logQueue = [];
    }

    async log(action, details) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            action,
            details
        };

        // Add to queue
        this.logQueue.push(logEntry);

        // TODO: Add code to write to SD card when available
        console.log("Log Entry:", logEntry);
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