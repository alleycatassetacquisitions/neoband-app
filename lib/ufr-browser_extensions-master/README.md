# UFR Browser extensions

uFR NFC reader browser extensions. This allows you to have direct communication with uFR Shell.

# Google Chrome browser installation

## Windows OS

1. Open Google Chrome browser
2. Navigate to chrome://extensions/
3. Enable Developer mode
4. Click on LOAD UNPACKED and select Chrome/Extension folder
5. Copy Ufr Chrome Extension ID
6. Close Google Chrome browser
7. Run "install-windows.bat" file from Chrome/Host folder
8. Paste previously copied ID when prompted
9. Run Example project from https://www.d-logic.net/code/nfc-rfid-reader-sdk/ufr-browser_extension-examples

## Linux OS

1. Open Google Chrome browser
2. Navigate to chrome://extensions/
3. Enable Developer mode
4. Click on LOAD UNPACKED and select Chrome/Extension folder
5. Copy Ufr Chrome Extension ID
6. Close Google Chrome browser
7. Run "install-linux" file from Chrome/Host folder
8. Enter "s" for system-wide installation or "l" for local user installation when promted
9. Paste previously copied ID when prompted
10. Run Example project from https://www.d-logic.net/code/nfc-rfid-reader-sdk/ufr-browser_extension-examples

# Google Chrome browser installation from store - **ONLY FOR BETA TESTERS**

## Windows OS

1. Open Google Chrome browser
2. Download and install "Browser extension for uFR Series NFC Readers" extension from Chrome store.
3. Run "Windows installer.exe" file from "Chrome/Store installers" folder and install host application.
4. If JavaScript application is running locally, "Allow access to file URLs" option must be enabled.

## Linux OS

1. Open Google Chrome browser
2. Download and install "Browser extension for uFR Series NFC Readers" extension from Chrome store.
3. Run "Linux installer" file from "Chrome/Store installers" folder and install host application.
4. If JavaScript application is running locally, "Allow access to file URLs" option must be enabled.


# Google Chromium browser installation

## Linux OS

1. Open Google Chromium browser
2. Navigate to chrome://extensions/
3. Enable Developer mode
4. Click on LOAD UNPACKED and select Chrome/Extension folder
5. Copy Ufr Chrome Extension ID
6. Navigate to chrome://settings/content/cookies and disable "Block third-party cookies" option
7. Close Google Chromium browser
8. Run "install-linux-chromium" file from Chrome/Host folder
9. Enter "s" for system-wide installation or "l" for local user installation when promted
10. Paste previously copied ID when prompted
11. Run Example project from https://www.d-logic.net/code/nfc-rfid-reader-sdk/ufr-browser_extension-examples

# Mozilla Firefox browser installation

## Windows OS

1. Run "install-windows.bat" file from Firefox/Host folder
2. Open	Mozilla Firefox browser
3. Navigate to about:debugging
4. Click on Load Temporary Add-on and select "manifest.json" Firefox/Extension folder
5. Run Example project from https://www.d-logic.net/code/nfc-rfid-reader-sdk/ufr-browser_extension-examples

## Linux OS

1. Run "install-linux" file from Firefox/Host folder
9. Enter "s" for system-wide installation or "l" for local user installation when promted
2. Open	Mozilla Firefox browser
3. Navigate to about:debugging
4. Click on Load Temporary Add-on and select "manifest.json" Firefox/Extension folder
5. Run Example project from https://www.d-logic.net/code/nfc-rfid-reader-sdk/ufr-browser_extension-examples

# Opera browser installation

## Windows OS

1. Open Opera browser
2. Navigate to chrome://extensions/
3. Enable Developer mode
4. Click on LOAD UNPACKED and select Opera/Extension folder
5. Copy Ufr Opera Extension ID
6. Close Opera browser
7. Run "install-windows.bat" file from Opera/Host folder
8. Paste previously copied ID when prompted
9. Run Example project from https://www.d-logic.net/code/nfc-rfid-reader-sdk/ufr-browser_extension-examples

## Linux OS

1. Open Google Chrome browser
2. Navigate to chrome://extensions/
3. Enable Developer mode
4. Click on LOAD UNPACKED and select Chrome/Extension folder
5. Copy Ufr Opera Extension ID
6. Close Opera browser
7. Run "install-linux" file from Opera/Host folder
8. Enter "s" for system-wide installation or "l" for local user installation when promted
9. Paste previously copied ID when prompted
10. Run Example project from https://www.d-logic.net/code/nfc-rfid-reader-sdk/ufr-browser_extension-examples

# Usage
NOTICE: As of v1.3 uFR Browser Extension, usage has been changed. 
New function uFR_Request(command) has been implemented and its usage is strongly suggested instead of ufRequest function.

Call uFR_Request function and pass "command" parameter as string that contains UFCoder function.
uFR_Request example:
```javascript
async function ufrTest() {
	let response = await uFR_Request("ReaderOpen");
}
```
Instead of using callback of ufRequest function to get data from our reader via extension, uFR_Request function will wait for 
command to finish and store data in functions assigned variable(e.g let response in this example).
uFR_Request is a Promise-based function which will wait for it to resolve, in other words, function will wait for data to be received from the reader with the 'await' keyword.

uFR Browser Extension v1.3 can still be used with ufRequest-ufResponse functions used in older extension implementations:
```javascript
uFRequest(command, function () {
	let response = uFResponse();	
})
```

NFC Reader Browser Extension document with details about extension usage along with code snippets can be found here:
https://www.d-logic.net/code/nfc-rfid-reader-sdk/ufr-doc
'NFC Reader Browser Extension.pdf' document.