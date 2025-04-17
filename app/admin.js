/**
 * @file admin.js
 * @description Administrator Interface and Management Tools
 * 
 * This module provides advanced administration capabilities including:
 * - Detailed memory map visualization and management
 * - Advanced read/write capabilities for all memory sectors
 * - Management tools for factions and allegiances
 * - User data administration
 * 
 * @version 3.0.4
 * @lastUpdated 2025-04-12
 */

// ======================= ADMIN PAGE =======================

/**
 * Initialize the admin interface when the DOM is fully loaded.
 * This listener ensures that the admin interface is only built after
 * the DOM is ready and the required FIELD_MAP has been loaded from map.js.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize admin if FIELD_MAP is available (loaded from map.js)
    if (typeof FIELD_MAP !== 'undefined') {
        initializeAdminInterface();
    } else {
        console.error("FIELD_MAP not found. Ensure map.js is loaded before admin.js");
        // Optionally display an error message on the admin page
        const adminContainer = document.getElementById('adminContainer');
        if (adminContainer) {
            adminContainer.innerHTML = '<p style="color: var(--error-color);">Error: Memory map data (map.js) failed to load.</p>';
        }
    }
});

/**
 * Initializes the admin interface by building the UI components.
 *
 * This function dynamically generates the Admin page UI, including:
 *   - The Settings section for server IP configuration (see below)
 *   - Faction, Allegiance, and User Data admin controls
 *   - Sync Server button for manual sync enablement
 *
 * The Settings section allows the user to enter and save the backend server IP address.
 * This value is stored in localStorage and used by all sync/API operations (see operations.js).
 *
 * The UI loads the current server IP from localStorage on page load, and updates it when the user clicks Save.
 * All changes are logged for traceability. User feedback is provided for success/error.
 */
function initializeAdminInterface() {
    const adminPage = document.getElementById('adminPage');
    if (!adminPage) {
        console.error("Admin page container (#adminPage) not found.");
        return;
    }

    const container = document.getElementById('adminContainer');
    if (!container) {
        console.error("Admin content container (#adminContainer) not found.");
        return;
    }
    container.innerHTML = ''; // Clear existing content

    console.log("Initializing Admin Interface...");

    // --- Add specific CSS styles for the Admin page ---
    const adminStyles = `
        .admin-section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid var(--medium-grey);
            background-color: rgba(26, 26, 26, 0.7);
        }
        .admin-section h3 {
            color: var(--white);
            margin-bottom: 15px;
            border-bottom: 1px solid var(--light-grey);
            padding-bottom: 5px;
        }
        .sector-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .admin-button {
            background-color: var(--dark-grey);
            border: 1px solid var(--cyan);
            color: var(--cyan);
            padding: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            font-family: var(--font-secondary);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 60px;
        }
        .admin-button:hover {
            background-color: var(--medium-grey);
            color: var(--white);
        }
        .sector-header {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 5px;
        }
        .sector-meta {
            font-size: 0.9em;
            color: var(--light-grey);
        }
        .sector-details {
            margin-top: 20px;
            padding: 15px;
            border: 1px dashed var(--medium-grey);
            background-color: rgba(0,0,0,0.3);
            animation: fadeIn 0.3s ease-in-out;
        }
        .sector-details h4 {
            color: var(--white);
            margin-bottom: 15px;
        }
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive grid */
            gap: 15px;
            margin-bottom: 15px;
        }
        .detail-item {
            background-color: var(--dark-grey);
            padding: 10px;
            border-left: 3px solid var(--cyan);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
         .detail-item label {
            font-size: 1em; /* Override global label size */
            color: var(--light-grey);
            margin-bottom: 0;
        }
        .detail-item input[type="text"] {
            width: 100%;
            font-size: 1em; /* Smaller font for detail inputs */
            padding: 8px;
            max-width: none; /* Override global max-width */
        }
         .detail-item input[readonly] {
             background-color: var(--medium-grey);
             border-style: solid;
             cursor: default;
         }
        .field-block-info {
            font-size: 0.8em;
            color: var(--medium-grey);
            text-align: right;
        }
        .admin-button-group {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = adminStyles;
    document.head.appendChild(styleSheet);

    // === SETTINGS SECTION: Server IP ===
    // This section allows the user to configure the backend server IP address used for all sync/API operations.
    // The value is stored in localStorage and accessed via operations.getServerBaseUrl/setServerBaseUrl.
    // The input is pre-filled with the current value, and updates are saved on button click.
    // This enables the app to work on any network or device without code changes.
    const settingsSection = document.createElement('div');
    settingsSection.className = 'admin-section';
    settingsSection.style.marginBottom = '30px';
    settingsSection.innerHTML = `
        <h3>Settings</h3>
        <div class="form-group">
            <label for="server-ip-input">Server IP</label>
            <input type="text" id="server-ip-input" class="input" placeholder="e.g. http://192.168.0.100:3000" style="width: 320px; max-width: 100%;" />
        </div>
        <button id="save-server-ip-btn" class="btn" style="margin-top: 10px;">Save</button>
        <span id="server-ip-status" style="margin-left: 15px; color: var(--cyan);"></span>
    `;
    container.appendChild(settingsSection);

    // Set initial value from localStorage (via operations.js)
    setTimeout(() => {
        const serverIpInput = document.getElementById('server-ip-input');
        if (serverIpInput && typeof window.getServerBaseUrl === 'function') {
            serverIpInput.value = window.getServerBaseUrl();
        }
    }, 0);

    // Save button event: updates localStorage and logs the change
    setTimeout(() => {
        const saveBtn = document.getElementById('save-server-ip-btn');
        const serverIpInput = document.getElementById('server-ip-input');
        const statusSpan = document.getElementById('server-ip-status');
        if (saveBtn && serverIpInput) {
            saveBtn.onclick = function() {
                const url = serverIpInput.value.trim();
                if (!url) {
                    statusSpan.textContent = 'Please enter a valid server URL.';
                    statusSpan.style.color = 'var(--error-color)';
                    return;
                }
                if (typeof window.setServerBaseUrl === 'function') {
                    window.setServerBaseUrl(url);
                    statusSpan.textContent = 'Saved!';
                    statusSpan.style.color = 'var(--cyan)';
                } else {
                    statusSpan.textContent = 'Error: Unable to save.';
                    statusSpan.style.color = 'var(--error-color)';
                }
            };
        }
    }, 0);

    // --- Create UI sections ---
    try {
          // Use plural keys for category parameter to ensure FIELD_MAP[category] is defined
          const factionsSection = createAdminSection("FACTION CONTROL", FIELD_MAP.factions, 'factions');
          container.appendChild(factionsSection);
    
          const allegiancesSection = createAdminSection("ALLEGIANCE CONTROL", FIELD_MAP.allegiances, 'allegiances');
          container.appendChild(allegiancesSection);
    
          // Create section for user data (limited view)
          const userSection = createAdminSection("USER DATA (Sector 39)", FIELD_MAP.user, 'user', true);
          container.appendChild(userSection);
    
          // Add Sync Server button
          const syncButton = document.createElement('button');
          syncButton.textContent = 'Sync Server';
          syncButton.className = 'admin-button';
          syncButton.style.marginTop = '20px';
          syncButton.onclick = () => {
              try {
                  enableNfcServerSync();
              } catch (error) {
                  utils.log('Error enabling NFC sync: ' + error.message, 'error');
              }
          };
    
          container.appendChild(syncButton);
    
          // Add Provision Card button (Admin Page)
          const provisionButton = document.createElement('button');
          provisionButton.id = 'admin-provision-card-btn'; // Unique ID for admin button
          provisionButton.textContent = 'Provision Card (Format + Set Keys)';
          provisionButton.className = 'btn btn-warning'; // Use warning style for potentially destructive action
          provisionButton.style.marginTop = '20px';
          provisionButton.style.marginLeft = '10px'; // Add some space from sync button
          // Call the global handler function directly
          provisionButton.onclick = window.handleGlobalProvisionCard; 
          container.appendChild(provisionButton);
    
          console.log("Admin Interface Initialized Successfully.");
    
    } catch (error) {
        console.error("Error initializing admin sections:", error);
        container.innerHTML = `<p style="color: var(--error-color);">Error building admin interface. Check console for details.</p>`;
    }
}

function enableNfcServerSync() {
    core.updateState({ 
        enableNfcSync: true, 
        selectedFaction: 'faction1',
        persist: true // Ensure state survives page navigation
    });
    utils.log("✅ Server sync enabled for Alleycat scans", "success");
}

/**
 * Creates an admin section for a specific category (faction, allegiance, user).
 * Generates a titled section containing a grid of entity buttons.
 * 
 * @param {string} sectionTitle - Display title for the section
 * @param {Object} mapData - The data from FIELD_MAP for this category
 * @param {string} category - Category identifier ('factions', 'allegiances', or 'user')
 * @returns {HTMLElement} The constructed section element
 */
function createAdminSection(sectionTitle, mapData, category) {
    const section = document.createElement('div');
    section.className = 'admin-section';

    const titleEl = document.createElement('h3');
    titleEl.textContent = sectionTitle;
    section.appendChild(titleEl);

    const grid = document.createElement('div');
    grid.className = 'sector-grid';

    if (category === 'user') {
        // For user category, create only one button for all user data (not one per field)
        // This button will open the user data detail view with all fields editable
        const btn = createEntityButton('user', mapData, category);
        grid.appendChild(btn);
    } else {
        for (const entityKey in mapData) {
            const entity = mapData[entityKey];
            // Always pass the plural category key for factions/allegiances
            const btn = createEntityButton(entityKey, entity, category);
            grid.appendChild(btn);
        }
    }

    section.appendChild(grid);
    return section;
}

/**
 * Creates a button for an entity (faction, allegiance, or user data).
 * When clicked, displays detailed information about the entity.
 * 
 * @param {string} entityKey - Key identifier for the entity (e.g., 'faction1')
 * @param {Object} entityData - Data structure for this entity from FIELD_MAP
 * @param {string} category - Category identifier ('factions', 'allegiances', or 'user')
 * @returns {HTMLButtonElement} The constructed button element
 */
function createEntityButton(entityKey, entityData, category) {
    const btn = document.createElement('button');
    btn.className = 'admin-button';
    btn.setAttribute('data-entity-key', entityKey);
    btn.setAttribute('data-category', category);

    // Handle different data structures for user data vs factions/allegiances
    let displayName, sectorNumber;
    if (category === 'user') {
        displayName = 'User Data';
        sectorNumber = '39';
    } else {
        // For factions and allegiances, use name property if available
        displayName = entityData.name || entityKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        sectorNumber = entityData.sector;
    }

    // Create button content
    const header = document.createElement('div');
    header.className = 'sector-header';
    header.textContent = displayName;
    
    const meta = document.createElement('div');
    meta.className = 'sector-meta';
    meta.textContent = `Sector ${sectorNumber}`;
    
    btn.appendChild(header);
    btn.appendChild(meta);
    
    if (category === 'user') {
        btn.addEventListener('click', () => displayUserDataDetails(entityKey, entityData));
    } else {
        // Always pass the plural category key for factions/allegiances
        btn.addEventListener('click', () => displayEntityDetails(entityKey, entityData, category));
    }
    
    return btn;
}

function displayEntityDetails(entityKey, entityData, category) {
    // First, remove any existing detail view to avoid duplicates
    const existingDetailView = document.getElementById('adminDetailView');
    if (existingDetailView) {
        existingDetailView.remove();
    }
    
    const detailView = document.createElement('div');
    detailView.className = 'sector-details';
    detailView.id = 'adminDetailView'; // ID to easily find and remove later

    // Handle display name differently for user category
    let displayName;
    if (category === 'user') {
        displayName = 'User Data';
    } else {
        displayName = entityData.name || entityKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
    
    // For userData, we need to handle the sector differently
    const sectorDisplay = category === 'user' ? '39' : entityData.sector;

    let fieldsHTML = '';
    
    // Handle userData differently since it has a different structure
    if (category === 'user') {
        // For user, access the fields property directly
        for (const fieldKey in entityData.fields) {
            const field = entityData.fields[fieldKey];
            // Skip if not a field object (e.g., might be a function or other property)
            if (!field || typeof field !== 'object' || !field.block) continue;
            
            const relativeBlock = field.block - 0; // Calculate relative block within sector 39
            const inputId = `admin-input-39-${relativeBlock}`;

            fieldsHTML += `
            <div class="detail-item" style="display: block;">
                <label for="${inputId}">${field.title}</label>
                <input type="text" id="${inputId}"
                       placeholder="${field.placeholder}" value=""
                       data-sector="39"
                       data-block="${relativeBlock}"
                       data-key="${field.key}" />
                <div class="field-block-info">Sector 39, Block ${relativeBlock}</div>
            </div>
            `;
        }
    } else {
        // For factions and allegiances, use the existing structure
        for (const fieldKey in entityData.fields) {
            const field = entityData.fields[fieldKey];
            const inputId = `admin-input-${entityData.sector}-${field.block}`;

            fieldsHTML += `
            <div class="detail-item">
                <label for="${inputId}">${field.title}</label>
                <input type="text" id="${inputId}"
                       placeholder="${field.placeholder}" value=""
                       data-sector="${entityData.sector}"
                       data-block="${field.block}"
                       data-key="${field.key}" />
                <div class="field-block-info">Sector ${entityData.sector}, Block ${field.block}</div>
            </div>
            `;
        }
    }

    detailView.innerHTML = `
        <h4>${displayName} - Sector ${sectorDisplay} Details</h4>
        <div class="detail-grid">
            ${fieldsHTML}
        </div>
        <div class="admin-button-group">
            <button class="btn btn-secondary" onclick="readAdminData('${entityKey}', '${category}')">Read Sector Data</button>
            <button class="btn" onclick="writeAdminData('${entityKey}', '${category}')">Write Sector Data</button>
            <button class="btn btn-danger" onclick="document.getElementById('adminDetailView').remove()">
                Close
            </button>
        </div>
    `;

    // Find the parent section element to append the detail view
    const parentSection = document.querySelector(`.admin-button[data-entity-key="${entityKey}"][data-category="${category}"]`).closest('.admin-section');

    if (category === 'user') {
        const userSection = document.querySelector('.admin-section[data-category="user"]');
        if (userSection) {
            userSection.appendChild(detailView);
        } else {
            console.error('User section not found for detail view');
        }
    } else if (parentSection) {
        parentSection.appendChild(detailView);
    } else {
        const adminContainer = document.getElementById('adminContainer');
        if (adminContainer) {
            adminContainer.appendChild(detailView);
        } else {
            console.error('Could not find a suitable container for detail view');
        }
    }
}

/**
 * Displays the user data detail view with all fields as editable inputs.
 * This function is specialized for the 'user' category and replaces the generic displayEntityDetails
 * for user data. It renders all user fields, with proper labeling, input fields, and block/sector info.
 * The original linear read/write logic is preserved as comments for backup.
 *
 * @param {string} entityKey - The key for the user entity (should be 'user')
 * @param {Object} userData - The FIELD_MAP.user object containing all user fields
 */
function displayUserDataDetails(entityKey, userData) {
    // Remove any existing detail view to avoid duplicates
    const existingDetailView = document.getElementById('adminDetailView');
    if (existingDetailView) {
        existingDetailView.remove();
    }

    const detailView = document.createElement('div');
    detailView.className = 'sector-details';
    detailView.id = 'adminDetailView';

    // Build out all user fields in sector 39 (as before)
    let fieldsHTML = '';
    for (const fieldKey in userData.fields) {
        const field = userData.fields[fieldKey];
        const inputId = `admin-input-39-${field.block}`;
        fieldsHTML += `
            <div class="detail-item" style="display: block;">
                <label for="${inputId}">${field.title}</label>
                <input type="text" id="${inputId}" placeholder="${field.placeholder}" value="" data-sector="39" data-block="${field.block}" data-key="${field.key}">
                <div class="field-block-info">Sector 39, Block ${field.block}</div>
            </div>
        `;
    }

    detailView.innerHTML = `
        <h4>User Data - Sector 39 Details</h4>
        <div class="detail-grid">
            ${fieldsHTML}
        </div>
        <div class="admin-button-group">
            <button class="btn btn-secondary" onclick="readAdminData('user', 'user')">Read Sector Data</button>
            <button class="btn" onclick="writeAdminData('user', 'user')">Write Sector Data</button>
            <button class="btn btn-danger" onclick="document.getElementById('adminDetailView')?.remove()">Close</button>
        </div>
    `;

    // --- FIX: Place the detailView inside the correct USER DATA section ---
    // Find the admin-section whose <h3> matches "USER DATA (Sector 39)"
    const allSections = document.querySelectorAll('.admin-section');
    let userSection = null;
    for (const section of allSections) {
        const h3 = section.querySelector('h3');
        if (h3 && h3.textContent.trim().toUpperCase() === "USER DATA (SECTOR 39)") {
            userSection = section;
            break;
        }
    }

    if (userSection) {
        userSection.appendChild(detailView);
    } else {
        // Fallback: default to adminContainer if USER DATA section not found
        const container = document.getElementById('adminContainer');
        container.appendChild(detailView);
    }
}

// Placeholder for Read Functionality
async function readAdminData(entityKey, category) {
    console.log(`Reading data for ${category}: ${entityKey}`);
    const detailView = document.getElementById('adminDetailView');
    if (!detailView) return;

    const inputs = detailView.querySelectorAll('input[type="text"]');
    if (typeof ui !== 'undefined' && typeof ui.showOperationIndicator === 'function') {
        ui.showOperationIndicator('Reading data...');
    } else {
        console.warn('ui.showOperationIndicator is not available.');
    }

    try {
        let entityData;
        if (category === 'user') {
            // FIX: Changed FIELD_MAP.userData to FIELD_MAP.user to match map.js structure
            entityData = FIELD_MAP.user;
        } else {
            entityData = FIELD_MAP[category][entityKey];
        }

        if (!entityData) {
            throw new Error(`Mapping data not found for ${category}: ${entityKey}`);
        }

        for (const input of inputs) {
            const sector = parseInt(input.dataset.sector);
            const block = parseInt(input.dataset.block);
            const key = input.dataset.key; // Key should be hex string

            // Always use admin role for admin reads (default key is handled in operations.js)
            let data = null;
            if (typeof operations !== 'undefined' && typeof operations.readSectorBlock === 'function') {
                // Corrected: Reads are universal, no role needed.
                data = await operations.readSectorBlock(sector, block);
            } else {
                console.warn('operations.readSectorBlock is not available.');
            }

            if (data) {
                // Original call preserved as backup:
                // input.value = utils.hexToString(data);
                // Updated per static analysis: use correct function hexToText()
                const textData = utils.hexToText(data);
                utils.log(`Converted hex to text (admin read): ${textData}`, 'debug');
                input.value = textData;
                utils.log(`Read Success (Sector ${sector}, Block ${block}): ${input.value}`); // Use utils namespace
            } else {
                input.value = ""; // Clear if read fails or returns null
                utils.log(`Read Failed/Empty (Sector ${sector}, Block ${block})`, 'warn'); // Use utils namespace
            }
        }
        if (typeof ui !== 'undefined' && typeof ui.showVisualConfirmation === 'function') {
            ui.showVisualConfirmation("Read Complete", "Sector data read successfully (or empty).");
        } else {
            console.warn('ui.showVisualConfirmation is not available.');
        }
    } catch (error) {
        console.error('Error reading admin data:', error);
        utils.log(`Error reading sector data for ${entityKey}: ${error.message}`, 'error'); // Use utils namespace
        if (typeof ui !== 'undefined' && typeof ui.showVisualConfirmation === 'function') {
            ui.showVisualConfirmation("Read Error", `Failed to read data: ${error.message}`, 'error');
        } else {
            console.warn('ui.showVisualConfirmation is not available.');
        }
    } finally {
        if (typeof ui !== 'undefined' && typeof ui.hideOperationIndicator === 'function') {
            ui.hideOperationIndicator();
        } else {
            console.warn('ui.hideOperationIndicator is not available.');
        }
    }
}

// Placeholder for Write Functionality
async function writeAdminData(entityKey, category) {
    console.log(`Writing data for ${category}: ${entityKey}`);
    const detailView = document.getElementById('adminDetailView');
    if (!detailView) return;

    const inputs = detailView.querySelectorAll('input[type="text"]');
    if (typeof ui !== 'undefined' && typeof ui.showOperationIndicator === 'function') {
        ui.showOperationIndicator('Writing data...');
    } else {
        console.warn('ui.showOperationIndicator is not available.');
    }

    try {
        let entityData;
        if (category === 'user') {
            // FIX: Changed FIELD_MAP.userData to FIELD_MAP.user to match map.js structure
            entityData = FIELD_MAP.user;
        } else {
            entityData = FIELD_MAP[category][entityKey];
        }
        if (!entityData) {
            throw new Error(`Mapping data not found for ${category}: ${entityKey}`);
        }

        for (const input of inputs) {
            const sector = parseInt(input.dataset.sector);
            const block = parseInt(input.dataset.block);
            const key = input.dataset.key;
            const dataToWrite = input.value;
            // Original call preserved as backup:
            // const hexData = utils.stringToHex(dataToWrite).padEnd(32, '0');
            // Updated per static analysis: use correct function textToHex()
            const hexData = utils.textToHex(dataToWrite).padEnd(32, '0');
            utils.log(`Converted admin input text to hex: ${hexData}`, 'debug');

            // Corrected: Determine target role based on sector and pass that role for writing.
            let targetRole = null;
            if (sector === 39) {
                targetRole = 'staff'; // User data sector uses staff key
            } else {
                // Find faction/allegiance associated with this sector
                const findRole = (map) => Object.entries(map || {}).find(([, data]) => data.sector === sector)?.[0];
                targetRole = findRole(FIELD_MAP.factions) || findRole(FIELD_MAP.allegiances);
            }

            if (!targetRole) {
                throw new Error(`Could not determine target role for writing to Sector ${sector}`);
            }

            utils.log(`Admin writing to Sector ${sector} using target role: ${targetRole}`, 'debug');

            // Fetch the actual hex key based on the determined role identifier (targetRole)
            let targetKeyHex = null;
            if (targetRole === 'staff') {
                targetKeyHex = window.NEOBAND_KEYS?.staff?.user?.neokey;
            } else if (window.NEOBAND_KEYS?.factions?.[targetRole]?.neoKey) {
                targetKeyHex = window.NEOBAND_KEYS.factions[targetRole].neoKey;
            } else if (window.NEOBAND_KEYS?.allegiances?.[targetRole]?.neoKey) {
                targetKeyHex = window.NEOBAND_KEYS.allegiances[targetRole].neoKey;
            }

            if (!targetKeyHex) {
                utils.log(`[writeAdminData] Could not determine target role/key for sector ${sector}.`, 'error');
                throw new Error(`Cannot write to sector ${sector}: Unable to determine the associated faction, allegiance, or if it's the staff sector.`);
            }

            utils.log(`[writeAdminData] Determined target role: ${targetRole} for sector ${sector}. Attempting write...`, 'info');

            utils.log(`[writeAdminData] Using key ${targetKeyHex} for target role ${targetRole} on sector ${sector}.`, 'debug');

            // Pass the fetched keyHex to the modified writeSectorBlock
            await operations.writeSectorBlock(sector, block, hexData, targetKeyHex);

            utils.log(`[writeAdminData] Wrote ${hexData} to Sector ${sector}, Block ${block} successfully.`, 'success');
        }
        if (typeof ui !== 'undefined' && typeof ui.showVisualConfirmation === 'function') {
            ui.showVisualConfirmation("Write Complete", "Sector data written successfully.");
        } else {
            console.warn('ui.showVisualConfirmation is not available.');
        }
    } catch (error) {
        console.error('Error writing admin data:', error);
        utils.log(`Error writing sector data for ${entityKey}: ${error.message}`, 'error'); // Use utils namespace
        if (typeof ui !== 'undefined' && typeof ui.showVisualConfirmation === 'function') {
            ui.showVisualConfirmation("Write Error", `Failed to write data: ${error.message}`, 'error');
        } else {
            console.warn('ui.showVisualConfirmation is not available.');
        }
    } finally {
        if (typeof ui !== 'undefined' && typeof ui.hideOperationIndicator === 'function') {
            ui.hideOperationIndicator();
        } else {
            console.warn('ui.hideOperationIndicator is not available.');
        }
    }
}

// Note: The placeholder comments for utility/UI functions are removed as we assume
// they are correctly defined in ui.js, utils.js, core.js, operations.js
// Ensure that `ui.showOperationIndicator`, `ui.hideOperationIndicator`,
// `ui.showVisualConfirmation`, `utils.log`, `utils.hexToString`,
// `utils.stringToHex`, `operations.readBlock`, `operations.writeBlock`
// are all accessible and function as expected.