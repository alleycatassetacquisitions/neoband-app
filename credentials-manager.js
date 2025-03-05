/**
 * CredentialsManager - Manages user authentication and authorization in the Neoband app
 * 
 * This class handles user credential validation, storing demo credentials for testing
 * and development, and providing a framework for loading actual credentials from an
 * external source (CSV file) in production environments.
 */
class CredentialsManager {
    /**
     * Initialize a new credentials manager with predefined demo credentials
     * 
     * The constructor sets up demo credentials with different roles (faction, admin, staff, allegiance)
     * and their corresponding access keys. Each credential includes:
     * - username/password for authentication
     * - role for authorization
     * - public/private keys for NFC band operations
     */
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

    /**
     * Validate user credentials and return authentication result
     * 
     * @param {string} username - The username to validate
     * @param {string} password - The password to validate
     * @returns {object} - Authentication result including validity, role, and keys if successful
     * 
     * This method checks if the provided username/password combination exists in either
     * the demo credentials or generated credentials, and returns appropriate authentication
     * details if valid.
     */
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