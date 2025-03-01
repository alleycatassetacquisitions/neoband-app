class CredentialsManager {
    constructor() {
        // Demo credentials with public and private keys
        this.demoCredentials = {
            'cyonic': { 
                password: 'cyonic', 
                role: 'faction', 
                publicKey: 'PUB_CYONIC', 
                privateKey: 'PRIV_CYONIC' 
            },
            'admin': { 
                password: 'admin', 
                role: 'admin', 
                publicKey: 'PUB_ADMIN', 
                privateKey: 'PRIV_ADMIN' 
            },
            'ureg': { 
                password: 'ureg', 
                role: 'staff', 
                publicKey: 'PUB_UREG', 
                privateKey: 'PRIV_UREG' 
            },
            'alleg': { 
                password: 'alleg', 
                role: 'allegiance', 
                publicKey: 'PUB_ALLEG', 
                privateKey: 'PRIV_ALLEG' 
            }
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
                role: this.demoCredentials[username].role,
                publicKey: this.demoCredentials[username].publicKey,
                privateKey: this.demoCredentials[username].privateKey
            };
        }

        // Check generated credentials
        if (this.generatedCredentials[username] && 
            this.generatedCredentials[username].password === password) {
            return {
                valid: true,
                role: this.generatedCredentials[username].role,
                publicKey: this.generatedCredentials[username].publicKey,
                privateKey: this.generatedCredentials[username].privateKey
            };
        }

        return { valid: false };
    }
} 

// Test function for CredentialsManager
function testCredentialsManager() {
    const manager = new CredentialsManager();
    
    console.log('Test Case 1: Valid Login');
    console.log('Input: cyonic/cyonic');
    const validResult = manager.validateCredentials('cyonic', 'cyonic');
    console.log('Result:', validResult);
    console.log('Expected: valid=true, role=faction, has public/private keys\n');

    console.log('Test Case 2: Invalid Password');
    console.log('Input: cyonic/wrongpass');
    const invalidPassResult = manager.validateCredentials('cyonic', 'wrongpass');
    console.log('Result:', invalidPassResult);
    console.log('Expected: valid=false\n');

    console.log('Test Case 3: Non-existent User');
    console.log('Input: unknown/randompass');
    const nonExistentResult = manager.validateCredentials('unknown', 'randompass');
    console.log('Result:', nonExistentResult);
    console.log('Expected: valid=false\n');
}

// Run tests if not in production
if (process.env.NODE_ENV !== 'production') {
    testCredentialsManager();
}