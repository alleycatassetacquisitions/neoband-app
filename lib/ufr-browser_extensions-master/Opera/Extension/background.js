var port;
var tab;
var started = 0;
var tabs = "";
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status == "complete") {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.sendRequest(tab.id, { method: "getHTML" }, function(
        response
      ) {
        if (typeof response !== "undefined") {
          // ! check if response isn't [undefined]
          if (response.data == "yes") {
            tabs += tab.id + "|";
            if (started == 0) {
              port = chrome.runtime.connectNative("ufr.dlogic.opera");
              started = 1;
              // ! connecting message listener only on host connection
              var returnResponse = function(msg1) {
                msg1 = msg1.trim();
                msg1 = atob(msg1);
                msg1 = msg1.replace(/%%/g, '"');
                msg1 = msg1.replace(/&&x/g, "\\x");

                var result = {};
                if (msg1 == "Unknown command") {
                  result["Status"] = "Unknown command";
                } else {
                  var spl = msg1.split("||");

                  var i;
                  for (i = 0; i < spl.length; i++) {
                    var key = spl[i].split(" -> ")[0];
                    var val = spl[i].split(" -> ")[1];
                    result[key] = val;
                  }
                }

                chrome.tabs.query(
                  { active: true, currentWindow: true },

                  function(queriedTabs) {
                    if (queriedTabs.length > 0) {
                      chrome.tabs.sendMessage(
                        queriedTabs[0].id,
                        result,
                        function(response) {}
                      );
                    }
                  }
                );
              };
              
              port.onMessage.addListener(returnResponse); // returns uFResponse back to application
            }

            chrome.browserAction.setIcon({ path: "icon128.png" });

            chrome.tabs.onRemoved.addListener(function(tabid, removed) {
              tabs = tabs.replace(tabid + "|", "");

              if (tabs == "") {
                port.postMessage("#EXIT");
                chrome.browserAction.setIcon({ path: "icon128off.png" });
                started = 0;
              }
            });

            window.onbeforeunload = function() {
              port.postMessage("#EXIT");

              chrome.browserAction.setIcon({ path: "icon128off.png" });
              started = 0;
            };

            chrome.tabs.onActivated.addListener(function(activeInfo) {
              if (tabs.indexOf(activeInfo.tabId) !== -1) {
                chrome.browserAction.setIcon({ path: "icon128.png" });
              } else {
                chrome.browserAction.setIcon({ path: "icon128off.png" });
              }
            });
          } else {
            chrome.browserAction.setIcon({ path: "icon128off.png" });
          }
        }
      });
    });
  }
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  msg = msg.replace(/"/g, "%%");
  msg = msg.replace(/\\x/g, "&&x");

  if (msg.length % 8 == 0) {
    msg += " ";
  }

  port.postMessage(msg);
  port.onDisconnect.addListener(function() {
    console.info("Disconnected.");
  });
});
