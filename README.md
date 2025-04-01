# Neoband App

## 📡 Overview

Neoband App is a decentralized, browser-based interface that allows Neotropolis event staff, factions, and allegiances to interact with MIFARE Classic 4K NFC wristbands ("NeoBands") using a uFR Zero Online Lite NFC reader. The app provides a secure and flexible way to write and read gameplay data to attendees' NFC wristbands.

**Current Version:** 1.3.8

## 🎯 Purpose

This app is designed as a **support utility** for faction/allegiance gameplay at Neotropolis events. It is **not a game itself**, but rather a tool that enables various factions and allegiances to implement their own gameplay mechanics by storing and retrieving data on NFC wristbands.

## 🌟 Key Features

- **Fully Offline Operation** - No internet or server connection required
- **NFC Operations** - Read, write, and reset MIFARE Classic 4K tags
- **Multi-Page Interface** - Registration, Faction, and Allegiances pages
- **Customizable Fields** - 180 editable fields across all pages
- **Visual Feedback** - Real-time operation status and detailed logging
- **Memory Allocation Map** - Fixed sector organization for different data types
- **Authentication** - Uses default Key A (`FFFFFFFFFFFF`)
- **Local Logging** - Records all NFC operations with timestamps

## 💻 Technical Requirements

- **Hardware**: uFR Zero Online Lite ISO 14443 A/B Network NFC RFID Reader/Writer
- **Tag Type**: MIFARE Classic 4K NFC Tags
- **Browser**: Any modern web browser with JavaScript enabled

## 🧩 Memory Allocation

The MIFARE Classic 4K tag memory is organized into sectors with specific purposes:

| Sector Range | Purpose |
|--------------|---------|
| 0            | Manufacturer (UID – read-only) |
| 1–31         | Factions (gameplay data) |
| 16, 32–35    | Reserved (not used) |
| 36–38        | Allegiances (gameplay data) |
| 39           | User Data (username, registration, allegiance) |

## 📋 Pages and Functions

### Registration Page
- **New Username** - Set a username (max 16 characters)
- **Band ID** - View the scanned NFC tag UID
- **Status** - Check the registration status
- **Operations** - SCAN, READ, WRITE, RESET

### Faction Page
- **Username Display** - Shows the current band's username
- **Faction Fields** - 3 customizable fields per faction
- **Faction Labels** - Editable faction names and field labels
- **Operations** - SCAN, READ, WRITE

### Allegiances Page
- **Username Display** - Shows the current band's username
- **Allegiance Fields** - 15 customizable fields per allegiance
- **Allegiance Labels** - Editable allegiance names and field labels
- **Operations** - SCAN, READ, WRITE

## 🚀 Getting Started

[Review our How-To Guide Here](https://docs.google.com/document/d/1bFi-6NWa4vLLJbelL7uFwWb5oyBQPXJAxzsqne2sKtM/edit?usp=sharing)

## 📝 Logging

The app maintains detailed logs of all NFC operations:
- What key was used for authentication
- Authentication success confirmation
- Sector and block read/write operations
- Data written to the NFC tag
- Process completion status

Logs are stored locally and can be viewed through the UI by toggling the log display.

## 🔧 Technical Notes

- **Username Storage**: Uses block 240 (sector 39, block 0) with 16 character limit
- **Authentication**: Always uses default Key A (`FFFFFFFFFFFF`, key index 0)
- **Reader Limitations**: Cannot have folders; all files must be at root level with "app/" prefix

