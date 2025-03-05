
# uFCoder libraries

Scope of this project are libraries used with **uFR** and **uFR Zero** Series devices and SDK examples. 
Libraries are supported at following platforms:
Windows 32 and 64 bit (static and dynamic)
Linux 32 and 64 bit (dynamic & static)
Linux ARM and ARM-HF (dynamic & static)
Mac OSX 64 bit & Universal (dynamic only)
iOS 64 bit (static & framework)
Android ARM 64 bit (.aar)
ESP32 ESP-IDF component

## Getting Started

Download project, choose appropriate architecture and place a library in appropriate directory.
Consult documentation for [API reference](https://code.d-logic.com/nfc-rfid-reader-sdk/ufr-doc/-/blob/master/uFR_Series_NFC_reader_API.pdf). For quick insight and functions' prototypes, check **/include/ufCoder.h** header file. 

### Prerequisites

[**uFR**](https://webshop.d-logic.com/products/nfc-rfid-reader-writer/ufr-series-dev-tools-with-sdk.html) or [**uFR Zero**](https://webshop.d-logic.com/products/nfc-rfid-reader-writer/ufr-zero-series.html) Series reader.

## License

See the [uFR_library_license.md](/license/uFR_library_license.md) file for details

## Acknowledgments

* Libraries are specific to mentioned hardware ONLY and some other hardware might have different approach, please bear that in mind.  

## Changelog

### [Version 6.0.8] - 2025-02-18

### General Changes

-  **API Updates:**

-  *ReaderOpen()* algorithm updated and refactored. Updated support for **uFR Zero** UART readers and **Online** series readers, additional support on **Android** platform. See [Android](#Android) section for more details.

-  *GetCardManufacturer()* function signature restored in `uFCoder.h`.

### Platform-Specific Changes

#### Windows

- Fixed crashing issue with `FTD2XX.dll` dependency loading in 32bit executables.

- Fixed crashing issue on 64bit executables with *ULC_** API functions.

-  *ReaderOpenEx()* closure before retrying to establish connection fixed.


#### Android

- Expanded support in *ReaderOpen()* for all of the **uFR Zero** series readers. Connecting to latest hardware versions supported via OTG cable.

- USB OTG read/write issue with packets larger than 60 bytes resolved, improved transfer speed.