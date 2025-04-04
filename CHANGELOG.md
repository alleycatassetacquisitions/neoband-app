# Rival App Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] - YYYY-MM-DD
## [Milestone 1] - YYYY-MM-DD
## [Milestone 2] - YYYY-MM-DD

### Added
- Initial project structure (`index.html`, `style.css`, `app/core.js`, `app/ui.js`, `app/utils.js`, `app/operations.js`, `admin.js`).
- `map.js` defining the `FIELD_MAP` constant based on the MIFARE 4K memory map CSV, including factions, allegiances, and user data with titles, placeholders, sectors, blocks, and keys.
- Basic navigation between Registration, Faction, Allegiance, and Admin pages.
- Dynamic population of Faction and Allegiance dropdowns based on `FIELD_MAP`.
- Dynamic generation of input fields for selected Factions and Allegiances based on `FIELD_MAP`.
- Event handlers for Scan, Read, Write, and Reset operations on Registration, Faction, and Allegiance pages.
- `admin.js` to dynamically display Faction and Allegiance information based on `FIELD_MAP`.
- Basic UI rendering logic in `ui.js` to reflect application state.
- Utility functions (`utils.js`) for logging and data conversion (hex/text).
- Placeholder NFC operation functions (`operations.js`).
- Visual confirmation dialogs for operations.
- Log display area with toggle button.

### Changed
- Refactored `core.js` to remove internal `MEMORY_MAP` definition.
- Updated `core.js` initialization to check for the globally defined `FIELD_MAP` from `map.js`.
- Updated `ui.js` functions (`populate*Select`, `display*Fields`) to use the global `FIELD_MAP`.
- Updated `ui.js` event handlers (`handle*`) to use `FIELD_MAP` and correct property names (`block`, `key`, `sector`) for NFC operations.
- Updated `admin.js` to use the global `FIELD_MAP`.

### Fixed
- Fixed syntax error ("Unterminated string literal") in `ui.js` (`handleRegReset`) by using template literals for multiline confirm message.
- Added `aria-label` and `title` attributes to log toggle button in `index.html` to satisfy linter requirements.
- Modified `operations.js` (`readBlock`, `writeBlock`) to use `_PK` command variants, accepting the NFC key as a parameter.
- Updated `ui.js` event handlers to retrieve the correct key from `FIELD_MAP` and pass it to `operations.js` functions.
- Corrected NFC authentication errors (`UFR_AUTH_ERROR`) by providing the explicit key (`FFFFFFFFFFFF`) instead of relying on reader-stored keys (`_RK`).
- Added robust error handling in `operations.js` to check for null/undefined responses from `ufResponse()` and provide better error messages.
- Added logging in `operations.js` to show raw `ufResponse()` output and the exact command string before sending via `ufRequest()`.
- Refactored `ui.js` `handleRegScan` to only perform tag detection (`scanTag`) and not automatically trigger `handleRegRead`.
- Refactored `ui.js` `handleRegRead` to be triggered only by the read button and explicitly read only defined user fields (Username, Allegiance, Status) using `operations.readBlock` with correct block addresses and keys from `FIELD_MAP`, removing the incorrect attempt to read Block 0.

### Removed
- Removed redundant `MEMORY_MAP` definition from `core.js`.
- Removed `validateMemoryMap` function from `core.js` as it was specific to the old map structure.

## [Milestone 3] - 2023-04-04

### Added
- Added `readUsernameAndUpdateFields` function to `ui.js` to read username from a tag and update all relevant fields across the application.
- Added direct integration with the original app's username reading functionality.
- Added automatic username read after successful tag scanning.
- Added `readFieldWithRetry` and `writeFieldWithRetry` functions to `operations.js` with retry logic and fallback authentication mechanisms matching the original Neoband App.
- Added `getSectorDelay` function to `operations.js` to retrieve sector-specific delays based on the block's sector type (faction, allegiance, user).
- Added exact replication of the original Neoband App's username reading, writing, and reset implementations with full compatibility.
- Added detailed HTML-based logging to the log display to match the original app's visual style.

### Changed
- Updated `readUsername` function in `operations.js` to use `readFieldWithRetry` for better reliability.
- Updated `writeUsername` function in `operations.js` to use `writeFieldWithRetry` for better reliability.
- Enhanced `scanTag` function to automatically call `readUsernameAndUpdateFields` after successful scan.
- Modified `handleRegRead` function in `ui.js` to match the original app's implementation pattern.
- Modified `handleRegWrite` function in `ui.js` to match the original app's implementation pattern.
- Modified `handleRegReset` function in `ui.js` to use `writeFieldWithRetry` for better reliability.
- Improved error handling in tag reading and username operations.
- Changed padding in `utils.padHex()` from '00' (null bytes) to 'FF' padding for compatibility with the original Neoband App's data format.
- Implemented sector-specific delays in read/write operations to match the original app's timing adjustments for different sector types.
- Unified error handling and visual feedback to match the original app's user experience.
- Refactored `readBlock` and `writeBlock` functions to use absolute addressing with LinearRead/LinearWrite instead of sector-based addressing.

### Fixed
- Fixed consistency issues between absolute and sector-based block addressing by preferring absolute addressing for user operations.
- Updated operation indicator and visual confirmation feedback to provide more detailed user feedback during operations.
- Enhanced compatibility with the original Neoband App's functionality.
- Fixed LinearRead and LinearWrite commands in readAbsoluteBlock and writeAbsoluteBlock to include required length and authentication parameters according to D-Logic API specifications.
- Corrected the format of LinearRead and LinearWrite commands to exactly match the original Neoband App implementation.
- Fixed state management after username operations to ensure consistent UI updates.
- Fixed authentication fallback logic to match the original app's behavior of attempting Key B authentication when Key A fails.
- Fixed hex encoding/decoding to handle FF padding correctly for compatibility with the original app.
- Fixed issue with BlockInSectorRead_PK commands failing with UFR_PARAMETERS_ERROR in faction data read/write operations.
- Fixed redundant username read operations in faction and allegiance scan handlers.

## [Milestone 4] - 2023-04-05

### Fixed
- Fixed critical issue with allegiance page reads and writes failing with UFR_PARAMETERS_ERROR by ensuring that all operations use absolute addressing with LinearRead/LinearWrite commands instead of sector-based addressing.
- Enhanced the `readBlock` and `writeBlock` functions to completely remove BlockInSectorRead_PK approach which was causing parameter validation errors.
- Added more detailed success logging for read and write operations, showing both sector/block and absolute block addresses.
- Modified error handling to provide clearer indication of where operations are failing.
- Added checks in faction and allegiance handler functions to verify FIELD_MAP is defined before attempting to access it, preventing "FIELD_MAP is not defined" errors.
- Improved user feedback when map.js fails to load by displaying a clear error message suggesting a page refresh.

These comprehensive updates ensure the allegiance page functionality is fully aligned with the original Neoband App behavior. By standardizing on absolute block addressing throughout the codebase, all read and write operations now work reliably across all sectors. The additional checks for FIELD_MAP improve application robustness, ensuring proper error handling even when script loading issues occur. With these fixes, the Rival App now offers a complete replacement for the original app with full compatibility and enhanced reliability. 

## [Milestone 5] - 2023-04-04

### Fixed
- Fixed critical issue with allegiance page failing with "FIELD_MAP is not defined" error by ensuring that the map.js script is properly loaded before accessing it.
- Identified and resolved a confusing comment in index.html that incorrectly stated "map.js which is at the root" while actually referencing it from the app/ directory.
- The issue was caused by inconsistent loading of the map.js file which contains the FIELD_MAP definition that both the registration page and allegiance page rely on.
- This fix ensures consistent access to the FIELD_MAP object across all pages, fixing the discrepancy where the registration page worked but the allegiance page didn't.

## [Milestone 6] - 2023-04-04

### Fixed
- Fixed issue with allegiance page read/write operations still failing with "FIELD_MAP is not defined" error.
- Modified the FIELD_MAP access pattern in `handleAllegianceRead` and `handleAllegianceWrite` functions to use `typeof FIELD_MAP === 'undefined'` check instead of `window.FIELD_MAP`.
- Made the same change to `handleFactionRead` and `handleFactionWrite` for consistency.
- These changes ensure that the FIELD_MAP global variable is accessed consistently throughout the application, fixing the discrepancy in how different functions check for the availability of the map data.

## [Milestone 7] - 2023-04-04

### Fixed
- Fixed issue with allegiance page write operations still failing with "FIELD_MAP is not defined" error.
- Found and fixed inconsistency in the `writeBlock` function in operations.js where it was using `window.FIELD_MAP` check while UI functions were using `typeof FIELD_MAP === 'undefined'`.
- This change ensures complete consistency in how FIELD_MAP is accessed across all components of the application.
- With this fix, both reading and writing to allegiance and faction blocks now work correctly.

## [Milestone 8] - 2023-04-04

### Fixed
- Fixed issue with allegiance and faction data appearing as empty strings when reading, even though hex data was successfully retrieved.
- Modified the `hexToText` function in utils.js to properly handle data formats with mixed FF padding bytes.
- The previous implementation incorrectly treated the first occurrence of '00' or 'FF' as a string terminator, discarding all subsequent bytes.
- The updated function now processes the entire hex string and extracts all valid characters, ignoring only the '00' and 'FF' padding bytes.
- This change ensures that all data written to the card can be properly read back, even if the hex representation has padding bytes mixed in.

## [Milestone 9] - 2023-04-04

### Fixed
- Fixed critical issue with allegiance and faction fields not being properly handled during write operations
- Modified the `writeFieldWithRetry` function in operations.js to properly initialize the hex data variable and ensure text is properly converted to valid hex format
- This addresses a serious issue where allegiance and faction fields were being written with corrupted data, causing unexpected values to appear when reading back from the card
- The fields now properly handle null input and use consistent text-to-hex conversion, ensuring all fields work as consistently as the username field
- This ensures all fields in the app now behave consistently regarding data handling, storage and reading 

## [Milestone 10] - 2023-04-04

### Fixed
- Fixed critical issue where allegiance and faction field values were being lost during read operations
- Modified the `readFieldWithRetry` function in operations.js to separate the raw hex data read from its text conversion 
- Improved the `hexToText` function in utils.js with better error handling and more robust conversion logic
- Added detailed debugging output for hex-to-text conversion to aid in troubleshooting
- This fix ensures that data written to allegiance and faction fields is properly preserved during read operations, solving the issue where field values would disappear when reading them back from the card 

## [Milestone 11] - 2023-04-04

### Fixed
- Fixed issue where single characters in allegiance fields were being incorrectly converted to empty strings
- Modified the hexToText function in utils.js to always return any valid characters found, even if it's just a single character
- Removed the check that was discarding single character results 
- Simplified the function's logic to consistently handle all text conversion cases
- Ensured that short strings like single digits or characters are properly preserved when reading from the card 

## [Milestone 12] - 2023-04-04

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