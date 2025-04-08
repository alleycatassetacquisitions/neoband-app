/**
 * ui.js
 * Handles UI updates, DOM manipulation, and event listeners for the Rival App.
 */

const ui = {

    /**
     * Initializes the UI elements and sets up event listeners.
     * Called once when the DOM is ready (from core.js).
     */
    init: function() {
        utils.log("UI Initializing...", 'info');

        // Navigation Link Listeners
        document.getElementById('nav-reg')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('registrationPage'); });
        document.getElementById('nav-faction')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('factionPage'); });
        document.getElementById('nav-allegiance')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('allegiancesPage'); });
        document.getElementById('nav-admin')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('adminPage'); });

        // Registration Page Button Listeners
        document.getElementById('reg-scan-btn')?.addEventListener('click', this.handleRegScan);
        document.getElementById('reg-read-btn')?.addEventListener('click', this.handleRegRead);
        document.getElementById('reg-write-btn')?.addEventListener('click', this.handleRegWrite);
        document.getElementById('reg-reset-btn')?.addEventListener('click', this.handleRegReset);

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
     */
    render: function() {
        utils.log("UI Rendering...", 'debug');
        const state = core.currentState;

        // --- Update common elements ---
        // Update Band ID / Username fields across relevant pages if tag is present
        const currentUid = state.scannedTagInfo.uid || "N/A";
        const currentUsername = state.currentUsername || "(Not Read)";
        const currentAllegiance = state.currentAllegiance || "(Not Read)";
        const displayUsername = state.currentUsername ? state.currentUsername : (currentUid !== "N/A" ? `${currentUid} (Unreg)` : "Scan Tag...");

        ui.updateInputValue('reg-band-id', currentUid);
        ui.updateInputValue('reg-current-username', currentUsername);
        ui.updateInputValue('reg-current-allegiance', currentAllegiance);
        ui.updateInputValue('faction-current-username', displayUsername);
        ui.updateInputValue('allegiance-current-username', displayUsername);

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
        this.showPage(state.activePage);
        utils.log(`UI Render complete for page: ${state.activePage}`, 'debug');
    },

    /**
     * Shows the specified page and hides others. Updates nav highlighting.
     * @param {string} pageId - The ID of the page to display.
     */
    showPage: function(pageId) {
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
            document.getElementById('registrationPage')?.classList.add('active');
             core.updateState({ activePage: 'registrationPage' }, false);
        }

         // Update navigation menu highlighting
         document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active-nav'));
         const activeNavLink = document.getElementById(`nav-${pageId.replace('Page', '')}`);
         if (activeNavLink) {
             activeNavLink.classList.add('active-nav');
         }
    },

    // --- UI Element Updaters ---

    /**
     * Safely updates the value of an input element.
     * @param {string} elementId - The ID of the input element.
     * @param {string} value - The value to set.
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
     * @param {string} selectId - The ID of the select element.
     * @param {string} value - The value to select.
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
     * @param {string} buttonId - The ID of the button element.
     * @param {boolean} isDisabled - True to disable, false to enable.
     */
    setButtonDisabled: function(buttonId, isDisabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = isDisabled;
        } else {
             // utils.log(`Button with ID ${buttonId} not found for disabling.`, 'warning');
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
        const detailsDiv = document.getElementById('faction-details');

        if (!container || !factionData || !detailsDiv) {
            utils.log(`Could not display fields for faction key: ${factionKey}`, 'error');
             detailsDiv.style.display = 'none';
            return;
        }

        // Create editable faction name heading
        const nameDisplayElement = document.getElementById('faction-name-display');
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
        logDisplay.style.display = "block";
        logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Starting username read operation...</div>`;
        utils.log("Starting username read operation...", 'info');
        
        // Show operation indicator
        ui.showOperationIndicator("Reading Username");
        
        try {
            // Check if a tag has been scanned
            if (!document.getElementById("reg-band-id").value.trim()) {
                logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ No tag detected. Please scan a tag first.</div>`;
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
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Reading username from block 240...</div>`;
            
            // Read username from block 240 using the method from original app
            const username = await operations.readUsername();
            
            // Update UI
            ui.updateInputValue('reg-username', username);
            ui.updateInputValue('reg-current-username', username);
            ui.updateInputValue('reg-status', "Read OK");
            
            // Update core state
            core.updateState({ currentUsername: username });
            
            // Log success
            logDisplay.innerHTML += `<div style='color:#00FF00;'>✓ Username read successfully: "${username}"</div>`;
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
            logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Error reading username: ${error}</div>`;
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
        logDisplay.style.display = "block";
        logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Starting username write operation...</div>`;
        utils.log("Starting username write operation...", 'info');
        
        // Show operation indicator
        ui.showOperationIndicator("Preparing to Write Username");
        
        try {
            const username = document.getElementById("reg-username").value.trim();
            
            // Log validation steps
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Validating inputs...</div>`;
            utils.log("Validating inputs...", 'info');
            
            // Validate inputs
            if (!document.getElementById("reg-band-id").value.trim()) {
                logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ No tag detected. Please scan a tag first.</div>`;
                utils.log("No tag detected. Please scan a tag first.", 'error');
                ui.updateOperationIndicator("Error: No Tag Detected");
                
                setTimeout(() => {
                    ui.hideOperationIndicator();
                    ui.showVisualConfirmation("No Tag Detected", "Please scan a band first", "error");
                }, 1000);
             return;
         }
            
            if (!username) {
                logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ No username provided.</div>`;
                utils.log("No username provided.", 'error');
                ui.updateOperationIndicator("Error: Missing Username");
                
                setTimeout(() => {
             ui.hideOperationIndicator();
                    ui.showVisualConfirmation("Missing Username", "Please enter a username", "error");
                }, 1000);
             return;
         }
            
            if (username.length > 16) {
                logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Username too long (max 16 characters).</div>`;
                utils.log("Username too long (max 16 characters).", 'error');
                ui.updateOperationIndicator("Error: Username Too Long");
                
                setTimeout(() => {
              ui.hideOperationIndicator();
                    ui.showVisualConfirmation("Username Too Long", "Username must be 16 characters or less", "error");
                }, 1000);
              return;
         }
            
            // All validations passed
            logDisplay.innerHTML += `<div style='color:#00FF00;'>✓ Validation passed</div>`;
            utils.log("Validation passed", 'success');
            ui.updateOperationIndicator("Writing Username: " + username);
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Writing username "${username}" to block 240...</div>`;
            
            // Write username to block 240 using method from original app
            await operations.writeUsername(username);
            
            // Update core state and UI
            core.updateState({ currentUsername: username });
            ui.updateInputValue('reg-current-username', username);
            ui.updateInputValue('reg-status', "Registered");
            
            // Log success
            logDisplay.innerHTML += `<div style='color:#00FF00;'>✓ Username written successfully</div>`;
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
            logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Error writing username: ${error}</div>`;
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
        logDisplay.style.display = "block";
        logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Starting factory reset operation...</div>`;
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

            // Clear all user data blocks using writeFieldWithRetry for better reliability
              const userFields = FIELD_MAP.user.fields;

            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Clearing username block...</div>`;
            await operations.writeFieldWithRetry("240", ""); // Username block
            
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Clearing status block...</div>`;
            await operations.writeFieldWithRetry(userFields.status.block.toString(), ""); // Status block
            
            logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Clearing allegiance block...</div>`;
            await operations.writeFieldWithRetry(userFields.allegiance.block.toString(), ""); // Allegiance block

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
           } catch (error) {
               ui.showVisualConfirmation("Scan Error", error.message || "Failed to scan tag.", 'error');
           }
     },
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
                     // Use readFactionField which directly returns text (like username)
                     const textData = await operations.readFactionField(
                         factionSector, 
                         fieldConfig.block, 
                         fieldConfig.key, 
                         `Faction Field ${fieldKey}`
                     );
                     
                     // Update the UI with the text data
                     ui.updateInputValue(inputId, textData);
                     utils.log(`Read Faction Field ${fieldKey} (Block ${fieldConfig.block}): "${textData}"`, 'info');
                     if(textData) readCount++;
                 } catch (fieldError) {
                     utils.log(`Failed to read Faction Field ${fieldKey} (Block ${fieldConfig.block}): ${fieldError.message}`, 'error');
                     ui.updateInputValue(inputId, ''); // Clear field on error
                 }
             }
             ui.showVisualConfirmation("Faction Read Complete", `Read ${readCount} fields for ${factionData.name}.`, 'success');
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
                      const textData = inputElement.value;
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
                              fieldConfig.key, 
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
         } catch (error) {
              utils.log(`Faction write error: ${error.message}`, 'error');
              ui.showVisualConfirmation("Faction Write Error", error.message || "Failed to write faction data.", 'error');
          }
     },

     // Allegiance Page
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
           } catch (error) {
               ui.showVisualConfirmation("Scan Error", error.message || "Failed to scan tag.", 'error');
           }
      },
      handleAllegianceRead: async function() {
        const allegianceKey = core.currentState.selectedAllegiance;
        utils.log(`Allegiance: Read initiated for ${allegianceKey}.`, 'info');
         if (!core.currentState.isTagPresent) {
             utils.log("Read failed: No tag present.", 'warning');
             ui.showVisualConfirmation("Read Error", "Scan a tag first.", 'error');
             return;
         }
        if (!allegianceKey) {
            utils.log("Read failed: No allegiance selected.", 'warning');
            ui.showVisualConfirmation("Read Error", "Select an allegiance first.", 'error');
            return;
        }

         // Check if FIELD_MAP is defined
         if (typeof FIELD_MAP === 'undefined') {
             utils.log("Read failed: FIELD_MAP is not defined. Ensure map.js is loaded.", 'error');
             ui.showVisualConfirmation("Read Error", "Configuration data is missing. Please refresh the page.", 'error');
            return;
        }

         const allegianceData = FIELD_MAP.allegiances[allegianceKey];
         if (!allegianceData) return;

         // Get allegiance sector
         const allegianceSector = allegianceData.sector;
         if (typeof allegianceSector !== 'number') {
             utils.log(`Error: Sector is not defined for allegiance ${allegianceKey}.`, 'error');
             ui.showVisualConfirmation("Read Error", "Allegiance configuration is incomplete.", 'error');
             return;
         }
         utils.log(`Reading allegiance data from Sector ${allegianceSector}...`, 'info');

         try {
             let readCount = 0;
             for (const [fieldKey, fieldConfig] of Object.entries(allegianceData.fields)) {
                 const inputId = `allegiance-${allegianceKey}-${fieldKey}-input`;
                 try {
                     // Use readAllegianceField which directly returns text (like username)
                     const textData = await operations.readAllegianceField(
                         allegianceSector, 
                         fieldConfig.block, 
                         fieldConfig.key, 
                         `Allegiance Field ${fieldKey}`
                     );
                     
                     // Update the UI with the text data
                     ui.updateInputValue(inputId, textData);
                     utils.log(`Read Allegiance Field ${fieldKey} (Block ${fieldConfig.block}): "${textData}"`, 'info');
                     if(textData) readCount++;
                 } catch (fieldError) {
                     utils.log(`Failed to read Allegiance Field ${fieldKey} (Block ${fieldConfig.block}): ${fieldError.message}`, 'error');
                     ui.updateInputValue(inputId, ''); // Clear field on error
                 }
             }
             ui.showVisualConfirmation("Allegiance Read Complete", `Read ${readCount} fields for ${allegianceData.name}.`, 'success');
         } catch (error) { // Catch potential errors from Promise.allSettled itself (unlikely)
              utils.log(`Allegiance read error: ${error.message}`, 'error');
              ui.showVisualConfirmation("Allegiance Read Error", error.message || "Failed to read allegiance data.", 'error');
         }
     },
      handleAllegianceWrite: async function() {
          const allegianceKey = core.currentState.selectedAllegiance;
          utils.log(`Allegiance: Write initiated for ${allegianceKey}.`, 'info');
           if (!core.currentState.isTagPresent) {
               utils.log("Write failed: No tag present.", 'warning');
                ui.showVisualConfirmation("Write Error", "Scan a tag first.", 'error');
               return;
           }
          if (!allegianceKey) {
               utils.log("Write failed: No allegiance selected.", 'warning');
                ui.showVisualConfirmation("Write Error", "Select an allegiance first.", 'error');
              return;
          }

          // Check if FIELD_MAP is defined
          if (typeof FIELD_MAP === 'undefined') {
              utils.log("Write failed: FIELD_MAP is not defined. Ensure map.js is loaded.", 'error');
              ui.showVisualConfirmation("Write Error", "Configuration data is missing. Please refresh the page.", 'error');
              return;
          }

          const allegianceData = FIELD_MAP.allegiances[allegianceKey];
          if (!allegianceData) return;

          // Get allegiance sector
          const allegianceSector = allegianceData.sector;
          if (typeof allegianceSector !== 'number') {
              utils.log(`Error: Sector is not defined for allegiance ${allegianceKey}.`, 'error');
              ui.showVisualConfirmation("Write Error", "Allegiance configuration is incomplete.", 'error');
              return;
          }
          utils.log(`Writing allegiance data to Sector ${allegianceSector}...`, 'info');

          try {
              let writeCount = 0;
               // Use Promise.allSettled to write potentially faster, but stop on first error maybe safer?
               // Let's do sequential writes for robustness on embedded device.
               for (const [fieldKey, fieldConfig] of Object.entries(allegianceData.fields)) {
                   const inputId = `allegiance-${allegianceKey}-${fieldKey}-input`;
                   const inputElement = document.getElementById(inputId);
                   if (inputElement) {
                       const textData = inputElement.value;
                       if(textData.length > 16) {
                            throw new Error(`Data for ${fieldConfig.title} exceeds 16 characters.`);
                        }
                       try {
                           // Use writeAllegianceField which works directly with text data like writeUsername
                           await operations.writeAllegianceField(
                               allegianceSector, 
                               fieldConfig.block, 
                               textData, 
                               fieldConfig.key, 
                               `Allegiance Field ${fieldKey}`
                           );
                           utils.log(`Wrote Allegiance Field ${fieldKey} (Block ${fieldConfig.block}): "${textData}"`, 'info');
                            if(textData) writeCount++;
                       } catch (fieldError) {
                           utils.log(`Failed to write Allegiance Field ${fieldKey} (Block ${fieldConfig.block}): ${fieldError.message}`, 'error');
                           throw new Error(`Failed to write ${fieldConfig.title}: ${fieldError.message}`); // Stop on first error
                       }
                   }
               }
              ui.showVisualConfirmation("Allegiance Write Complete", `Wrote ${writeCount} fields for ${allegianceData.name}.`, 'success');
          } catch (error) {
               utils.log(`Allegiance write error: ${error.message}`, 'error');
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
        logDisplay.innerHTML += `<div style='color:#FFFFFF;'>Auto-reading username from block 240...</div>`;
        
        try {
            // Read username from block 240 - using the same method as original app
            const username = await operations.readUsername();
            
            // Update all username fields if username is found - matching original app behavior
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
            // Update with error message - matching original app
            const errorText = `${uid} (Error reading)`;
            ui.updateInputValue('faction-current-username', errorText);
            ui.updateInputValue('allegiance-current-username', errorText);
            
            // Update registration status
            ui.updateInputValue('reg-status', "Read Error");
            
            // Log error
            logDisplay.innerHTML += `<div style='color:#FF0000;'>✗ Error reading username: ${error}</div>`;
            utils.log(`Error reading username: ${error}`, 'error');
            
            // Show error confirmation
            ui.showVisualConfirmation("Username Read Error", error.toString(), "error");
        }
        
        // Scroll log to bottom
        logDisplay.scrollTop = logDisplay.scrollHeight;
    },

}; 