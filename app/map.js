/*
  map.js - Fully Hard-Coded Memory Map for the Neoband App
  This file defines:
  - 30 Factions (Sector 1 to 30): Each with 3 fields.
  - 3 Allegiances (Sector 36 to 38): Each with 15 fields.
  - User registration mapping (Sector 39): Only the username field.
  Each field contains: title, placeholder, block number (relative to sector start), and the NFC key.
*/

const NFC_KEY = "FFFFFFFFFFFF"; // Common NFC key used for all fields

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
      username:   { title: "Username",              placeholder: "Enter Username",             block: 240, key: NFC_KEY },
      // Add other user fields used in handleRegWrite / handleRegRead
      status:     { title: "Band Status",           placeholder: "N/A",                      block: 242, key: NFC_KEY }, // Placeholder N/A as it's usually read-only display or set internally
      allegiance: { title: "Affiliated Allegiance", placeholder: "No Affiliated Allegiance", block: 243, key: NFC_KEY }
      // Add other user fields from CSV if needed later (244-254)
    }
  }
};

// Validate mapping: Ensure every field has a valid sector, block, key, and placeholder
function validateFieldMap() {
  for (const category in FIELD_MAP) {
    const catData = FIELD_MAP[category];
    if (category === 'user') { // User category structure is different
      if (typeof catData.sector !== 'number') {
          console.warn(`Misaligned mapping: ${category} missing valid sector.`);
      }
      for (const field in catData.fields) {
        const mapping = catData.fields[field];
        if (typeof mapping.block !== 'number') {
          console.warn(`Misaligned mapping: ${category} -> ${field} missing valid block.`);
        }
        if (!mapping.key) {
          console.warn(`Missing key for mapping: ${category} -> ${field}`);
        }
        if (!mapping.placeholder) {
          console.warn(`Missing placeholder for mapping: ${category} -> ${field}`);
        }
      }
    } else { // Factions and Allegiances
      for (const name in catData) {
        const entity = catData[name];
        if (typeof entity.sector !== 'number') {
          console.warn(`Misaligned mapping: ${category} -> ${name} missing valid sector.`);
        }
        if (!entity.name) {
            console.warn(`Missing name for mapping: ${category} -> ${name}`);
        }
        for (const field in entity.fields) {
          const mapping = entity.fields[field];
          if (typeof mapping.block !== 'number') {
            console.warn(`Misaligned mapping: ${category} -> ${name} -> ${field} missing valid block.`);
          }
          if (!mapping.key) {
            console.warn(`Missing key for mapping: ${category} -> ${name} -> ${field}`);
          }
          if (!mapping.placeholder) {
            console.warn(`Missing placeholder for mapping: ${category} -> ${name} -> ${field}`);
          }
        }
      }
    }
  }
}
validateFieldMap();

// Export FIELD_MAP if modules are supported
// Avoid using 'module' directly in browser scripts unless using a bundler
// Making it a global variable for simplicity in this context
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = FIELD_MAP;
// } 