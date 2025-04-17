/*  credentialManager.js
    Credential Manager for NeoBand App
    --------------------------------------------------------------*/
/* global NEOBAND_KEYS, utils */
(function (g) {
    // 1. Pull keys from keys.js if it exists — otherwise fallback to a safe default
    const SRC = g.NEOBAND_KEYS || {
        staffKey: "FFFFFFFFFFFF",
        admin: { username: "admin", password: "admin", neoKey: "ADADADADADAD" },
        factions: {}, allegiances: {}
    };

    // 2. Flatten into one fast lookup table: name → {type, key, ...}
    const T = Object.create(null);
    T.staff = { type: 'staff', key: SRC.staffKey };
    T.admin = { type: 'admin', key: SRC.admin.neoKey, username: SRC.admin.username, password: SRC.admin.password };
    Object.values(SRC.factions).forEach(f =>
        T[f.name.toLowerCase()] = { type: 'faction', key: f.neoKey, sector: f.sector, id: f.name }
    );
    Object.values(SRC.allegiances).forEach(a =>
        T[a.name.toLowerCase()] = { type: 'allegiance', key: a.neoKey, sector: a.sector, id: a.name }
    );

    // 3. State
    let current = null;
    let lastError = null;
    let lastLog = [];

    // 4. Public helpers
    /**
     * Retrieves all defined login roles (Staff, Admin, Faction names, Allegiance names).
     * @returns {string[]} An array of role names.
     */
    function getAllLoginRoles() {
        const roles = ['Staff', 'Admin']; // Start with Staff and Admin
        // Add Faction names
        Object.values(SRC.factions).forEach(f => roles.push(f.name));
        // Add Allegiance names
        Object.values(SRC.allegiances).forEach(a => roles.push(a.name));
        log(`Retrieved login roles: ${roles.join(', ')}`);
        return roles;
    }

    function lookup(name) {
        if (!name) return null;
        const entry = T[name.trim().toLowerCase()] || null;
        log(`Lookup: '${name}' → ${entry ? JSON.stringify(entry) : 'null'}`);
        return entry;
    }

    function use(name) {
        current = lookup(name);
        log(`Use: '${name}' → ${current ? JSON.stringify(current) : 'null'}`);
        return current;
    }

    function active() { return current; }

    function logout() {
        log('Logout: clearing current credential.');
        current = null;
    }

    /**
     * Authenticate a user (admin, staff, or group) by name and optional password.
     * @param {string} name - Credential name (e.g., 'admin', 'staff', or group name)
     * @param {string} [passwordOrKey] - Password for admin (optional for others)
     * @returns {object|null} Credential object if authenticated, null otherwise
     */
    function login(name, passwordOrKey) {
        lastError = null;
        if (!name) {
            lastError = 'No credential name provided.';
            logError(lastError);
            return null;
        }

        // Handle case-insensitive lookup but store original name for logging/display
        const originalName = name;
        name = name.trim().toLowerCase();

        // Special handling for Staff and Admin based on name
        if (name === 'staff') {
            current = T.staff;
            log(`Login success: Staff`);
            return current;
        }
        if (name === 'admin') {
            if (!passwordOrKey || passwordOrKey !== SRC.admin.password) {
                lastError = 'Invalid admin password.';
                logError(lastError);
                current = null; // Ensure current is cleared on failed admin login
                return null;
            }
            current = T.admin;
            log(`Login success: Admin`);
            return current;
        }

        // Lookup Faction/Allegiance by name
        const cred = T[name]; // Already lowercased during table build
        if (!cred) {
            lastError = `Credential not found for '${originalName}'.`;
            logError(lastError);
            current = null;
            return null;
        }

        // Check if the provided key matches the faction/allegiance key
        if (!passwordOrKey || passwordOrKey.toUpperCase() !== cred.key.toUpperCase()) {
            lastError = `Invalid key provided for '${originalName}'.`;
            logError(lastError);
            current = null;
            return null;
        }

        // Success for Faction/Allegiance
        current = cred;
        log(`Login success: ${originalName} (${cred.type}) with matching key.`);
        return cred;
    }

    function getLastError() {
        return lastError;
    }

    function log(msg) {
        if (typeof utils !== 'undefined' && utils.log) {
            utils.log(`[CredentialMgr] ${msg}`, 'debug');
        }
        lastLog.push({ ts: Date.now(), msg });
        if (lastLog.length > 100) lastLog.shift();
    }

    function logError(msg) {
        if (typeof utils !== 'undefined' && utils.log) {
            utils.log(`[CredentialMgr] ERROR: ${msg}`, 'error');
        }
        lastLog.push({ ts: Date.now(), error: msg });
        if (lastLog.length > 100) lastLog.shift();
    }

    function getLog() {
        return lastLog.slice();
    }

    // 5. Expose on window
    g.CredentialMgr = {
        getAllLoginRoles,
        lookup, use, active, login, logout, getLastError, getLog
    };

})(window);
  