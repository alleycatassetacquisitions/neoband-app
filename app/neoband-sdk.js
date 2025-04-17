/**
 * NeoBand SDK - Standalone
 * Works natively inside D-Logic uFR Zero Online environment (UDP mode).
 * No external dependencies or hardcoded IPs.
 * Auto-converts between text and hex.
 * Implements core NFC tag functionality with validation
 */

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
    if (write && (sector === 0 || block === maxBlocksPerSector - 1)) {
      throw new Error(`Write access denied to protected sector/block: sector ${sector}, block ${block}`);
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
   * Always uses standard access bits (FF078069).
   * NOTE: This function uses getSectorKeysForUser which was recently removed and re-added. Verify functionality if used.
   */
  const setUserSectorTrailer = async (sector, role) => {
    const { keyA, keyB } = getSectorKeysForUser(sector, role, true);
    const accessBits = 'FF078069';
    // Only allow admin or the assigned user to set their own sector trailer
    // Command uses keyA and keyB directly, but Neoband standard is often Key B (neoKey) + Auth B for writes.
    // D-Logic's SectorTrailerWrite might implicitly use Key A/B provided in the command for auth, OR default keys.
    // Reverting to original command structure: SectorTrailerWrite <address_mode> <address> <newKeyA> <accessBits6> <userByte1> <newKeyB> <authKeyIndex>
    // Using address_mode 0, authKeyIndex 0 as per D-Logic examples. Key B auth might require _PK variant.
    const accessBitsPart = accessBits.substring(0, 6);
    const userBytePart = accessBits.substring(6, 8);
    // Ensure keys are hex strings without '0x' prefix if sendRequest adds it, or add '0x' if needed.
    // Assuming sendRequest handles '0x' prefixing consistently or keys are already formatted.
    const command = `SectorTrailerWrite 0 ${sector} ${keyA} ${accessBitsPart} ${userBytePart} ${keyB} 0`;
    console.debug(`[neoband-sdk] setUserSectorTrailer: Command: ${command}`);
    return sendRequest(command).then(r => r.Status);
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
      console.debug('[neoband-sdk] formatCard: Starting card format using BlockInSectorWrite and SectorTrailerWrite_PK');
      // Default values
      const defaultBlockData = '00'.repeat(16); // 16 bytes of 0x00
      // Use Universal Read Key for Key A slot, Default Key for Key B slot initially.
      if (!window.NEOBAND_KEYS || !window.NEOBAND_KEYS.universalReadKeyA) {
        throw new Error('[neoband-sdk] formatCard: NEOBAND_KEYS.universalReadKeyA is not loaded or defined.');
      }
      const universalKeyA = window.NEOBAND_KEYS.universalReadKeyA;
      const initialKeyB = DEFAULT_KEY; // FFFFFFFFFFFF
      const defaultAccessBits = 'FF078069'; // Standard default access bits

      // Validate keys before proceeding
      validateKeyHex(universalKeyA);
      validateKeyHex(initialKeyB);

      // Format all sectors
      for (let sector = 0; sector <= MAX_SECTOR; sector++) {
        const blocks = (sector < 32) ? 4 : 16;
        // Write default data to all data blocks (skip trailer block)
        for (let block = 0; block < blocks - 1; block++) {
          try {
            await sendRequest(`BlockInSectorWrite 0x${defaultBlockData} ${sector} ${block} ${DEFAULT_AUTH_STR} ${DEFAULT_KEY_INDEX}`);
            console.debug(`[neoband-sdk] formatCard: Wrote default data to sector ${sector}, block ${block}`);
          } catch (err) {
            console.error(`[neoband-sdk] formatCard: Error writing to sector ${sector}, block ${block}:`, err);
            // Continue formatting other blocks
          }
        }
        // Write default keys and access bits to trailer block (D-Logic expects 6 parameters)
        const trailerBlock = (sector < 32) ? 3 : 15;
        try {
          // SectorTrailerWrite requires KeyA, AccessBits (first 6 bytes), UserByte (next 1 byte), KeyB
          // We use universalKeyA for the Key A slot and initialKeyB for the Key B slot.
          const accessBitsHex = defaultAccessBits.substring(0, 6); // e.g., FF0780
          const userByteHex = defaultAccessBits.substring(6, 8);   // e.g., 69

          // Use the PK variant for formatting, authenticating with the default FFFFFFFFFFFF key B (since Key A might not be default yet)
          // Use SectorTrailerWrite_PK, authenticating with the default key FFFFFFFFFFFF using Key B (0x61)

          // This assumes the card is either factory default OR the previous Key B was FFFFFFFFFFFF.

          // If Key B is unknown, formatting might fail. Robust formatting might require trying Key A auth first.

          const defaultAuthKey = DEFAULT_KEY; // FFFFFFFFFFFF

          const command = `SectorTrailerWrite_PK 0 ${sector} ${universalKeyA} ${accessBitsHex} ${userByteHex} ${initialKeyB} 0x61 ${defaultAuthKey}`;

          // DEBUG: Log the command being sent
          console.debug(`[neoband-sdk] formatCard: SectorTrailerWrite command for sector ${sector}: ${command}`);

          await sendRequest(command);
          // Original attempt using hardcoded DEFAULT_KEY for Key A slot:
          // await sendRequest(`SectorTrailerWrite 0 ${sector} ${DEFAULT_KEY} ${accessBitsPart} ${userBytePart} ${initialKeyB} 0`);

          console.debug(`[neoband-sdk] formatCard: Reset sector trailer for sector ${sector}, block ${trailerBlock} with KeyA=${universalKeyA}, KeyB=${initialKeyB}`);
        } catch (err) {
          console.error(`[neoband-sdk] formatCard: Error resetting sector trailer for sector ${sector}:`, err);
          // Continue formatting other sectors
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
   * Writes a sector trailer with specified keys and access bits (standard auth).
   * Corresponds to D-Logic 'SectorTrailerWrite'.
   * @param {number} sector - Sector address (0-39).
   * @param {string} keyA - New Key A (12 hex chars).
   * @param {string} accessBits - Access bits (e.g., 'FF0780' or 'FF078069'). 6 or 8 hex chars.
   * @param {string} userByte - User byte (usually '69' if using 8 hex char accessBits, otherwise part of accessBits). 2 hex chars.
   * @param {string} keyB - New Key B (12 hex chars).
   * @param {number|string} authMode - Authentication mode for the operation (0x60 or 0x61).
   * @param {number} keyIndex - Key index used for authentication (usually 0).
   * @returns {Promise<string>} Status of the write operation.
   */
  const sectorTrailerWrite = (sector, keyA, accessBits, userByte, keyB, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
    validateSectorBlock(sector, 0); // Validate sector only
    validateKeyHex(keyA);
    validateKeyHex(keyB);
    // Combine accessBits (6 hex) and userByte (2 hex) for validation
    const combinedAccess = accessBits + userByte;
    if (!/^[0-9A-Fa-f]{8}$/.test(combinedAccess)) throw new Error('[neoband-sdk] Invalid accessBits + userByte format: must be 8 hex characters total.');

    const newKeyAHex = formatHexData(keyA);
    const newKeyBHex = formatHexData(keyB);
    // D-Logic command expects separate Access Bits (6 hex) and User Byte (2 hex)
    const accessBitsPart = combinedAccess.substring(0, 6);
    const userBytePart = combinedAccess.substring(6, 8);

    // D-Logic script.js: SectorTrailerWrite adressMode adress newKeyA block0 block1 block2 sectorTrailAccessBits sectorTrailAccessByte newKeyB authMode keyIndex
    // Mapping: adressMode=1 (sector), adress=sector, newKeyA=keyA, block0..2=accessBits, sectorTrailAccessBits=userByte?, sectorTrailAccessByte=??, newKeyB=keyB
    // The D-Logic command seems complex and might have different interpretations or parameter orders depending on firmware/mode.
    // Example: SectorTrailerWrite 0 1 FFFFFFFFFFFF FF0780 69 FFFFFFFFFFFF 0
    // The command takes the *new* keys/access bits as data.
    // Authentication is handled separately by sendRequest (using authMode/keyIndex as defaults if not using PK variant).
    // Let's ensure the authMode/keyIndex parameters passed to this function are used for the authentication step if possible,
    // although sendRequest currently uses defaults. This might need refinement if auth requires specific keys.
    const command = `SectorTrailerWrite 0 ${sector} ${newKeyAHex} ${accessBitsPart} ${userBytePart} ${newKeyBHex} 0`; // Final 0 might be auth key index?
    console.debug('[neoband-sdk] sectorTrailerWrite command:', command);
    // This command likely requires prior authentication using authMode/keyIndex which sendRequest handles internally with defaults.
    // The function signature includes authMode/keyIndex, but they are not directly used in the command string here.
    // If authentication needs to use the provided authMode/keyIndex, sendRequest logic or the command string needs adjustment.
    return sendRequest(command).then(r => r.Status);
  };

  /**
   * Writes a sector trailer with specified keys and access bits using a provided key (_PK).
   * Corresponds to D-Logic 'SectorTrailerWrite_PK'.
   * @param {number} sector - Sector address (0-39).
   * @param {string} keyA - New Key A (12 hex chars).
   * @param {string} accessBits - Access bits (e.g., 'FF0780'). 6 hex chars.
   * @param {string} userByte - User byte (e.g., '69'). 2 hex chars.
   * @param {string} keyB - New Key B (12 hex chars).
   * @param {number|string} authMode - Authentication mode for the operation (0x60 or 0x61).
   * @param {string} authKeyHex - Key used for authentication (12 hex chars).
   * @returns {Promise<string>} Status of the write operation.
   */
  const sectorTrailerWrite_PK = (sector, keyA, accessBits, userByte, keyB, authMode, authKeyHex) => {
      validateSectorBlock(sector, 0); // Validate sector only
      validateKeyHex(keyA);
      validateKeyHex(keyB);
      validateKeyHex(authKeyHex);
      // Combine accessBits (6 hex) and userByte (2 hex) for validation
      const combinedAccess = accessBits + userByte;
      if (!/^[0-9A-Fa-f]{8}$/.test(combinedAccess)) throw new Error('[neoband-sdk] Invalid accessBits + userByte format: must be 8 hex characters total.');

      const newKeyAHex = formatHexData(keyA);
      const newKeyBHex = formatHexData(keyB);
      const accessBitsPart = combinedAccess.substring(0, 6);
      const userBytePart = combinedAccess.substring(6, 8);
      const authKeyStr = formatHexData(authKeyHex);
      const authModeStr = formatAuthMode(authMode);

      // D-Logic script.js: SectorTrailerWrite_PK adressMode adress newKeyA block0 block1 block2 sectorTrailAccessBits sectorTrailAccessByte newKeyB authMode key
      // Mapping attempt: SectorTrailerWrite_PK 0 <sector> <newKeyA> <accessBits6> <userByte1> <newKeyB> <authModeStr> <authKeyStr>
      // Note: D-Logic examples often use address_mode 0 for trailers. Let's use 0.
      const command = `SectorTrailerWrite_PK 0 ${sector} ${newKeyAHex} ${accessBitsPart} ${userBytePart} ${newKeyBHex} ${authModeStr} ${authKeyStr}`;
      console.debug('[neoband-sdk] sectorTrailerWrite_PK command:', command);
      return sendRequest(command).then(r => r.Status);
  };


  /**
   * Writes a sector trailer directly using a 16-byte hex string (standard auth). Unsafe, use with caution.
   * Corresponds to D-Logic 'SectorTrailerWriteUnsafe'.
   * @param {number} sector - Sector address (0-39).
   * @param {string} trailerHexData - 16 bytes (32 hex chars) for the sector trailer (KeyA + AccessBits/UserByte + KeyB).
   * @param {number|string} authMode - Authentication mode for the operation (0x60 or 0x61).
   * @param {number} keyIndex - Key index used for authentication (usually 0).
   * @returns {Promise<string>} Status of the write operation.
   */
  const sectorTrailerWriteUnsafe = (sector, trailerHexData, authMode = DEFAULT_AUTH, keyIndex = DEFAULT_KEY_INDEX) => {
      validateSectorBlock(sector, 0); // Validate sector only
      const trailerHex = formatHexData(trailerHexData);
      if (trailerHex.length !== 34) throw new Error('[neoband-sdk] Invalid trailerHexData length for sectorTrailerWriteUnsafe. Must be 16 bytes (32 hex chars + 0x).');
      const authStr = formatAuthMode(authMode);
      // Command: SectorTrailerWriteUnsafe <address_mode> <address> <trailer_data> <authMode> <keyIndex>
      // Assuming address_mode 0 for sector trailer.
      const command = `SectorTrailerWriteUnsafe 0 ${sector} ${trailerHex} ${authStr} ${keyIndex}`;
      console.debug('[neoband-sdk] sectorTrailerWriteUnsafe command:', command);
      return sendRequest(command).then(r => r.Status);
  };

  /**
   * Writes a sector trailer directly using a 16-byte hex string with a provided key (_PK). Unsafe, use with caution.
   * Corresponds to D-Logic 'SectorTrailerWriteUnsafe_PK'.
   * @param {number} sector - Sector address (0-39).
   * @param {string} trailerHexData - 16 bytes (32 hex chars) for the sector trailer.
   * @param {number|string} authMode - Authentication mode for the operation (0x60 or 0x61).
   * @param {string} authKeyHex - Key used for authentication (12 hex chars).
   * @returns {Promise<string>} Status of the write operation.
   */
  const sectorTrailerWriteUnsafe_PK = (sector, trailerHexData, authMode, authKeyHex) => {
      validateSectorBlock(sector, 0); // Validate sector only
      validateKeyHex(authKeyHex);
      const trailerHex = formatHexData(trailerHexData);
       if (trailerHex.length !== 34) throw new Error('[neoband-sdk] Invalid trailerHexData length for sectorTrailerWriteUnsafe_PK. Must be 16 bytes (32 hex chars + 0x).');
      const authStr = formatAuthMode(authMode);
      const keyStr = formatHexData(authKeyHex);
      // Command: SectorTrailerWriteUnsafe_PK <address_mode> <address> <trailer_data> <authMode> <key>
      const command = `SectorTrailerWriteUnsafe_PK 0 ${sector} ${trailerHex} ${authStr} ${keyStr}`;
      console.debug('[neoband-sdk] sectorTrailerWriteUnsafe_PK command:', command);
      return sendRequest(command).then(r => r.Status);
  };

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
    if (!window.NEOBAND_KEYS || !window.NEOBAND_KEYS.universalReadKeyA) {
      throw new Error('[neoband-sdk] universalReadBlock: NEOBAND_KEYS.universalReadKeyA is not loaded or defined.');
    }
    const universalKeyHex = window.NEOBAND_KEYS.universalReadKeyA;
    validateKeyHex(universalKeyHex); // Ensure the key format is valid

    // Use blockInSectorRead_PK with AuthMode A (0x60) and the universal key
    return await blockInSectorRead_PK(sector, block, 0x60, universalKeyHex);
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
          keyB = window.NEOBAND_KEYS.staff.user.neokey;
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
      console.debug(`[writeUserSectorBlock] Writing Sector ${sector}, Block ${block} for Role: ${role}`);
      validateSectorBlock(sector, block, true); // Validate for write
      const dataHex = formatHexData(hexData);
      if (dataHex.length !== 34) throw new Error('[neoband-sdk] Invalid hexData length for writeUserSectorBlock. Must be 16 bytes (32 hex chars + 0x).');

      try {
          const { keyB } = getSectorKeysForUser(sector, role); // Get Key B for the role/sector
          const authMode = 0x61; // Always use AuthMode B for writing with specific neoKey

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
    getSectorKeysForUser, // Re-added for potential use by setUserSectorTrailer or other logic
    writeUserSectorBlock, // Re-added for potential role-based write logic

    // --- Per-user access functions ---
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
    sectorTrailerWrite_PK,
    sectorTrailerWriteUnsafe,
    sectorTrailerWriteUnsafe_PK,
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
