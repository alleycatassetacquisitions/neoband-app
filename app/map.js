/**
 * map.js - Memory Map Definition for the Neoband App
 * 
 * This file defines the complete MIFARE Classic 4K memory layout used by the Neoband App.
 * It specifies the exact sectors, blocks, and fields for all data storage in the application.
 * 
 * Memory Layout Overview:
 * - 30 Factions (Sectors 1-30): Each with 3 fields stored in blocks 0-2 within its sector
 * - 3 Allegiances (Sectors 36-38): Each with 15 fields (spread across multiple blocks)
 * - User registration data (Sector 39): Contains username and other user-specific fields
 * 
 * Technical Notes:
 * - All operations use the standard key "FFFFFFFFFFFF" for authentication
 * - Sector trailers (block 3 in each sector, or block 15 in large sectors) are not used for data
 * - Sector 0 (manufacturer data), Sector 16 (MAD), and Sectors 32-35 are reserved
 * - Each field specifies its sector, block, key, and metadata for UI display
 * 
 * This memory map ensures consistent data storage across the application and
 * allows the app to locate and manage specific fields on the MIFARE Classic 4K tag.
 */

/**
 * Common NFC authentication key used for all fields.
 * This is the factory default key (FF FF FF FF FF FF) for MIFARE Classic.
 * @constant {string}
 */
const NFC_KEY = "FFFFFFFFFFFF"; // Common NFC key used for all fields

/**
 * Complete field map defining all data storage locations on the MIFARE Classic 4K tag.
 * This object acts as a comprehensive schema for the entire tag's memory usage.
 * Each entry specifies a category of data with its location and attributes.
 * 
 * Structure:
 * - factions: 30 faction objects, each with 3 fields
 * - allegiances: 3 allegiance objects, each with 15 fields
 * - userData: Fields for user registration data (username, etc.)
 * 
 * Each field contains:
 * - title: Human-readable field name displayed in the UI
 * - placeholder: Text shown when field is empty
 * - block: Relative block number within its sector
 * - key: Authentication key for reading/writing this field
 * 
 * @type {Object}
 */
const FIELD_MAP = {
  factions: {
    faction1: {
      name: "Alleycat",
      sector: 1,
      fields: {
        field1: { title: "Hunter/Bounty", placeholder: "Enter Hunter/Bounty", block: 0, key: NFC_KEY }, // Block ID 4
        field2: { title: "# of Wins", placeholder: "Enter # of wins", block: 1, key: NFC_KEY }, // Block ID 5
        field3: { title: "Best Draw Time", placeholder: "Enter Best Draw Time", block: 2, key: NFC_KEY } // Block ID 6
      }
    },
    faction2: {
      name: "Faction #2",
      sector: 2,
      fields: {
        field1: { title: "Faction #2 Field #1", placeholder: "Faction #2 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 8
        field2: { title: "Faction #2 Field #2", placeholder: "Faction #2 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 9
        field3: { title: "Faction #2 Field #3", placeholder: "Faction #2 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 10
      }
    },
    faction3: {
      name: "Faction #3",
      sector: 3,
      fields: {
        field1: { title: "Faction #3 Field #1", placeholder: "Faction #3 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 12
        field2: { title: "Faction #3 Field #2", placeholder: "Faction #3 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 13
        field3: { title: "Faction #3 Field #3", placeholder: "Faction #3 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 14
      }
    },
    faction4: {
      name: "Faction #4",
      sector: 4,
      fields: {
        field1: { title: "Faction #4 Field #1", placeholder: "Faction #4 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 16
        field2: { title: "Faction #4 Field #2", placeholder: "Faction #4 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 17
        field3: { title: "Faction #4 Field #3", placeholder: "Faction #4 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 18
      }
    },
    faction5: {
      name: "Faction #5",
      sector: 5,
      fields: {
        field1: { title: "Faction #5 Field #1", placeholder: "Faction #5 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 20
        field2: { title: "Faction #5 Field #2", placeholder: "Faction #5 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 21
        field3: { title: "Faction #5 Field #3", placeholder: "Faction #5 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 22
      }
    },
    faction6: {
      name: "Faction #6",
      sector: 6,
      fields: {
        field1: { title: "Faction #6 Field #1", placeholder: "Faction #6 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 24
        field2: { title: "Faction #6 Field #2", placeholder: "Faction #6 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 25
        field3: { title: "Faction #6 Field #3", placeholder: "Faction #6 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 26
      }
    },
    faction7: {
      name: "Faction #7",
      sector: 7,
      fields: {
        field1: { title: "Faction #7 Field #1", placeholder: "Faction #7 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 28
        field2: { title: "Faction #7 Field #2", placeholder: "Faction #7 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 29
        field3: { title: "Faction #7 Field #3", placeholder: "Faction #7 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 30
      }
    },
    faction8: {
      name: "Faction #8",
      sector: 8,
      fields: {
        field1: { title: "Faction #8 Field #1", placeholder: "Faction #8 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 32
        field2: { title: "Faction #8 Field #2", placeholder: "Faction #8 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 33
        field3: { title: "Faction #8 Field #3", placeholder: "Faction #8 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 34
      }
    },
    faction9: {
      name: "Faction #9",
      sector: 9,
      fields: {
        field1: { title: "Faction #9 Field #1", placeholder: "Faction #9 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 36
        field2: { title: "Faction #9 Field #2", placeholder: "Faction #9 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 37
        field3: { title: "Faction #9 Field #3", placeholder: "Faction #9 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 38
      }
    },
    faction10: {
      name: "Faction #10",
      sector: 10,
      fields: {
        field1: { title: "Faction #10 Field #1", placeholder: "Faction #10 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 40
        field2: { title: "Faction #10 Field #2", placeholder: "Faction #10 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 41
        field3: { title: "Faction #10 Field #3", placeholder: "Faction #10 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 42
      }
    },
    faction11: {
      name: "Faction #11",
      sector: 11,
      fields: {
        field1: { title: "Faction #11 Field #1", placeholder: "Faction #11 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 44
        field2: { title: "Faction #11 Field #2", placeholder: "Faction #11 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 45
        field3: { title: "Faction #11 Field #3", placeholder: "Faction #11 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 46
      }
    },
    faction12: {
      name: "Faction #12",
      sector: 12,
      fields: {
        field1: { title: "Faction #12 Field #1", placeholder: "Faction #12 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 48
        field2: { title: "Faction #12 Field #2", placeholder: "Faction #12 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 49
        field3: { title: "Faction #12 Field #3", placeholder: "Faction #12 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 50
      }
    },
    faction13: {
      name: "Faction #13",
      sector: 13,
      fields: {
        field1: { title: "Faction #13 Field #1", placeholder: "Faction #13 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 52
        field2: { title: "Faction #13 Field #2", placeholder: "Faction #13 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 53
        field3: { title: "Faction #13 Field #3", placeholder: "Faction #13 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 54
      }
    },
    faction14: {
      name: "Faction #14",
      sector: 14,
      fields: {
        field1: { title: "Faction #14 Field #1", placeholder: "Faction #14 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 56
        field2: { title: "Faction #14 Field #2", placeholder: "Faction #14 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 57
        field3: { title: "Faction #14 Field #3", placeholder: "Faction #14 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 58
      }
    },
    faction15: {
      name: "Faction #15",
      sector: 15,
      fields: {
        field1: { title: "Faction #15 Field #1", placeholder: "Faction #15 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 60
        field2: { title: "Faction #15 Field #2", placeholder: "Faction #15 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 61
        field3: { title: "Faction #15 Field #3", placeholder: "Faction #15 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 62
      }
    },
    // Sector 16 is skipped as per CSV
    faction16: {
      name: "Faction #16",
      sector: 17,
      fields: {
        field1: { title: "Faction #16 Field #1", placeholder: "Faction #16 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 68
        field2: { title: "Faction #16 Field #2", placeholder: "Faction #16 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 69
        field3: { title: "Faction #16 Field #3", placeholder: "Faction #16 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 70
      }
    },
    faction17: {
      name: "Faction #17",
      sector: 18,
      fields: {
        field1: { title: "Faction #17 Field #1", placeholder: "Faction #17 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 72
        field2: { title: "Faction #17 Field #2", placeholder: "Faction #17 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 73
        field3: { title: "Faction #17 Field #3", placeholder: "Faction #17 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 74
      }
    },
    faction18: {
      name: "Faction #18",
      sector: 19,
      fields: {
        field1: { title: "Faction #18 Field #1", placeholder: "Faction #18 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 76
        field2: { title: "Faction #18 Field #2", placeholder: "Faction #18 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 77
        field3: { title: "Faction #18 Field #3", placeholder: "Faction #18 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 78
      }
    },
    faction19: {
      name: "Faction #19",
      sector: 20,
      fields: {
        field1: { title: "Faction #19 Field #1", placeholder: "Faction #19 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 80
        field2: { title: "Faction #19 Field #2", placeholder: "Faction #19 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 81
        field3: { title: "Faction #19 Field #3", placeholder: "Faction #19 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 82
      }
    },
    faction20: {
      name: "Faction #20",
      sector: 21,
      fields: {
        field1: { title: "Faction #20 Field #1", placeholder: "Faction #20 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 84
        field2: { title: "Faction #20 Field #2", placeholder: "Faction #20 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 85
        field3: { title: "Faction #20 Field #3", placeholder: "Faction #20 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 86
      }
    },
    faction21: {
      name: "Faction #21",
      sector: 22,
      fields: {
        field1: { title: "Faction #21 Field #1", placeholder: "Faction #21 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 88
        field2: { title: "Faction #21 Field #2", placeholder: "Faction #21 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 89
        field3: { title: "Faction #21 Field #3", placeholder: "Faction #21 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 90
      }
    },
    faction22: {
      name: "Faction #22",
      sector: 23,
      fields: {
        field1: { title: "Faction #22 Field #1", placeholder: "Faction #22 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 92
        field2: { title: "Faction #22 Field #2", placeholder: "Faction #22 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 93
        field3: { title: "Faction #22 Field #3", placeholder: "Faction #22 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 94
      }
    },
    faction23: {
      name: "Faction #23",
      sector: 24,
      fields: {
        field1: { title: "Faction #23 Field #1", placeholder: "Faction #23 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 96
        field2: { title: "Faction #23 Field #2", placeholder: "Faction #23 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 97
        field3: { title: "Faction #23 Field #3", placeholder: "Faction #23 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 98
      }
    },
    faction24: {
      name: "Faction #24",
      sector: 25,
      fields: {
        field1: { title: "Faction #24 Field #1", placeholder: "Faction #24 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 100
        field2: { title: "Faction #24 Field #2", placeholder: "Faction #24 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 101
        field3: { title: "Faction #24 Field #3", placeholder: "Faction #24 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 102
      }
    },
    faction25: {
      name: "Faction #25",
      sector: 26,
      fields: {
        field1: { title: "Faction #25 Field #1", placeholder: "Faction #25 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 104
        field2: { title: "Faction #25 Field #2", placeholder: "Faction #25 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 105
        field3: { title: "Faction #25 Field #3", placeholder: "Faction #25 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 106
      }
    },
    faction26: {
      name: "Faction #26",
      sector: 27,
      fields: {
        field1: { title: "Faction #26 Field #1", placeholder: "Faction #26 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 108
        field2: { title: "Faction #26 Field #2", placeholder: "Faction #26 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 109
        field3: { title: "Faction #26 Field #3", placeholder: "Faction #26 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 110
      }
    },
    faction27: {
      name: "Faction #27",
      sector: 28,
      fields: {
        field1: { title: "Faction #27 Field #1", placeholder: "Faction #27 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 112
        field2: { title: "Faction #27 Field #2", placeholder: "Faction #27 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 113
        field3: { title: "Faction #27 Field #3", placeholder: "Faction #27 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 114
      }
    },
    faction28: {
      name: "Faction #28",
      sector: 29,
      fields: {
        field1: { title: "Faction #28 Field #1", placeholder: "Faction #28 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 116
        field2: { title: "Faction #28 Field #2", placeholder: "Faction #28 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 117
        field3: { title: "Faction #28 Field #3", placeholder: "Faction #28 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 118
      }
    },
    faction29: {
      name: "Faction #29",
      sector: 30,
      fields: {
        field1: { title: "Faction #29 Field #1", placeholder: "Faction #29 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 120
        field2: { title: "Faction #29 Field #2", placeholder: "Faction #29 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 121
        field3: { title: "Faction #29 Field #3", placeholder: "Faction #29 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 122
      }
    },
    faction30: {
      name: "Faction #30",
      sector: 31,
      fields: {
        field1: { title: "Faction #30 Field #1", placeholder: "Faction #30 Field #1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 124
        field2: { title: "Faction #30 Field #2", placeholder: "Faction #30 Field #2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 125
        field3: { title: "Faction #30 Field #3", placeholder: "Faction #30 Field #3 Placeholder", block: 2, key: NFC_KEY } // Block ID 126
      }
    }
  },
  allegiances: {
    allegiance1: {
      name: "Endline",
      sector: 36,
      fields: {
        field1: { title: "Allegiance #1 Field 1", placeholder: "Allegiance #1 Field 1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 192
        field2: { title: "Allegiance #1 Field 2", placeholder: "Allegiance #1 Field 2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 193
        field3: { title: "Allegiance #1 Field 3", placeholder: "Allegiance #1 Field 3 Placeholder", block: 2, key: NFC_KEY }, // Block ID 194
        field4: { title: "Allegiance #1 Field 4", placeholder: "Allegiance #1 Field 4 Placeholder", block: 3, key: NFC_KEY }, // Block ID 195
        field5: { title: "Allegiance #1 Field 5", placeholder: "Allegiance #1 Field 5 Placeholder", block: 4, key: NFC_KEY }, // Block ID 196
        field6: { title: "Allegiance #1 Field 6", placeholder: "Allegiance #1 Field 6 Placeholder", block: 5, key: NFC_KEY }, // Block ID 197
        field7: { title: "Allegiance #1 Field 7", placeholder: "Allegiance #1 Field 7 Placeholder", block: 6, key: NFC_KEY }, // Block ID 198
        field8: { title: "Allegiance #1 Field 8", placeholder: "Allegiance #1 Field 8 Placeholder", block: 7, key: NFC_KEY }, // Block ID 199
        field9: { title: "Allegiance #1 Field 9", placeholder: "Allegiance #1 Field 9 Placeholder", block: 8, key: NFC_KEY }, // Block ID 200
        field10: { title: "Allegiance #1 Field 10", placeholder: "Allegiance #1 Field 10 Placeholder", block: 9, key: NFC_KEY }, // Block ID 201
        field11: { title: "Allegiance #1 Field 11", placeholder: "Allegiance #1 Field 11 Placeholder", block: 10, key: NFC_KEY }, // Block ID 202
        field12: { title: "Allegiance #1 Field 12", placeholder: "Allegiance #1 Field 12 Placeholder", block: 11, key: NFC_KEY }, // Block ID 203
        field13: { title: "Allegiance #1 Field 13", placeholder: "Allegiance #1 Field 13 Placeholder", block: 12, key: NFC_KEY }, // Block ID 204
        field14: { title: "Allegiance #1 Field 14", placeholder: "Allegiance #1 Field 14 Placeholder", block: 13, key: NFC_KEY }, // Block ID 205
        field15: { title: "Allegiance #1 Field 15", placeholder: "Allegiance #1 Field 15 Placeholder", block: 14, key: NFC_KEY } // Block ID 206
      }
    },
    allegiance2: {
      name: "Helix",
      sector: 37,
      fields: {
        field1: { title: "Allegiance #2 Field 1", placeholder: "Allegiance #2 Field 1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 208
        field2: { title: "Allegiance #2 Field 2", placeholder: "Allegiance #2 Field 2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 209
        field3: { title: "Allegiance #2 Field 3", placeholder: "Allegiance #2 Field 3 Placeholder", block: 2, key: NFC_KEY }, // Block ID 210
        field4: { title: "Allegiance #2 Field 4", placeholder: "Allegiance #2 Field 4 Placeholder", block: 3, key: NFC_KEY }, // Block ID 211
        field5: { title: "Allegiance #2 Field 5", placeholder: "Allegiance #2 Field 5 Placeholder", block: 4, key: NFC_KEY }, // Block ID 212
        field6: { title: "Allegiance #2 Field 6", placeholder: "Allegiance #2 Field 6 Placeholder", block: 5, key: NFC_KEY }, // Block ID 213
        field7: { title: "Allegiance #2 Field 7", placeholder: "Allegiance #2 Field 7 Placeholder", block: 6, key: NFC_KEY }, // Block ID 214
        field8: { title: "Allegiance #2 Field 8", placeholder: "Allegiance #2 Field 8 Placeholder", block: 7, key: NFC_KEY }, // Block ID 215
        field9: { title: "Allegiance #2 Field 9", placeholder: "Allegiance #2 Field 9 Placeholder", block: 8, key: NFC_KEY }, // Block ID 216
        field10: { title: "Allegiance #2 Field 10", placeholder: "Allegiance #2 Field 10 Placeholder", block: 9, key: NFC_KEY }, // Block ID 217
        field11: { title: "Allegiance #2 Field 11", placeholder: "Allegiance #2 Field 11 Placeholder", block: 10, key: NFC_KEY }, // Block ID 218
        field12: { title: "Allegiance #2 Field 12", placeholder: "Allegiance #2 Field 12 Placeholder", block: 11, key: NFC_KEY }, // Block ID 219
        field13: { title: "Allegiance #2 Field 13", placeholder: "Allegiance #2 Field 13 Placeholder", block: 12, key: NFC_KEY }, // Block ID 220
        field14: { title: "Allegiance #2 Field 14", placeholder: "Allegiance #2 Field 14 Placeholder", block: 13, key: NFC_KEY }, // Block ID 221
        field15: { title: "Allegiance #2 Field 15", placeholder: "Allegiance #2 Field 15 Placeholder", block: 14, key: NFC_KEY } // Block ID 222
      }
    },
    allegiance3: {
      name: "The Resistance",
      sector: 38,
      fields: {
        field1: { title: "Allegiance #3 Field 1", placeholder: "Allegiance #3 Field 1 Placeholder", block: 0, key: NFC_KEY }, // Block ID 224
        field2: { title: "Allegiance #3 Field 2", placeholder: "Allegiance #3 Field 2 Placeholder", block: 1, key: NFC_KEY }, // Block ID 225
        field3: { title: "Allegiance #3 Field 3", placeholder: "Allegiance #3 Field 3 Placeholder", block: 2, key: NFC_KEY }, // Block ID 226
        field4: { title: "Allegiance #3 Field 4", placeholder: "Allegiance #3 Field 4 Placeholder", block: 3, key: NFC_KEY }, // Block ID 227
        field5: { title: "Allegiance #3 Field 5", placeholder: "Allegiance #3 Field 5 Placeholder", block: 4, key: NFC_KEY }, // Block ID 228
        field6: { title: "Allegiance #3 Field 6", placeholder: "Allegiance #3 Field 6 Placeholder", block: 5, key: NFC_KEY }, // Block ID 229
        field7: { title: "Allegiance #3 Field 7", placeholder: "Allegiance #3 Field 7 Placeholder", block: 6, key: NFC_KEY }, // Block ID 230
        field8: { title: "Allegiance #3 Field 8", placeholder: "Allegiance #3 Field 8 Placeholder", block: 7, key: NFC_KEY }, // Block ID 231
        field9: { title: "Allegiance #3 Field 9", placeholder: "Allegiance #3 Field 9 Placeholder", block: 8, key: NFC_KEY }, // Block ID 232
        field10: { title: "Allegiance #3 Field 10", placeholder: "Allegiance #3 Field 10 Placeholder", block: 9, key: NFC_KEY }, // Block ID 233
        field11: { title: "Allegiance #3 Field 11", placeholder: "Allegiance #3 Field 11 Placeholder", block: 10, key: NFC_KEY }, // Block ID 234
        field12: { title: "Allegiance #3 Field 12", placeholder: "Allegiance #3 Field 12 Placeholder", block: 11, key: NFC_KEY }, // Block ID 235
        field13: { title: "Allegiance #3 Field 13", placeholder: "Allegiance #3 Field 13 Placeholder", block: 12, key: NFC_KEY }, // Block ID 236
        field14: { title: "Allegiance #3 Field 14", placeholder: "Allegiance #3 Field 14 Placeholder", block: 13, key: NFC_KEY }, // Block ID 237
        field15: { title: "Allegiance #3 Field 15", placeholder: "Allegiance #3 Field 15 Placeholder", block: 14, key: NFC_KEY } // Block ID 238
      }
    }
  },
  user: {
    sector: 39,
    fields: {
      // Use absolute Block IDs from CSV
      username:   { title: "Username",              placeholder: "Enter Username",             block: 0, key: NFC_KEY },
      // Add other user fields used in handleRegWrite / handleRegRead
      status:     { title: "Band Status",           placeholder: "N/A",                      block: 2, key: NFC_KEY }, // Placeholder N/A as it's usually read-only display or set internally
      allegiance: { title: "Affiliated Allegiance", placeholder: "No Affiliated Allegiance", block: 3, key: NFC_KEY }
      // Add other user fields from CSV if needed later (244-254)
    }
  }
};

/**
 * Validates the FIELD_MAP structure to ensure consistency and proper field mappings.
 * This function checks that:
 * 1. User data is in Sector 39
 * 2. Faction data is in Sectors 1-15
 * 3. Allegiance data is in Sectors 36-38
 * 4. All required fields are present with valid types
 */
function validateFieldMap() {
  // Validate user section
  if (!FIELD_MAP.user || typeof FIELD_MAP.user !== 'object') {
    console.error("CRITICAL: FIELD_MAP.user is missing or invalid");
    return;
  }
  
  // Validate user sector assignment
  if (FIELD_MAP.user.sector !== 39) {
    console.error(`CRITICAL: User sector should be 39, found ${FIELD_MAP.user.sector}`);
    // Auto-correct to prevent errors
    FIELD_MAP.user.sector = 39;
  }
  
  // Validate user fields
  if (!FIELD_MAP.user.fields || !FIELD_MAP.user.fields.username) {
    console.error("CRITICAL: Username field configuration is missing");
    return;
  }
  
  // Validate username is in block 0
  if (FIELD_MAP.user.fields.username.block !== 0) {
    console.error(`CRITICAL: Username block should be 0, found ${FIELD_MAP.user.fields.username.block}`);
    // Auto-correct
    FIELD_MAP.user.fields.username.block = 0;
  }
  
  // Validate factions
  if (!FIELD_MAP.factions || typeof FIELD_MAP.factions !== 'object') {
    console.error("CRITICAL: FIELD_MAP.factions is missing or invalid");
    return;
  }
  
  // Check each faction for proper sector assignment (should be 1-15)
  Object.entries(FIELD_MAP.factions).forEach(([key, faction]) => {
    if (typeof faction !== 'object') {
      console.warn(`Faction ${key} is not a valid object`);
      return;
    }
    
    if (typeof faction.sector !== 'number') {
      console.warn(`Faction ${key} has invalid sector type: ${typeof faction.sector}`);
      return;
    }
    
    // Validate faction sector range
    if (faction.sector < 1 || faction.sector > 31 || faction.sector === 16) {
      console.error(`CRITICAL: Faction ${key} sector should be between 1-15 or 17-31, found ${faction.sector}`);
    }
    
    // Check faction fields
    if (!faction.fields || typeof faction.fields !== 'object') {
      console.warn(`Faction ${key} has missing or invalid fields`);
      return;
    }
    
    // Check each field has required properties
    Object.entries(faction.fields).forEach(([fieldKey, field]) => {
      if (!field.title || typeof field.title !== 'string') {
        console.warn(`Faction ${key}, field ${fieldKey} is missing title`);
      }
      
      if (typeof field.block !== 'number') {
        console.warn(`Faction ${key}, field ${fieldKey} has invalid block number type`);
      }
      
      if (!field.key || typeof field.key !== 'string') {
        console.warn(`Faction ${key}, field ${fieldKey} is missing key`);
      }
    });
  });
  
  // Validate allegiances
  if (!FIELD_MAP.allegiances || typeof FIELD_MAP.allegiances !== 'object') {
    console.error("CRITICAL: FIELD_MAP.allegiances is missing or invalid");
    return;
  }
  
  // Check each allegiance for proper sector assignment (should be 36-38)
  Object.entries(FIELD_MAP.allegiances).forEach(([key, allegiance]) => {
    if (typeof allegiance !== 'object') {
      console.warn(`Allegiance ${key} is not a valid object`);
      return;
    }
    
    if (typeof allegiance.sector !== 'number') {
      console.warn(`Allegiance ${key} has invalid sector type: ${typeof allegiance.sector}`);
      return;
    }
    
    // Validate allegiance sector range
    if (allegiance.sector < 36 || allegiance.sector > 38) {
      console.error(`CRITICAL: Allegiance ${key} sector should be between 36-38, found ${allegiance.sector}`);
    }
    
    // Check allegiance fields
    if (!allegiance.fields || typeof allegiance.fields !== 'object') {
      console.warn(`Allegiance ${key} has missing or invalid fields`);
      return;
    }
    
    // Check each field has required properties
    Object.entries(allegiance.fields).forEach(([fieldKey, field]) => {
      if (!field.title || typeof field.title !== 'string') {
        console.warn(`Allegiance ${key}, field ${fieldKey} is missing title`);
      }
      
      if (typeof field.block !== 'number') {
        console.warn(`Allegiance ${key}, field ${fieldKey} has invalid block number type`);
      }
      
      if (!field.key || typeof field.key !== 'string') {
        console.warn(`Allegiance ${key}, field ${fieldKey} is missing key`);
      }
    });
  });
  
  console.info("Field map validation complete");
}
validateFieldMap();

// Export FIELD_MAP if modules are supported
// Avoid using 'module' directly in browser scripts unless using a bundler
// Making it a global variable for simplicity in this context
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = FIELD_MAP;
// } 