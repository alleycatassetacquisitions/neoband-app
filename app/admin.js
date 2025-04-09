/**
 * admin.js
 * Provides administrator interface and functionality for the Neoband App.
 * 
 * This file implements:
 * - Admin interface initialization and rendering
 * - Detailed memory map visualization
 * - Advanced read/write capabilities for memory sectors
 * - Management tools for factions and allegiances
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
 * Creates a dynamic admin interface based on the FIELD_MAP structure,
 * organizing content by category (factions, allegiances, user data).
 * 
 * @returns {void}
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

    // --- Create UI sections ---
    try {
        // Create section for factions using FIELD_MAP.factions
        const factionsSection = createAdminSection("FACTION CONTROL", FIELD_MAP.factions, 'faction');
        container.appendChild(factionsSection);

        // Create section for allegiances using FIELD_MAP.allegiances
        const allegiancesSection = createAdminSection("ALLEGIANCE CONTROL", FIELD_MAP.allegiances, 'allegiance');
        container.appendChild(allegiancesSection);

        // Create section for user data (limited view)
        const userSection = createAdminSection("USER DATA (Sector 39)", FIELD_MAP.userData, 'user');
        container.appendChild(userSection);

        console.log("Admin Interface Initialized Successfully.");

    } catch (error) {
        console.error("Error initializing admin sections:", error);
        container.innerHTML = `<p style="color: var(--error-color);">Error building admin interface. Check console for details.</p>`;
    }
}

/**
 * Creates an admin section for a specific category (faction, allegiance, user).
 * Generates a titled section containing a grid of entity buttons.
 * 
 * @param {string} sectionTitle - Display title for the section
 * @param {Object} mapData - The data from FIELD_MAP for this category
 * @param {string} category - Category identifier ('faction', 'allegiance', or 'user')
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

    // Iterate over each entity in the mapData
    if (category === 'user') {
        // Special handling for user category as it's not nested by name
        const btn = createEntityButton('userData', mapData, category);
        grid.appendChild(btn);
    } else {
        for (const entityKey in mapData) {
            const entity = mapData[entityKey];
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
 * @param {string} category - Category identifier ('faction', 'allegiance', or 'user')
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
    
    // Add click listener
    btn.addEventListener('click', () => displayEntityDetails(entityKey, entityData, category));
    
    return btn;
}

function displayEntityDetails(entityKey, entityData, category) {
    const detailView = document.createElement('div');
    detailView.className = 'sector-details';
    detailView.id = 'adminDetailView'; // ID to easily find and remove later

    const displayName = entityData.name || entityKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    
    // For userData, we need to handle the sector differently
    const sectorDisplay = category === 'user' ? '39' : entityData.sector;

    let fieldsHTML = '';
    
    // Handle userData differently since it has a different structure
    if (category === 'user') {
        // For userData, each property is a field
        for (const fieldKey in entityData) {
            const field = entityData[fieldKey];
            // Skip if not a field object (e.g., might be a function or other property)
            if (!field || typeof field !== 'object' || !field.block) continue;
            
            const absoluteBlockId = calculateAbsoluteBlockId(39, field.block - 240); // Adjust block to be relative to sector 39
            const relativeBlock = field.block - 240; // Calculate relative block within sector 39
            const inputId = `admin-input-39-${relativeBlock}`;

            fieldsHTML += `
            <div class="detail-item">
                <label for="${inputId}">${field.title}</label>
                <input type="text" id="${inputId}"
                       placeholder="${field.placeholder}" value=""
                       data-sector="39"
                       data-block="${relativeBlock}"
                       data-key="${field.key}" />
                <div class="field-block-info">Sector 39, Block ${relativeBlock} (Abs: ${field.block})</div>
            </div>
            `;
        }
    } else {
        // For factions and allegiances, use the existing structure
        for (const fieldKey in entityData.fields) {
            const field = entityData.fields[fieldKey];
            const absoluteBlockId = calculateAbsoluteBlockId(entityData.sector, field.block);
            const inputId = `admin-input-${entityData.sector}-${field.block}`;

            fieldsHTML += `
            <div class="detail-item">
                <label for="${inputId}">${field.title}</label>
                <input type="text" id="${inputId}"
                       placeholder="${field.placeholder}" value=""
                       data-sector="${entityData.sector}"
                       data-block="${field.block}"
                       data-key="${field.key}" />
                <div class="field-block-info">Sector ${entityData.sector}, Block ${field.block} (Abs: ${absoluteBlockId})</div>
            </div>
            `;
        }
    }

    detailView.innerHTML = `
        <h4>${displayName} - Sector ${entityData.sector} Details</h4>
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

    return detailView;
}

// Helper to calculate absolute block ID based on sector and relative block
function calculateAbsoluteBlockId(sector, relativeBlock) {
    if (sector < 0 || sector >= 40 || relativeBlock < 0 || relativeBlock >= 16) {
        return 'Invalid';
    }
    if (sector < 32) {
        // Sectors 0-31 have 4 blocks each
        return sector * 4 + relativeBlock;
    } else {
        // Sectors 32-39 have 16 blocks each
        // Base address for sector 32 is 32*4 = 128
        return 128 + (sector - 32) * 16 + relativeBlock;
    }
}

// Placeholder for Read Functionality
async function readAdminData(entityKey, category) {
    console.log(`Reading data for ${category}: ${entityKey}`);
    const detailView = document.getElementById('adminDetailView');
    if (!detailView) return;

    const inputs = detailView.querySelectorAll('input[type="text"]');
    ui.showOperationIndicator('Reading data...'); // Use ui namespace

    try {
        let entityData;
        if (category === 'user') {
            entityData = FIELD_MAP.userData;
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

            // Assume operations.readBlock exists and handles the uFR logic
            // It needs sector, block (relative to sector), authMode, and key
            // Using Key A (0x60) and the specific key from map.js by default
            const data = await operations.readBlock(sector, block, 0x60, key);

            if (data) {
                input.value = utils.hexToString(data); // Assuming hexToString exists
                utils.log(`Read Success (Sector ${sector}, Block ${block}): ${input.value}`); // Use utils namespace
            } else {
                input.value = ""; // Clear if read fails or returns null
                utils.log(`Read Failed/Empty (Sector ${sector}, Block ${block})`, 'warn'); // Use utils namespace
            }
        }
        ui.showVisualConfirmation("Read Complete", "Sector data read successfully (or empty)."); // Use ui namespace
    } catch (error) {
        console.error('Error reading admin data:', error);
        utils.log(`Error reading sector data for ${entityKey}: ${error.message}`, 'error'); // Use utils namespace
        ui.showVisualConfirmation("Read Error", `Failed to read data: ${error.message}`, 'error'); // Use ui namespace
    } finally {
        ui.hideOperationIndicator(); // Use ui namespace
    }
}

// Placeholder for Write Functionality
async function writeAdminData(entityKey, category) {
    console.log(`Writing data for ${category}: ${entityKey}`);
    const detailView = document.getElementById('adminDetailView');
    if (!detailView) return;

    const inputs = detailView.querySelectorAll('input[type="text"]');
    ui.showOperationIndicator('Writing data...'); // Use ui namespace

    try {
        let entityData;
        if (category === 'user') {
            entityData = FIELD_MAP.userData;
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
            const hexData = utils.stringToHex(dataToWrite).padEnd(32, '0'); // Pad to 16 bytes (32 hex chars)

            // Assume operations.writeBlock exists and handles the uFR logic
            // It needs sector, block (relative), data (hex), authMode, key
            const success = await operations.writeBlock(sector, block, hexData, 0x60, key);

            if (success) {
                utils.log(`Write Success (Sector ${sector}, Block ${block}): ${dataToWrite}`); // Use utils namespace
            } else {
                utils.log(`Write Failed (Sector ${sector}, Block ${block})`, 'error'); // Use utils namespace
                // Optionally stop writing on first failure
                throw new Error(`Failed to write to Sector ${sector}, Block ${block}.`);
            }
        }
        ui.showVisualConfirmation("Write Complete", "Sector data written successfully."); // Use ui namespace
    } catch (error) {
        console.error('Error writing admin data:', error);
        utils.log(`Error writing sector data for ${entityKey}: ${error.message}`, 'error'); // Use utils namespace
        ui.showVisualConfirmation("Write Error", `Failed to write data: ${error.message}`, 'error'); // Use ui namespace
    } finally {
        ui.hideOperationIndicator(); // Use ui namespace
    }
}

// Note: The placeholder comments for utility/UI functions are removed as we assume
// they are correctly defined in ui.js, utils.js, core.js, operations.js
// Ensure that `ui.showOperationIndicator`, `ui.hideOperationIndicator`,
// `ui.showVisualConfirmation`, `utils.log`, `utils.hexToString`,
// `utils.stringToHex`, `operations.readBlock`, `operations.writeBlock`
// are all accessible and function as expected.