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

        //Login Page Button Listeners
        document.getElementById('staff-login-btn')?.addEventListener('click', this.handleLogin);
        document.getElementById('admin-login-btn')?.addEventListener('click', this.handleLogout);
        document.getElementById('group-login-btn')?.addEventListener('click', this.handleReset);

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

        // Log Toggle Button Listener
        document.getElementById('log-toggle')?.addEventListener('click', this.toggleLogDisplay);

        // Visual Confirmation Button Listener
        document.getElementById('confirmButton')?.addEventListener('click', this.hideVisualConfirmation);


        // Populate dynamic dropdowns
        this.populateFactionSelect();
        this.populateAllegianceSelect();
        this.populateAllegianceAssignSelect(); // Populate registration allegiance dropdown


        utils.log("UI Initialized.", 'success');
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
        ui.setButtonDisabled('allegiance-read-btn', isOpRunning);
        ui.setButtonDisabled('allegiance-write-btn', isOpRunning);

        // --- Update active page ---
        this.showPage(state.activePage || 'loginPage'); // Default to login page
        utils.log(`UI Render complete for page: ${state.activePage}`, 'debug');
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
        const select = document.getElementById('reg-allegiance-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- Select Allegiance --</option>'; // Reset
        Object.entries(FIELD_MAP.allegiances).forEach(([key, allegiance]) => {
            const option = document.createElement('option');
            option.value = allegiance.name; // Use the name for writing to the tag
            option.textContent = allegiance.name;
            select.appendChild(option);
        });
    },

     /**
     * Dynamically generates input fields for the selected faction.
     * @param {string} factionKey - The key of the selected faction (e.g., 'faction1').
     */
    displayFactionFields: function(factionKey) {
        const container = document.getElementById('faction-fields-container');
        const factionData = FIELD_MAP.factions[factionKey];
        let nameDisplayElement = null;
        const detailsDiv = document.getElementById('faction-details');

        nameDisplayElement = document.getElementById('faction-name-display');
        if (!container || !factionData || !detailsDiv || !nameDisplayElement) {
            utils.log(`Could not display fields for faction key: ${factionKey} - missing container, data, detailsDiv, or nameDisplayElement`, 'error');
            if (detailsDiv) {
                // Defensive: hide details if element exists
                detailsDiv.style.display = 'none';
            }
            return;
        }

        // Create editable faction name heading
        nameDisplayElement = document.getElementById('faction-name-display');
        nameDisplayElement.innerHTML = ''; // Clear existing content
        
        // Create editable input for faction name
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'input faction-title-input';
        nameInput.value = factionData.name;
        nameInput.id = `faction-${factionKey}-name-input`;
        nameInput.dataset.originalValue = factionData.name; // Store original value for reference
        nameDisplayElement.appendChild(nameInput);
        
        container.innerHTML = ''; // Clear previous fields

        Object.entries(factionData.fields).forEach(([fieldKey, fieldConfig]) => {
             const groupDiv = document.createElement('div');
             groupDiv.className = 'faction-field-group form-group'; // Reuse form-group style

             // Create editable label with input
             const labelDiv = document.createElement('div');
             labelDiv.className = 'field-label-container';
             
             // Create editable input for field title
             const titleInput = document.createElement('input');
             titleInput.type = 'text';
             titleInput.className = 'input field-title-input';
             titleInput.value = fieldConfig.title;
             titleInput.dataset.originalValue = fieldConfig.title; // Store original value
             
             // Use a unique ID based on faction and field key for the value input
             const inputId = `faction-${factionKey}-${fieldKey}-input`;
             
             // Create the value input (for the actual data)
             const valueInput = document.createElement('input');
             valueInput.type = 'text';
             valueInput.className = 'input faction-data-input'; // Add class for easy selection
             valueInput.id = inputId;
             valueInput.placeholder = fieldConfig.placeholder;
             // Store block number and key for writing operations
             valueInput.dataset.sector = factionData.sector; // Store sector
             valueInput.dataset.block = fieldConfig.block; // Use 'block' from FIELD_MAP
             valueInput.dataset.key = fieldConfig.key; // Use 'key' from FIELD_MAP
             valueInput.dataset.fieldKey = fieldKey; // Store the original field key

             // Add a label element to maintain accessibility
             const label = document.createElement('label');
             label.htmlFor = inputId;
             label.appendChild(titleInput);
             
             groupDiv.appendChild(label);
             groupDiv.appendChild(valueInput);
             container.appendChild(groupDiv);
        });
         detailsDiv.style.display = 'block'; // Show the details section
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

         if (!container || !allegianceData || !detailsDiv) {
            utils.log(`Could not display fields for allegiance key: ${allegianceKey}`, 'error');
            detailsDiv.style.display = 'none';
            return;
        }

        // Create editable allegiance name heading
        const nameDisplayElement = document.getElementById('allegiance-name-display');
        if (!nameDisplayElement) {
            utils.log(`Could not display allegiance fields: missing name display element`, 'error');
            if (detailsDiv) {
                detailsDiv.style.display = 'none';
            }
            return;
        }
        nameDisplayElement.innerHTML = ''; // Clear existing content
        
        // Create editable input for allegiance name
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'input allegiance-title-input';
        nameInput.value = allegianceData.name;
        nameInput.id = `allegiance-${allegianceKey}-name-input`;
        nameInput.dataset.originalValue = allegianceData.name; // Store original value for reference
        nameDisplayElement.appendChild(nameInput);
        
        container.innerHTML = ''; // Clear previous fields

         // Generate fields
        Object.entries(allegianceData.fields).forEach(([fieldKey, fieldConfig]) => {
             const groupDiv = document.createElement('div');
             groupDiv.className = 'allegiance-field-group form-group';

             // Create editable label with input
             const labelDiv = document.createElement('div');
             labelDiv.className = 'field-label-container';
             
             // Create editable input for field title
             const titleInput = document.createElement('input');
             titleInput.type = 'text';
             titleInput.className = 'input field-title-input';
             titleInput.value = fieldConfig.title;
             titleInput.dataset.originalValue = fieldConfig.title; // Store original value
             
             // Use a unique ID based on allegiance and field key
             const inputId = `allegiance-${allegianceKey}-${fieldKey}-input`;
             
             // Create the value input (for the actual data)
             const valueInput = document.createElement('input');
             valueInput.type = 'text';
             valueInput.className = 'input allegiance-data-input';
             valueInput.id = inputId;
             valueInput.placeholder = fieldConfig.placeholder;
             // Store block number and key for writing operations
             valueInput.dataset.sector = allegianceData.sector; // Store sector
             valueInput.dataset.block = fieldConfig.block; // Use 'block' from FIELD_MAP
             valueInput.dataset.key = fieldConfig.key;     // Use 'key' from FIELD_MAP
             valueInput.dataset.fieldKey = fieldKey;

             // Add a label element to maintain accessibility
             const label = document.createElement('label');
             label.htmlFor = inputId;
             label.appendChild(titleInput);
             
             groupDiv.appendChild(label);
             groupDiv.appendChild(valueInput);
             container.appendChild(groupDiv);
        });
         detailsDiv.style.display = 'block'; // Show the details section
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
     handleRegReset: async function() {
        // Show log display and initialize
        const logDisplay = document.getElementById("logDisplay");
        if (logDisplay) {
            logDisplay.style.display = "block";
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Starting factory reset operation...</div>`;
        } else {
            console.error("Log display element not found when starting factory reset.");
        }
        utils.log("Starting factory reset operation...", 'info');
        
        try {
            if (!document.getElementById("reg-band-id").value.trim()) {
                logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ No tag detected. Please scan a tag first.</div>`;
                utils.log("No tag detected. Please scan a tag first.", 'error');
                ui.showVisualConfirmation("No Tag Detected", "Please scan a band first", "error");
             return;
         }

            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Confirming factory reset operation with user...</div>`;
            utils.log("Confirming factory reset operation with user...", 'info');
            
            if (!confirm("Are you sure you want to perform a factory reset on this band? This will erase ALL data including username, faction data, and allegiances.")) {
                logDisplay.innerHTML += `<div style='color:#FFA500;'>Factory reset operation cancelled by user</div>`;
                utils.log("Factory reset operation cancelled by user", 'warning');
               return;
           }

            // Proceed with reset
            ui.showOperationIndicator("Resetting Tag...");
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Beginning factory reset...</div>`;
            utils.log("Beginning factory reset...", 'info');

            // Clear all user data blocks
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Clearing username block...</div>`;
            await operations.writeSectorBlock(39, 0, utils.textToHex("").padEnd(32, '0'), 'admin');
            
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Clearing status block...</div>`;
            await operations.writeSectorBlock(39, 2, utils.textToHex("").padEnd(32, '0'), 'admin');
            
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Clearing allegiance block...</div>`;
            await operations.writeSectorBlock(39, 3, utils.textToHex("").padEnd(32, '0'), 'admin');

            // Update UI
            ui.updateInputValue('reg-status', "Unregistered");
            ui.updateInputValue('reg-username', "");
            ui.updateInputValue('reg-current-username', "");
            ui.updateSelectValue('reg-allegiance-select', "");
            
            // Update core state
            core.updateState({ currentUsername: null });

            // Show success
            logDisplay.innerHTML += `<div style='color:#00FF00;'>✓ Factory reset completed successfully</div>`;
            utils.log("Factory reset completed successfully", 'success');
            ui.showVisualConfirmation("Reset Complete", "Tag has been reset to factory defaults", "success");

         } catch (error) {
            logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Factory reset error: ${error}</div>`;
            utils.log(`Factory reset error: ${error}`, 'error');
            ui.showVisualConfirmation("Reset Error", error.toString(), "error");
        } finally {
            ui.hideOperationIndicator();
            
            // Scroll log to bottom
            logDisplay.scrollTop = logDisplay.scrollHeight;
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
                if (uid) operations.syncFaction1DataToServer(uid);
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
            if (uid) operations.syncFaction1DataToServer(uid);
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
             if (writeUid) operations.syncFaction1DataToServer(writeUid);
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
            if (writeUid) operations.syncFaction1DataToServer(writeUid);
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
            const allegiance = await operations.readCurrentAllegiance();
            // Update both Player Data fields
            ui.updateInputValue('faction-current-allegiance', allegiance);
            ui.updateInputValue('allegiance-current-allegiance', allegiance);
            // Update core state
            core.updateState({ currentAllegiance: allegiance });
            utils.log(`[UI] Updated Player Data allegiance fields to: '${allegiance}'`, 'success');
        } catch (error) {
            utils.log(`[UI] Error reading current allegiance: ${error}`, 'error');
            ui.updateInputValue('faction-current-allegiance', '(Read Error)');
            ui.updateInputValue('allegiance-current-allegiance', '(Read Error)');
        }
    },

};