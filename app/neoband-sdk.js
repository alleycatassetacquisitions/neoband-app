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
  
    function validateSectorBlock(sector, block, write = false) {
      if (sector < 0 || sector > MAX_SECTOR) throw new Error('Invalid sector: ' + sector);
      const maxBlock = MAX_BLOCKS_PER_SECTOR(sector);
      if (block < 0 || block >= maxBlock) throw new Error(`Invalid block ${block} for sector ${sector}`);
      if (write && (sector === 0 || block === maxBlock - 1)) {
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
      return sendRequest(`BlockRead ${sector} ${block} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Data);
    };
  
    const writeBlock = (sector, block, hexData) => {
      validateSectorBlock(sector, block, true);
      return sendRequest(`BlockWrite ${sector} ${block} ${hexData} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
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
  
    const linearRead = (start, length) => sendRequest(`LinearRead ${start} ${length} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Data);
    const linearWrite = (start, hexData) => sendRequest(`LinearWrite ${start} ${linearByteLength(hexData)} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX} ${hexData}`).then(r => r.Status);
  
    const readValueBlock = (block) => sendRequest(`ValueBlockRead ${block} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Data);
    const writeValueBlock = (block, value) => sendRequest(`ValueBlockWrite ${block} ${value} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
    const incrementValueBlock = (block, value) => sendRequest(`ValueBlockIncrement ${block} ${value} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
    const decrementValueBlock = (block, value) => sendRequest(`ValueBlockDecrement ${block} ${value} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
  
    const setSectorTrailer = (sector, keyA, keyB, acs = 'FF078069') => sendRequest(`SectorTrailerWrite 1 ${sector} ${keyA} ${acs} ${keyB} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
    const getCardSize = () => sendRequest('GetCardSize').then(r => r.Data);
    const formatCard = () => sendRequest(`LinearFormatCard ${DEFAULT_KEY} 0 0 0 ${DEFAULT_KEY} ${DEFAULT_AUTH} ${DEFAULT_KEY_INDEX}`).then(r => r.Status);
  
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
  
    return {
      readBlock,
      writeBlock,
      readText,
      writeText,
      readSectorBlock,
      writeSectorBlock,
      linearRead,
      linearWrite,
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
    };
  })();
  
  window.NeobandSDK = NeobandSDK;
  