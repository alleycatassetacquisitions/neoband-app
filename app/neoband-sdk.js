/**
 * NeoBand SDK - Standalone
 * Works natively inside D-Logic uFR Zero Online environment (UDP mode).
 * No external dependencies or hardcoded IPs.
 * Auto-converts between text and hex.
 * Implements core NFC tag functionality with validation
 */
//NOTE TO AI: NEVER DELETE ANY OF THESE FUNCTIONS, ONLY ADD TO THEM OR COMMENT THEM OUT IF YOU ARE GOING TO REMOVE THEM

const NeobandSDK = (() => {
  const DEFAULT_KEY = 'FFFFFFFFFFFF';
  const DEFAULT_AUTH = 0x60;
  const DEFAULT_KEY_INDEX = 0;
  const MAX_SECTOR = 39;
  const MAX_BLOCKS_PER_SECTOR = (sector) => sector < 32 ? 4 : 16;
  const DEFAULT_AUTH_STR = '0x60'; // Key A as string for D-Logic commands

  function validateSectorBlock(sector, block, write = false) {
    const maxBlocksPerSector = (sector < 32) ? 4 : 16;
    if (sector < 0 || sector > 39) throw new Error('Invalid sector: ' + sector);
    if (block < 0 || block >= maxBlocksPerSector) throw new Error(`Invalid block ${block} for sector ${sector}`);
    if (write) {
      if (sector === 0) {
        throw new Error(`Write access denied to protected sector 0, block ${block}. Writing to sector 0 is forbidden.`);
      }
      if (block === maxBlocksPerSector - 1) {
        throw new Error(`Write access denied to sector trailer: sector ${sector}, block ${block}`);
      }
    }
  }

  function textToHex(text) {
    const hex = Array.from(new TextEncoder().encode(text))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.padEnd(32, '00');
  }

  function hexToText(hex) {
    try {
      const cleanHex = hex.replace(/[^0-9A-Fa-f]/g, '').slice(0, 32);
      const bytes = cleanHex.match(/.{1,2}/g).map(b => parseInt(b, 16));
      return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\x00+$/, '');
    } catch {
      return '';
    }
  }

  function extractJsonSafe(response) {
      if (!response || !response.Status) {
          throw new Error('[neoband-sdk] Reader error: Invalid or missing response');
      }
      
      // Match the status format from actual reader response: "[0x00 (0)] UFR_OK"
      const statusMatch = response.Status.match(/\[(.*?)\]\s+(.+)/);
      const statusCode = statusMatch ? statusMatch[1] : 'unknown';
      const statusText = statusMatch ? statusMatch[2] : response.Status;
      
      if (statusText !== 'UFR_OK') {
          throw new Error(`[neoband-sdk] Reader error: ${statusText} (${statusCode})`);
      }
      
      return response;
  }

  /**
   * Enhanced error handler for sendRequest, logs error and command context.
   */
  function handleSendError(err, command = null) {
      console.error('[neoband-sdk] Communication error:', err);
      if (command) {
          console.error('[neoband-sdk] Command that caused error:', command);
      }
      
      // Handle undefined property errors
      if (err.message && err.message.includes("can't access property")) {
          throw new Error('[neoband-sdk] Invalid reader response format');
      }
      if (err.name === 'AbortError') {
          throw new Error('[neoband-sdk] Request timed out (2000ms)');
      }
      if (err.message && err.message.includes('NetworkError')) {
          throw new Error('[neoband-sdk] Reader connection failed');
      }
      throw err; // Preserve original error stack
  }

  /**
   * Sends a command string to the /shell endpoint and returns the parsed response.
   * Added detailed debug logging for command, response, and error tracing.
   */
  function sendRequest(command) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    // Log the command being sent for debugging
    console.debug('[neoband-sdk] sendRequest: Sending command:', command);

    return fetch('/shell', {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: command,
      signal: controller.signal,
    })
    .then(async res => {
      clearTimeout(timeoutId);
      // Log the raw response status and headers
      console.debug('[neoband-sdk] sendRequest: Raw fetch response:', res.status, res.statusText, res.headers);
      let json;
      try {
        json = await res.json();
        // Log the parsed JSON response
        console.debug('[neoband-sdk] sendRequest: Parsed JSON response:', JSON.stringify(json));
        return json;
      } catch (e) {
        const text = await res.text();
        console.error('[neoband-sdk] sendRequest: Invalid JSON response:', text);
        throw new Error(`Invalid JSON response: ${text}`);
      }
    })
    .then(extractJsonSafe)
    .catch(err => {
      // Log the error with command context
      console.error('[neoband-sdk] sendRequest: Error for command:', command, err);
      handleSendError(err, command);
    });
  }

  function linearByteLength(hexData) {
    return hexData.length / 2;
  }

  const readBlock = (sector, block) => {
    validateSectorBlock(sector, block);
    // Use BlockInSectorRead for sector/block addressing
    return sendRequest(`BlockInSectorRead h ${sector} ${block} ${DEFAULT_AUTH_STR} ${DEFAULT_KEY_INDEX}`).then(r => r.Data);
  };

  const writeBlock = (sector, block, hexData) => {
    validateSectorBlock(sector, block, true);
    // Use BlockInSectorWrite for sector/block addressing
    const dataHex = hexData.startsWith('0x') ? hexData : '0x' + hexData;
    return sendRequest(`BlockInSectorWrite ${dataHex} ${sector} ${block} ${DEFAULT_AUTH_STR} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
  };

  const readSectorBlock = (sector, block, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    validateSectorBlock(sector, block);
    // Format matches the working examples: "BlockInSectorRead h [sector] [block] [authMode] [keyIndex]"
    // The 'h' parameter is required by the D-Logic API to indicate hex format
    return sendRequest(`BlockInSectorRead h ${sector} ${block} ${authMode} ${keyIndex}`).then(r => r.Data);
  };

  /**
   * Writes a 16-byte hexData block to the specified sector/block using the given authMode and keyIndex.
   * Added debug logging for all parameters and command string.
   */
  // FIXED: Match reference app: data as 0x..., authMode as "0x60"/"0x61"
  const writeSectorBlock = (sector, block, hexData, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    validateSectorBlock(sector, block, true);
    // Always prefix data with 0x
    const dataHex = hexData.startsWith('0x') ? hexData : '0x' + hexData;
    // Use "0x60" for Key A, "0x61" for Key B
    const authStr = authMode === 0x61 || authMode === 97 ? '0x61' : '0x60';
    const command = `BlockInSectorWrite ${dataHex} ${sector} ${block} ${authStr} ${keyIndex}`;
    // Log all parameters and the command string
    console.debug('[neoband-sdk] writeSectorBlock params:', { sector, block, hexData, dataHex, authMode, authStr, keyIndex });
    console.debug('[neoband-sdk] writeSectorBlock (REF-STYLE) command:', command);
    return sendRequest(command).then(r => r.Status);
  };

  const readValueBlock = (block) => sendRequest(`ValueBlockRead ${block} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Data);
  const writeValueBlock = (block, value) => sendRequest(`ValueBlockWrite ${block} ${value} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
  const incrementValueBlock = (block, value) => sendRequest(`ValueBlockIncrement ${block} ${value} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
  const decrementValueBlock = (block, value) => sendRequest(`ValueBlockDecrement ${block} ${value} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);

  /**
   * Simplified sector trailer write: only allow admin or the assigned user to set their own sector trailer.
   * Always uses standard access bits (FF0780) and user byte (00 for non-MAD, production use).
   * NOTE: This function uses getSectorKeysForUser which was recently removed and re-added. Verify functionality if used.
   */
  const setUserSectorTrailer = async (sector, role) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] setUserSectorTrailer: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }
    // Use sectorTrailerWrite for roles with custom Key B
    const { keyA, keyB } = getSectorKeysForUser(sector, role, true);
    //const accessBits = 'FF0780'; // Standard access bits
    // Use zeroed access bits (all bits set to 0) as requested
    const accessBits = getMifareAccessBits('zeroed');
    console.debug(`[neoband-sdk] setUserSectorTrailer: Using zeroed access bits (${accessBits}) for role ${role}`);
    
    const userByte = '00'; // Use 00 for production/non-MAD cards
    try {
      const status = await sectorTrailerWrite(
        sector,
        keyA,
        accessBits,
        userByte,
        keyB,
        0x61, // AuthMode: Key B
        0 // KeyIndex: always 0 for regular write
      );
      console.debug(`[neoband-sdk] setUserSectorTrailer: Used sectorTrailerWrite for sector ${sector}, role ${role}. AccessBits: ${accessBits}, UserByte: ${userByte}. Status:`, status);
      return status;
    } catch (err) {
      console.error(`[neoband-sdk] setUserSectorTrailer: Error writing sector trailer for sector ${sector}, role ${role}:`, err);
      // NOTE: Considered using sectorTrailerWrite_PK as fallback but not implemented since the _PK version was commented out
      // If a fallback is needed in the future, consider uncommenting the sectorTrailerWrite_PK function
      throw err;
    }
  };

  const getCardSize = () => sendRequest('GetCardSize').then(r => r.Data);

  /**
   * Format the card by writing default values to all data blocks and resetting sector trailers.
   * Uses only BlockInSectorWrite and SectorTrailerWrite (no LinearRead/Write).
   * This matches the D-Logic Advanced example approach.
   * @returns {Promise<string>} Status
   */
  const formatCard = async () => {
    try {
      console.debug('[neoband-sdk] formatCard: Starting card format using BlockInSectorWrite and sectorTrailerWrite');
      const defaultBlockData = '00'.repeat(16); // 16 bytes of 0x00
      if (!window.NEOBAND_KEYS || !window.NEOBAND_KEYS.universalReadKeyA) {
        throw new Error('[neoband-sdk] formatCard: NEOBAND_KEYS.universalReadKeyA is not loaded or defined.');
      }
      const universalKeyA = window.NEOBAND_KEYS.universalReadKeyA;
      const initialKeyB = DEFAULT_KEY; // FFFFFFFFFFFF
      //const defaultAccessBits = 'FF0780'; // Standard access bit
      // Get zeroed access bits as requested (all bits set to 0)
      const defaultAccessBits = getMifareAccessBits('zeroed');
      console.debug(`[neoband-sdk] formatCard: Using zeroed access bits: ${defaultAccessBits}`);
      
      const defaultUserByte = '00'; // Use 00 for production/non-MAD cards
      validateKeyHex(universalKeyA);
      validateKeyHex(initialKeyB);
      
      // Track processed blocks to prevent duplicate writes
      const processedBlocks = new Set();
      
      // Skip sector 0 entirely as writing to it is forbidden
      console.debug('[neoband-sdk] formatCard: Skipping sector 0 entirely (writing to sector 0 is forbidden)');
      for (let sector = 1; sector <= MAX_SECTOR; sector++) {
        const blocks = (sector < 32) ? 4 : 16;
        // Write each data block (0, 1, 2, ... blocks-2) exactly once
        for (let block = 0; block < blocks - 1; block++) {
          // Create a unique identifier for this sector/block combination
          const blockId = `${sector}-${block}`;
          
          // Skip if this block has already been processed
          if (processedBlocks.has(blockId)) {
            console.debug(`[neoband-sdk] formatCard: Skipping already processed block: sector ${sector}, block ${block}`);
            continue;
          }
          
          try {
            // Mark this block as processed before sending the request
            processedBlocks.add(blockId);
            
            await sendRequest(`BlockInSectorWrite 0x${defaultBlockData} ${sector} ${block} ${DEFAULT_AUTH_STR} ${DEFAULT_KEY_INDEX}`);
            console.debug(`[neoband-sdk] formatCard: Wrote default data to sector ${sector}, block ${block}`);
          } catch (err) {
            console.error(`[neoband-sdk] formatCard: Error writing to sector ${sector}, block ${block}:`, err);
          }
        }
        
        const trailerBlock = (sector < 32) ? 3 : 15;
        // Create a unique identifier for the trailer block
        const trailerBlockId = `${sector}-trailer`;
        
        // Skip if this trailer has already been processed
        if (processedBlocks.has(trailerBlockId)) {
          console.debug(`[neoband-sdk] formatCard: Skipping already processed trailer for sector ${sector}`);
          continue;
        }
        
        // Mark this trailer as processed
        processedBlocks.add(trailerBlockId);
        
        try {
          // Use sectorTrailerWrite for correct command construction
          const status = await sectorTrailerWrite(
            sector,
            universalKeyA,
            defaultAccessBits,
            defaultUserByte,
            initialKeyB,
            0x61, // AuthMode: Key B
            0 // KeyIndex: always 0 for regular write
          );
          console.debug(`[neoband-sdk] formatCard: Reset sector trailer for sector ${sector}, block ${trailerBlock} with KeyA=${universalKeyA}, KeyB=${initialKeyB}, AccessBits=${defaultAccessBits}, UserByte=${defaultUserByte}. Status:`, status);
        } catch (err) {
          console.error(`[neoband-sdk] formatCard: Error resetting sector trailer for sector ${sector}:`, err);
          // Only retry if error is not "Incorrect parameters"
          if (err && err.message && !/Incorrect parameters/i.test(err.message)) {
            try {
              const statusRetry = await sectorTrailerWrite(
                sector,
                universalKeyA,
                defaultAccessBits,
                defaultUserByte,
                initialKeyB,
                0x61,
                0
              );
              console.debug(`[neoband-sdk] formatCard: Retry sector trailer for sector ${sector} with zeroed access bits (${defaultAccessBits}) succeeded. Status:`, statusRetry);
            } catch (retryErr) {
              console.error(`[neoband-sdk] formatCard: Retry failed for sector trailer in sector ${sector} with zeroed access bits:`, retryErr);
              // NOTE: Fallback using BlockInSectorWrite was suggested but not implemented as it's not appropriate for sector trailers
              // If a fallback is needed in the future, consider uncommenting and adapting the sectorTrailerWrite_PK function instead
            }
          }
        }
      }
      return 'Success';
    } catch (err) {
      console.error('[neoband-sdk] formatCard: Card format failed:', err);
      return 'Error';
    }
  };

  const readText = (sector, block) => readBlock(sector, block).then(hexToText);
  const writeText = (sector, block, text) => writeBlock(sector, block, textToHex(text));

  const getUID = async () => {
    try {
      // Send the GetCardIdEx command to the reader
      const result = await sendRequest('GetCardIdEx');
      
      // Log the raw response for debugging
      console.debug('[neoband-sdk] GetCardIdEx raw response:', result);
      
      let uid = null;
      
      // Primary Strategy: Directly check result.CardUid
      if (result && result.CardUid && typeof result.CardUid === 'string') {
          uid = result.CardUid;
          console.debug('[neoband-sdk] Found UID in result.CardUid:', uid);
          // Handle potential '0x' prefix right away
          if (uid.startsWith('0x')) {
            uid = uid.substring(2); // Remove '0x'
            console.debug('[neoband-sdk] Removed "0x" prefix, UID is now:', uid);
          }
      } 
      // Removed fallback strategies for clarity and to prioritize the most likely correct source based on logs

      // Add detailed logging before validation
      console.debug(`[neoband-sdk] Final check before validation: uid = ${uid}, typeof uid = ${typeof uid}`);

      const isValidUid = uid && typeof uid === 'string' && /^[0-9A-Fa-f]{8,}$/i.test(uid);
      console.debug(`[neoband-sdk] Regex test result for '${uid}': ${isValidUid}`); // Added log

      // Final validation
      if (!isValidUid) {
        console.error('[neoband-sdk] Could not extract valid UID from response:', result);
        throw new Error('[neoband-sdk] Invalid UID format');
      }
      
      // Normalize and return the UID
      const normalizedUid = uid.toUpperCase().padStart(8, '0');
      console.debug('[neoband-sdk] Normalized UID:', normalizedUid);
      return normalizedUid;
    } catch (error) {
      console.error('[neoband-sdk] getUID error:', error);
      throw error;
    }
  };

  const signalSuccess = () => sendRequest('ReaderUISignal 1 1').then(r => r.Status);
  const signalFailure = () => sendRequest('ReaderUISignal 2 2').then(r => r.Status);
  const resetReader = () => sendRequest('ReaderReset').then(r => r.Status);
  const getCardType = () => sendRequest('GetDlogicCardType').then(r => r.Data);
  const getFirmwareVersion = () => sendRequest('GetReaderFirmwareVersion').then(r => r.Data);
  const getHardwareVersion = () => sendRequest('GetReaderHardwareVersion').then(r => r.Data);
  const getSerialNumber = () => sendRequest('GetReaderSerialNumber').then(r => r.Data);
  const getReaderDescription = () => sendRequest('GetReaderDescription').then(r => r.Data);
  
  // Get raw card ID response (for debugging)
  const getRawCardIdEx = () => sendRequest('GetCardIdEx');

  // --- Generic BlockInSectorRead/Write (for admin/advanced use) ---
  /**
   * Generic block-in-sector read (admin/advanced use).
   * @param {number} sector
   * @param {number} block
   * @param {number} authMode - 0x60 (Key A) or 0x61 (Key B)
   * @param {number} keyIndex - usually 0
   * @returns {Promise<string>} Hex data
   */
  const blockInSectorRead = (sector, block, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    console.warn('[neoband-sdk] blockInSectorRead (standard auth) is deprecated. Use readSectorBlock or blockInSectorRead_PK.');
    validateSectorBlock(sector, block);
    const authStr = formatAuthMode(authMode);
    return sendRequest(`BlockInSectorRead h ${sector} ${block} ${authStr} ${keyIndex}`).then(r => r.Data);
  };

  /**
   * Generic block-in-sector write (admin/advanced use).
   * @param {number} sector
   * @param {number} block
   * @param {string} hexData - 16 bytes hex
   * @param {number} authMode - 0x60 (Key A) or 0x61 (Key B)
   * @param {number} keyIndex - usually 0
   * @returns {Promise<string>} Status
   */
  const blockInSectorWrite = (sector, block, hexData, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    validateSectorBlock(sector, block, true);
    const dataHex = hexData.startsWith('0x') ? hexData : '0x' + hexData;
    const authStr = authMode === 0x61 || authMode === 97 ? '0x61' : '0x60';
    return sendRequest(`BlockInSectorWrite ${dataHex} ${sector} ${block} ${authStr} ${keyIndex}`).then(r => r.Status);
  };

  /**
   * Direct block-in-sector read using a provided key (PK variant, like D-Logic example).
   * @param {number} sector
   * @param {number} block
   * @param {number} authMode - 0x60 (Key A) or 0x61 (Key B)
   * @param {string} keyHex - 12 hex chars, e.g. 'FFFFFFFFFFFF'
   * @returns {Promise<string>} Hex data
   */
  const blockInSectorRead_PK = (sector, block, authMode, keyHex) => {
    validateSectorBlock(sector, block);
    // Format: BlockInSectorRead_PK h <sector> <block> <authMode> <key>
    const keyStr = keyHex.startsWith('0x') ? keyHex : '0x' + keyHex;
    const authStr = authMode === 0x61 || authMode === 97 ? '0x61' : '0x60';
    const cmd = `BlockInSectorRead_PK h ${sector} ${block} ${authStr} ${keyStr}`;
    return sendRequest(cmd).then(r => r.Data);
  };

  /**
   * Direct block-in-sector write using a provided key (PK variant, like D-Logic example).
   * @param {number} sector
   * @param {number} block
   * @param {string} hexData - 16 bytes hex
   * @param {number} authMode - 0x60 (Key A) or 0x61 (Key B)
   * @param {string} keyHex - 12 hex chars, e.g. 'FFFFFFFFFFFF'
   * @returns {Promise<string>} Status
   */
  const blockInSectorWrite_PK = (sector, block, hexData, authMode, keyHex) => {
    validateSectorBlock(sector, block, true);
    const dataHex = hexData.startsWith('0x') ? hexData : '0x' + hexData;
    const keyStr = keyHex.startsWith('0x') ? keyHex : '0x' + keyHex;
    const authStr = authMode === 0x61 || authMode === 97 ? '0x61' : '0x60';
    const cmd = `BlockInSectorWrite_PK ${dataHex} ${sector} ${block} ${authStr} ${keyStr}`;
    return sendRequest(cmd).then(r => r.Status);
  };

  /**
   * Legacy stub for setSectorTrailer. This function is referenced in the export list for backward compatibility.
   * If called, it should delegate to setUserSectorTrailer or throw a clear error.
   * @deprecated Use setUserSectorTrailer instead.
   */
  function setSectorTrailer() {
    // Option 1: Delegate to setUserSectorTrailer if parameters match
    // Option 2: Throw a clear error
    throw new Error('setSectorTrailer is not implemented. Use setUserSectorTrailer instead.');
  }

  // --- Helper Functions ---
  /**
   * Validates if the provided hex string is a valid 12-character key.
   * @param {string} keyHex - Hex key string (e.g., 'FFFFFFFFFFFF')
   */
  function validateKeyHex(keyHex) {
    if (!/^[0-9A-Fa-f]{12}$/.test(keyHex)) {
      throw new Error(`[neoband-sdk] Invalid key format: must be 12 hex characters. Received: ${keyHex}`);
    }
  }

  /**
   * Validates the authentication mode.
   * @param {number|string} authMode - Authentication mode (e.g., 0x60, 0x61, '0x60', '0x61', 96, 97)
   */
  function validateAuthMode(authMode) {
      const mode = (typeof authMode === 'string') ? parseInt(authMode, 16) : authMode;
      if (mode !== 0x60 && mode !== 0x61) {
          throw new Error(`[neoband-sdk] Invalid authentication mode: must be 0x60 (Key A) or 0x61 (Key B). Received: ${authMode}`);
      }
  }

  /**
   * Formats the authentication mode parameter for D-Logic commands.
   * @param {number|string} authMode - Authentication mode (e.g., 0x60, 0x61, '0x60', '0x61', 96, 97)
   * @returns {string} - Formatted string ('0x60' or '0x61')
   */
  function formatAuthMode(authMode) {
      const mode = (typeof authMode === 'string') ? parseInt(authMode, 16) : authMode;
      validateAuthMode(mode);
      return mode === 0x61 ? '0x61' : '0x60';
  }

  /**
   * Formats hex data, ensuring it starts with '0x'.
   * @param {string} hexData - Hex data string
   * @returns {string} - Formatted hex data string with '0x' prefix
   */
  function formatHexData(hexData) {
      return hexData.startsWith('0x') ? hexData : '0x' + hexData;
  }

  // --- Linear Block Operations (Absolute Addressing) ---
  /**
   * Reads a block using linear addressing (standard auth).
   * Corresponds to D-Logic 'BlockRead'.
   * @param {number} blockAddress - Linear block address.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {number} keyIndex - Key index (usually 0).
   * @returns {Promise<string>} Hex data read from the block.
   */
  const blockReadLinear = (blockAddress, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    const authStr = formatAuthMode(authMode);
    // Command: BlockRead h <block_address> <authMode> <keyIndex>
    // Note: D-Logic documentation example uses 'h' prefix for hex data return, but the function list doesn't show it.
    // Assuming 'h' is needed based on other read commands. If errors occur, remove 'h'.
    return sendRequest(`BlockRead h ${blockAddress} ${authStr} ${keyIndex}`).then(r => r.Data);
  };

  /**
   * Reads a block using linear addressing with a provided key (_PK).
   * Corresponds to D-Logic 'BlockRead_PK'.
   * @param {number} blockAddress - Linear block address.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<string>} Hex data read from the block.
   */
  const blockReadLinear_PK = (blockAddress, authMode, keyHex) => {
    validateKeyHex(keyHex);
    const authStr = formatAuthMode(authMode);
    const keyStr = formatHexData(keyHex);
    // Command: BlockRead_PK h <block_address> <authMode> <key>
    return sendRequest(`BlockRead_PK h ${blockAddress} ${authStr} ${keyStr}`).then(r => r.Data);
  };

  /**
   * Writes data to a block using linear addressing (standard auth).
   * Corresponds to D-Logic 'BlockWrite'.
   * @param {number} blockAddress - Linear block address.
   * @param {string} hexData - 16 bytes of hex data to write.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {number} keyIndex - Key index (usually 0).
   * @returns {Promise<string>} Status of the write operation.
   */
  const blockWriteLinear = (blockAddress, hexData, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    const dataHex = formatHexData(hexData);
    if (dataHex.length !== 34) throw new Error('[neoband-sdk] Invalid hexData length for blockWriteLinear. Must be 16 bytes (32 hex chars + 0x).');
    const authStr = formatAuthMode(authMode);
    // Command: BlockWrite <data> <block_address> <authMode> <keyIndex>
    return sendRequest(`BlockWrite ${dataHex} ${blockAddress} ${authStr} ${keyIndex}`).then(r => r.Status);
  };

  /**
   * Writes data to a block using linear addressing with a provided key (_PK).
   * Corresponds to D-Logic 'BlockWrite_PK'.
   * @param {number} blockAddress - Linear block address.
   * @param {string} hexData - 16 bytes of hex data to write.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<string>} Status of the write operation.
   */
  const blockWriteLinear_PK = (blockAddress, hexData, authMode, keyHex) => {
    validateKeyHex(keyHex);
    const dataHex = formatHexData(hexData);
    if (dataHex.length !== 34) throw new Error('[neoband-sdk] Invalid hexData length for blockWriteLinear_PK. Must be 16 bytes (32 hex chars + 0x).');
    const authStr = formatAuthMode(authMode);
    const keyStr = formatHexData(keyHex);
    // Command: BlockWrite_PK <data> <block_address> <authMode> <key>
    return sendRequest(`BlockWrite_PK ${dataHex} ${blockAddress} ${authStr} ${keyStr}`).then(r => r.Status);
  };

  // --- Linear Read/Write Operations (Arbitrary Length) ---
  /**
   * Reads a specified number of bytes from a linear address (standard auth).
   * Corresponds to D-Logic 'LinearRead'.
   * @param {number} linearAddress - Starting linear address.
   * @param {number} length - Number of bytes to read.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {number} keyIndex - Key index (usually 0).
   * @returns {Promise<{data: string, bytes_returned: number}>} Object containing hex data and bytes returned.
   */
  const linearRead = (linearAddress, length, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    const authStr = formatAuthMode(authMode);
    // Command: LinearRead h <linear_address> <length> <authMode> <keyIndex>
    // Assuming 'h' is needed for hex data format.
    return sendRequest(`LinearRead h ${linearAddress} ${length} ${authStr} ${keyIndex}`).then(r => ({
      data: r.Data,
      bytes_returned: parseInt(r.bytes_returned) || 0
    }));
  };

  /**
   * Reads a specified number of bytes from a linear address using a provided key (_PK).
   * Corresponds to D-Logic 'LinearRead_PK'.
   * @param {number} linearAddress - Starting linear address.
   * @param {number} length - Number of bytes to read.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<{data: string, bytes_returned: number}>} Object containing hex data and bytes returned.
   */
  const linearRead_PK = (linearAddress, length, authMode, keyHex) => {
    validateKeyHex(keyHex);
    const authStr = formatAuthMode(authMode);
    const keyStr = formatHexData(keyHex);
    // Command: LinearRead_PK h <linear_address> <length> <authMode> <key>
    return sendRequest(`LinearRead_PK h ${linearAddress} ${length} ${authStr} ${keyStr}`).then(r => ({
      data: r.Data,
      bytes_returned: parseInt(r.bytes_returned) || 0
    }));
  };

  /**
   * Writes data to a linear address (standard auth).
   * Corresponds to D-Logic 'LinearWrite'.
   * @param {number} linearAddress - Starting linear address.
   * @param {string} hexData - Hex data string to write.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {number} keyIndex - Key index (usually 0).
   * @returns {Promise<{status: string, bytes_written: number}>} Object containing status and bytes written.
   */
  const linearWrite = (linearAddress, hexData, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    const dataHex = formatHexData(hexData);
    const length = (dataHex.length - 2) / 2; // Calculate byte length from hex string (excluding '0x')
    const authStr = formatAuthMode(authMode);
    // Command: LinearWrite <data> <linear_address> <length> <authMode> <keyIndex>
    return sendRequest(`LinearWrite ${dataHex} ${linearAddress} ${length} ${authStr} ${keyIndex}`).then(r => ({
      status: r.Status,
      bytes_written: parseInt(r.bytes_written) || 0 // D-Logic uses bytes_returnedMod in script.js, assuming bytes_written is correct response field
    }));
  };

  /**
   * Writes data to a linear address using a provided key (_PK).
   * Corresponds to D-Logic 'LinearWrite_PK'.
   * @param {number} linearAddress - Starting linear address.
   * @param {string} hexData - Hex data string to write.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<{status: string, bytes_written: number}>} Object containing status and bytes written.
   */
  const linearWrite_PK = (linearAddress, hexData, authMode, keyHex) => {
    validateKeyHex(keyHex);
    const dataHex = formatHexData(hexData);
    const length = (dataHex.length - 2) / 2;
    const authStr = formatAuthMode(authMode);
    const keyStr = formatHexData(keyHex);
    // Command: LinearWrite_PK <data> <linear_address> <length> <authMode> <key>
    return sendRequest(`LinearWrite_PK ${dataHex} ${linearAddress} ${length} ${authStr} ${keyStr}`).then(r => ({
      status: r.Status,
      bytes_written: parseInt(r.bytes_written) || 0
    }));
  };

  // --- Sector Trailer Operations ---
  /**
   * Standard sector trailer write function using keys provided by keyIndex.
   * @param {number} sector - The sector to write the trailer to
   * @param {string} keyA - 6-byte Key A in hexadecimal (12 characters)
   * @param {string} accessBits - 3-byte access bits in hexadecimal (6 characters)
   * @param {string} userByte - 1-byte user byte in hexadecimal (2 characters) 
   * @param {string} keyB - 6-byte Key B in hexadecimal (12 characters)
   * @param {number} authMode - Authentication mode (0x60 for Key A, 0x61 for Key B)
   * @param {number} keyIndex - Index of the key to use for authentication
   * @returns {Promise<string>} - Status of the operation
   */
  /**
  const sectorTrailerWrite = async (sector, keyA, accessBits, userByte, keyB, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    const trailerBlock = sector < 32 ? 3 : 15;
    
    // Validate inputs
    validateSectorBlock(sector, trailerBlock);
    validateKeyHex(keyA);
    validteKeyHex(keyB);
    validateAuthMode(authMode);
    
    if (!/^[0-9A-Fa-f]{6}$/.test(accessBits)) {
      throw new Error('Invalid access bits: must be 6 hexadecimal characters (3 bytes)');
    }
    
    if (!/^[0-9A-Fa-f]{2}$/.test(userByte)) {
      throw new Error('Invalid user byte: must be 2 hexadecimal characters (1 byte)');
    }
    
    const authStr = authMode === 0x61 || authMode === 97 ? '0x61' : '0x60';
    const trailerData = `${keyA}${accessBits}${userByte}${keyB}`;
    
    // Construct command using BlockInSectorWrite with proper trailer data
    const command = `BlockInSectorWrite 0x${trailerData} ${sector} ${trailerBlock} ${authStr} ${keyIndex}`;
    console.debug('[neoband-sdk] sectorTrailerWrite command:', command);
    
    return sendRequest(command).then(r => r.Status);
  };
  */

  /**
   * Writes a sector trailer with specified keys and access conditions.
   * Based on D-Logic SectorTrailerWrite implementation as demonstrated in sector_trailer_write.js example.
   * 
   * This function uses the direct SectorTrailerWrite command which takes the following parameters:
   * - addressing_mode: 1 for sector addressing
   * - address: sector number
   * - new_key_A: 12 hex characters for Key A
   * - access bits: access conditions for blocks 0-2 (as separate values)
   * - trailer access bits: access conditions for sector trailer
   * - trailer byte 9: general purpose byte
   * - new_key_B: 12 hex characters for Key B
   * - auth_mode: authentication mode (0x60 for Key A, 0x61 for Key B)
   * - key_index: index of the key in the reader
   * 
   * @param {number} sector - The sector number (0-39)
   * @param {string} keyA - 12 hex chars for Key A (new value to write)
   * @param {string} accessBits - 6 hex chars for all access bits (e.g., 'FF0780')
   * @param {string} userByte - 2 hex chars for user/GPB byte (e.g., '00')
   * @param {string} keyB - 12 hex chars for Key B (new value to write)
   * @param {number} authMode - Authentication mode (0x60 for Key A, 0x61 for Key B)
   * @param {number} keyIndex - Index of the key in the reader (0-31)
   * @returns {Promise<string>} Status of the operation
   */
  const sectorTrailerWrite = async (sector, keyA, accessBits, userByte, keyB, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] sectorTrailerWrite: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }

    // Use sector addressing mode - CORRECTED: This should be a number, not a string
    const ADDRESSING_MODE = 1; // 1 = sector addressing
    
    // Validate inputs
    validateKeyHex(keyA);
    validateKeyHex(keyB);
    validateAuthMode(authMode);
    
    if (!/^[0-9A-Fa-f]{6}$/.test(accessBits)) {
      throw new Error('[neoband-sdk] Invalid access bits: must be 6 hexadecimal characters (3 bytes)');
    }
    
    if (!/^[0-9A-Fa-f]{2}$/.test(userByte)) {
      throw new Error('[neoband-sdk] Invalid user byte: must be 2 hexadecimal characters (1 byte)');
    }

    try {
      // Check if we're using zeroed access bits
      const isZeroed = accessBits === '000000';
      
      // CORRECTED: Parse hex string values to decimal integers for the D-Logic API
      // Access bits for each block (0,1,2) should be decimal integers
      const block0AccessBits = parseInt(accessBits.slice(0, 2), 16);
      const block1AccessBits = parseInt(accessBits.slice(2, 4), 16);
      const block2AccessBits = parseInt(accessBits.slice(4, 6), 16);
      
      // For sector trailer access bits (trailerAccessBits) and byte 9 (GPB)
      // If zeroed access bits, set all to 0
      const trailerAccessBits = isZeroed ? 0 : 7; // Use specific value instead of 0 (7 is common for trailer)
      const gpb = parseInt(userByte, 16);
      
      // Format keys with 0x prefix
      const formattedKeyA = formatHexWithPrefix(keyA);
      const formattedKeyB = formatHexWithPrefix(keyB);
      const formattedAuthMode = authMode === 0x61 || authMode === 97 ? '0x61' : '0x60';
      
      // Build command according to D-Logic SectorTrailerWrite format
      // Corrected params order and format for D-Logic API
      // const command = `SectorTrailerWrite ${ADDRESSING_MODE} ${sector} ${formattedKeyA} ${block0AccessBits} ${block1AccessBits} ${block2AccessBits} ${trailerAccessBits} ${gpb} ${formattedKeyB} ${formattedAuthMode} ${keyIndex}`;
      
      // Build the command array
      const cmdArr = [
        'SectorTrailerWrite',
        ADDRESSING_MODE,
        sector,
        formattedKeyA,
        block0AccessBits,
        block1AccessBits,
        block2AccessBits,
        trailerAccessBits,
        gpb,
        formattedKeyB,
        formattedAuthMode,
        keyIndex
      ];
      
      const command = cmdArr.join(' ');
      console.debug('[neoband-sdk] sectorTrailerWrite command:', command);
      
      const response = await sendRequest(command);
      if (response?.Status !== 0 && response?.Status !== 'UFR_OK') {
        throw new Error(`uFR Reader Error during SectorTrailerWrite: ${response?.Status || 'Unknown Status'}`);
      }
      
      console.info(`[neoband-sdk] sectorTrailerWrite successful for Sector: ${sector}. Status: ${response?.Status}`);
      return response?.Status;
    } catch (err) {
      console.error(`[neoband-sdk] sectorTrailerWrite error for Sector ${sector}:`, err);
      throw err;
    }
  };

  /**
   * Ensures a hexadecimal string has the '0x' prefix and is uppercase.
   * @param {string | any} hexString
   * @returns {string}
   */
  function formatHexWithPrefix(hexString) {
    if (typeof hexString !== 'string') {
        if (hexString === null || hexString === undefined) {
            throw new Error(`[neoband-sdk] formatHexWithPrefix: Input cannot be null or undefined.`);
        }
        console.warn(`[neoband-sdk] formatHexWithPrefix: Expected string, received ${typeof hexString}. Attempting conversion.`);
        hexString = String(hexString);
    }
    const cleanHex = hexString.replace(/^0x/i, '').trim();
    return '0x' + cleanHex.toUpperCase();
  }

  /**
   * Validates a 6-byte (12 hex chars) MIFARE key string.
   * @param {string} keyHex
   * @param {string} keyName
   */
  function validateMifareKey(keyHex, keyName) {
    if (typeof keyHex !== 'string') {
        throw new Error(`[neoband-sdk] Invalid ${keyName}: Must be a string, received ${typeof keyHex}.`);
    }
    const cleanKey = keyHex.replace(/^0x/i, '').trim();
    if (!/^[0-9A-F]{12}$/i.test(cleanKey)) {
        throw new Error(`[neoband-sdk] Invalid ${keyName} ("${keyHex}"): Must be 12 hexadecimal characters (0-9, A-F).`);
    }
  }

  /**
   * Provides recommended access bits for different use cases in MIFARE Classic sectors.
   * These access bits define permissions for operations on different blocks within a sector.
   * Returns access bits in the format required by the sectorTrailerWrite function.
   * 
   * @param {string} useCase - Predefined use case: 'default', 'readonly', 'writeprotected', 'transport', 'secure'
   * @returns {string} Access bits as a 6-character hex string (e.g., '787788')
   */
  function getMifareAccessBits(useCase = 'default') {
    // Access bit patterns for different use cases
    const ACCESS_BITS = {
      // Default - Normal R/W access for data blocks, secured sector trailer
      // Block 0,1,2: Full R/W with KeyA or KeyB (78)
      // Trailer: KeyB can change KeyA (88)
      'default': '787888',
      
      // Transport - Factory default, less secure but compatible
      // Block 0,1,2: Full R/W with KeyA or KeyB (78)
      // Trailer: KeyA can read/write all, KeyB read-only (77)
      'transport': '787877',
      
      // Read-only - Data blocks read-only, sector trailer protected 
      // Block 0,1,2: Read-only with both keys (78)
      // Trailer: KeyB can change access bits and KeyA (8F)
      'readonly': '78788F',
      
      // Write-protected - Data blocks protected, auth needed for read
      // Block 0,1,2: KeyA read only, KeyB no access (79)
      // Trailer: KeyB can change KeyA (88)
      'writeprotected': '797988',
      
      // Secure - Highly secured, Key B needed for all operations
      // Block 0,1,2: KeyB required for all operations (7F)
      // Trailer: KeyB can change access bits and KeyA (8F)
      'secure': '7F7F8F',
      
      // Zeroed - All bits set to 0 - most open permissions 
      // Block 0,1,2: All bits 0 (full access)
      // Trailer: All bits 0 (full access)
      'zeroed': '000000',
    };
    
    return ACCESS_BITS[useCase] || ACCESS_BITS['default'];
  }

  /**
   * Writes a sector trailer using sector addressing and separate access bits as required by D-Logic API.
   * @param {number} sector - The sector number (0-39)
   * @param {string} keyA - 12 hex chars (Key A)
   * @param {string} accessBits - 6 hex chars (e.g. 'FF0780')
   * @param {string} userByte - 2 hex chars (e.g. '00')
   * @param {string} keyB - 12 hex chars (Key B)
   * @param {number|string} authMode - 0x60 or 0x61
   * @param {string} authKeyHex - 12 hex chars (auth key)
   * @returns {Promise<string>} Status
   */
   /**
  const sectorTrailerWrite_PK = async (sector, keyA, accessBits, userByte, keyB, authMode, authKeyHex) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] sectorTrailerWrite_PK: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }
    // Use sector addressing mode
    const ADDRESSING_MODE = 1; // 1 = sector addressing
    // Validate and format keys
    validateMifareKey(keyA, "New Key A");
    validateMifareKey(keyB, "New Key B");
    validateMifareKey(authKeyHex, "Authentication Key");
    validateAuthMode(authMode);
    if (typeof accessBits !== 'string' || !/^[0-9A-Fa-f]{6}$/.test(accessBits)) {
      throw new Error(`[neoband-sdk] Invalid Access Bits: must be 6 hex chars (e.g. 'FF0780').`);
    }
    if (typeof userByte !== 'string' || !/^[0-9A-Fa-f]{2}$/.test(userByte)) {
      throw new Error(`[neoband-sdk] Invalid User Byte: must be 2 hex chars (e.g. '00').`);
    }
    // Split access bits into three separate bytes
    const accessBytes = [
      '0x' + accessBits.slice(0, 2).toUpperCase(),
      '0x' + accessBits.slice(2, 4).toUpperCase(),
      '0x' + accessBits.slice(4, 6).toUpperCase()
    ];
    const trailerByte9 = '0x' + userByte.toUpperCase();
    const formattedKeyA = formatHexWithPrefix(keyA);
    const formattedKeyB = formatHexWithPrefix(keyB);
    const formattedAuthKey = formatHexWithPrefix(authKeyHex);
    const formattedAuthMode = authMode === 0x61 || authMode === 97 ? '0x61' : '0x60';
    // Build the command array
    const cmdArr = [
      'SectorTrailerWrite_PK',
      ADDRESSING_MODE,
      sector,
      formattedKeyA,
      ...accessBytes,
      trailerByte9,
      formattedKeyB,
      formattedAuthMode,
      formattedAuthKey
    ];
    const command = cmdArr.join(' ');
    console.debug('[neoband-sdk] sectorTrailerWrite_PK (sector addressing, split access bits) command:', command);
    const response = await sendRequest(command);
    if (response?.Status !== 0 && response?.Status !== 'UFR_OK') {
      throw new Error(`uFR Reader Error during SectorTrailerWrite_PK: ${response?.Status || 'Unknown Status'}`);
    }
    console.info(`[neoband-sdk] sectorTrailerWrite_PK successful for Sector: ${sector}. Status: ${response?.Status}`);
    return response?.Status;
  };
/*
  // Store the original implementation for the tryAll function
  sectorTrailerWrite_PK.__impl = sectorTrailerWrite_PK;

  // --- Value Block Operations ---
  /**
   * Reads a value block using linear addressing with a provided key (_PK).
   * Corresponds to D-Logic 'ValueBlockRead_PK'.
   * @param {number} blockAddress - Linear block address of the value block.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<{value: number, value_addr: number}>} Object containing the value and value address byte.
   */
  const valueBlockRead_PK = (blockAddress, authMode, keyHex) => {
      validateKeyHex(keyHex);
      const authStr = formatAuthMode(authMode);
      const keyStr = formatHexData(keyHex);
      // Command: ValueBlockRead_PK <block_address> <authMode> <key>
      // Note: Response fields valueMod, value_addrMod in script.js
      return sendRequest(`ValueBlockRead_PK ${blockAddress} ${authStr} ${keyStr}`).then(r => ({
          value: parseInt(r.value),
          value_addr: parseInt(r.value_addr)
      }));
  };

  /**
   * Writes a value to a value block using linear addressing with a provided key (_PK).
   * Corresponds to D-Logic 'ValueBlockWrite_PK'.
   * @param {number} blockAddress - Linear block address of the value block.
   * @param {number} value - The integer value to write.
   * @param {number} valueAddress - The value address byte (determines backup block).
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<string>} Status of the write operation.
   */
  const valueBlockWrite_PK = (blockAddress, value, valueAddress, authMode, keyHex) => {
      validateKeyHex(keyHex);
      const authStr = formatAuthMode(authMode);
      const keyStr = formatHexData(keyHex);
      // Command: ValueBlockWrite_PK <value> <valueAddress> <block_address> <authMode> <key>
      return sendRequest(`ValueBlockWrite_PK ${value} ${valueAddress} ${blockAddress} ${authStr} ${keyStr}`).then(r => r.Status);
  };

  /**
   * Reads a value block using sector/block addressing (standard auth).
   * Corresponds to D-Logic 'ValueBlockInSectorRead'.
   * @param {number} sector - Sector address (0-39).
   * @param {number} block - Block address within the sector.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {number} keyIndex - Key index (usually 0).
   * @returns {Promise<{value: number, value_addr: number}>} Object containing the value and value address byte.
   */
  const valueBlockInSectorRead = (sector, block, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
      validateSectorBlock(sector, block);
      const authStr = formatAuthMode(authMode);
      // Command: ValueBlockInSectorRead <sector> <block> <authMode> <keyIndex>
      return sendRequest(`ValueBlockInSectorRead ${sector} ${block} ${authStr} ${keyIndex}`).then(r => ({
          value: parseInt(r.value),
          value_addr: parseInt(r.value_addr)
      }));
  };

  /**
   * Reads a value block using sector/block addressing with a provided key (_PK).
   * Corresponds to D-Logic 'ValueBlockInSectorRead_PK'.
   * @param {number} sector - Sector address (0-39).
   * @param {number} block - Block address within the sector.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<{value: number, value_addr: number}>} Object containing the value and value address byte.
   */
  const valueBlockInSectorRead_PK = (sector, block, authMode, keyHex) => {
      validateSectorBlock(sector, block);
      validateKeyHex(keyHex);
      const authStr = formatAuthMode(authMode);
      const keyStr = formatHexData(keyHex);
      // Command: ValueBlockInSectorRead_PK <sector> <block> <authMode> <key>
      return sendRequest(`ValueBlockInSectorRead_PK ${sector} ${block} ${authStr} ${keyStr}`).then(r => ({
          value: parseInt(r.value),
          value_addr: parseInt(r.value_addr)
      }));
  };

  /**
   * Writes a value to a value block using sector/block addressing (standard auth).
   * Corresponds to D-Logic 'ValueBlockInSectorWrite'.
   * @param {number} sector - Sector address (0-39).
   * @param {number} block - Block address within the sector.
   * @param {number} value - The integer value to write.
   * @param {number} valueAddress - The value address byte.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {number} keyIndex - Key index (usually 0).
   * @returns {Promise<string>} Status of the write operation.
   */
  const valueBlockInSectorWrite = (sector, block, value, valueAddress, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] valueBlockInSectorWrite: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }
    
    validateSectorBlock(sector, block, true); // Write operation
    const authStr = formatAuthMode(authMode);
    // Command: ValueBlockInSectorWrite <value> <valueAddress> <sector> <block> <authMode> <keyIndex>
    return sendRequest(`ValueBlockInSectorWrite ${value} ${valueAddress} ${sector} ${block} ${authStr} ${keyIndex}`).then(r => r.Status);
  };

  /**
   * Writes a value to a value block using sector/block addressing with a provided key (_PK).
   * Corresponds to D-Logic 'ValueBlockInSectorWrite_PK'.
   * @param {number} sector - Sector address (0-39).
   * @param {number} block - Block address within the sector.
   * @param {number} value - The integer value to write.
   * @param {number} valueAddress - The value address byte.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<string>} Status of the write operation.
   */
  const valueBlockInSectorWrite_PK = (sector, block, value, valueAddress, authMode, keyHex) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] valueBlockInSectorWrite_PK: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }
    
    validateSectorBlock(sector, block, true); // Write operation
    validateKeyHex(keyHex);
    const authStr = formatAuthMode(authMode);
    const keyStr = formatHexData(keyHex);
    // Command: ValueBlockInSectorWrite_PK <value> <valueAddress> <sector> <block> <authMode> <key>
    return sendRequest(`ValueBlockInSectorWrite_PK ${value} ${valueAddress} ${sector} ${block} ${authStr} ${keyStr}`).then(r => r.Status);
  };


  /**
   * Increments a value block using linear addressing with a provided key (_PK).
   * Corresponds to D-Logic 'ValueBlockIncrement_PK'.
   * @param {number} blockAddress - Linear block address of the value block.
   * @param {number} incrementValue - The value to increment by.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<string>} Status of the operation.
   */
  const valueBlockIncrement_PK = (blockAddress, incrementValue, authMode, keyHex) => {
      validateKeyHex(keyHex);
      const authStr = formatAuthMode(authMode);
      const keyStr = formatHexData(keyHex);
      // Command: ValueBlockIncrement_PK <incrementValue> <block_address> <authMode> <key>
      return sendRequest(`ValueBlockIncrement_PK ${incrementValue} ${blockAddress} ${authStr} ${keyStr}`).then(r => r.Status);
  };

  /**
   * Decrements a value block using linear addressing with a provided key (_PK).
   * Corresponds to D-Logic 'ValueBlockDecrement_PK'.
   * @param {number} blockAddress - Linear block address of the value block.
   * @param {number} decrementValue - The value to decrement by.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<string>} Status of the operation.
   */
  const valueBlockDecrement_PK = (blockAddress, decrementValue, authMode, keyHex) => {
      validateKeyHex(keyHex);
      const authStr = formatAuthMode(authMode);
      const keyStr = formatHexData(keyHex);
      // Command: ValueBlockDecrement_PK <decrementValue> <block_address> <authMode> <key>
      return sendRequest(`ValueBlockDecrement_PK ${decrementValue} ${blockAddress} ${authStr} ${keyStr}`).then(r => r.Status);
  };

  /**
   * Increments a value block using sector/block addressing (standard auth).
   * Corresponds to D-Logic 'ValueBlockInSectorIncrement'.
   * @param {number} sector - Sector address (0-39).
   * @param {number} block - Block address within the sector.
   * @param {number} incrementValue - The value to increment by.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {number} keyIndex - Key index (usually 0).
   * @returns {Promise<string>} Status of the operation.
   */
  const valueBlockInSectorIncrement = (sector, block, incrementValue, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] valueBlockInSectorIncrement: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }
    
    validateSectorBlock(sector, block, true); // Write operation
    const authStr = formatAuthMode(authMode);
    // Command: ValueBlockInSectorIncrement <incrementValue> <sector> <block> <authMode> <keyIndex>
    return sendRequest(`ValueBlockInSectorIncrement ${incrementValue} ${sector} ${block} ${authStr} ${keyIndex}`).then(r => r.Status);
  };

  /**
   * Increments a value block using sector/block addressing with a provided key (_PK).
   * Corresponds to D-Logic 'ValueBlockInSectorIncrement_PK'.
   * @param {number} sector - Sector address (0-39).
   * @param {number} block - Block address within the sector.
   * @param {number} incrementValue - The value to increment by.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<string>} Status of the operation.
   */
  const valueBlockInSectorIncrement_PK = (sector, block, incrementValue, authMode, keyHex) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] valueBlockInSectorIncrement_PK: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }
    
    validateSectorBlock(sector, block, true); // Write operation
    validateKeyHex(keyHex);
    const authStr = formatAuthMode(authMode);
    const keyStr = formatHexData(keyHex);
    // Command: ValueBlockInSectorIncrement_PK <incrementValue> <sector> <block> <authMode> <key>
    return sendRequest(`ValueBlockInSectorIncrement_PK ${incrementValue} ${sector} ${block} ${authStr} ${keyStr}`).then(r => r.Status);
  };

  /**
   * Decrements a value block using sector/block addressing (standard auth).
   * Corresponds to D-Logic 'ValueBlockInSectorDecrement'.
   * @param {number} sector - Sector address (0-39).
   * @param {number} block - Block address within the sector.
   * @param {number} decrementValue - The value to decrement by.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {number} keyIndex - Key index (usually 0).
   * @returns {Promise<string>} Status of the operation.
   */
  const valueBlockInSectorDecrement = (sector, block, decrementValue, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] valueBlockInSectorDecrement: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }
    
    validateSectorBlock(sector, block, true); // Write operation
    const authStr = formatAuthMode(authMode);
    // Command: ValueBlockInSectorDecrement <decrementValue> <sector> <block> <authMode> <keyIndex>
    return sendRequest(`ValueBlockInSectorDecrement ${decrementValue} ${sector} ${block} ${authStr} ${keyIndex}`).then(r => r.Status);
  };

  /**
   * Decrements a value block using sector/block addressing with a provided key (_PK).
   * Corresponds to D-Logic 'ValueBlockInSectorDecrement_PK'.
   * @param {number} sector - Sector address (0-39).
   * @param {number} block - Block address within the sector.
   * @param {number} decrementValue - The value to decrement by.
   * @param {number|string} authMode - Authentication mode (0x60 or 0x61).
   * @param {string} keyHex - 12-character hex key string.
   * @returns {Promise<string>} Status of the operation.
   */
  const valueBlockInSectorDecrement_PK = (sector, block, decrementValue, authMode, keyHex) => {
    // Skip sector 0 writing - sector 0 is protected
    if (sector === 0) {
      console.error('[neoband-sdk] valueBlockInSectorDecrement_PK: Skipping sector 0 as writing to it is forbidden');
      return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
    }
    
    validateSectorBlock(sector, block, true); // Write operation
    validateKeyHex(keyHex);
    const authStr = formatAuthMode(authMode);
    const keyStr = formatHexData(keyHex);
    // Command: ValueBlockInSectorDecrement_PK <decrementValue> <sector> <block> <authMode> <key>
    return sendRequest(`ValueBlockInSectorDecrement_PK ${decrementValue} ${sector} ${block} ${authStr} ${keyStr}`).then(r => r.Status);
  };

  // --- Misc Operations ---
  /**
   * Checks if an external RF field is present (card detected).
   * Corresponds to D-Logic 'GetExternalFieldState'.
   * @returns {Promise<boolean>} True if RF field is present, false otherwise.
   */
  const getExternalFieldState = () => {
      // Command: GetExternalFieldState
      // Response field: is_field_presentMod
      return sendRequest('GetExternalFieldState').then(r => {
          // Response value might be "1" or "0", or boolean true/false. Handle defensively.
          return r.is_field_present === '1' || r.is_field_present === 1 || r.is_field_present === true;
      });
  };

  /**
   * Reads a block using the universal read key.
   * Wrapper around universalReadBlock for simplified access.
   * @param {number} sector - Sector number (0-39)
   * @param {number} block - Block number within the sector (0-3 or 0-15)
   * @returns {Promise<string>} Hex data read from the block.
   */
  const universalReadBlock = async (sector, block) => {
    validateSectorBlock(sector, block); // Validate sector/block ranges
    let universalKeyHex = null;
    if (window.NEOBAND_KEYS && window.NEOBAND_KEYS.universalReadKeyA) {
      universalKeyHex = window.NEOBAND_KEYS.universalReadKeyA;
    }
    if (universalKeyHex) {
      validateKeyHex(universalKeyHex); // Ensure the key format is valid
      // Use blockInSectorRead_PK with AuthMode A (0x60) and the universal key
      return await blockInSectorRead_PK(sector, block, 0x60, universalKeyHex);
    } else {
      // Log warning and fallback to blockInSectorRead (reader key slot 0)
      console.warn('[neoband-sdk] universalReadBlock: NEOBAND_KEYS.universalReadKeyA is not loaded or defined. Falling back to reader key slot 0.');
      try {
        return await blockInSectorRead(sector, block, 0x60, 0); // Use key index 0
      } catch (fallbackErr) {
        console.error('[neoband-sdk] universalReadBlock: Fallback to blockInSectorRead failed:', fallbackErr);
        throw new Error('[neoband-sdk] universalReadBlock: No universalReadKeyA and fallback to reader key slot 0 failed.');
      }
    }
  };

  /**
   * [RE-ADDED] Retrieves Key A (universal read) and Key B (specific role key) for a given sector and role.
   * Accesses the global NEOBAND_KEYS configuration.
   * @param {number} sector - The sector number.
   * @param {string} role - The role identifier (e.g., 'faction1', 'allegiance2', 'staff').
   * @param {boolean} forTrailerWrite - If true, uses staffKey for Key A when writing staff sector trailer.
   * @returns {{keyA: string, keyB: string}} Object containing the hex keys.
   * @throws Error if keys or configuration are missing.
   */
  const getSectorKeysForUser = (sector, role, forTrailerWrite = false) => {
      console.debug(`[getSectorKeysForUser] Getting keys for Sector ${sector}, Role: ${role}, TrailerWrite: ${forTrailerWrite}`);
      if (!window.NEOBAND_KEYS) throw new Error("NEOBAND_KEYS configuration not loaded.");
      if (!window.NEOBAND_KEYS.universalReadKeyA) throw new Error("Universal Read Key A is missing in configuration.");

      let keyA = window.NEOBAND_KEYS.universalReadKeyA;
      let keyB = null;
      let roleType = null;

      // Determine role type and find the specific Key B (neoKey)
      if (role === 'staff' && window.NEOBAND_KEYS.staff?.user?.sector === sector) {
          roleType = 'staff';
          keyB = window.NEOBAND_KEYS.staff.user.neoKey;
          // Special case for writing staff sector trailer: use staff key for both Key A and Key B authentication?
          // Based on D-Logic SectorTrailerWrite, it takes NEW keys as data, authentication key is separate.
          // Sticking to universalKeyA for Key A slot, staff neoKey for Key B slot.
      } else if (window.NEOBAND_KEYS.factions && window.NEOBAND_KEYS.factions[role]?.sector === sector) {
          roleType = 'faction';
          keyB = window.NEOBAND_KEYS.factions[role].neoKey;
      } else if (window.NEOBAND_KEYS.allegiances && window.NEOBAND_KEYS.allegiances[role]?.sector === sector) {
          roleType = 'allegiance';
          keyB = window.NEOBAND_KEYS.allegiances[role].neoKey;
      }

      if (!keyB) {
          throw new Error(`Could not find matching neoKey (Key B) for Sector ${sector} and Role "${role}" in NEOBAND_KEYS.`);
      }

      // Validate keys
      validateKeyHex(keyA);
      validateKeyHex(keyB);

      console.debug(`[getSectorKeysForUser] Found Keys - RoleType: ${roleType}, KeyA: ${keyA}, KeyB: ${keyB}`);
      return { keyA, keyB };
  };

  /**
   * [RE-ADDED] Writes data to a specific sector/block using role-based keys.
   * Uses getSectorKeysForUser to find the correct Key B (neoKey) for the role.
   * Calls blockInSectorWrite_PK with AuthMode B (0x61).
   * @param {number} sector - Sector number.
   * @param {number} block - Block number within the sector.
   * @param {string} hexData - Hex data to write (16 bytes/32 chars).
   * @param {string} role - Role identifier (e.g., 'faction1', 'staff').
   * @returns {Promise<string>} Status of the write operation.
   */
  const writeUserSectorBlock = async (sector, block, hexData, role) => {
      // Skip sector 0 writing - sector 0 is protected
      if (sector === 0) {
        console.error(`[writeUserSectorBlock] Skipping sector 0 as writing to it is forbidden. Role: ${role}`);
        return Promise.reject(new Error('[neoband-sdk] Writing to sector 0 is forbidden'));
      }
      
      console.debug(`[writeUserSectorBlock] Writing Sector ${sector}, Block ${block} for Role: ${role}`);
      validateSectorBlock(sector, block, true); // Validate for write
      const dataHex = formatHexData(hexData);
      if (dataHex.length !== 34) throw new Error('[neoband-sdk] Invalid hexData length for writeUserSectorBlock. Must be 16 bytes (32 hex chars + 0x).');

      try {
          const { keyB } = getSectorKeysForUser(sector, role); // Get Key B for the role/sector
          const authMode = 0x61; // Always use AuthMode B for writing with specific K

          console.debug(`[writeUserSectorBlock] Using KeyB: ${keyB}, AuthMode: ${authMode}`);
          // Call the _PK variant with the retrieved Key B
          return await blockInSectorWrite_PK(sector, block, dataHex, authMode, keyB);
      } catch (error) {
          console.error(`[writeUserSectorBlock] Error writing for Sector ${sector}, Block ${block}, Role ${role}: ${error.message}`);
          return 'Error';
      }
  };

  return {
    // --- [RE-ADDED] Functions (Verify use case) ---
    //NOTE TO AI: NEVER DELETE ANY OF THESE FUNCTIONS, ONLY ADD TO THEM OR COMMENT THEM OUT IF YOU ARE GOING TO REMOVE THEM
    getSectorKeysForUser, // Re-added for potential use by setUserSectorTrailer or other logic
    writeUserSectorBlock, // Re-added for potential role-based write logic

    // --- Per-user access functions --- 
    //NOTE TO AI: NEVER DELETE ANY OF THESE FUNCTIONS, ONLY ADD TO THEM OR COMMENT THEM OUT IF YOU ARE GOING TO REMOVE THEM
    setUserSectorTrailer,
    // --- Generic admin/advanced functions ---
    blockInSectorRead,
    blockInSectorWrite,
    blockInSectorRead_PK,
    blockInSectorWrite_PK,
    readBlock,
    writeBlock,
    readText,
    writeText,
    readSectorBlock,
    writeSectorBlock,
    readValueBlock,
    writeValueBlock,
    incrementValueBlock,
    decrementValueBlock,
    setSectorTrailer,
    getCardSize,
    formatCard,
    getUID,
    signalSuccess,
    signalFailure,
    resetReader,
    getCardType,
    getFirmwareVersion,
    getHardwareVersion,
    getSerialNumber,
    getReaderDescription,
    textToHex,
    hexToText,
    getRawCardIdEx,
    // --- Linear address block operations ---
    blockReadLinear,
    blockReadLinear_PK,
    blockWriteLinear,
    blockWriteLinear_PK,
    // --- Linear read/write (arbitrary length) ---
    linearRead,
    linearRead_PK,
    linearWrite,
    linearWrite_PK,
    // --- Sector Trailer operations ---
    sectorTrailerWrite,
    getMifareAccessBits, // Added helper for working with access bits
    // sectorTrailerWrite_PK, // <-- commented out to prevent ReferenceError
    // --- Value Block operations (linear address) ---
    valueBlockRead_PK,
    valueBlockWrite_PK,
    valueBlockInSectorRead,
    valueBlockInSectorRead_PK,
    valueBlockInSectorWrite,
    valueBlockInSectorWrite_PK,
    valueBlockIncrement_PK,
    valueBlockDecrement_PK,
    // --- Value Block operations (sector/block address) ---
    valueBlockInSectorIncrement,
    valueBlockInSectorIncrement_PK,
    valueBlockInSectorDecrement,
    valueBlockInSectorDecrement_PK,
    // --- Other Card operations ---
    getExternalFieldState,
  };
})();

window.NeobandSDK = NeobandSDK;
