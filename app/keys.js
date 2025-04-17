// keys.js
// This file lives on the LOCAL MACHINE (not on the D-Logic device).
// It contains all the keys we need: admin, staff, 30 factions, 3 allegiances,
// plus a universal read key for Key A if desired.
//
// "neoKey" is the name used for each group's unique MIFARE Key B (write key).

window.NEOBAND_KEYS = {
    // All users can read all sectors and blocks using the universal read key (Key A for all sectors) - read-only:
    universalReadKeyA: "A0A1A2A3A4A5",
   
    // The default staff key for writing to the sector 39:
  staff: {
    user: {name: "User Data", neokey:"FFFFFFFFFFFF", sector: 39 },
  },
    // Admin can read/write all sectors by either:
    //  1) Knowing all factions' neoKeys, or
    //  2) Setting each sector's Key B to this same admin key (less common).
    // Usually you'd store references to all 30 faction + 3 allegiance keys in memory for the admin user.
    admin: {
      name: "admin", 
      password: "supersecret"
    },
    //All factions and allegiances have their own unique NFC key for writing to their own data sectors and blocks and are also their password to the app
    // 
    // 30 factions
    factions: {
      faction1:  { name: "Alleycat",  neoKey: "010101010101", sector: 1 },
      faction2:  { name: "The Thirteens",  neoKey: "020202020202", sector: 2 },
      faction3:  { name: "Wayward Communication Corporation",  neoKey: "030303030303", sector: 3 },
      faction4:  { name: "Terminal 418",  neoKey: "040404040404", sector: 4 },
      faction5:  { name: "The Sentinels",  neoKey: "050505050505", sector: 5 },
      faction6:  { name: "Faction #6",  neoKey: "060606060606", sector: 6 },
      faction7:  { name: "Faction #7",  neoKey: "070707070707", sector: 7 },
      faction8:  { name: "Faction #8",  neoKey: "080808080808", sector: 8 },
      faction9:  { name: "Faction #9",  neoKey: "090909090909", sector: 9 },
      faction10: { name: "Faction #10", neoKey: "0A0A0A0A0A0A", sector: 10 },
      faction11: { name: "Faction #11", neoKey: "0B0B0B0B0B0B", sector: 11 },
      faction12: { name: "Faction #12", neoKey: "0C0C0C0C0C0C", sector: 12 },
      faction13: { name: "Faction #13", neoKey: "0D0D0D0D0D0D", sector: 13 },
      faction14: { name: "Faction #14", neoKey: "0E0E0E0E0E0E", sector: 14 },
      faction15: { name: "Faction #15", neoKey: "0F0F0F0F0F0F", sector: 15 },
      faction16: { name: "Faction #16", neoKey: "101010101010", sector: 16 },
      faction17: { name: "Faction #17", neoKey: "111111111111", sector: 17 },
      faction18: { name: "Faction #18", neoKey: "121212121212", sector: 18 },
      faction19: { name: "Faction #19", neoKey: "131313131313", sector: 19 },
      faction20: { name: "Faction #20", neoKey: "141414141414", sector: 20 },
      faction21: { name: "Faction #21", neoKey: "151515151515", sector: 21 },
      faction22: { name: "Faction #22", neoKey: "161616161616", sector: 22 },
      faction23: { name: "Faction #23", neoKey: "171717171717", sector: 23 },
      faction24: { name: "Faction #24", neoKey: "181818181818", sector: 24 },
      faction25: { name: "Faction #25", neoKey: "191919191919", sector: 25 },
      faction26: { name: "Faction #26", neoKey: "1A1A1A1A1A1A", sector: 26 },
      faction27: { name: "Faction #27", neoKey: "1B1B1B1B1B1B", sector: 27 },
      faction28: { name: "Faction #28", neoKey: "1C1C1C1C1C1C", sector: 28 },
      faction29: { name: "Faction #29", neoKey: "1D1D1D1D1D1D", sector: 29 },
      faction30: { name: "Faction #30", neoKey: "1E1E1E1E1E1E", sector: 30 },
    },
   
    // 3 allegiances
    allegiances: {
      allegiance1: { name: "Endline", neoKey: "A1A1A1A1A1A1", sector: 36 },
      allegiance2: { name: "Helix", neoKey: "A2A2A2A2A2A2", sector: 37 },
      allegiance3: { name: "The Resistance", neoKey: "A3A3A3A3A3A3", sector: 38 }
    }
   };
  