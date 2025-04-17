/*  credentialManager.js
    Minimal lookup + state helper for NeoBand App
    --------------------------------------------------------------*/
/* global NEOBAND_KEYS */
(function (g) {

    /* 1.  Pull keys from keys.js if it exists — otherwise
           fall back to a tiny hard‑coded default so the file
           never throws in dev environments.                           */
    const SRC = g.NEOBAND_KEYS || {
          staffKey : "FFFFFFFFFFFF",
          admin    : { neoKey: "ADADADADADAD" },
          factions : {}, allegiances : {}
        };
  
    /* 2.  Flatten into one fast lookup table:  name → {type,key,…}   */
    const T = Object.create(null);
  
    T.staff = { type:'staff',  key:SRC.staffKey };
  
    T.admin = { type:'admin',  key:SRC.admin.neoKey };
  
    Object.values(SRC.factions).forEach(f =>
        T[f.name.toLowerCase()] =
          { type:'faction',     key:f.neoKey, sector:f.sector, id:f.name });
  
    Object.values(SRC.allegiances).forEach(a =>
        T[a.name.toLowerCase()] =
          { type:'allegiance',  key:a.neoKey, sector:a.sector, id:a.name });
  
    /* 3.  Public helpers:   lookup(name)   use(name)   active()      */
    let current = null;
  
    function lookup(name){
        return name ? T[name.trim().toLowerCase()] || null : null;
    }
  
    function use(name){
        current = lookup(name);
        return current;                 // null if unknown
    }
  
    function active(){ return current; }
  
    /* 4.  Expose on window                                 */
    g.CredentialMgr = { lookup, use, active };
  
  })(window);
  