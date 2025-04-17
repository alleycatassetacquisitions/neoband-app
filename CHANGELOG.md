# Rival App Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Version 3.0.5]

### Added
- **Admin Page: Server IP Settings Section**
  - Added a new "Settings" section to the Admin page with a "Server IP" input field and a "Save" button.
  - Allows users to enter and persist the backend server's IP address in localStorage.
  - The current server IP is loaded from localStorage and displayed in the input field on page load.
  - All API sync operations now use the configured server IP instead of a hardcoded value.
  - UI feedback is provided on save (success or error).
  - Affected files: `app/admin.js`, `app/operations.js`

### Changed
- **Dynamic Server IP for Sync**
  - Refactored `syncFaction1DataToServer` in `app/operations.js` to use the server IP from localStorage via `getServerBaseUrl()`.
  - Exposed `getServerBaseUrl` and `setServerBaseUrl` on the global window object for use by the admin UI.
  - Improved logging for server IP changes and sync operations.

## [Version 3.0.4]

### Fixed
- **FIELD_MAP Pluralization Bug:**
  - Fixed a critical bug in `app/admin.js` where the admin page logic for Factions and Allegiances sometimes passed the singular category key ("faction", "allegiance") instead of the required plural key ("factions", "allegiances")
  - This caused `FIELD_MAP[category]` to be undefined, resulting in TypeError and breaking admin read/write
  - All admin logic (button generation, event handlers, and function calls) now consistently uses the correct plural category key
  - Original buggy logic preserved as comments for backup, per project requirements
  - Added detailed comments and references for traceability and maintainability
  - Affected file: `app/admin.js` (lines 168–357)

### Changed
- **User Data Admin Section Refactor:**
  - Updated admin page user data section to display all fields as editable inputs in a detail view
  - Added `displayUserDataDetails` as a dedicated function for rendering all user data fields
  - Modified button logic to create only one button for user data instead of one per field
  - Updated `createAdminSection` and `createEntityButton` to support the new user data handling
  - Preserved original linear read/write logic as comments for audit and backup
  - Added comprehensive comments and logging for traceability and maintainability
  - Ensures admin user data section is fully editable and compliant with project requirements

## [Version 3.0.3]

### Fixed
- **Allegiance Field Memory Mapping:**
  - Corrected the FIELD_MAP for all allegiances in `app/map.js` to span 5 consecutive sectors per allegiance
  - Implemented valid data blocks (blocks 0–2) per sector for a total of 15 fields
  - Fixed previous mapping that incorrectly attempted to use blocks 0–14 of a single sector
  - Added comprehensive comments documenting the rationale and bugfix
  - Preserved original (invalid) mapping as comments for audit/compliance
  - Ensured strict compliance with MIFARE Classic 1K/4K memory constraints

- **Username and Field Operations:**
  - Fixed username read operation in SDK parameter passing to use correct sector mapping
  - Updated both read and write operations to use Sector 39, Block 0 exclusively
  - Added comprehensive logging for SDK calls (parameters, results, errors)
  - Preserved original linear read/write logic as commented backup
  - Fixed sector mapping logic for sectors 32–39 and 16–23

- **Error Handling and UI Updates:**
  - Enhanced error handling to preserve UI field values during NFC errors
  - Implemented clear error message display via `showVisualConfirmation`
  - Added detailed logging for all UI updates and error conditions
  - Updated error handling for username, faction, and allegiance field operations
  - Improved traceability logging for debugging and maintenance

### Enhanced
- Added comprehensive documentation for memory mapping and sector/block addressing
- Implemented detailed traceability logging throughout the application
- Added explicit logging for addressing logic and rationale
- Enhanced debugging capabilities with detailed parameter logging

### Technical Details
- Corrected sector/block addressing compliance for MIFARE Classic cards
- Eliminated silent addressing bugs in username operations
- Improved consistency in field operations across all data types
- Enhanced error handling to prevent data loss and user confusion

## [Version 3.0.2]

### Fixed
- Critical bug fix: Fixed issue where username was being written to block 21 (Sector 5, Block 1) instead of block 240 (Sector 39, Block 0)
- Added hardcore validation and safeguards in writeFieldWithRetry and writeUsername functions to prevent incorrect block usage
- Added emergency detection and correction if the app tries to write to block 21 when it should be writing to block 240
- Improved address validation to ensure correct sector/block calculation and consistent handling of numerical vs string addresses

### Enhanced
- Added post-write verification for username writes to confirm data is correctly stored
- Added comprehensive debugging logs to trace the exact path of block addresses through the system
- Enhanced the getSectorDelay function with special handling for username block
- Added reference logging to show mapping between block 21 and 240 for better debugging

## [Version 3.0.1]

### Fixed
- Critical bug fix: Added proper validation for block addresses to ensure username is written to the correct sector (39) and block (0) instead of incorrectly targeting sector 5
- Implemented `reverseLinearToSectorBlock` function in `utils.js` that correctly maps linear block addresses to sector/block coordinates
- Added `validateSectorBlockMapping` function to detect inconsistencies between block numbering systems
- Updated UI to show the correct sector and block information during username read/write operations
- Enhanced block validation in `readFieldWithRetryRaw` and `writeFieldWithRetry` functions
- Fixed technical documentation to correctly state that block 240 is in Sector 39, Block 0 (not Sector 60)

### Enhanced
- Improved error handling with additional validation checks for critical block operations
- Added detailed logging for block validation failures to help diagnose issues
- Updated UI messages to include both linear block numbers and sector/block coordinates for clarity
- Added `detectBlockMappingIssues` utility function to help identify and correct block addressing issues when migrating data between different addressing schemes

## [Milestone 18]

### Fixed
- Resolved critical issue where faction fields were being corrupted during operations within the same sector
- Implemented isolated authentication for each block read/write operation in faction and allegiance fields
- Added mandatory delays between operations to ensure card stability and prevent corruption
- Replaced use of shared functions with direct, isolated commands for each operation
- Added verification step after writes to confirm data integrity
- Enhanced logging to show detailed hex analysis during read/write operations
- Faction data like "hunter" now properly persists across multiple operations
- Eliminated corruption between different blocks in the same sector
- Data is now consistently read back exactly as written for all field types (username, faction, allegiance)

### Technical Details
- Fixed a critical MIFARE card operation issue where authentication sessions weren't properly maintained between blocks
- Each read/write now performs its own complete authentication cycle
- Added proper delays before and after operations to ensure card stability
- Implemented verification reads after writes to confirm data integrity

## [Milestone 17]

### Added
- Added comprehensive technical documentation to all application files:
  - Enhanced `core.js` with detailed comments explaining state management, initialization, and core application logic
  - Updated `operations.js` with extensive NFC technical documentation including memory addressing, authentication, and data handling
  - Added detailed comments to `utils.js` explaining MIFARE Classic 4K memory structure, hex conversion, and data padding
  - Improved `ui.js` documentation with clear explanations of UI initialization, rendering, and event handling
  - Enhanced `map.js` with comprehensive memory map documentation including sector allocation and field definitions
  - Added detailed technical documentation to `admin.js` explaining admin interface functionality
- Added JSDoc-style parameter and return type documentation to all major functions
- Added technical notes sections explaining MIFARE Classic 4K memory structure and constraints
- Included detailed authentication key documentation and sector addressing explanations
- Added explanations of error handling and recovery strategies

### Changed
- Updated `handleFactionWrite` to use `writeFactionField` instead of `writeBlock`
- Updated `handleAllegianceWrite` to use `writeAllegianceField` instead of `writeBlock`
- Standardized the writing approach across all card data (username, factions, and allegiance fields)

### Fixed
- Fixed critical issue where faction fields like "hunter" were only storing the first character "h" during write operations
- Made faction field writes and reads use the identical approach to username fields, using the same series of function calls and data handling
- Ensured consistent encoding/decoding behavior for all field types
- All fields now maintain full text data integrity, resolving the data truncation issues observed in faction fields

## [Milestone 16]

### Fixed
- Fixed critical issue with double hex-to-text conversion in faction and allegiance read operations
- Added dedicated `readFactionField` and `readAllegianceField` functions that follow the same pattern as `readUsername`
- Updated `handleFactionRead` and `handleAllegianceRead` to use these new functions for consistent behavior
- All field reading now uses the same approach: reading the raw data and performing a single conversion to text
- This resolves issues where faction fields like "hunter" were incorrectly displayed as empty
- Fields containing a single character (like "h" from "hunter") now display correctly
- Standardized the reading approach across all card data (username, factions, and allegiance fields)

## [Milestone 15]

### Changed
- Updated sector delay timing in `core.js` to resolve authentication issues during read/write operations:
  - Increased delay for Sector 1 (Factions) from 50ms to 2900ms
  - Increased delay for Sectors 36-38 (Allegiances) from 60ms to 2900ms
  - Increased delay for Sector 39 (User data) from 40ms to 600ms
- These longer delays ensure proper authentication with the NFC card reader, particularly when accessing multiple blocks within the same sector
- The longer delays prevent UFR_AUTH_ERROR issues that previously occurred during faction and allegiance operations

### Fixed
- Resolved authentication failures that occurred when reading faction and allegiance data
- Fixed issue where successful writes would be followed by failed reads due to insufficient delay between operations
- Improved reliability of consecutive operations on the same sector

## [Milestone 14]

### Fixed
- Fixed critical issue with faction and allegiance fields being double-encoded during write operations
- Modified `handleFactionWrite` and `handleAllegianceWrite` functions in ui.js to remove pre-encoding of data
- Previously, text was being encoded to hex in both the UI code and again in operations.writeFieldWithRetry, causing corruption
- The fix ensures data is passed as raw text from the UI to operations.writeBlock, letting operations.writeFieldWithRetry handle the encoding once
- This resolves issues where written data like "hunter" would appear corrupted or missing when read back
- Data written to faction and allegiance fields now persists correctly with the same reliability as username fields

## [Milestone 13]

### Fixed
- Performed a comprehensive root cause analysis of allegiance field data persistence issues
- Completely refactored the data encoding/decoding process for better compatibility with the original Neoband App:
  - Enhanced `textToHex` function to add detailed debugging information and proper error handling
  - Completely rewrote `hexToText` function with improved handling of FF-padded data
  - Enhanced `writeFieldWithRetry` with more robust text validation and explicit length limiting
  - Enhanced `readFieldWithRetry` with specialized handling for allegiance sectors (36-38)
  - Added extensive logging throughout the data conversion process to aid troubleshooting
- Significantly improved data persistence in allegiance fields:
  - Fixed issue where written data like "Hey99Dinos" would appear as single characters ("4") or nothing when read back
  - Fixed issue where invalid or corrupted characters would appear in allegiance fields
  - Ensured consistent character encoding across all operations
- Added sector-specific validation and debug information for allegiance sectors
- Applied more detailed input validation and better error handling in text-to-hex conversion
- This comprehensive update ensures that allegiance field data now persists properly across all operations, with the same reliability as username fields 

## [Milestone 12]

### Fixed
- Fixed issue where single characters in allegiance fields were being incorrectly converted to empty strings
- Modified the hexToText function in utils.js to always return any valid characters found, even if it's just a single character
- Removed the check that was discarding single character results 
- Simplified the function's logic to consistently handle all text conversion cases
- Ensured that short strings like single digits or characters are properly preserved when reading from the card 

## [Milestone 11]

### Fixed
- Fixed critical issue where allegiance and faction field values were being lost during read operations
- Modified the `readFieldWithRetry` function in operations.js to separate the raw hex data read from its text conversion 
- Improved the `hexToText` function in utils.js with better error handling and more robust conversion logic
- Added detailed debugging output for hex-to-text conversion to aid in troubleshooting
- This fix ensures that data written to allegiance and faction fields is properly preserved during read operations, solving the issue where field values would disappear when reading them back from the card 

## [Milestone 10]

### Fixed
- Fixed critical issue with allegiance and faction fields not being properly handled during write operations
- Modified the `writeFieldWithRetry` function in operations.js to properly initialize the hex data variable and ensure text is properly converted to valid hex format
- This addresses a serious issue where allegiance and faction fields were being written with corrupted data, causing unexpected values to appear when reading back from the card
- The fields now properly handle null input and use consistent text-to-hex conversion, ensuring all fields work as consistently as the username field
- This ensures all fields in the app now behave consistently regarding data handling, storage and reading 

## [Milestone 9]

### Fixed
- Fixed critical issue with allegiance and faction fields not being properly handled during write operations
- Modified the `writeFieldWithRetry` function in operations.js to properly initialize the hex data variable and ensure text is properly converted to valid hex format
- This addresses a serious issue where allegiance and faction fields were being written with corrupted data, causing unexpected values to appear when reading back from the card
- The fields now properly handle null input and use consistent text-to-hex conversion, ensuring all fields work as consistently as the username field
- This ensures all fields in the app now behave consistently regarding data handling, storage and reading 

## [Milestone 8]

### Fixed
- Fixed issue with allegiance and faction data appearing as empty strings when reading, even though hex data was successfully retrieved
- Modified the `hexToText` function in utils.js to properly handle data formats with mixed FF padding bytes
- The previous implementation incorrectly treated the first occurrence of '00' or 'FF' as a string terminator, discarding all subsequent bytes
- The updated function now processes the entire hex string and extracts all valid characters, ignoring only the '00' and 'FF' padding bytes
- This change ensures that all data written to the card can be properly read back, even if the hex representation has padding bytes mixed in

## [Milestone 7]

### Fixed
- Fixed issue with allegiance page write operations still failing with "FIELD_MAP is not defined" error
- Found and fixed inconsistency in the `writeBlock` function in operations.js where it was using `window.FIELD_MAP` check while UI functions were using `typeof FIELD_MAP === 'undefined'`
- This change ensures complete consistency in how FIELD_MAP is accessed across all components of the application
- With this fix, both reading and writing to allegiance and faction blocks now work correctly

## [Milestone 6]

### Fixed
- Fixed issue with allegiance page read/write operations still failing with "FIELD_MAP is not defined" error
- Modified the FIELD_MAP access pattern in `handleAllegianceRead` and `handleAllegianceWrite` functions to use `typeof FIELD_MAP === 'undefined'` check instead of `window.FIELD_MAP`
- Made the same change to `handleFactionRead` and `handleFactionWrite` for consistency
- These changes ensure that the FIELD_MAP global variable is accessed consistently throughout the application, fixing the discrepancy in how different functions check for the availability of the map data

## [Milestone 5]

### Fixed
- Fixed critical issue with allegiance page failing with "FIELD_MAP is not defined" error by ensuring that the map.js script is properly loaded before accessing it
- Identified and resolved a confusing comment in index.html that incorrectly stated "map.js which is at the root" while actually referencing it from the app/ directory
- The issue was caused by inconsistent loading of the map.js file which contains the FIELD_MAP definition that both the registration page and allegiance page rely on
- This fix ensures consistent access to the FIELD_MAP object across all pages, fixing the discrepancy where the registration page worked but the allegiance page didn't

## [Milestone 4]

### Fixed
- Fixed critical issue with allegiance page reads and writes failing with UFR_PARAMETERS_ERROR by ensuring that all operations use absolute addressing with LinearRead/LinearWrite commands instead of sector-based addressing
- Enhanced the `readBlock` and `writeBlock` functions to completely remove BlockInSectorRead_PK approach which was causing parameter validation errors
- Added more detailed success logging for read and write operations, showing both sector/block and absolute block addresses
- Modified error handling to provide clearer indication of where operations are failing
- Added checks in faction and allegiance handler functions to verify FIELD_MAP is defined before attempting to access it, preventing "FIELD_MAP is not defined" errors
- Improved user feedback when map.js fails to load by displaying a clear error message suggesting a page refresh

## [Milestone 3]

### Added
- Added `readUsernameAndUpdateFields` function to `ui.js` to read username from a tag and update all relevant fields across the application
- Added direct integration with the original app's username reading functionality
- Added automatic username read after successful tag scanning
- Added `readFieldWithRetry` and `writeFieldWithRetry` functions to `operations.js` with retry logic and fallback authentication mechanisms matching the original Neoband App
- Added `getSectorDelay` function to `operations.js` to retrieve sector-specific delays based on the block's sector type (faction, allegiance, user)
- Added exact replication of the original Neoband App's username reading, writing, and reset implementations with full compatibility
- Added detailed HTML-based logging to the log display to match the original app's visual style

### Changed
- Updated `readUsername` function in `operations.js` to use `readFieldWithRetry` for better reliability
- Updated `writeUsername` function in `operations.js` to use `writeFieldWithRetry` for better reliability
- Enhanced `scanTag` function to automatically call `readUsernameAndUpdateFields` after successful scan
- Modified `handleRegRead` function in `ui.js` to match the original app's implementation pattern
- Modified `handleRegWrite` function in `ui.js` to match the original app's implementation pattern
- Modified `handleRegReset` function in `ui.js` to use `writeFieldWithRetry` for better reliability
- Improved error handling in tag reading and username operations
- Changed padding in `utils.padHex()` from '00' (null bytes) to 'FF' padding for compatibility with the original Neoband App's data format
- Implemented sector-specific delays in read/write operations to match the original app's timing adjustments for different sector types
- Unified error handling and visual feedback to match the original app's user experience
- Refactored `readBlock` and `writeBlock` functions to use absolute addressing with LinearRead/LinearWrite instead of sector-based addressing
- Server sync is now initialized at app start in `core.js`, immediately after UI initialization, by calling `operations.syncFaction1DataToServer` with a placeholder UID. This ensures the sync function is always available and can be triggered or retried as needed.
- `scanTag` now always sets `selectedFaction` to `'faction1'` and `enableNfcSync` to `true` after a successful tag scan, and always triggers `syncFaction1DataToServer` for faction1 tags. Added detailed logging in `syncFaction1DataToServer` to confirm invocation and parameters for traceability and debugging.
- `syncFaction1DataToServer` now reads `username` (sector 39, block 0), `allegiance` (sector 39, block 2), and faction fields (sector 1, blocks 0-2) directly from the tag, and uses the display name for the faction from `FIELD_MAP` if available. This ensures the sync payload always matches the actual tag data, not possibly stale state.

### Fixed
- Fixed consistency issues between absolute and sector-based block addressing by preferring absolute addressing for user operations
- Updated operation indicator and visual confirmation feedback to provide more detailed user feedback during operations
- Enhanced compatibility with the original Neoband App's functionality
- Fixed LinearRead and LinearWrite commands in readAbsoluteBlock and writeAbsoluteBlock to include required length and authentication parameters according to D-Logic API specifications
- Corrected the format of LinearRead and LinearWrite commands to exactly match the original Neoband App implementation
- Fixed state management after username operations to ensure consistent UI updates
- Fixed authentication fallback logic to match the original app's behavior of attempting Key B authentication when Key A fails
- Fixed hex encoding/decoding to handle FF padding correctly for compatibility with the original app
- Fixed issue with BlockInSectorRead_PK commands failing with UFR_PARAMETERS_ERROR in faction data read/write operations
- Fixed redundant username read operations in faction and allegiance scan handlers

## [Milestone 2]

### Added
- Initial project structure (`index.html`, `style.css`, `app/core.js`, `app/ui.js`, `app/utils.js`, `app/operations.js`, `admin.js`)
- `map.js` defining the `FIELD_MAP` constant based on the MIFARE 4K memory map CSV, including factions, allegiances, and user data with titles, placeholders, sectors, blocks, and keys
- Basic navigation between Registration, Faction, Allegiance, and Admin pages
- Dynamic population of Faction and Allegiance dropdowns based on `FIELD_MAP`
- Dynamic generation of input fields for selected Factions and Allegiances based on `FIELD_MAP`
- Event handlers for Scan, Read, Write, and Reset operations on Registration, Faction, and Allegiance pages
- `admin.js` to dynamically display Faction and Allegiance information based on `FIELD_MAP`
- Basic UI rendering logic in `ui.js` to reflect application state
- Utility functions (`utils.js`) for logging and data conversion (hex/text)
- Placeholder NFC operation functions (`operations.js`)
- Visual confirmation dialogs for operations
- Log display area with toggle button

### Changed
- Refactored `core.js` to remove internal `MEMORY_MAP` definition
- Updated `core.js` initialization to check for the globally defined `FIELD_MAP` from `map.js`
- Updated `ui.js` functions (`populate*Select`, `display*Fields`) to use the global `FIELD_MAP`
- Updated `ui.js` event handlers (`handle*`) to use `FIELD_MAP` and correct property names (`block`, `key`, `sector`) for NFC operations
- Updated `admin.js` to use the global `FIELD_MAP`

### Fixed
- Fixed syntax error ("Unterminated string literal") in `ui.js` (`handleRegReset`) by using template literals for multiline confirm message
- Added `aria-label` and `title` attributes to log toggle button in `index.html` to satisfy linter requirements
- Modified `operations.js` (`readBlock`, `writeBlock`) to use `_PK` command variants, accepting the NFC key as a parameter
- Updated `ui.js` event handlers to retrieve the correct key from `FIELD_MAP` and pass it to `operations.js` functions
- Corrected NFC authentication errors (`UFR_AUTH_ERROR`) by providing the explicit key (`FFFFFFFFFFFF`) instead of relying on reader-stored keys (`_RK`)
- Added robust error handling in `operations.js` to check for null/undefined responses from `ufResponse()` and provide better error messages
- Added logging in `operations.js` to show raw `ufResponse()` output and the exact command string before sending via `ufRequest()`
- Refactored `ui.js` `handleRegScan` to only perform tag detection (`scanTag`) and not automatically trigger `handleRegRead`
- Refactored `ui.js` `handleRegRead` to be triggered only by the read button and explicitly read only defined user fields (Username, Allegiance, Status) using `operations.readBlock` with correct block addresses and keys from `FIELD_MAP`, removing the incorrect attempt to read Block 0
- Increased delay times for allegiance (4000ms) and user (1200ms) operations to fix authentication errors
- Improved retry mechanism for NFC operations with allegiance sectors by adding progressive backoff
- Added extra initial delay for allegiance sectors which are more prone to errors
- Fixed handling of write operations to ensure consistent delays and error management
- Fixed critical issue with username reading functionality by correcting the readFieldWithRetryRaw function to use LinearRead command instead of incorrectly using LinearWrite command format

### Removed
- Removed redundant `MEMORY_MAP` definition from `core.js`
- Removed `validateMemoryMap` function from `core.js` as it was specific to the old map structure

## [Milestone 1]

Initial project setup and basic functionality implementation.

## [Unreleased] - 2025-04-13
### Added
- Player Data section at the top of Faction and Allegiance pages, with a cyan frame.
- Moved Current User field into Player Data section on both pages.
- Added 'Current Allegiance' field (readonly, auto-filled from sector 39, block 3) to Player Data section on both pages.
- New CSS class `.player-data-frame` (add to style.css) for cyan frame.
- New function `operations.readCurrentAllegiance` to read current allegiance from sector 39, block 3.
- New function `ui.readAndUpdateCurrentAllegiance` to update Player Data allegiance fields and core state.
- UI now updates Player Data allegiance field after every scan or read on Faction and Allegiance pages.

### Changed
- All Faction and Allegiance page content (dropdowns, tables, fields, buttons) now appears under the Player Data section.
- UI render logic updated to set new allegiance fields.

### Notes
- No changes to Registration or Admin pages.
- See code comments for required CSS for `.player-data-frame`.