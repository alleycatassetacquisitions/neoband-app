# Neoband App

## Overview
The Neoband App is a comprehensive web-based application for managing MIFARE Classic 4K NFC tags using the D-Logic uFR Zero Online Lite ISO 14443 A/B Network NFC RFID Reader/Writer. It provides a complete interface for reading, writing, and managing user data, faction information, and allegiances on NFC wristbands.

The application supports:
- User registration and management
- Faction data read/write operations
- Allegiance data management
- Administrative control over the entire memory map
- Comprehensive operation logging
- Error handling and recovery

## Technical Requirements

- D-Logic uFR Zero Online Lite ISO 14443 A/B Network NFC RFID Reader/Writer
- Modern web browser (Chrome recommended)
- MIFARE Classic 4K NFC tags/wristbands

## Memory Structure

The application is designed for MIFARE Classic 4K cards which have:
- 40 sectors (numbered 0-39)
- Sectors 0-31: 4 blocks each (0-3)
- Sectors 32-39: 16 blocks each (0-15)
- Block 3 in each sector is the "trailer" block (contains keys and access bits)

The memory map follows these rules:
1. **Factions**: Use sectors 1-15 and 17-31 (30 factions total)
   - Each faction gets 3 fields (blocks 0-2 in their sector)
   - Sector 16 is reserved (skipped)
2. **Allegiances**: Use sectors 36-38
   - Each allegiance spans 15 blocks in its sector
   - Only blocks 0-14 are used in each sector
3. **User data**: Uses sector 39, block 0
   - Username is stored in sector 39, block 0

## Authentication
- All operations use the standard factory key (FFFFFFFFFFFF)
- Each block requires fresh authentication before access
- Key A is used for authentication (AUTH_MODE_A: 0x60)

## Application Pages

### 1. Registration Page

**Purpose**: Manage user data and perform basic tag operations.

**Features**:
- Tag detection and scanning
- Username reading and writing
- Tag status display
- User data reset functionality

**Key UI Elements**:
- Username input field (max 16 chars)
- Band ID display (read-only)
- Current username display (read-only)
- Band status indicator
- Operation buttons (Scan, Read, Register/Update, Clear)

### 2. Faction Page

**Purpose**: Manage faction-specific data.

**Features**:
- Faction selection from 30 available factions
- Reading faction-specific data fields
- Writing faction data to the tag
- Display of current user information

**Key UI Elements**:
- Current username display
- Faction selector dropdown
- Faction fields form (dynamically generated)
- Operation buttons (Scan, Read, Write)

### 3. Allegiances Page

**Purpose**: Manage allegiance-specific data.

**Features**:
- Allegiance selection (Endline, Helix, The Resistance)
- Reading allegiance data fields
- Writing allegiance data to the tag
- Display of current user information

**Key UI Elements**:
- Current username display
- Allegiance selector dropdown
- Allegiance fields form (dynamically generated)
- Operation buttons (Scan, Read, Write)

### 4. Admin Page

**Purpose**: Provide advanced control over the entire memory map.

**Features**:
- Full access to all factions and allegiances
- Direct sector/block operations
- Detailed memory addressing information
- Advanced read/write capabilities

**Key UI Elements**:
- Dynamically generated admin interface
- Entity selection controls
- Detailed memory field displays

## Core Files and Functions

### index.html

The main HTML file that defines the structure of the application UI. It includes:
- Application header and navigation
- Four main page sections (Registration, Faction, Allegiance, Admin)
- Shared UI elements (operation indicator, confirmation modal, log display)
- Script loading sequence (critical for proper functionality)

**Important Notes**:
- Script loading order is critical
- All scripts must be referenced with "app/" prefix for uFR Zero device compatibility
- The 'ufr' attribute on the HTML tag enables integration with the uFR browser extension

### map.js

Defines the memory layout and field mappings for the application.

**Key Components**:
- `NFC_KEY`: Standard authentication key (FFFFFFFFFFFF)
- `FIELD_MAP`: Complete memory layout definition including:
  - `factions`: 30 faction definitions with their fields
  - `allegiances`: 3 allegiance definitions with their fields
  - `user`: User data field definitions

**Memory Mapping Rules**:
- Each faction gets its own sector with 3 blocks
- Each allegiance spans 15 blocks in its sector
- User data occupies specific blocks in sector 39

### utils.js

Provides utility functions for the application.

**Key Functions**:
- Text/Hex conversion: `textToHex()`, `hexToText()`
- Logging: `log()`, `initLogger()`
- UI utilities: `showConfirmation()`, `showOperationIndicator()`
- String/data manipulation: `padHex()`, `formatDate()`

### operations.js

Implements all NFC card operations.

**Key Functions**:
- `scanTag()`: Detects and initializes tag communication
- `readSectorBlock()`: Reads data from a specific sector/block
- `writeSectorBlock()`: Writes data to a specific sector/block
- `readUsername()`: Reads username from Sector 39, Block 0
- `writeUsername()`: Writes username to Sector 39, Block 0
- `readFactionField()`: Reads faction-specific data
- `writeFactionField()`: Writes faction-specific data
- `readAllegianceField()`: Reads allegiance-specific data
- `writeAllegianceField()`: Writes allegiance-specific data

**Important Constants**:
- `AUTH_MODE_A`: 0x60 (Key A authentication)
- `AUTH_MODE_B`: 0x61 (Key B authentication)

**Operation Timing**:
- Username operations require 600ms delay
- Faction operations require 2900ms delay
- Allegiance operations require 2900ms delay

### core.js

Serves as the central controller for the application.

**Key Components**:
- `currentState`: Application state object containing runtime variables
- `NFC_KEY`: Default authentication key
- `RESERVED_SECTORS`: Set of sectors reserved for system use
- `SECTOR_DELAYS`: Timing configuration for NFC operations

**Key Functions**:
- `init()`: Initializes the application
- `updateState()`: Updates application state and triggers UI rendering
- `resetTagState()`: Clears tag-related state information
- `setOperationStatus()`: Updates operation status indicators

### ui.js

Handles UI manipulation and event handling.

**Key Functions**:
- `init()`: Sets up UI and event listeners
- `render()`: Updates UI based on current application state
- `navigateTo()`: Handles page navigation
- `populateSelectors()`: Populates dropdown selectors from FIELD_MAP
- `createFactionFields()`: Dynamically generates faction field inputs
- `createAllegianceFields()`: Dynamically generates allegiance field inputs
- `readUsernameAndUpdateFields()`: Updates UI with username data
- Event handlers for all button interactions

### admin.js

Provides administrative interface functionality.

**Key Functions**:
- `initializeAdminInterface()`: Sets up the admin UI
- `createAdminSection()`: Generates admin section for factions/allegiances
- `createEntityButton()`: Creates entity selection buttons
- `displayEntityDetails()`: Shows detailed entity information
- `displayUserDataDetails()`: Shows user data details
- `readAdminData()`: Reads data for admin display
- `writeAdminData()`: Writes data from admin interface

### neoband-sdk.js

Custom SDK that interfaces with the D-Logic uFR hardware directly.

**Key Functions**:
- `getUID()`: Gets the unique identifier of the detected tag
- `readSectorBlock()`: Reads data from specific sector/block
- `writeSectorBlock()`: Writes data to specific sector/block

## D-Logic SDK Specifics

### uFR Zero Hardware Integration

The application communicates with the D-Logic uFR Zero reader through the custom neoband-sdk.js, which requires:
- The HTML 'ufr' attribute
- Script references with "app/" prefix
- Strict sector/block addressing for MIFARE Classic operations

### Authentication Requirements

- All read/write operations require authentication
- Key Index 0 is used for standard authentication (Key A)
- Authentication must occur before each block access

### Operation Timing

To ensure reliable operation with the uFR reader:
- A delay of 2900ms between faction operations
- A delay of 4000ms between allegiance operations
- A delay of 1200ms between user data operations
- These delays prevent command conflicts and ensure proper authentication

## MIFARE Classic 4K Specifics

### Memory Layout

- 40 sectors (0-39)
- Sectors 0-31: 4 blocks per sector
- Sectors 32-39: 16 blocks per sector
- Total usable storage: approximately 4KB

### Sector Structure

- Each sector contains data blocks and a trailer block
- The trailer block (the last block in each sector) contains:
  - Key A (6 bytes)
  - Access bits (4 bytes)
  - Key B (6 bytes)
- Only data blocks are used for storing application data

### Reserved Sectors

- Sector 0: Contains manufacturer data and card identification
- Sector 16: Reserved for the MIFARE Application Directory (MAD)
- Sectors 32-35: Reserved for system use in this application

## Error Handling

The application implements comprehensive error handling:
- Dependency checks to detect missing modules
- Try/catch blocks around all NFC operations
- Logging of operation status and errors
- UI indicators for operation success/failure
- Timeouts and retries for unreliable operations

## Changelog

For a complete history of changes and updates, refer to the CHANGELOG.md file in the project root.

## Setup and Deployment

1. Connect the D-Logic uFR Zero reader to the computer
2. Open the application in a supported browser
3. Ensure all JavaScript files are present in the root directory
4. The application should detect the reader and be ready for use

## Development Guidelines

When modifying the application:
- Maintain the script loading order in index.html
- Preserve the D-Logic specific prefixes and attributes
- Follow the established memory mapping in map.js
- Add comprehensive logging for any new operations
- Test all NFC operations with actual MIFARE Classic 4K tags
- Update the CHANGELOG.md file with any changes 