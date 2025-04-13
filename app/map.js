/**
 * @file map.js
 * @description MIFARE Classic 4K Memory Map and Field Definitions
 * 
 * This file defines the memory layout and field mappings for the Neoband App,
 * specifically designed for MIFARE Classic 4K cards. The mapping follows strict
 * MIFARE Classic memory structure constraints and D-Logic SDK requirements.
 * 
 * Memory Structure:
 * - MIFARE Classic 4K has 40 sectors (numbered 0-39)
 * - Each sector has multiple blocks:
 *   - Sectors 0-31: 4 blocks each (0-3)
 *   - Sectors 32-39: 16 blocks each (0-15)
 * - Block 3 in each sector is the "trailer" block (contains keys and access bits)
 * - Only data blocks (0-2) are used for storing field values
 * 
 * Field Mapping Rules:
 * 1. Factions use sectors 1-15 and 17-31 (30 factions total)
 *    - Each faction gets 3 fields (blocks 0-2 in their sector)
 *    - Sector 16 is reserved (skipped as per CSV)
 * 2. Allegiances use sectors 36-38
 *    - Each allegiance spans 5 consecutive sectors
 *    - Only blocks 0-2 are used in each sector
 * 3. User data (username) uses sector 39, block 0
 * 
 * Authentication:
 * - All operations use the same authentication key (FFFFFFFFFFFF)
 * - Each block requires fresh authentication before access
 * 
 * @version 3.0.4
 * @lastUpdated 2025-04-12
 */

// Global authentication key used for all sectors
const NFC_KEY = "FFFFFFFFFFFF";

/**
 * FIELD_MAP defines the complete memory layout for all factions, allegiances,
 * and user data. Each field includes:
 * 
 * @property {string} name - Display name for the faction/allegiance
 * @property {number} sector - MIFARE sector number (0-39)
 * @property {Object} fields - Collection of data fields for this faction/allegiance
 * @property {Object} fields.fieldN - Individual field definition
 * @property {string} fields.fieldN.title - Display title for the field
 * @property {string} fields.fieldN.placeholder - Input placeholder text
 * @property {number} fields.fieldN.sector - MIFARE sector number for this field
 * @property {number} fields.fieldN.block - Block number within the sector (0-2)
 * @property {string} fields.fieldN.key - Authentication key for this block
 */
const FIELD_MAP = {
  factions: {
    faction1: {
      name: "Alleycat",
      sector: 1,
      fields: {
        field1: { title: "Hunter/Bounty", placeholder: "Enter Hunter/Bounty", sector: 1, block: 0, key: NFC_KEY },
        field2: { title: "# of Wins", placeholder: "Enter # of wins", sector: 1, block: 1, key: NFC_KEY },
        field3: { title: "Best Draw Time", placeholder: "Enter Best Draw Time", sector: 1, block: 2, key: NFC_KEY }
      }
    },
    faction2: {
      name: "Faction #2",
      sector: 2,
      fields: {
        field1: { title: "Faction #2 Field #1", placeholder: "Faction #2 Field #1 Placeholder", sector: 2, block: 0, key: NFC_KEY },
        field2: { title: "Faction #2 Field #2", placeholder: "Faction #2 Field #2 Placeholder", sector: 2, block: 1, key: NFC_KEY },
        field3: { title: "Faction #2 Field #3", placeholder: "Faction #2 Field #3 Placeholder", sector: 2, block: 2, key: NFC_KEY }
      }
    },
    faction3: {
      name: "Faction #3",
      sector: 3,
      fields: {
        field1: { title: "Faction #3 Field #1", placeholder: "Faction #3 Field #1 Placeholder", sector: 3, block: 0, key: NFC_KEY },
        field2: { title: "Faction #3 Field #2", placeholder: "Faction #3 Field #2 Placeholder", sector: 3, block: 1, key: NFC_KEY },
        field3: { title: "Faction #3 Field #3", placeholder: "Faction #3 Field #3 Placeholder", sector: 3, block: 2, key: NFC_KEY }
      }
    },
    faction4: {
      name: "Faction #4",
      sector: 4,
      fields: {
        field1: { title: "Faction #4 Field #1", placeholder: "Faction #4 Field #1 Placeholder", sector: 4, block: 0, key: NFC_KEY },
        field2: { title: "Faction #4 Field #2", placeholder: "Faction #4 Field #2 Placeholder", sector: 4, block: 1, key: NFC_KEY },
        field3: { title: "Faction #4 Field #3", placeholder: "Faction #4 Field #3 Placeholder", sector: 4, block: 2, key: NFC_KEY }
      }
    },
    faction5: {
      name: "Faction #5",
      sector: 5,
      fields: {
        field1: { title: "Faction #5 Field #1", placeholder: "Faction #5 Field #1 Placeholder", sector: 5, block: 0, key: NFC_KEY },
        field2: { title: "Faction #5 Field #2", placeholder: "Faction #5 Field #2 Placeholder", sector: 5, block: 1, key: NFC_KEY },
        field3: { title: "Faction #5 Field #3", placeholder: "Faction #5 Field #3 Placeholder", sector: 5, block: 2, key: NFC_KEY }
      }
    },
    faction6: {
      name: "Faction #6",
      sector: 6,
      fields: {
        field1: { title: "Faction #6 Field #1", placeholder: "Faction #6 Field #1 Placeholder", sector: 6, block: 0, key: NFC_KEY },
        field2: { title: "Faction #6 Field #2", placeholder: "Faction #6 Field #2 Placeholder", sector: 6, block: 1, key: NFC_KEY },
        field3: { title: "Faction #6 Field #3", placeholder: "Faction #6 Field #3 Placeholder", sector: 6, block: 2, key: NFC_KEY }
      }
    },
    faction7: {
      name: "Faction #7",
      sector: 7,
      fields: {
        field1: { title: "Faction #7 Field #1", placeholder: "Faction #7 Field #1 Placeholder", sector: 7, block: 0, key: NFC_KEY },
        field2: { title: "Faction #7 Field #2", placeholder: "Faction #7 Field #2 Placeholder", sector: 7, block: 1, key: NFC_KEY },
        field3: { title: "Faction #7 Field #3", placeholder: "Faction #7 Field #3 Placeholder", sector: 7, block: 2, key: NFC_KEY }
      }
    },
    faction8: {
      name: "Faction #8",
      sector: 8,
      fields: {
        field1: { title: "Faction #8 Field #1", placeholder: "Faction #8 Field #1 Placeholder", sector: 8, block: 0, key: NFC_KEY },
        field2: { title: "Faction #8 Field #2", placeholder: "Faction #8 Field #2 Placeholder", sector: 8, block: 1, key: NFC_KEY },
        field3: { title: "Faction #8 Field #3", placeholder: "Faction #8 Field #3 Placeholder", sector: 8, block: 2, key: NFC_KEY }
      }
    },
    faction9: {
      name: "Faction #9",
      sector: 9,
      fields: {
        field1: { title: "Faction #9 Field #1", placeholder: "Faction #9 Field #1 Placeholder", sector: 9, block: 0, key: NFC_KEY },
        field2: { title: "Faction #9 Field #2", placeholder: "Faction #9 Field #2 Placeholder", sector: 9, block: 1, key: NFC_KEY },
        field3: { title: "Faction #9 Field #3", placeholder: "Faction #9 Field #3 Placeholder", sector: 9, block: 2, key: NFC_KEY }
      }
    },
    faction10: {
      name: "Faction #10",
      sector: 10,
      fields: {
        field1: { title: "Faction #10 Field #1", placeholder: "Faction #10 Field #1 Placeholder", sector: 10, block: 0, key: NFC_KEY },
        field2: { title: "Faction #10 Field #2", placeholder: "Faction #10 Field #2 Placeholder", sector: 10, block: 1, key: NFC_KEY },
        field3: { title: "Faction #10 Field #3", placeholder: "Faction #10 Field #3 Placeholder", sector: 10, block: 2, key: NFC_KEY }
      }
    },
    faction11: {
      name: "Faction #11",
      sector: 11,
      fields: {
        field1: { title: "Faction #11 Field #1", placeholder: "Faction #11 Field #1 Placeholder", sector: 11, block: 0, key: NFC_KEY },
        field2: { title: "Faction #11 Field #2", placeholder: "Faction #11 Field #2 Placeholder", sector: 11, block: 1, key: NFC_KEY },
        field3: { title: "Faction #11 Field #3", placeholder: "Faction #11 Field #3 Placeholder", sector: 11, block: 2, key: NFC_KEY }
      }
    },
    faction12: {
      name: "Faction #12",
      sector: 12,
      fields: {
        field1: { title: "Faction #12 Field #1", placeholder: "Faction #12 Field #1 Placeholder", sector: 12, block: 0, key: NFC_KEY },
        field2: { title: "Faction #12 Field #2", placeholder: "Faction #12 Field #2 Placeholder", sector: 12, block: 1, key: NFC_KEY },
        field3: { title: "Faction #12 Field #3", placeholder: "Faction #12 Field #3 Placeholder", sector: 12, block: 2, key: NFC_KEY }
      }
    },
    faction13: {
      name: "Faction #13",
      sector: 13,
      fields: {
        field1: { title: "Faction #13 Field #1", placeholder: "Faction #13 Field #1 Placeholder", sector: 13, block: 0, key: NFC_KEY },
        field2: { title: "Faction #13 Field #2", placeholder: "Faction #13 Field #2 Placeholder", sector: 13, block: 1, key: NFC_KEY },
        field3: { title: "Faction #13 Field #3", placeholder: "Faction #13 Field #3 Placeholder", sector: 13, block: 2, key: NFC_KEY }
      }
    },
    faction14: {
      name: "Faction #14",
      sector: 14,
      fields: {
        field1: { title: "Faction #14 Field #1", placeholder: "Faction #14 Field #1 Placeholder", sector: 14, block: 0, key: NFC_KEY },
        field2: { title: "Faction #14 Field #2", placeholder: "Faction #14 Field #2 Placeholder", sector: 14, block: 1, key: NFC_KEY },
        field3: { title: "Faction #14 Field #3", placeholder: "Faction #14 Field #3 Placeholder", sector: 14, block: 2, key: NFC_KEY }
      }
    },
    faction15: {
      name: "Faction #15",
      sector: 15,
      fields: {
        field1: { title: "Faction #15 Field #1", placeholder: "Faction #15 Field #1 Placeholder", sector: 15, block: 0, key: NFC_KEY },
        field2: { title: "Faction #15 Field #2", placeholder: "Faction #15 Field #2 Placeholder", sector: 15, block: 1, key: NFC_KEY },
        field3: { title: "Faction #15 Field #3", placeholder: "Faction #15 Field #3 Placeholder", sector: 15, block: 2, key: NFC_KEY }
      }
    },
    // Sector 16 is skipped as per CSV
    faction16: {
      name: "Faction #16",
      sector: 17,
      fields: {
        field1: { title: "Faction #16 Field #1", placeholder: "Faction #16 Field #1 Placeholder", sector: 17, block: 0, key: NFC_KEY },
        field2: { title: "Faction #16 Field #2", placeholder: "Faction #16 Field #2 Placeholder", sector: 17, block: 1, key: NFC_KEY },
        field3: { title: "Faction #16 Field #3", placeholder: "Faction #16 Field #3 Placeholder", sector: 17, block: 2, key: NFC_KEY }
      }
    },
    faction17: {
      name: "Faction #17",
      sector: 18,
      fields: {
        field1: { title: "Faction #17 Field #1", placeholder: "Faction #17 Field #1 Placeholder", sector: 18, block: 0, key: NFC_KEY },
        field2: { title: "Faction #17 Field #2", placeholder: "Faction #17 Field #2 Placeholder", sector: 18, block: 1, key: NFC_KEY },
        field3: { title: "Faction #17 Field #3", placeholder: "Faction #17 Field #3 Placeholder", sector: 18, block: 2, key: NFC_KEY }
      }
    },
    faction18: {
      name: "Faction #18",
      sector: 19,
      fields: {
        field1: { title: "Faction #18 Field #1", placeholder: "Faction #18 Field #1 Placeholder", sector: 19, block: 0, key: NFC_KEY },
        field2: { title: "Faction #18 Field #2", placeholder: "Faction #18 Field #2 Placeholder", sector: 19, block: 1, key: NFC_KEY },
        field3: { title: "Faction #18 Field #3", placeholder: "Faction #18 Field #3 Placeholder", sector: 19, block: 2, key: NFC_KEY }
      }
    },
    faction19: {
      name: "Faction #19",
      sector: 20,
      fields: {
        field1: { title: "Faction #19 Field #1", placeholder: "Faction #19 Field #1 Placeholder", sector: 20, block: 0, key: NFC_KEY },
        field2: { title: "Faction #19 Field #2", placeholder: "Faction #19 Field #2 Placeholder", sector: 20, block: 1, key: NFC_KEY },
        field3: { title: "Faction #19 Field #3", placeholder: "Faction #19 Field #3 Placeholder", sector: 20, block: 2, key: NFC_KEY }
      }
    },
    faction20: {
      name: "Faction #20",
      sector: 21,
      fields: {
        field1: { title: "Faction #20 Field #1", placeholder: "Faction #20 Field #1 Placeholder", sector: 21, block: 0, key: NFC_KEY },
        field2: { title: "Faction #20 Field #2", placeholder: "Faction #20 Field #2 Placeholder", sector: 21, block: 1, key: NFC_KEY },
        field3: { title: "Faction #20 Field #3", placeholder: "Faction #20 Field #3 Placeholder", sector: 21, block: 2, key: NFC_KEY }
      }
    },
    faction21: {
      name: "Faction #21",
      sector: 22,
      fields: {
        field1: { title: "Faction #21 Field #1", placeholder: "Faction #21 Field #1 Placeholder", sector: 22, block: 0, key: NFC_KEY },
        field2: { title: "Faction #21 Field #2", placeholder: "Faction #21 Field #2 Placeholder", sector: 22, block: 1, key: NFC_KEY },
        field3: { title: "Faction #21 Field #3", placeholder: "Faction #21 Field #3 Placeholder", sector: 22, block: 2, key: NFC_KEY }
      }
    },
    faction22: {
      name: "Faction #22",
      sector: 23,
      fields: {
        field1: { title: "Faction #22 Field #1", placeholder: "Faction #22 Field #1 Placeholder", sector: 23, block: 0, key: NFC_KEY },
        field2: { title: "Faction #22 Field #2", placeholder: "Faction #22 Field #2 Placeholder", sector: 23, block: 1, key: NFC_KEY },
        field3: { title: "Faction #22 Field #3", placeholder: "Faction #22 Field #3 Placeholder", sector: 23, block: 2, key: NFC_KEY }
      }
    },
    faction23: {
      name: "Faction #23",
      sector: 24,
      fields: {
        field1: { title: "Faction #23 Field #1", placeholder: "Faction #23 Field #1 Placeholder", sector: 24, block: 0, key: NFC_KEY },
        field2: { title: "Faction #23 Field #2", placeholder: "Faction #23 Field #2 Placeholder", sector: 24, block: 1, key: NFC_KEY },
        field3: { title: "Faction #23 Field #3", placeholder: "Faction #23 Field #3 Placeholder", sector: 24, block: 2, key: NFC_KEY }
      }
    },
    faction24: {
      name: "Faction #24",
      sector: 25,
      fields: {
        field1: { title: "Faction #24 Field #1", placeholder: "Faction #24 Field #1 Placeholder", sector: 25, block: 0, key: NFC_KEY },
        field2: { title: "Faction #24 Field #2", placeholder: "Faction #24 Field #2 Placeholder", sector: 25, block: 1, key: NFC_KEY },
        field3: { title: "Faction #24 Field #3", placeholder: "Faction #24 Field #3 Placeholder", sector: 25, block: 2, key: NFC_KEY }
      }
    },
    faction25: {
      name: "Faction #25",
      sector: 26,
      fields: {
        field1: { title: "Faction #25 Field #1", placeholder: "Faction #25 Field #1 Placeholder", sector: 26, block: 0, key: NFC_KEY },
        field2: { title: "Faction #25 Field #2", placeholder: "Faction #25 Field #2 Placeholder", sector: 26, block: 1, key: NFC_KEY },
        field3: { title: "Faction #25 Field #3", placeholder: "Faction #25 Field #3 Placeholder", sector: 26, block: 2, key: NFC_KEY }
      }
    },
    faction26: {
      name: "Faction #26",
      sector: 27,
      fields: {
        field1: { title: "Faction #26 Field #1", placeholder: "Faction #26 Field #1 Placeholder", sector: 27, block: 0, key: NFC_KEY },
        field2: { title: "Faction #26 Field #2", placeholder: "Faction #26 Field #2 Placeholder", sector: 27, block: 1, key: NFC_KEY },
        field3: { title: "Faction #26 Field #3", placeholder: "Faction #26 Field #3 Placeholder", sector: 27, block: 2, key: NFC_KEY }
      }
    },
    faction27: {
      name: "Faction #27",
      sector: 28,
      fields: {
        field1: { title: "Faction #27 Field #1", placeholder: "Faction #27 Field #1 Placeholder", sector: 28, block: 0, key: NFC_KEY },
        field2: { title: "Faction #27 Field #2", placeholder: "Faction #27 Field #2 Placeholder", sector: 28, block: 1, key: NFC_KEY },
        field3: { title: "Faction #27 Field #3", placeholder: "Faction #27 Field #3 Placeholder", sector: 28, block: 2, key: NFC_KEY }
      }
    },
    faction28: {
      name: "Faction #28",
      sector: 29,
      fields: {
        field1: { title: "Faction #28 Field #1", placeholder: "Faction #28 Field #1 Placeholder", sector: 29, block: 0, key: NFC_KEY },
        field2: { title: "Faction #28 Field #2", placeholder: "Faction #28 Field #2 Placeholder", sector: 29, block: 1, key: NFC_KEY },
        field3: { title: "Faction #28 Field #3", placeholder: "Faction #28 Field #3 Placeholder", sector: 29, block: 2, key: NFC_KEY }
      }
    },
    faction29: {
      name: "Faction #29",
      sector: 30,
      fields: {
        field1: { title: "Faction #29 Field #1", placeholder: "Faction #29 Field #1 Placeholder", sector: 30, block: 0, key: NFC_KEY },
        field2: { title: "Faction #29 Field #2", placeholder: "Faction #29 Field #2 Placeholder", sector: 30, block: 1, key: NFC_KEY },
        field3: { title: "Faction #29 Field #3", placeholder: "Faction #29 Field #3 Placeholder", sector: 30, block: 2, key: NFC_KEY }
      }
    },
    faction30: {
      name: "Faction #30",
      sector: 31,
      fields: {
        field1: { title: "Faction #30 Field #1", placeholder: "Faction #30 Field #1 Placeholder", sector: 31, block: 0, key: NFC_KEY },
        field2: { title: "Faction #30 Field #2", placeholder: "Faction #30 Field #2 Placeholder", sector: 31, block: 1, key: NFC_KEY },
        field3: { title: "Faction #30 Field #3", placeholder: "Faction #30 Field #3 Placeholder", sector: 31, block: 2, key: NFC_KEY }
      }
    }
  },
  allegiances: {
    
    allegiance1: {
      name: "Endline",
      sector: 36,
      fields: {
        field1: { title: "Allegiance #1 Field 1", placeholder: "Allegiance #1 Field 1 Placeholder", sector: 36, block: 0, key: NFC_KEY },
        field2: { title: "Allegiance #1 Field 2", placeholder: "Allegiance #1 Field 2 Placeholder", sector: 36, block: 1, key: NFC_KEY },
        field3: { title: "Allegiance #1 Field 3", placeholder: "Allegiance #1 Field 3 Placeholder", sector: 36, block: 2, key: NFC_KEY },
        field4: { title: "Allegiance #1 Field 4", placeholder: "Allegiance #1 Field 4 Placeholder", sector: 36, block: 3, key: NFC_KEY },
        field5: { title: "Allegiance #1 Field 5", placeholder: "Allegiance #1 Field 5 Placeholder", sector: 36, block: 4, key: NFC_KEY },
        field6: { title: "Allegiance #1 Field 6", placeholder: "Allegiance #1 Field 6 Placeholder", sector: 36, block: 5, key: NFC_KEY },
        field7: { title: "Allegiance #1 Field 7", placeholder: "Allegiance #1 Field 7 Placeholder", sector: 36, block: 6, key: NFC_KEY },
        field8: { title: "Allegiance #1 Field 8", placeholder: "Allegiance #1 Field 8 Placeholder", sector: 36, block: 7, key: NFC_KEY },
        field9: { title: "Allegiance #1 Field 9", placeholder: "Allegiance #1 Field 9 Placeholder", sector: 36, block: 8, key: NFC_KEY },
        field10: { title: "Allegiance #1 Field 10", placeholder: "Allegiance #1 Field 10 Placeholder", sector: 36, block: 9, key: NFC_KEY },
        field11: { title: "Allegiance #1 Field 11", placeholder: "Allegiance #1 Field 11 Placeholder", sector: 36, block: 10, key: NFC_KEY },
        field12: { title: "Allegiance #1 Field 12", placeholder: "Allegiance #1 Field 12 Placeholder", sector: 36, block: 11, key: NFC_KEY },
        field13: { title: "Allegiance #1 Field 13", placeholder: "Allegiance #1 Field 13 Placeholder", sector: 36, block: 12, key: NFC_KEY },
        field14: { title: "Allegiance #1 Field 14", placeholder: "Allegiance #1 Field 14 Placeholder", sector: 36, block: 13, key: NFC_KEY },
        field15: { title: "Allegiance #1 Field 15", placeholder: "Allegiance #1 Field 15 Placeholder", sector: 36, block: 14, key: NFC_KEY }
      }
    },
    allegiance2: {
      name: "Helix",
      sector: 37,
      fields: {
        field1: { title: "Allegiance #2 Field 1", placeholder: "Allegiance #2 Field 1 Placeholder", sector: 37, block: 0, key: NFC_KEY },
        field2: { title: "Allegiance #2 Field 2", placeholder: "Allegiance #2 Field 2 Placeholder", sector: 37, block: 1, key: NFC_KEY },
        field3: { title: "Allegiance #2 Field 3", placeholder: "Allegiance #2 Field 3 Placeholder", sector: 37, block: 2, key: NFC_KEY },
        field4: { title: "Allegiance #2 Field 4", placeholder: "Allegiance #2 Field 4 Placeholder", sector: 37, block: 3, key: NFC_KEY },
        field5: { title: "Allegiance #2 Field 5", placeholder: "Allegiance #2 Field 5 Placeholder", sector: 37, block: 4, key: NFC_KEY },
        field6: { title: "Allegiance #2 Field 6", placeholder: "Allegiance #2 Field 6 Placeholder", sector: 37, block: 5, key: NFC_KEY },
        field7: { title: "Allegiance #2 Field 7", placeholder: "Allegiance #2 Field 7 Placeholder", sector: 37, block: 6, key: NFC_KEY },
        field8: { title: "Allegiance #2 Field 8", placeholder: "Allegiance #2 Field 8 Placeholder", sector: 37, block: 7, key: NFC_KEY },
        field9: { title: "Allegiance #2 Field 9", placeholder: "Allegiance #2 Field 9 Placeholder", sector: 37, block: 8, key: NFC_KEY },
        field10: { title: "Allegiance #2 Field 10", placeholder: "Allegiance #2 Field 10 Placeholder", sector: 37, block: 9, key: NFC_KEY },
        field11: { title: "Allegiance #2 Field 11", placeholder: "Allegiance #2 Field 11 Placeholder", sector: 37, block: 10, key: NFC_KEY },
        field12: { title: "Allegiance #2 Field 12", placeholder: "Allegiance #2 Field 12 Placeholder", sector: 37, block: 11, key: NFC_KEY },
        field13: { title: "Allegiance #2 Field 13", placeholder: "Allegiance #2 Field 13 Placeholder", sector: 37, block: 12, key: NFC_KEY },
        field14: { title: "Allegiance #2 Field 14", placeholder: "Allegiance #2 Field 14 Placeholder", sector: 37, block: 13, key: NFC_KEY },
        field15: { title: "Allegiance #2 Field 15", placeholder: "Allegiance #2 Field 15 Placeholder", sector: 37, block: 14, key: NFC_KEY }
      }
    },
    allegiance3: {
      name: "The Resistance",
      sector: 38,
      fields: {
        field1: { title: "Allegiance #3 Field 1", placeholder: "Allegiance #3 Field 1 Placeholder", sector: 38, block: 0, key: NFC_KEY },
        field2: { title: "Allegiance #3 Field 2", placeholder: "Allegiance #3 Field 2 Placeholder", sector: 38, block: 1, key: NFC_KEY },
        field3: { title: "Allegiance #3 Field 3", placeholder: "Allegiance #3 Field 3 Placeholder", sector: 38, block: 2, key: NFC_KEY },
        field4: { title: "Allegiance #3 Field 4", placeholder: "Allegiance #3 Field 4 Placeholder", sector: 38, block: 3, key: NFC_KEY },
        field5: { title: "Allegiance #3 Field 5", placeholder: "Allegiance #3 Field 5 Placeholder", sector: 38, block: 4, key: NFC_KEY },
        field6: { title: "Allegiance #3 Field 6", placeholder: "Allegiance #3 Field 6 Placeholder", sector: 38, block: 5, key: NFC_KEY },
        field7: { title: "Allegiance #3 Field 7", placeholder: "Allegiance #3 Field 7 Placeholder", sector: 38, block: 6, key: NFC_KEY },
        field8: { title: "Allegiance #3 Field 8", placeholder: "Allegiance #3 Field 8 Placeholder", sector: 38, block: 7, key: NFC_KEY },
        field9: { title: "Allegiance #3 Field 9", placeholder: "Allegiance #3 Field 9 Placeholder", sector: 38, block: 8, key: NFC_KEY },
        field10: { title: "Allegiance #3 Field 10", placeholder: "Allegiance #3 Field 10 Placeholder", sector: 38, block: 9, key: NFC_KEY },
        field11: { title: "Allegiance #3 Field 11", placeholder: "Allegiance #3 Field 11 Placeholder", sector: 38, block: 10, key: NFC_KEY },
        field12: { title: "Allegiance #3 Field 12", placeholder: "Allegiance #3 Field 12 Placeholder", sector: 38, block: 11, key: NFC_KEY },
        field13: { title: "Allegiance #3 Field 13", placeholder: "Allegiance #3 Field 13 Placeholder", sector: 38, block: 12, key: NFC_KEY },
        field14: { title: "Allegiance #3 Field 14", placeholder: "Allegiance #3 Field 14 Placeholder", sector: 38, block: 13, key: NFC_KEY },
        field15: { title: "Allegiance #3 Field 15", placeholder: "Allegiance #3 Field 15 Placeholder", sector: 38, block: 14, key: NFC_KEY }
      }
    }
  },
    user: {
      name: "User Data",
      sector: 39,
      fields: {
        field1: { title: "Username", placeholder: "Enter Username", sector: 39, block: 0, key: NFC_KEY },
        field2: { title: "User Field 2", placeholder: "User Field 2 Placeholder", sector: 39, block: 1, key: NFC_KEY },
        field3: { title: "Registration", placeholder: "Enter Registration", sector: 39, block: 2, key: NFC_KEY },
        field4: { title: "Allegiance Affiliation", placeholder: "Enter Allegiance", sector: 39, block: 3, key: NFC_KEY },
        field5: { title: "User Field 5", placeholder: "User Field 5 Placeholder", sector: 39, block: 4, key: NFC_KEY },
        field6: { title: "User Field 6", placeholder: "User Field 6 Placeholder", sector: 39, block: 5, key: NFC_KEY },
        field7: { title: "User Field 7", placeholder: "User Field 7 Placeholder", sector: 39, block: 6, key: NFC_KEY },
        field8: { title: "User Field 8", placeholder: "User Field 8 Placeholder", sector: 39, block: 7, key: NFC_KEY },
        field9: { title: "User Field 9", placeholder: "User Field 9 Placeholder", sector: 39, block: 8, key: NFC_KEY },
        field10: { title: "User Field 10", placeholder: "User Field 10 Placeholder", sector: 39, block: 9, key: NFC_KEY },
        field11: { title: "User Field 11", placeholder: "User Field 11 Placeholder", sector: 39, block: 10, key: NFC_KEY },
        field12: { title: "User Field 12", placeholder: "User Field 12 Placeholder", sector: 39, block: 11, key: NFC_KEY },
        field13: { title: "User Field 13", placeholder: "User Field 13 Placeholder", sector: 39, block: 12, key: NFC_KEY },
        field14: { title: "User Field 14", placeholder: "User Field 14 Placeholder", sector: 39, block: 13, key: NFC_KEY },
        field15: { title: "User Field 15", placeholder: "User Field 15 Placeholder", sector: 39, block: 14, key: NFC_KEY },
      }
    }
  };
