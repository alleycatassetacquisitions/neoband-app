/**
 * @file ui.js
 * @description User Interface Management and Event Handling
 * 
 * This module manages all UI-related functionality including:
 * 1. Page navigation and rendering
 * 2. Form handling and validation
 * 3. NFC operation feedback
 * 4. Error display and user notifications
 * 
 * @version 3.0.4
 * @lastUpdated 2025-04-12
 */
/**
 * === Dependency Checks for ui.js ===
 * These guards detect missing dependencies early to prevent uncaught ReferenceErrors.
 */

try {
    if (typeof utils === 'undefined') {
        console.error('CRITICAL: utils.js is not loaded before ui.js');
    } else {
        utils.log('utils.js loaded successfully (ui.js)', 'debug');
    }

    if (typeof core === 'undefined') {
        console.error('CRITICAL: core.js is not loaded before ui.js');
        if (typeof utils !== 'undefined') utils.log('core.js missing (ui.js)', 'error');
    } else {
        if (typeof utils !== 'undefined') utils.log('core.js loaded successfully (ui.js)', 'debug');
    }

    if (typeof operations === 'undefined') {
        console.error('CRITICAL: operations.js is not loaded before ui.js');
        if (typeof utils !== 'undefined') utils.log('operations.js missing (ui.js)', 'error');
    } else {
        if (typeof utils !== 'undefined') utils.log('operations.js loaded successfully (ui.js)', 'debug');
    }

    if (typeof FIELD_MAP === 'undefined') {
        console.error('CRITICAL: FIELD_MAP is not defined. map.js may be missing.');
        if (typeof utils !== 'undefined') utils.log('FIELD_MAP missing (ui.js)', 'error');
    } else {
        if (typeof utils !== 'undefined') utils.log('FIELD_MAP loaded successfully (ui.js)', 'debug');
    }
} catch (e) {
    console.error('Error during dependency checks in ui.js:', e);
}

const ui = {

    /**
     * Disables all NFC-dependent UI buttons to prevent user interaction
     * when the neoband-sdk is unavailable or NFC is not supported.
     */
    disableNfcButtons: function() {
        const buttonIds = [
            'reg-scan-btn', 'reg-read-btn', 'reg-write-btn',
            'faction-scan-btn', 'faction-read-btn', 'faction-write-btn',
            'allegiance-scan-btn', 'allegiance-read-btn', 'allegiance-write-btn'
        ];
        buttonIds.forEach(function(id) {
            var btn = document.getElementById(id);
            if (btn) {
                btn.disabled = true;
            }
        });
    },

    /**
     * Initializes the UI elements and sets up event listeners.
     * Called once when the DOM is ready (from core.js).
     *
     * This function:
     * 1. Sets up navigation handlers between pages
     * 2. Attaches event listeners to all interactive elements
     * 3. Populates dynamic dropdowns with faction and allegiance data
     * 4. Ensures the initial UI state matches the application state
     *
     * @returns {void}
     */
    init: function() {
        utils.log("UI Initializing...", 'info');

        //Login Page Elements & Listeners
        document.getElementById('login-submit-btn')?.addEventListener('click', this.handleLoginSubmit.bind(this)); // Use bind(this) to maintain context

        // Navigation Link Listeners
        document.getElementById('nav-login')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('loginPage'); });
        document.getElementById('nav-reg')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('registrationPage'); });
        document.getElementById('nav-faction')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('factionPage'); });
        document.getElementById('nav-allegiance')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('allegiancesPage'); });
        document.getElementById('nav-admin')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('adminPage'); });

        // Registration Page Button Listeners
        document.getElementById('reg-scan-btn')?.addEventListener('click', this.handleRegScan);
        document.getElementById('reg-read-btn')?.addEventListener('click', this.handleRegRead);
        document.getElementById('reg-write-btn')?.addEventListener('click', this.handleRegWrite);
        document.getElementById('reg-reset-btn')?.addEventListener('click', this.handleRegReset);
        document.getElementById('reg-provision-btn')?.addEventListener('click', window.handleGlobalProvisionCard);

        // Faction Page Button & Select Listeners
        document.getElementById('faction-select')?.addEventListener('change', this.handleFactionSelectChange);
        document.getElementById('faction-scan-btn')?.addEventListener('click', this.handleFactionScan);
        document.getElementById('faction-read-btn')?.addEventListener('click', this.handleFactionRead);
        document.getElementById('faction-write-btn')?.addEventListener('click', this.handleFactionWrite);

        // Allegiance Page Button & Select Listeners
        document.getElementById('allegiance-select')?.addEventListener('change', this.handleAllegianceSelectChange);
        document.getElementById('allegiance-scan-btn')?.addEventListener('click', this.handleAllegianceScan);
        document.getElementById('allegiance-read-btn')?.addEventListener('click', this.handleAllegianceRead);
        document.getElementById('allegiance-write-btn')?.addEventListener('click', this.handleAllegianceWrite);
        // New listener for the save current allegiance button
        document.getElementById('allegiance-save-current-btn')?.addEventListener('click', this.handleAllegianceSaveCurrent.bind(this)); // Added

        // Log Toggle Button Listener
        document.getElementById('log-toggle')?.addEventListener('click', this.toggleLogDisplay);

        // Visual Confirmation Button Listener
        document.getElementById('confirmButton')?.addEventListener('click', this.hideVisualConfirmation);

        // *** ADD/MODIFY LISTENERS specific to logo interaction ***
        
        // Listener for the Set Current Allegiance Dropdown (Updates Logo)
        const setCurrentSelect = document.getElementById('allegiance-set-current-select');
        if (setCurrentSelect) {
            setCurrentSelect.addEventListener('change', this.handleAllegianceSetCurrentSelectChange.bind(this));
             utils.log('[UI Init] Added change listener to set current allegiance dropdown.', 'debug');
        } else {
             utils.log('[UI Init] Set current allegiance dropdown not found during init.', 'warning');
        }

        // --- DEFER LOGO-RELATED INIT --- 
        setTimeout(() => {
            utils.log('[UI Init Deferred] Attaching logo listeners and setting initial state...', 'debug');
            // Listener for the Allegiance Logo Click (Saves Allegiance)
            const logoImg = document.getElementById('allegiance-logo');
            if (logoImg) {
                logoImg.addEventListener('click', this.handleAllegianceLogoClick.bind(this));
                utils.log('[UI Init Deferred] Added click listener to allegiance logo.', 'debug');
                // Ensure logo is hidden initially
                this.updateAllegianceLogo(null); // Hide logo by default
            } else {
                utils.log('[UI Init Deferred] Allegiance logo element not found.', 'error'); // Log as error if still not found
            }
        }, 0); // Defer execution slightly
        // --- END DEFER LOGO-RELATED INIT --- 

        // Populate dynamic dropdowns
        this.populateLoginUserSelect();
        this.populateFactionSelect();
        this.populateAllegianceSelect();
        this.populateAllegianceAssignSelect();
        this.populateAllegianceSetCurrentSelect();

        utils.log("UI Initialized (listeners attached, dropdowns populated).", 'success');
        this.showPage(core.currentState.activePage); // Show initial page
        this.render(); // Initial render based on default state
    },

    /**
     * Updates the entire UI based on the current application state (core.currentState).
     * This is the central function for synchronizing the UI with application state.
     * 
     * The render function:
     * 1. Updates all UI elements to reflect current state
     * 2. Handles visibility and enabled/disabled states of buttons
     * 3. Updates status displays and form fields
     * 4. Ensures consistent display across all pages
     * 
     * Called after state changes that require UI updates.
     * 
     * @returns {void}
     */
    render: function() {
        utils.log("UI Rendering...", 'debug');
        const state = core.currentState;

        // --- Update common elements ---
        // Update Band ID / Username fields across relevant pages if tag is present
        const currentUid = state.scannedTagInfo?.uid || "N/A"; // Safe null check
        const currentUsername = state.currentUsername || "(Not Read)";
        const currentAllegiance = state.currentAllegiance || "(Not Read)";
        const displayUsername = state.currentUsername ? state.currentUsername : (currentUid !== "N/A" ? `${currentUid} (Unreg)` : "Scan Tag...");

        ui.updateInputValue('reg-band-id', currentUid);
        ui.updateInputValue('reg-current-username', currentUsername);
        ui.updateInputValue('reg-current-allegiance', currentAllegiance);
        ui.updateInputValue('faction-current-username', displayUsername);
        ui.updateInputValue('allegiance-current-username', displayUsername);
        // --- New: Update Player Data Allegiance fields on Faction/Allegiance pages ---
        ui.updateInputValue('faction-current-allegiance', currentAllegiance);
        ui.updateInputValue('allegiance-current-allegiance', currentAllegiance);
        utils.log(`Player Data: Set currentAllegiance to '${currentAllegiance}' on Faction/Allegiance pages.`, 'debug');

        // Update registration status display
        let regStatus = "Unknown";
        if (!state.isTagPresent) regStatus = "No Tag";
        else if (state.lastOperationStatus === 'error') regStatus = "Error";
        else if (state.currentUsername) regStatus = "Registered";
        else regStatus = "Detected (Unregistered)";
        ui.updateInputValue('reg-status', regStatus);

        // Enable/disable buttons based on tag presence and operation status
        const isTagScanned = state.isTagPresent;
        const isOpRunning = state.isOperationInProgress;

        // Registration buttons
        ui.setButtonDisabled('reg-scan-btn', isOpRunning);
        ui.setButtonDisabled('reg-read-btn', isOpRunning);
        ui.setButtonDisabled('reg-write-btn', isOpRunning);
        ui.setButtonDisabled('reg-reset-btn', isOpRunning);

        // Faction buttons
        const isFactionSelected = !!state.selectedFaction;
        ui.setButtonDisabled('faction-scan-btn', isOpRunning);
        ui.setButtonDisabled('faction-read-btn', isOpRunning);
        ui.setButtonDisabled('faction-write-btn', isOpRunning);

        // Allegiance buttons
        const isAllegianceSelected = !!state.selectedAllegiance;
        ui.setButtonDisabled('allegiance-scan-btn', isOpRunning);
        ui.setButtonDisabled('allegiance-read-btn', isOpRunning || !isAllegianceSelected);
        ui.setButtonDisabled('allegiance-write-btn', isOpRunning || !isAllegianceSelected);
        // New: Enable/disable the Save Allegiance button
        ui.setButtonDisabled('allegiance-save-current-btn', isOpRunning || !isTagScanned);

        // --- Update active page ---
        this.showPage(state.activePage || 'loginPage'); // Default to login page
        utils.log(`UI Render complete for page: ${state.activePage}`, 'debug');
    },

    /**
     * Populates the login user select dropdown.
     */
    populateLoginUserSelect: function() {
        const selectElement = document.getElementById('login-user-select');
        if (!selectElement) {
            utils.log('Login user select element not found.', 'error');
            return;
        }

        // Clear existing options except the placeholder
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }

        // Add Staff
        if (window.NEOBAND_KEYS && window.NEOBAND_KEYS.staff && window.NEOBAND_KEYS.staff.user) {
            const staffOption = document.createElement('option');
            staffOption.value = 'staff';
            staffOption.textContent = 'Staff (' + window.NEOBAND_KEYS.staff.user.name + ')';
            selectElement.appendChild(staffOption);
        }

        // Add Admin
        if (window.NEOBAND_KEYS && window.NEOBAND_KEYS.admin) {
            const adminOption = document.createElement('option');
            adminOption.value = 'admin';
            adminOption.textContent = 'Admin (' + window.NEOBAND_KEYS.admin.name + ')';
            selectElement.appendChild(adminOption);
        }

        // Add Factions
        if (window.NEOBAND_KEYS && window.NEOBAND_KEYS.factions) {
            for (const factionKey in window.NEOBAND_KEYS.factions) {
                const faction = window.NEOBAND_KEYS.factions[factionKey];
                const option = document.createElement('option');
                option.value = `faction_${factionKey}`; // Unique value for each faction
                option.textContent = `Faction: ${faction.name}`;
                selectElement.appendChild(option);
            }
        }

        // Add Allegiances
        if (window.NEOBAND_KEYS && window.NEOBAND_KEYS.allegiances) {
            for (const allegianceKey in window.NEOBAND_KEYS.allegiances) {
                const allegiance = window.NEOBAND_KEYS.allegiances[allegianceKey];
                const option = document.createElement('option');
                option.value = `allegiance_${allegianceKey}`; // Unique value for each allegiance
                option.textContent = `Allegiance: ${allegiance.name}`;
                selectElement.appendChild(option);
            }
        }
        utils.log('Login user select populated.', 'debug');
    },

    /**
     * Handles the login submission.
     * Validates credentials and redirects the user.
     */
    handleLoginSubmit: function() {
        const userSelect = document.getElementById('login-user-select');
        const passwordInput = document.getElementById('login-password');
        const selectedValue = userSelect.value;
        const password = passwordInput.value;

        if (!selectedValue) {
            this.showError('Please select a user.');
            return;
        }
        if (!password) {
            this.showError('Please enter a password.');
            return;
        }

        let isValid = false;
        let redirectPage = 'loginPage'; // Default page
        let userType = '';
        let userName = '';

        try {
            if (selectedValue === 'staff') {
                userType = 'Staff';
                userName = window.NEOBAND_KEYS.staff.user.name;
                // Staff uses neoKey as password
                if (password === window.NEOBAND_KEYS.staff.user.neoKey) {
                    isValid = true;
                    redirectPage = 'registrationPage';
                }
            } else if (selectedValue === 'admin') {
                userType = 'Admin';
                userName = window.NEOBAND_KEYS.admin.name;
                // Admin uses its specific password
                if (password === window.NEOBAND_KEYS.admin.password) {
                    isValid = true;
                    redirectPage = 'adminPage';
                }
            } else if (selectedValue.startsWith('faction_')) {
                const factionKey = selectedValue.substring(8);
                const faction = window.NEOBAND_KEYS.factions[factionKey];
                userType = 'Faction';
                userName = faction.name;
                // Factions use neoKey as password
                if (faction && password === faction.neoKey) {
                    isValid = true;
                    redirectPage = 'factionPage';
                    // Pre-select this faction on the faction page
                    core.updateState({ selectedFaction: factionKey }, false); // Don't re-render yet
                }
            } else if (selectedValue.startsWith('allegiance_')) {
                const allegianceKey = selectedValue.substring(11);
                const allegiance = window.NEOBAND_KEYS.allegiances[allegianceKey];
                userType = 'Allegiance';
                userName = allegiance.name;
                // Allegiances use neoKey as password
                if (allegiance && password === allegiance.neoKey) {
                    isValid = true;
                    redirectPage = 'allegiancesPage';
                    // Pre-select this allegiance on the allegiance page
                    core.updateState({ selectedAllegiance: allegianceKey }, false); // Don't re-render yet
                }
            }
        } catch (error) {
            utils.log(`Error during login validation: ${error}`, 'error');
            this.showError('An unexpected error occurred during login.');
            return;
        }

        if (isValid) {
            utils.log(`${userType} '${userName}' logged in successfully. Redirecting to ${redirectPage}.`, 'success');
            // Clear password field after successful login
            passwordInput.value = ''; 
            // Update core state about logged-in user (optional, but good practice)
            core.updateState({ loggedInUserType: userType, loggedInUserName: userName }); // This will trigger render
            this.showPage(redirectPage); // Navigate to the page
        } else {
            utils.log(`Login failed for user selection: ${selectedValue}`, 'warning');
            this.showError('Invalid user or password.');
            // Optionally clear password field on failure too
            // passwordInput.value = ''; 
        }
    },

    /**
     * Shows the specified page and hides others. Updates nav highlighting.
     * This function handles all page navigation within the application.
     * 
     * The function:
     * 1. Updates the core state with the new active page
     * 2. Hides all pages in the DOM
     * 3. Shows only the target page
     * 4. Updates navigation menu highlighting
     * 5. Handles error cases with a fallback to default page
     * 
     * @param {string} pageId - The ID of the page to display.
     * @returns {void}
     */
    showPage: function(pageId = 'loginPage') { // Default parameter
        utils.log(`Navigating to page: ${pageId}`, 'debug');
        core.updateState({ activePage: pageId }, false); // Update state without triggering re-render yet

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        // Show the target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            console.error(`Page with ID ${pageId} not found!`);
            // Show default page as fallback
            document.getElementById('loginPage')?.classList.add('active');
            core.updateState({ activePage: 'loginPage' }, false);
        }

        // Update navigation menu highlighting
        document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active-nav'));
        const activeNavLink = document.getElementById(`nav-${pageId.replace('Page', '')}`);
        if (activeNavLink) {
            activeNavLink.classList.add('active-nav');
        }
        // To avoid accidental syncing when users return to the Faction page later
        if (pageId !== 'adminPage' && core.currentState.admin?.enableNfcSync) {
            utils.log('Leaving Admin Page — Sync flag auto-disabled', 'debug');
            core.updateState({ enableNfcSync: false });
        }
        
    },

    // --- UI Element Updaters ---

    /**
     * Safely updates the value of an input element.
     * Checks for the element's existence before attempting to set its value.
     * 
     * @param {string} elementId - The ID of the input element.
     * @param {string} value - The value to set.
     * @returns {void}
     */
    updateInputValue: function(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        } else {
            // utils.log(`Element with ID ${elementId} not found for value update.`, 'warning');
        }
    },

    /**
     * Safely updates the value of a select element.
     * Finds the matching option by value or text content and selects it.
     * 
     * @param {string} selectId - The ID of the select element.
     * @param {string} value - The value to select.
     * @returns {void}
     * 
     * Technical Notes:
     * - First attempts to match by option value
     * - If no match by value, tries to match by option text content
     * - If still no match, logs a debug message
     * - Handles edge cases like null/undefined values gracefully
     */
    updateSelectValue: function(selectId, value) {
        const select = document.getElementById(selectId);
        if (!select) {
            // utils.log(`Select with ID ${selectId} not found for value update.`, 'warning');
            return;
        }
        
        // First try to find an option with matching value
        let found = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) {
                select.selectedIndex = i;
                found = true;
                break;
            }
        }
        
        // If no match by value, try matching by text content
        if (!found && value) {
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].textContent === value) {
                    select.selectedIndex = i;
                    found = true;
                    break;
                }
            }
        }
        
        // If still no match, optionally log warning
        if (!found && value) {
            utils.log(`Could not find option with value or text "${value}" in select ${selectId}`, 'debug');
        }
    },

    /**
     * Sets the disabled state of a button.
     * Used to enable/disable buttons based on application state.
     * 
     * @param {string} buttonId - The ID of the button element.
     * @param {boolean} isDisabled - True to disable, false to enable.
     * @returns {void}
     */
    setButtonDisabled: function(buttonId, isDisabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = isDisabled;
            // Also update visual disabled state with a class
            if (isDisabled) {
                button.classList.add('disabled');
            } else {
                button.classList.remove('disabled');
            }
        } else {
            // Commented out to reduce noise in logs, as this is normal during initialization
            // utils.log(`Button with ID ${buttonId} not found for disable state update.`, 'warning');
        }
    },

    /**
     * Handles reading allegiance data from NFC tags.
     * Validates tag presence and allegiance selection before reading.
     * Provides visual feedback for operation status.
     * 
     * @returns {Promise<void>}
     */
    handleAllegianceRead: async function() {
        const allegianceKey = core.currentState.selectedAllegiance;
        utils.log(`[Allegiance] Read initiated for key: ${allegianceKey}`, 'info');
        if (!core.currentState.isTagPresent) {
            utils.log("[Allegiance] Read failed: No tag present.", 'warning');
            ui.showVisualConfirmation("Read Error", "Scan a tag first.", 'error');
            return;
        }
        if (!allegianceKey) {
            utils.log("[Allegiance] Read failed: No allegiance selected.", 'warning');
            ui.showVisualConfirmation("Read Error", "Select an allegiance first.", 'error');
            return;
        }

        // Check if FIELD_MAP is defined
        if (typeof FIELD_MAP === 'undefined') {
            utils.log("[Allegiance] Read failed: FIELD_MAP is not defined. Ensure map.js is loaded.", 'error');
            ui.showVisualConfirmation("Read Error", "Configuration data is missing. Please refresh the page.", 'error');
            return;
        }

        const allegianceData = FIELD_MAP.allegiances[allegianceKey];
        if (!allegianceData) {
            utils.log(`[Allegiance] Read failed: No data found for key ${allegianceKey}`, 'error');
            return;
        }

        // Use per-field sector/block addressing for each allegiance field (MIFARE Classic compliance)
        try {
            let readCount = 0;
            for (const [fieldKey, fieldConfig] of Object.entries(allegianceData.fields)) {
                const inputId = `allegiance-${allegianceKey}-${fieldKey}-input`;
                try {
                    // Log SDK call parameters
                    utils.log(`[Allegiance] SDK readAllegianceField params: sector=${fieldConfig.sector}, block=${fieldConfig.block}, key=${fieldConfig.key}, label=Allegiance Field ${fieldKey}`, 'debug');
                    // Use readAllegianceField which directly returns text (like username)
                    const textData = await operations.readAllegianceField(
                        fieldConfig.sector,
                        fieldConfig.block,
                        `Allegiance Field ${fieldKey}`
                    );
                    // Log SDK call result
                    utils.log(`[Allegiance] SDK readAllegianceField result for ${fieldKey}: "${textData}"`, 'debug');
                    // Update the UI with the text data
                    ui.updateInputValue(inputId, textData);
                    utils.log(`[Allegiance] UI updated: set ${inputId} = "${textData}"`, 'debug');
                    if (textData) readCount++;
                } catch (fieldError) {
                    utils.log(`[Allegiance] Failed to read field ${fieldKey} (Block ${fieldConfig.block}): ${fieldError.message}`, 'error');
                    // Do NOT clear the field on error; preserve previous value.
                    // Display an error message to the user.
                    ui.showVisualConfirmation(
                        `Allegiance Field Read Error`,
                        `Failed to read ${fieldConfig.title}: ${fieldError.message}`,
                        "error"
                    );
                    utils.log(`[Allegiance] UI error displayed for field ${fieldKey}: ${fieldError.message}`, 'debug');
                }
            }
            ui.showVisualConfirmation("Allegiance Read Complete", `Read ${readCount} fields for ${allegianceData.name}.`, 'success');
            // --- Update Player Data Allegiance field ---
            await ui.readAndUpdateCurrentAllegiance();
        } catch (error) {
            utils.log(`[Allegiance] Read error: ${error.message}`, 'error');
            ui.showVisualConfirmation("Allegiance Read Error", error.message || "Failed to read allegiance data.", 'error');
        }
    },

    /**
     * Populates the faction select dropdown.
     */
    populateFactionSelect: function() {
        const select = document.getElementById('faction-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- Select Faction --</option>'; // Clear existing
        Object.entries(FIELD_MAP.factions).forEach(([key, faction]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = faction.name;
            select.appendChild(option);
        });
    },

    /**
     * Populates the allegiance select dropdown.
     */
    populateAllegianceSelect: function() {
        const select = document.getElementById('allegiance-select');
         if (!select) return;
         select.innerHTML = '<option value="">-- Select Allegiance --</option>'; // Clear existing
        Object.entries(FIELD_MAP.allegiances).forEach(([key, allegiance]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = allegiance.name;
            select.appendChild(option);
        });
    },

    /**
    * Populates the allegiance assignment dropdown on the registration page.
    */
    populateAllegianceAssignSelect: function() {
        this.populateAllegianceSelectByName('reg-allegiance-select');
    },

    /**
    * Populates an allegiance select dropdown using allegiance names for value/text.
    * Used for both Registration page assignment and Allegiance page current setting.
    * @param {string} selectId - The ID of the select element to populate.
    */
    populateAllegianceSelectByName: function(selectId) {
        const select = document.getElementById(selectId);
        if (!select) {
            utils.log(`[populateAllegianceSelectByName] Select element with ID '${selectId}' not found.`, 'warning');
            return;
        }
        select.innerHTML = '<option value="">-- Select Allegiance --</option>'; // Reset
        // Add a "None" option for clearing allegiance
        const noneOption = document.createElement('option');
        noneOption.value = ""; // Empty value represents clearing
        noneOption.textContent = "(None)";
        select.appendChild(noneOption);

        if (typeof FIELD_MAP === 'undefined' || !FIELD_MAP.allegiances) {
            utils.log("[populateAllegianceSelectByName] FIELD_MAP or FIELD_MAP.allegiances not defined.", 'error');
            return;
        }
        Object.entries(FIELD_MAP.allegiances).forEach(([key, allegiance]) => {
            if (allegiance && allegiance.name) { // Check if allegiance and name exist
                const option = document.createElement('option');
                option.value = allegiance.name; // Use the name for writing to the tag
                option.textContent = allegiance.name;
                select.appendChild(option);
            } else {
                utils.log(`[populateAllegianceSelectByName] Skipping invalid allegiance entry: key=${key}`, 'warning');
            }
        });
        utils.log(`[populateAllegianceSelectByName] Populated select element '${selectId}'.`, 'debug');
    },

    /**
    * Populates the 'Set Current Allegiance' dropdown on the Allegiance page.
    */
    populateAllegianceSetCurrentSelect: function() {
        this.populateAllegianceSelectByName('allegiance-set-current-select');
    },

     /**
     * Dynamically generates input fields for the selected faction.
     * @param {string} factionKey - The key of the selected faction (e.g., 'faction1').
     */
    displayFactionFields: function(factionKey) {
        const container = document.getElementById('faction-fields-container');
        const factionData = FIELD_MAP.factions[factionKey];
        let nameDisplayElement = document.getElementById('faction-name-display');
        const detailsDiv = document.getElementById('faction-details');

        // --- Start: Ensure Clean Slate ---
        if (nameDisplayElement) nameDisplayElement.innerHTML = ''; // Clear title display
        if (container) container.innerHTML = ''; // Clear fields container
        // --- End: Ensure Clean Slate ---

        if (!container || !factionData || !detailsDiv || !nameDisplayElement) {
            utils.log(`Could not display fields for faction key: ${factionKey} - missing container, data, detailsDiv, or nameDisplayElement`, 'error');
            if (detailsDiv) {
                // Defensive: hide details if element exists
                detailsDiv.style.display = 'none';
            }
            return;
        }

        // Create editable faction name heading
        // nameDisplayElement.innerHTML = ''; // Moved to top
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'input faction-title-input';
        nameInput.placeholder = factionData.name; 
        nameInput.id = `faction-${factionKey}-name-display`; 
        nameInput.dataset.originalValue = factionData.name;
        nameDisplayElement.appendChild(nameInput);
        
        // container.innerHTML = ''; // Moved to top

        Object.entries(factionData.fields).forEach(([fieldKey, fieldConfig]) => {
             const groupDiv = document.createElement('div');
             groupDiv.className = 'faction-field-group form-group';

             const labelDiv = document.createElement('div');
             labelDiv.className = 'field-label-container';
             
             const titleInput = document.createElement('input');
             titleInput.type = 'text';
             titleInput.className = 'input field-title-input';
             titleInput.placeholder = fieldConfig.title; 
             titleInput.dataset.originalValue = fieldConfig.title; 
             
             const inputId = `faction-${factionKey}-${fieldKey}-input`;
             
             const valueInput = document.createElement('input');
             valueInput.type = 'text';
             valueInput.className = 'input faction-data-input'; 
             valueInput.id = inputId;
             valueInput.placeholder = fieldConfig.placeholder;
             valueInput.dataset.sector = factionData.sector; 
             valueInput.dataset.block = fieldConfig.block; 
             valueInput.dataset.key = fieldConfig.key; 
             valueInput.dataset.fieldKey = fieldKey;

             const label = document.createElement('label');
             label.htmlFor = inputId;
             label.id = `label-${inputId}`;
             label.appendChild(titleInput);
             
             groupDiv.appendChild(label);
             groupDiv.appendChild(valueInput);
             container.appendChild(groupDiv);
        });
         detailsDiv.style.display = 'block'; // Show the details section
         
         // --- Load persisted UI settings AFTER fields are generated (with delay) ---
         // Delay slightly to ensure DOM is ready after generation
         setTimeout(() => {
             utils.log(`Calling loadFactionUISettings for ${factionKey} after delay...`, 'debug');
             loadFactionUISettings(); // Load saved titles, labels, and values
         }, 0); // 0ms timeout defers execution until after current stack clears
         // --- End Load persisted UI settings ---

         this.render(); // Update button states etc.
         utils.log(`Displayed fields for faction: ${factionData.name}`, 'debug');
    },

     /**
     * Dynamically generates input fields for the selected allegiance.
     * @param {string} allegianceKey - The key of the selected allegiance (e.g., 'allegiance1').
     */
    displayAllegianceFields: function(allegianceKey) {
        const container = document.getElementById('allegiance-fields-container');
        const allegianceData = FIELD_MAP.allegiances[allegianceKey];
        const detailsDiv = document.getElementById('allegiance-details');
        let nameDisplayElement = document.getElementById('allegiance-name-display');

        // --- Start: Ensure Clean Slate ---
        if (nameDisplayElement) nameDisplayElement.innerHTML = ''; // Clear title display
        if (container) container.innerHTML = ''; // Clear fields container
        // --- End: Ensure Clean Slate ---

         if (!container || !allegianceData || !detailsDiv || !nameDisplayElement) {
            utils.log(`Could not display fields for allegiance key: ${allegianceKey}`, 'error');
            detailsDiv.style.display = 'none';
            return;
        }

        // Create editable allegiance name heading
        // nameDisplayElement.innerHTML = ''; // Moved to top
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'input allegiance-title-input';
        nameInput.placeholder = allegianceData.name; 
        nameInput.id = `allegiance-${allegianceKey}-name-display`;
        nameInput.dataset.originalValue = allegianceData.name; 
        nameDisplayElement.appendChild(nameInput);
        
        // container.innerHTML = ''; // Moved to top

         // Generate fields
        Object.entries(allegianceData.fields).forEach(([fieldKey, fieldConfig]) => {
             const groupDiv = document.createElement('div');
             groupDiv.className = 'allegiance-field-group form-group';

             const labelDiv = document.createElement('div');
             labelDiv.className = 'field-label-container';
             
             const titleInput = document.createElement('input');
             titleInput.type = 'text';
             titleInput.className = 'input field-title-input';
             titleInput.placeholder = fieldConfig.title;
             titleInput.dataset.originalValue = fieldConfig.title;
             
             const inputId = `allegiance-${allegianceKey}-${fieldKey}-input`;
             
             const valueInput = document.createElement('input');
             valueInput.type = 'text';
             valueInput.className = 'input allegiance-data-input';
             valueInput.id = inputId;
             valueInput.placeholder = fieldConfig.placeholder;
             valueInput.dataset.sector = allegianceData.sector; 
             valueInput.dataset.block = fieldConfig.block; 
             valueInput.dataset.key = fieldConfig.key;     
             valueInput.dataset.fieldKey = fieldKey;

             const label = document.createElement('label');
             label.htmlFor = inputId;
             label.id = `label-${inputId}`;
             label.appendChild(titleInput);
             
             groupDiv.appendChild(label);
             groupDiv.appendChild(valueInput);
             container.appendChild(groupDiv);
        });
         detailsDiv.style.display = 'block'; // Show the details section

         // --- Load persisted UI settings AFTER fields are generated (with delay) ---
         // Delay slightly to ensure DOM is ready after generation
         setTimeout(() => {
             utils.log(`Calling loadAllegianceUISettings for ${allegianceKey} after delay...`, 'debug');
             loadAllegianceUISettings(); // Load saved titles, labels, and values
         }, 0); // 0ms timeout defers execution until after current stack clears
         // --- End Load persisted UI settings ---

         this.render(); // Update button states etc.
         utils.log(`Displayed fields for allegiance: ${allegianceData.name}`, 'debug');
    },

    // --- Visual Feedback ---

    showOperationIndicator: function(message) {
        const indicator = document.getElementById("operationIndicator");
        const msgElement = document.getElementById("operationMessage");
        if (indicator && msgElement) {
            msgElement.textContent = message;
            indicator.style.display = 'flex'; // Use flex to align spinner and text
        }
    },

    updateOperationIndicator: function(message) {
       const msgElement = document.getElementById("operationMessage");
        if (msgElement) {
            msgElement.textContent = message;
        }
    },

    hideOperationIndicator: function() {
        const indicator = document.getElementById("operationIndicator");
        if (indicator) {
            indicator.style.display = 'none';
        }
    },

    showVisualConfirmation: function(title, message, type = 'success') {
        const confirmBox = document.getElementById("visualConfirmation");
        const icon = document.getElementById("confirmIcon");
        const titleElement = document.getElementById("confirmTitle");
        const messageElement = document.getElementById("confirmMessage");

        if (!confirmBox || !icon || !titleElement || !messageElement) return;

        let iconChar = '✓';
        let color = 'var(--cyan)'; // Use CSS variables

        switch (type) {
            case 'success':
                iconChar = '✓';
                color = 'var(--cyan)'; // Or maybe green: '#00FF00';
                break;
            case 'error':
                iconChar = '✗';
                color = '#FF0000';
                break;
            case 'warning':
                iconChar = '⚠';
                color = '#FFA500';
                break;
        }

        icon.textContent = iconChar;
        icon.style.color = color;
        titleElement.textContent = title;
        titleElement.style.color = color; // Match title color to icon
        messageElement.textContent = message;

        confirmBox.style.display = 'block';

        // Auto-hide after 3 seconds for success/warning, requires manual close for error
        if (type !== 'error') {
            setTimeout(this.hideVisualConfirmation, 3000);
        }
    },

    hideVisualConfirmation: function() {
        const confirmBox = document.getElementById("visualConfirmation");
        if (confirmBox) {
            confirmBox.style.display = 'none';
        }
    },

     toggleLogDisplay: function() {
        const logDisplay = document.getElementById("logDisplay");
        if (!logDisplay) return;
        const currentDisplay = window.getComputedStyle(logDisplay).display;
        logDisplay.style.display = (currentDisplay === 'none') ? 'block' : 'none';
        utils.log(`Log display toggled ${logDisplay.style.display === 'block' ? 'ON' : 'OFF'}.`, 'debug');
     },

    // --- Event Handlers (Link UI actions to core/operations) ---

    // Registration Page
    /**
     * IMPORTANT FOR AI DEVELOPERS: The Registration page functionality is fully implemented and meets all requirements.
     * DO NOT remove, change, or downgrade any existing functionality in these Registration page handlers.
     * All current features are required and working as intended.
     */
    handleRegScan: async function() {
        utils.clearLog(); // Clear log on new scan
        utils.log("Registration: Scan initiated.", 'info');
        
        try {
            const uid = await operations.scanTag();
            
            // Update Band ID display
            ui.updateInputValue('reg-band-id', uid);
            
            // Update status display
            ui.updateInputValue('reg-status', core.currentState.bandStatus);
            
            // Enable read/write buttons after successful scan
            document.getElementById('reg-read-btn').disabled = false;
            document.getElementById('reg-write-btn').disabled = false;
            document.getElementById('reg-reset-btn').disabled = false;
            
        } catch (error) {
            utils.log(`Scan error: ${error.message}`, 'error');
            // Reset UI elements
            ui.updateInputValue('reg-band-id', '');
            ui.updateInputValue('reg-status', 'No Tag');
            
            // Disable buttons on scan failure
            document.getElementById('reg-read-btn').disabled = true;
            document.getElementById('reg-write-btn').disabled = true;
            document.getElementById('reg-reset-btn').disabled = true;
        }
    },
    handleRegRead: async function() {
        // Show log display and initialize
        const logDisplay = document.getElementById("logDisplay");
        if (logDisplay) {
            logDisplay.style.display = "block";
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Starting username read operation...</div>`;
        } else {
            console.error("Log display element not found when starting username read operation.");
        }
        utils.log("Starting username read operation...", 'info');
        
        // Show operation indicator
        ui.showOperationIndicator("Reading Username");
        
        try {
            // Check if a tag has been scanned
            if (!document.getElementById("reg-band-id").value.trim()) {
                if (logDisplay) {
                    logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ No tag detected. Please scan a tag first.</div>`;
                }
                utils.log("No tag detected. Please scan a tag first.", 'error');
                ui.updateOperationIndicator("Error: No Tag Detected");
                
                setTimeout(() => {
                    ui.hideOperationIndicator();
                    ui.showVisualConfirmation("No Tag Detected", "Please scan a tag first", "error");
                }, 1000);
                
                ui.updateInputValue('reg-status', "Read Error");
                return;
            }
            
            // Update indicator
            ui.updateOperationIndicator("Reading Username Data");
            
            // Get correct sector and block information for username
            if (logDisplay) {
                logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Reading username from Sector 39, Block 0...</div>`;
            }
            
            // Read username from sector 39, block 0 using method from original app
            const username = await operations.readUsername();
            
            // Update UI
            ui.updateInputValue('reg-username', username);
            ui.updateInputValue('reg-current-username', username);
            ui.updateInputValue('reg-status', "Read OK");
            
            // Update core state
            core.updateState({ currentUsername: username });
            
            // Log success
            if (logDisplay) {
                logDisplay.innerHTML += `<div style='color:#00FF00;'>✓ Username read successfully: "${username}"</div>`;
            }
            utils.log(`Username read successfully: "${username}"`, 'success');
            ui.updateOperationIndicator("Username Read Complete");
            
            // Show success confirmation
            setTimeout(() => {
                ui.hideOperationIndicator();
                ui.showVisualConfirmation("Username Read", 
                    username ? `Username: ${username}` : "No username stored on this tag", 
                    username ? "success" : "warning");
            }, 1000);
        } catch (error) {
            // Log error
            if (logDisplay) {
                logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Error reading username: ${error}</div>`;
            }
            utils.log(`Error reading username: ${error}`, 'error');
            ui.updateOperationIndicator("Read Error");
            ui.updateInputValue('reg-status', "Read Error");
            
            // Show error confirmation
            setTimeout(() => {
                ui.hideOperationIndicator();
                ui.showVisualConfirmation("Read Error", error.toString(), "error");
            }, 1000);
        }
        
        // Scroll log to bottom
        logDisplay.scrollTop = logDisplay.scrollHeight;
    },
     handleRegWrite: async function() {
        // Show log display and initialize
        const logDisplay = document.getElementById("logDisplay");
        if (logDisplay) {
            logDisplay.style.display = "block";
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Starting registration...</div>`;
        } else {
            console.error("Log display element not found when starting registration.");
        }
        utils.log("Starting registration...", 'info');
        
        try {
            if (!document.getElementById("reg-band-id").value.trim()) {
                if (logDisplay) {
                    logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ No tag detected. Please scan a tag first.</div>`;
                }
                utils.log("No tag detected. Please scan a tag first", 'error');
                ui.showVisualConfirmation("No Tag Detected", "Please scan a band first", "error");
                return;
            }
            
            const username = document.getElementById("reg-username").value.trim();
            if (!username) {
                if (logDisplay) {
                    logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Username is required.</div>`;
                }
                utils.log("Username is required", 'error');
                ui.showVisualConfirmation("Validation Error", "Username is required", "error");
                return;
            }
            
            if (username.length > 16) {
                if (logDisplay) {
                    logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Username must be 16 characters or less.</div>`;
                }
                utils.log("Username must be 16 characters or less", 'error');
                ui.showVisualConfirmation("Validation Error", "Username must be 16 characters or less", "error");
                return;
            }
            
            // All validations passed
            if (logDisplay) {
                logDisplay.innerHTML += `<div style='color:#00FF00;'>✓ Validation passed</div>`;
            }
            utils.log("Validation passed", 'success');
            
            ui.updateOperationIndicator("Writing Username: " + username);
            if (logDisplay) {
                logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Writing username "${username}" to Sector 39, Block 0...</div>`;
            }
            
            // Write username using method from operations
            await operations.writeUsername(username);
            
            // Update core state and UI
            core.updateState({ currentUsername: username });
            ui.updateInputValue('reg-current-username', username);
            ui.updateInputValue('reg-status', "Registered");
            
            // Log success
            if (logDisplay) {
                logDisplay.innerHTML += `<div style='color:#00FF00;'>✓ Username written successfully</div>`;
            }
            utils.log("Username written successfully", 'success');
            ui.updateOperationIndicator("Write Complete");
            
            // Show success confirmation
            setTimeout(() => {
                ui.hideOperationIndicator();
                ui.showVisualConfirmation("Registration Complete", 
                    `Username "${username}" has been registered successfully`, "success");
            }, 1000);
         } catch (error) {
            // Log error
            if (logDisplay) {
                logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Error writing username: ${error}</div>`;
            }
            utils.log(`Error writing username: ${error}`, 'error');
            ui.updateOperationIndicator("Write Error");
            ui.updateInputValue('reg-status', "Write Error");
            
            // Show error confirmation
            setTimeout(() => {
                ui.hideOperationIndicator();
                ui.showVisualConfirmation("Write Error", error.toString(), "error");
            }, 1000);
         }
        
        // Scroll log to bottom
        logDisplay.scrollTop = logDisplay.scrollHeight;
     },
     /**
      * Handles the factory reset operation for a scanned tag.
      * Confirms with the user, then attempts to reset the entire tag (Sectors 1-39)
      * to factory defaults (Keys: FFFFFFFFFFFF, Access: FF078069) using the
      * operations.resetTagToFactoryDefaults function.
      * Updates UI and provides feedback based on the operation result.
      */
     handleRegReset: async function() {
         // Show log display and initialize
         const logDisplay = document.getElementById("logDisplay");
         if (logDisplay) {
             logDisplay.style.display = "block";
             logDisplay.innerHTML = ''; // Clear previous logs for this operation
             logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Starting FULL Tag Factory Reset operation...</div>`;
         } else {
             console.error("Log display element not found when starting factory reset.");
         }
         utils.log("Starting FULL Tag Factory Reset operation...", 'info');
 
         try {
             // Check if tag is present
             if (!document.getElementById("reg-band-id").value.trim()) {
                 const noTagMsg = 'No tag detected. Please scan a tag first.';
                 if(logDisplay) logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ ${noTagMsg}</div>`;
                 utils.log(noTagMsg, 'error');
                 ui.showVisualConfirmation("No Tag Detected", noTagMsg, "error");
                 return;
             }
 
             // Confirm with user before proceeding
             const confirmMsg = "Are you sure you want to perform a FULL factory reset on this band?\n\n" +
                              "This will attempt to ERASE ALL SECTORS (1-39) back to factory defaults " +
                              "(Keys: FFFFFFFFFFFF, Access: FF078069). \n\n" +
                              "THIS CANNOT BE UNDONE.";
 
             if(logDisplay) logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Confirming FULL factory reset with user...</div>`;
             utils.log("Confirming factory reset operation with user...", 'info');
             
             if (!confirm(confirmMsg)) {
                 const cancelMsg = "Factory reset operation cancelled by user.";
                 if(logDisplay) logDisplay.innerHTML += `<div style='color:#FFA500;'>${cancelMsg}</div>`;
                 utils.log(cancelMsg, 'warning');
                 return;
             }
 
             ui.showOperationIndicator("Resetting Tag...");
             if(logDisplay) logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Beginning FULL factory reset... (This may take a while)</div>`;
             utils.log("Beginning FULL factory reset...", 'info');
 
             // Call the new operations function for factory reset
             const result = await operations.factoryResetCard(); // <-- Use the new standalone function
 
             if(logDisplay) logDisplay.innerHTML += `<div style='color:${result.success ? "#00FF00" : "#FF0000"};'>${result.message}</div>`;
 
             if (result.success) {
                 // --- Update UI to reflect reset --- 
                 // (Similar to old reset, but more general)
                 ui.updateInputValue('reg-username', ""); // Clear the input field
                 ui.updateInputValue('reg-current-username', "(Reset - Scan/Read Again)"); // Update current display
                 ui.updateSelectValue('reg-allegiance-select', ""); // Clear allegiance dropdown
                 ui.updateInputValue('reg-status', "Reset (Unregistered)"); // Update status display
 
                 // Also clear fields on other pages that show username/allegiance
                 ui.updateInputValue('faction-current-username', "(Reset - Scan/Read Again)");
                 ui.updateInputValue('faction-current-allegiance', "(Reset - Scan/Read Again)");
                 ui.updateInputValue('allegiance-current-username', "(Reset - Scan/Read Again)");
                 // Clear the allegiance dropdown and logo on the allegiance page
                 ui.updateSelectValue('allegiance-set-current-select', "");
                 ui.updateAllegianceLogo(null);
 
                 // --- Update core state ---
                 core.updateState({
                     currentUsername: null,
                     currentAllegiance: null,
                     bandStatus: "Reset (Unregistered)"
                 }); // Let updateState trigger render
 
                 // Show success
                 utils.log("Full Factory Reset completed successfully.", 'success');
                 ui.showVisualConfirmation("Reset Complete", result.message, "success");
             } else {
                  // Show failure/partial success message
                 utils.log("Full Factory Reset completed with errors.", 'warning');
                 ui.showVisualConfirmation("Reset Finished (with errors)", result.message, "warning");
                  // Update status display to show error
                  ui.updateInputValue('reg-status', "Reset Error");
             }
         } catch (error) { // Catch errors from the UI handler itself (e.g., confirmation, element access)
             const errorMsg = `Factory Reset UI error: ${error.message || error}`;
             if(logDisplay) logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ ${errorMsg}</div>`;
             utils.log(errorMsg, 'error');
             console.error("Reset UI Error Details:", error); // Log full error object to console
             // Update status display to show error
             ui.updateInputValue('reg-status', "Reset Error");
             // Show visual error confirmation
             ui.showVisualConfirmation("Reset Error", errorMsg, "error");
         } finally {
             // Always hide the operation indicator
             // Delay hiding slightly to allow user to see final message in indicator if needed
             setTimeout(() => ui.hideOperationIndicator(), 500);
         }
     },

    // Faction Page
    /**
     * IMPORTANT FOR AI DEVELOPERS: The Faction page functionality is fully implemented and meets all requirements.
     * DO NOT remove, change, or downgrade any existing functionality in these Faction page handlers.
     * All current features are required and working as intended.
     */
     handleFactionSelectChange: function(event) {
         const selectedFactionKey = event.target.value;
         core.updateState({ selectedFaction: selectedFactionKey });
         if (selectedFactionKey) {
             ui.displayFactionFields(selectedFactionKey);
         } else {
              // Hide details if no faction is selected
             const detailsDiv = document.getElementById('faction-details');
             if(detailsDiv) detailsDiv.style.display = 'none';
              ui.render(); // Update button states
         }
     },
     handleFactionScan: async function() {
          utils.clearLog();
          utils.log("Faction: Scan initiated.", 'info');
          // Retrieve selectedFactionKey from the core state
          const selectedFactionKey = core.currentState.selectedFaction;
          // Check if a faction is actually selected before proceeding
          if (!selectedFactionKey) {
              ui.showVisualConfirmation("Scan Error", "Please select a faction before scanning.", 'warning');
              return; // Stop execution if no faction is selected
          }
           try {
                await operations.scanTag();

                // After a successful scan, the scanTag function already tries to read username 
                // through readUsernameAndUpdateFields, so we don't need to do it again here
                ui.render();
                // --- Update Player Data Allegiance field ---
                await ui.readAndUpdateCurrentAllegiance();

                // --- Update state with latest field values and sync ---
                // Only update for the first three fields (field1, field2, field3)
                const fieldInputs = ['field1', 'field2', 'field3'].map(
                    key => document.getElementById(`faction-${selectedFactionKey}-${key}-input`)
                );
                core.updateState({
                    field1: fieldInputs[0] ? fieldInputs[0].value : '',
                    field2: fieldInputs[1] ? fieldInputs[1].value : '',
                    field3: fieldInputs[2] ? fieldInputs[2].value : ''
                });
                const uid = core.currentState.scannedTagInfo && core.currentState.scannedTagInfo.uid;
                // if (uid) /* TODO: NFC sync disabled */ /* operations.syncFaction1DataToServer(uid); */
           } catch (error) {
               ui.showVisualConfirmation("Scan Error", error.message || "Failed to scan tag.", 'error');
           }
     },
    /**
     * Reads all fields for the selected faction from their correct sector/block using keyIndex 0 and Key A.
     * This logic ensures each field is read from its mapped sector/block as defined in FIELD_MAP,
     * using the correct authentication key (Key A, keyIndex 0) as required by the Neoband-App-25-fields bugfix.
     * See CHANGELOG.md for details on the sector/block migration and bugfix.
     * The original linear read/write logic is preserved elsewhere in the codebase as a backup.
     */
    handleFactionRead: async function() {
        const factionKey = core.currentState.selectedFaction;
        utils.log(`Faction: Read initiated for ${factionKey}.`, 'info');
        if (!core.currentState.isTagPresent) {
            utils.log("Read failed: No tag present.", 'warning');
            ui.showVisualConfirmation("Read Error", "Scan a tag first.", 'error');
            return;
        }
        if (!factionKey) {
            utils.log("Read failed: No faction selected.", 'warning');
            ui.showVisualConfirmation("Read Error", "Select a faction first.", 'error');
            return;
        }

        // Check if FIELD_MAP is defined
        if (typeof FIELD_MAP === 'undefined') {
            utils.log("Read failed: FIELD_MAP is not defined. Ensure map.js is loaded.", 'error');
            ui.showVisualConfirmation("Read Error", "Configuration data is missing. Please refresh the page.", 'error');
            return;
        }

        const factionData = FIELD_MAP.factions[factionKey];
        if (!factionData) return; // Should not happen if selected

        // Get faction sector
        const factionSector = factionData.sector;
        if (typeof factionSector !== 'number') {
            utils.log(`Error: Sector is not defined for faction ${factionKey}.`, 'error');
            ui.showVisualConfirmation("Read Error", "Faction configuration is incomplete.", 'error');
            return;
        }
        utils.log(`Reading faction data from Sector ${factionSector}...`, 'info');

        try {
            let readCount = 0;
            for (const [fieldKey, fieldConfig] of Object.entries(factionData.fields)) {
                const inputId = `faction-${factionKey}-${fieldKey}-input`;
                try {
                    // Each field is read from its mapped sector/block using keyIndex 0 (Key A).
                    // The key parameter is mapped from fieldConfig.key, which is "FFFFFFFFFFFF" for Key A.
                    // See CHANGELOG.md for details on this bugfix.
                    let blockText = await operations.readFactionField(
                        factionSector,
                        fieldConfig.block,
                        `Faction Field ${fieldKey}`
                    );

                    // Permanently trim padding and residual characters
                    blockText = blockText.trim();

                    // Update only this input with this block's decoded data
                    ui.updateInputValue(inputId, blockText);

                    utils.log(`Read Faction Field ${fieldKey} (Block ${fieldConfig.block}): "${blockText}"`, 'info');

                    if (blockText) readCount++;
                } catch (fieldError) {
                    utils.log(`Failed to read Faction Field ${fieldKey} (Block ${fieldConfig.block}): ${fieldError.message}`, 'error');
                    // Do NOT clear the field on error; preserve previous value.
                    // Optionally, display an error message to the user.
                    ui.showVisualConfirmation(
                        `Faction Field Read Error`,
                        `Failed to read ${fieldConfig.title}: ${fieldError.message}`,
                        "error"
                    );
                }
            }
            ui.showVisualConfirmation("Faction Read Complete", `Read ${readCount} fields for ${factionData.name}.`, 'success');
            // --- Update Player Data Allegiance field ---
            await ui.readAndUpdateCurrentAllegiance();

            // --- Update state with latest field values and sync ---
            // Only update for the first three fields (field1, field2, field3)
            const fieldInputs = ['field1', 'field2', 'field3'].map(
                key => document.getElementById(`faction-${factionKey}-${key}-input`)
            );
            core.updateState({
                field1: fieldInputs[0] ? fieldInputs[0].value : '',
                field2: fieldInputs[1] ? fieldInputs[1].value : '',
                field3: fieldInputs[2] ? fieldInputs[2].value : ''
            });
            const uid = core.currentState.scannedTagInfo && core.currentState.scannedTagInfo.uid;
            // if (uid) /* TODO: NFC sync disabled */ /* operations.syncFaction1DataToServer(uid); */
        } catch (error) { // Catch potential errors from Promise.allSettled itself (unlikely)
            utils.log(`Faction read error: ${error.message}`, 'error');
            ui.showVisualConfirmation("Faction Read Error", error.message || "Failed to read faction data.", 'error');
        }
    },
     handleFactionWrite: async function() {
        const factionKey = core.currentState.selectedFaction;
        utils.log(`Faction: Write initiated for ${factionKey}.`, 'info');
         if (!core.currentState.isTagPresent) {
             utils.log("Write failed: No tag present.", 'warning');
             ui.showVisualConfirmation("Write Error", "Scan a tag first.", 'error');
             return;
         }
        if (!factionKey) {
            utils.log("Write failed: No faction selected.", 'warning');
             ui.showVisualConfirmation("Write Error", "Select a faction first.", 'error');
            return;
        }

         // Check if FIELD_MAP is defined
         if (typeof FIELD_MAP === 'undefined') {
             utils.log("Write failed: FIELD_MAP is not defined. Ensure map.js is loaded.", 'error');
             ui.showVisualConfirmation("Write Error", "Configuration data is missing. Please refresh the page.", 'error');
            return;
        }

         const factionData = FIELD_MAP.factions[factionKey];
         if (!factionData) return; // Should not happen if selected

         // Get faction sector
         const factionSector = factionData.sector;
         if (typeof factionSector !== 'number') {
             utils.log(`Error: Sector is not defined for faction ${factionKey}.`, 'error');
             ui.showVisualConfirmation("Write Error", "Faction configuration is incomplete.", 'error');
             return;
         }
         utils.log(`Writing faction data to Sector ${factionSector}...`, 'info');

         try {
             let writeCount = 0;
             for (const [fieldKey, fieldConfig] of Object.entries(factionData.fields)) {
                 const inputId = `faction-${factionKey}-${fieldKey}-input`;
                 const inputElement = document.getElementById(inputId);
                  if (inputElement) {
                      let textData = inputElement.value;

                      // Enforce dedicated data for Block 4 (Hunter/Bounty)
                      // Enforce strict isolation: write ONLY this input's data to its dedicated block

                      // Validate length (optional, but good practice)
                      if(textData.length > 16) {
                          throw new Error(`Data for ${fieldConfig.title} exceeds 16 characters.`);
                      }
                       try {
                          // Use writeFactionField which works directly with text data like writeUsername
                          await operations.writeFactionField(
                              factionSector, 
                              fieldConfig.block, 
                              textData, 
                              factionKey, // Pass the selected faction key as the role
                              `Faction Field ${fieldKey}`
                          );
                          utils.log(`Wrote Faction Field ${fieldKey} (Block ${fieldConfig.block}): "${textData}"`, 'info');
                           if(textData) writeCount++;
                      } catch (fieldError) {
                          utils.log(`Failed to write Faction Field ${fieldKey} (Block ${fieldConfig.block}): ${fieldError.message}`, 'error');
                          // Optionally stop the whole write process on first error
                          throw new Error(`Failed to write ${fieldConfig.title}: ${fieldError.message}`);
                      }
                  }
             }
             ui.showVisualConfirmation("Faction Write Complete", `Wrote ${writeCount} fields for ${factionData.name}.`, 'success');

             // --- Update state with latest field values and sync ---
             // Only update for the first three fields (field1, field2, field3)
             const writeFieldInputs = ['field1', 'field2', 'field3'].map(
                 key => document.getElementById(`faction-${factionKey}-${key}-input`)
             );
             core.updateState({
                 field1: writeFieldInputs[0] ? writeFieldInputs[0].value : '',
                 field2: writeFieldInputs[1] ? writeFieldInputs[1].value : '',
                 field3: writeFieldInputs[2] ? writeFieldInputs[2].value : ''
             });
             const writeUid = core.currentState.scannedTagInfo && core.currentState.scannedTagInfo.uid;
             // if (writeUid) /* TODO: NFC sync disabled */ /* operations.syncFaction1DataToServer(writeUid); */
         } catch (error) {
              utils.log(`Faction write error: ${error.message}`, 'error');
              ui.showVisualConfirmation("Faction Write Error", error.message || "Failed to write faction data.", 'error');
          }
     },

     // Allegiance Page
    /**
     * IMPORTANT FOR AI DEVELOPERS: The Allegiance page functionality is fully implemented and meets all requirements.
     * DO NOT remove, change, or downgrade any existing functionality in these Allegiance page handlers.
     * All current features are required and working as intended.
     */
     handleAllegianceSelectChange: function(event) {
         const selectedAllegianceKey = event.target.value;
         core.updateState({ selectedAllegiance: selectedAllegianceKey });
         if (selectedAllegianceKey) {
             ui.displayAllegianceFields(selectedAllegianceKey);
         } else {
             const detailsDiv = document.getElementById('allegiance-details');
             if(detailsDiv) detailsDiv.style.display = 'none';
             ui.render(); // Update button states
         }
     },
      handleAllegianceScan: async function() {
          utils.clearLog();
          utils.log("Allegiance: Scan initiated.", 'info');
           try {
                await operations.scanTag();

                // After a successful scan, the scanTag function already tries to read username 
                // through readUsernameAndUpdateFields, so we don't need to do it again here
                 ui.render();
                // --- Update Player Data Allegiance field ---
                await ui.readAndUpdateCurrentAllegiance();
           } catch (error) {
               ui.showVisualConfirmation("Scan Error", error.message || "Failed to scan tag.", 'error');
           }
      },
    /**
     * Reads all allegiance fields for the selected allegiance.
     * On NFC error, previous field values are preserved and errors are displayed to the user.
     * Detailed logging is performed for all SDK calls and UI updates for traceability.
     */
    handleAllegianceRead: async function() {
        const allegianceKey = core.currentState.selectedAllegiance;
        utils.log(`[Allegiance] Read initiated for key: ${allegianceKey}`, 'info');
        if (!core.currentState.isTagPresent) {
            utils.log("[Allegiance] Read failed: No tag present.", 'warning');
            ui.showVisualConfirmation("Read Error", "Scan a tag first.", 'error');
            return;
        }
        if (!allegianceKey) {
            utils.log("[Allegiance] Read failed: No allegiance selected.", 'warning');
            ui.showVisualConfirmation("Read Error", "Select an allegiance first.", 'error');
            return;
        }

        // Check if FIELD_MAP is defined
        if (typeof FIELD_MAP === 'undefined') {
            utils.log("[Allegiance] Read failed: FIELD_MAP is not defined. Ensure map.js is loaded.", 'error');
            ui.showVisualConfirmation("Read Error", "Configuration data is missing. Please refresh the page.", 'error');
            return;
        }

        const allegianceData = FIELD_MAP.allegiances[allegianceKey];
        if (!allegianceData) {
            utils.log(`[Allegiance] Read failed: No data found for key ${allegianceKey}`, 'error');
            return;
        }

        // Use per-field sector/block addressing for each allegiance field (MIFARE Classic compliance)
        try {
            let readCount = 0;
            for (const [fieldKey, fieldConfig] of Object.entries(allegianceData.fields)) {
                const inputId = `allegiance-${allegianceKey}-${fieldKey}-input`;
                try {
                    // Log SDK call parameters
                    utils.log(`[Allegiance] SDK readAllegianceField params: sector=${fieldConfig.sector}, block=${fieldConfig.block}, key=${fieldConfig.key}, label=Allegiance Field ${fieldKey}`, 'debug');
                    // Use readAllegianceField which directly returns text (like username)
                    const textData = await operations.readAllegianceField(
                        fieldConfig.sector,
                        fieldConfig.block,
                        `Allegiance Field ${fieldKey}`
                    );
                    // Log SDK call result
                    utils.log(`[Allegiance] SDK readAllegianceField result for ${fieldKey}: "${textData}"`, 'debug');
                    // Update the UI with the text data
                    ui.updateInputValue(inputId, textData);
                    utils.log(`[Allegiance] UI updated: set ${inputId} = "${textData}"`, 'debug');
                    if (textData) readCount++;
                } catch (fieldError) {
                    utils.log(`[Allegiance] Failed to read field ${fieldKey} (Block ${fieldConfig.block}): ${fieldError.message}`, 'error');
                    // Do NOT clear the field on error; preserve previous value.
                    // Display an error message to the user.
                    ui.showVisualConfirmation(
                        `Allegiance Field Read Error`,
                        `Failed to read ${fieldConfig.title}: ${fieldError.message}`,
                        "error"
                    );
                    utils.log(`[Allegiance] UI error displayed for field ${fieldKey}: ${fieldError.message}`, 'debug');
                }
            }
            ui.showVisualConfirmation("Allegiance Read Complete", `Read ${readCount} fields for ${allegianceData.name}.`, 'success');
            // --- Update Player Data Allegiance field ---
            await ui.readAndUpdateCurrentAllegiance();
        } catch (error) {
            utils.log(`[Allegiance] Read error: ${error.message}`, 'error');
            ui.showVisualConfirmation("Allegiance Read Error", error.message || "Failed to read allegiance data.", 'error');
        }
    },
    /**
     * Writes all allegiance fields for the selected allegiance.
     * On NFC error, previous field values are preserved and errors are displayed to the user.
     * Detailed logging is performed for all SDK calls and UI updates for traceability.
     */
    handleAllegianceWrite: async function() {
        const allegianceKey = core.currentState.selectedAllegiance;
        utils.log(`[Allegiance] Write initiated for key: ${allegianceKey}`, 'info');
        if (!core.currentState.isTagPresent) {
            utils.log("[Allegiance] Write failed: No tag present.", 'warning');
            ui.showVisualConfirmation("Write Error", "Scan a tag first.", 'error');
            return;
        }
        if (!allegianceKey) {
            utils.log("[Allegiance] Write failed: No allegiance selected.", 'warning');
            ui.showVisualConfirmation("Write Error", "Select an allegiance first.", 'error');
            return;
        }

        // Check if FIELD_MAP is defined
        if (typeof FIELD_MAP === 'undefined') {
            utils.log("[Allegiance] Write failed: FIELD_MAP is not defined. Ensure map.js is loaded.", 'error');
            ui.showVisualConfirmation("Write Error", "Configuration data is missing. Please refresh the page.", 'error');
            return;
        }

        const allegianceData = FIELD_MAP.allegiances[allegianceKey];
        if (!allegianceData) {
            utils.log(`[Allegiance] Write failed: No data found for key ${allegianceKey}`, 'error');
            return;
        }

        // Get allegiance sector
        const allegianceSector = allegianceData.sector;
        if (typeof allegianceSector !== 'number') {
            utils.log(`[Allegiance] Error: Sector is not defined for allegiance ${allegianceKey}.`, 'error');
            ui.showVisualConfirmation("Write Error", "Allegiance configuration is incomplete.", 'error');
            return;
        }
        utils.log(`[Allegiance] Writing data to Sector ${allegianceSector} for key ${allegianceKey}`, 'info');

        try {
            let writeCount = 0;
            // Sequential writes for robustness on embedded device.
            for (const [fieldKey, fieldConfig] of Object.entries(allegianceData.fields)) {
                const inputId = `allegiance-${allegianceKey}-${fieldKey}-input`;
                const inputElement = document.getElementById(inputId);
                if (inputElement) {
                    const textData = inputElement.value;
                    utils.log(`[Allegiance] Preparing to write field ${fieldKey}: value="${textData}" (max 16 chars)`, 'debug');
                    if (textData.length > 16) {
                        utils.log(`[Allegiance] Write error: Data for ${fieldConfig.title} exceeds 16 characters.`, 'error');
                        throw new Error(`Data for ${fieldConfig.title} exceeds 16 characters.`);
                    }
                    try {
                        // Log SDK call parameters
                        utils.log(`[Allegiance] SDK writeAllegianceField params: sector=${allegianceSector}, block=${fieldConfig.block}, data="${textData}", key=${fieldConfig.key}, label=Allegiance Field ${fieldKey}`, 'debug');
                        // Use writeAllegianceField which works directly with text data
                        await operations.writeAllegianceField(
                            allegianceSector,
                            fieldConfig.block,
                            textData,
                            allegianceKey, // Pass the selected allegiance key as the role
                            `Allegiance Field ${fieldKey}`
                        );
                        utils.log(`[Allegiance] SDK writeAllegianceField success for ${fieldKey}`, 'debug');
                        utils.log(`[Allegiance] UI confirmed write for field ${fieldKey}: "${textData}"`, 'debug');
                        if (textData) writeCount++;
                    } catch (fieldError) {
                        utils.log(`[Allegiance] Failed to write field ${fieldKey} (Block ${fieldConfig.block}): ${fieldError.message}`, 'error');
                        // Do NOT clear the field on error; preserve previous value.
                        // Display an error message to the user.
                        ui.showVisualConfirmation(
                            `Allegiance Field Write Error`,
                            `Failed to write ${fieldConfig.title}: ${fieldError.message}`,
                            "error"
                        );
                        utils.log(`[Allegiance] UI error displayed for field ${fieldKey}: ${fieldError.message}`, 'debug');
                        throw new Error(`Failed to write ${fieldConfig.title}: ${fieldError.message}`); // Stop on first error
                    }
                }
            }
            ui.showVisualConfirmation("Allegiance Write Complete", `Wrote ${writeCount} fields for ${allegianceData.name}.`, 'success');

            // --- Update state with latest field values and sync ---
            // Only update for the first three fields (field1, field2, field3)
            const writeFieldInputs = ['field1', 'field2', 'field3'].map(
                key => document.getElementById(`allegiance-${allegianceKey}-${key}-input`)
            );
            core.updateState({
                field1: writeFieldInputs[0] ? writeFieldInputs[0].value : '',
                field2: writeFieldInputs[1] ? writeFieldInputs[1].value : '',
                field3: writeFieldInputs[2] ? writeFieldInputs[2].value : ''
            });
            const writeUid = core.currentState.scannedTagInfo && core.currentState.scannedTagInfo.uid;
            // if (writeUid) /* TODO: NFC sync disabled */ /* operations.syncFaction1DataToServer(writeUid); */
        } catch (error) {
            utils.log(`[Allegiance] Write error: ${error.message}`, 'error');
            ui.showVisualConfirmation("Allegiance Write Error", error.message || "Failed to write allegiance data.", 'error');
        }
    },

    /**
     * Reads username and updates all relevant fields across pages
     * @param {string} uid - The UID of the scanned tag
     */
    readUsernameAndUpdateFields: async function(uid) {
        // Use the logDisplay like the original app
        const logDisplay = document.getElementById("logDisplay");
        logDisplay.style.display = "block";
        logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Auto-reading username from Sector 39, Block 0...</div>`;
        
        try {
            // Read username using operations.readUsername
            const username = await operations.readUsername();
            
            // Update all username fields if username is found
            if (username && username.trim() !== "") {
                // Update all username fields
                ui.updateInputValue('reg-username', username);
                ui.updateInputValue('reg-current-username', username);
                ui.updateInputValue('faction-current-username', username);
                ui.updateInputValue('allegiance-current-username', username);
                
                // Update registration status
                ui.updateInputValue('reg-status', "Registered");
                
                // Update core state
                core.updateState({ currentUsername: username });
                
                // Log success
                logDisplay.innerHTML += `<div style='color:#00FF00;'>✓ Username found: ${username}</div>`;
                utils.log(`Username found: ${username}`, 'success');
                
                // Show success confirmation
                ui.showVisualConfirmation("Username Found", `Username: ${username}`, "success");
            } else {
                // Clear username fields since no username was found
                ui.updateInputValue('reg-username', "");
                ui.updateInputValue('reg-current-username', "");
                
                // Keep the UID in the username fields with a note - matching original app
                const unregisteredText = `${uid} (Unregistered)`;
                ui.updateInputValue('faction-current-username', unregisteredText);
                ui.updateInputValue('allegiance-current-username', unregisteredText);
                
                // Update registration status
                ui.updateInputValue('reg-status', "Unregistered");
                
                // Log warning
                logDisplay.innerHTML += `<div style='color:#FFA500;'>⚠ No username found on tag</div>`;
                utils.log("No username found on tag", 'warning');
                
                // Show warning confirmation
                ui.showVisualConfirmation("No Username", "This tag is not registered yet", "warning");
            }
        } catch (error) {
            // Do NOT clear username fields on error; preserve previous values.
            // Instead, display an error message and log the error.
            const errorText = `${uid} (Error reading)`;
            utils.log(`Username read error for UID ${uid}: ${error}`, 'error');
            if (logDisplay) {
                logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Error reading username: ${error}</div>`;
            }
            // Optionally, update the faction/allegiance username display to indicate error, but do not clear main fields
            ui.updateInputValue('faction-current-username', errorText);
            ui.updateInputValue('allegiance-current-username', errorText);
            ui.updateInputValue('reg-status', "Read Error");
            ui.showVisualConfirmation("Username Read Error", error.toString(), "error");
        }
        
        // Scroll log to bottom
        logDisplay.scrollTop = logDisplay.scrollHeight;
    },

    /**
     * Reads the current allegiance from sector 39, block 3 and updates the Player Data fields on Faction and Allegiance pages.
     * Uses operations.readCurrentAllegiance and updates both the UI and core state.
     * Logs all steps and errors.
     */
    readAndUpdateCurrentAllegiance: async function() {
        try {
            utils.log('[UI] Reading current allegiance for Player Data section...', 'info');
            const allegiance = await operations.readCurrentAllegiance(); // Returns name or "(None)"
            
            // Update core state first
            core.updateState({ currentAllegiance: allegiance === "(None)" ? null : allegiance });

            // --- Conditional UI Update based on active page ---
            const currentPage = core.currentState.activePage;

            if (currentPage === 'allegiancesPage') {
                // Update the NEW dropdown on the Allegiance page
                ui.updateSelectValue('allegiance-set-current-select', allegiance === "(None)" ? "" : allegiance);
                utils.log(`[UI - Allegiance Page] Updated 'Set Current Allegiance' dropdown to: '${allegiance}'`, 'debug');
            } else {
                // Update the read-only input on other pages (like Faction page)
                ui.updateInputValue('faction-current-allegiance', allegiance);
                 utils.log(`[UI - Other Page (${currentPage})] Updated read-only allegiance field to: '${allegiance}'`, 'debug');
                // We might need to add similar inputs to other pages if they display current allegiance.
            }
            // Original line commented out as it targeted the old input on allegiance page:
            // ui.updateInputValue('allegiance-current-allegiance', allegiance); 

            utils.log(`[UI] Finished updating Player Data allegiance fields to: '${allegiance}'`, 'success');
        } catch (error) {
            utils.log(`[UI] Error reading/updating current allegiance: ${error}`, 'error');
            // Update relevant fields to show error state
            const currentPage = core.currentState.activePage;
            if (currentPage === 'allegiancesPage') {
                 // Optionally clear or disable the dropdown on error?
                 // For now, just log. The select value remains unchanged.
                 utils.log('[UI - Allegiance Page] Error reading allegiance, dropdown state preserved.', 'warning');
            } else {
                 ui.updateInputValue('faction-current-allegiance', '(Read Error)');
            }
            // ui.updateInputValue('allegiance-current-allegiance', '(Read Error)'); // Old input commented out
        }
    },

    /**
     * Displays an error message to the user.
     * Uses a dedicated error display area.
     * 
     * @param {string} message - The error message to display.
     */
    showError: function(message) {
        const errorElement = document.getElementById('error-message'); // Assuming you add <div id="error-message" class="error"></div> to index.html
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            // Optionally hide after a delay
            setTimeout(() => {
                errorElement.style.display = 'none';
                errorElement.textContent = '';
            }, 5000); // Hide after 5 seconds
        } else {
            // Fallback to alert if the element doesn't exist
            console.error("Error display element '#error-message' not found. Alerting instead.");
            alert(`Error: ${message}`); 
        }
        utils.log(`UI Error Displayed: ${message}`, 'error');
    },

    /**
     * Handles the click event for the 'Save Allegiance' button on the Allegiance page.
     * Writes the selected allegiance from the 'allegiance-set-current-select' dropdown
     * to Sector 39, Block 3 using the staff key.
     */
    handleAllegianceSaveCurrent: async function() {
        utils.log('[UI] Save Current Allegiance button clicked.', 'info');
        const selectElement = document.getElementById('allegiance-set-current-select');
        
        if (!selectElement) {
            utils.log('[UI] Save Current Allegiance failed: Select element not found.', 'error');
            ui.showVisualConfirmation("Save Error", "UI component missing. Refresh might help.", 'error');
            return;
        }
        
        const selectedAllegianceName = selectElement.value;
        // No need to check for empty value here, as writing an empty string signifies clearing the allegiance.
        // utils.log(`[UI] Selected allegiance to save: '${selectedAllegianceName}'`, 'debug');

        if (!core.currentState.isTagPresent) {
            utils.log('[UI] Save Current Allegiance failed: No tag present.', 'warning');
            ui.showVisualConfirmation("Save Error", "Scan a tag first.", 'error');
            return;
        }

        try {
            ui.showOperationIndicator('Saving Allegiance...');
            const success = await operations.writeUserAllegiance(selectedAllegianceName);
            
            if (success) {
                utils.log(`[UI] Successfully saved allegiance '${selectedAllegianceName}' to Sector 39, Block 3.`, 'success');
                ui.showVisualConfirmation("Allegiance Saved", `Current allegiance set to: ${selectedAllegianceName || '(None)'}`, 'success');
                // Update core state to reflect the change immediately
                core.updateState({ currentAllegiance: selectedAllegianceName || null }); 
                // No need to call readAndUpdateCurrentAllegiance again, we know the value written.
            } else {
                // writeUserAllegiance should throw on failure, so this might not be reached
                // but kept for robustness.
                utils.log('[UI] operations.writeUserAllegiance reported failure but did not throw.', 'warning');
                ui.showVisualConfirmation("Save Failed", "Could not save allegiance. See logs.", 'error');
            }
        } catch (error) {
            utils.log(`[UI] Error saving current allegiance: ${error.message}`, 'error');
            ui.showVisualConfirmation("Save Error", `Failed to save allegiance: ${error.message}`, 'error');
        } finally {
            ui.hideOperationIndicator();
        }
    },

    /**
     * Updates the allegiance logo display based on the allegiance name.
     * MODIFIED: Toggles 'logo-hidden' class instead of inline style.
     * @param {string|null} allegianceName - The name of the allegiance (e.g., "Endline") or null/empty.
     */
    updateAllegianceLogo: function(allegianceName) {
        const logoImg = document.getElementById('allegiance-logo'); // Assume an <img id="allegiance-logo"> exists in index.html
        if (!logoImg) {
             utils.log('[UI] Allegiance logo element (#allegiance-logo) not found.', 'warning');
             return;
        }

        let logoSrc = ''; // Default to empty

        // Use allegianceName directly (as set in populateAllegianceSelectByName)
        switch (allegianceName) {
            case "Endline":
                logoSrc = 'app/NEO_ENDLINE_Color_Logo-200.png';
                break;
            case "Helix":
                logoSrc = 'app/NEO_HELIX_Color_Logo-200.png';
                break;
            case "The Resistance":
                logoSrc = 'app/NEO_Resistance_Logo-200.png';
                break;
            default:
                logoSrc = ''; // Hide for "(None)" or other values
        }

        logoImg.src = logoSrc;

        // *** MODIFIED: Toggle class instead of style.display ***
        if (logoSrc) {
            logoImg.classList.remove('logo-hidden');
        } else {
            logoImg.classList.add('logo-hidden');
        }

        // Store the allegiance name in a data attribute for the click handler
        logoImg.dataset.allegianceName = allegianceName || "";

        utils.log(`[UI] Updated allegiance logo. Name: '${allegianceName}', Src: '${logoSrc}', Hidden: ${!logoSrc}`, 'debug');
    },

    /**
     * Handles changes to the 'Set Current Allegiance' dropdown in the Player Data section.
     * MODIFIED: Updates the allegiance logo based on the selection.
     */
     handleAllegianceSetCurrentSelectChange: function(event) {
        const selectedAllegianceName = event.target.value; // This is "Endline", "Helix", etc. or ""

        utils.log(`[UI] 'Set Current Allegiance' dropdown changed to: '${selectedAllegianceName}'`, 'debug');

        // Update the logo display to match the dropdown selection
        ui.updateAllegianceLogo(selectedAllegianceName);

        // Note: This change *doesn't* save to the tag automatically.
        // Saving happens via the logo click or the 'Save Allegiance' button.
    },

     /**
      * Reads the current allegiance from sector 39, block 3 and updates the Player Data fields.
      * MODIFIED: Also updates the allegiance logo display.
      */
     readAndUpdateCurrentAllegiance: async function() {
         try {
             utils.log('[UI] Reading current allegiance for Player Data section...', 'info');
             const allegiance = await operations.readCurrentAllegiance(); // Returns name or "(None)"

             // Update core state first
             core.updateState({ currentAllegiance: allegiance === "(None)" ? null : allegiance });

             const currentPage = core.currentState.activePage;
             const allegianceValue = allegiance === "(None)" ? "" : allegiance; // Value for select/logo

             if (currentPage === 'allegiancesPage') {
                 ui.updateSelectValue('allegiance-set-current-select', allegianceValue);
                 // *** Update logo based on read allegiance ***
                 ui.updateAllegianceLogo(allegianceValue);
                 utils.log(`[UI - Allegiance Page] Updated 'Set Current Allegiance' dropdown and Logo to: '${allegiance}'`, 'debug');
             } else {
                 ui.updateInputValue('faction-current-allegiance', allegiance);
                  utils.log(`[UI - Other Page (${currentPage})] Updated read-only allegiance field to: '${allegiance}'`, 'debug');
             }

             utils.log(`[UI] Finished updating Player Data allegiance fields/logo to: '${allegiance}'`, 'success');
         } catch (error) {
             utils.log(`[UI] Error reading/updating current allegiance: ${error}`, 'error');
             const currentPage = core.currentState.activePage;
             if (currentPage === 'allegiancesPage') {
                  utils.log('[UI - Allegiance Page] Error reading allegiance, dropdown/logo state preserved.', 'warning');
                  // *** Update logo based on error ***
                   ui.updateAllegianceLogo(null); // Hide logo on error
             } else {
                  ui.updateInputValue('faction-current-allegiance', '(Read Error)');
             }
         }
     },

     /**
      * Handles the click event for the allegiance logo.
      * Saves the allegiance associated with the currently displayed logo to the tag.
      */
     handleAllegianceLogoClick: async function() {
         const logoImg = document.getElementById('allegiance-logo');
         // Check if logo is hidden (meaning no allegiance is selected/displayed)
         if (!logoImg || logoImg.classList.contains('logo-hidden') || !logoImg.dataset.allegianceName) {
              utils.log('[UI] Logo click failed: Logo is hidden or allegiance name data attribute missing.', 'warning');
              ui.showVisualConfirmation("Save Error", "No allegiance selected to save.", 'error');
              return;
         }

         const allegianceToSave = logoImg.dataset.allegianceName;
         utils.log(`[UI] Allegiance logo clicked. Attempting to save: '${allegianceToSave}'`, 'info');


         if (!core.currentState.isTagPresent) {
             utils.log('[UI] Logo click save failed: No tag present.', 'warning');
             ui.showVisualConfirmation("Save Error", "Scan a tag first.", 'error');
             return;
         }

         try {
             ui.showOperationIndicator(`Saving ${allegianceToSave}...`);
             const success = await operations.writeUserAllegiance(allegianceToSave);

             if (success) {
                 utils.log(`[UI] Successfully saved allegiance '${allegianceToSave}' via logo click.`, 'success');
                 ui.showVisualConfirmation("Allegiance Saved", `Current allegiance set to: ${allegianceToSave || '(None)'}`, 'success');
                 // Update core state
                 core.updateState({ currentAllegiance: allegianceToSave || null });
                 // Update the dropdown to match the saved value
                 ui.updateSelectValue('allegiance-set-current-select', allegianceToSave);
             } else {
                  utils.log('[UI] Logo click save failed: operations.writeUserAllegiance reported failure.', 'warning');
                  ui.showVisualConfirmation("Save Failed", "Could not save allegiance via logo. See logs.", 'error');
             }
         } catch (error) {
             utils.log(`[UI] Error saving allegiance via logo click: ${error.message}`, 'error');
             ui.showVisualConfirmation("Save Error", `Failed to save allegiance: ${error.message}`, 'error');
         } finally {
             ui.hideOperationIndicator();
         }
     },

}; // End of ui object