class CredentialsManager {
    constructor() {
        // Demo credentials
        this.demoCredentials = {
            'cyonic': { password: 'cyonic', role: 'faction' },
            'admin': { password: 'admin', role: 'admin' },
            'ureg': { password: 'ureg', role: 'staff' },
            'alleg': { password: 'alleg', role: 'allegiance' }
        };

        // Generated credentials will be loaded from credentials_updated.csv
        this.generatedCredentials = {};
    }

    async loadGeneratedCredentials() {
        try {
            // TODO: Add code to load credentials from credentials_updated.csv
            console.log("Loading generated credentials...");
        } catch (error) {
            console.error("Error loading generated credentials:", error);
        }
    }

    validateCredentials(username, password) {
        // Check demo credentials first
        if (this.demoCredentials[username] && 
            this.demoCredentials[username].password === password) {
            return {
                valid: true,
                role: this.demoCredentials[username].role
            };
        }

        // Check generated credentials
        if (this.generatedCredentials[username] && 
            this.generatedCredentials[username].password === password) {
            return {
                valid: true,
                role: this.generatedCredentials[username].role,
                keyA: this.generatedCredentials[username].keyA,
                keyB: this.generatedCredentials[username].keyB
            };
        }

        return { valid: false };
    }
} 