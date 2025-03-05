let port;
let tab;
let started = 0;
let tabs = "";
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status == "complete") {
    browser.tabs.sendMessage(tab.id, { method: "getHTML" }, function(response) {
      if (typeof response !== "undefined") {
        if (response.data == "yes") {
          tabs += tab.id + "|";
          if (started == 0) {
            port = browser.runtime.connectNative("dlogic");
            console.log("port:" + port);
            started = 1;

            let returnResponse = function(msg1) {
              msg1 = msg1.trim();
              msg1 = atob(msg1);
              msg1 = msg1.replace(/%%/g, '"');
              msg1 = msg1.replace(/&&x/g, "\\x");

              let result = {};
              if (msg1 == "Unknown command") {
                result["Status"] = "Unknown command";
              } else {
                let spl = msg1.split("||");

                let i;
                for (i = 0; i < spl.length; i++) {
                  let key = spl[i].split(" -> ")[0];
                  let val = spl[i].split(" -> ")[1];
                  result[key] = val;
                }
              }

              browser.tabs.query(
                { active: true, currentWindow: true },
                function(tabs) {
                  let t = tabs[0];
                  browser.tabs.sendMessage(t.id, result, function(response) {});
                }
              );
            };

            port.onMessage.addListener(returnResponse);
          }

          chrome.browserAction.setIcon({ path: "icon128.png" });

          chrome.tabs.onRemoved.addListener(function(tabid, removed) {
            tabs = tabs.replace(tabid + "|", "");

            if (tabs == "") {
              /* let close = {};
                            close.command = "#EXIT";
                            port.postMessage(close.command);*/
              port.postMessage("#EXIT");
              chrome.browserAction.setIcon({ path: "icon128off.png" });
              started = 0;
            }
          });

          window.onbeforeunload = function() {
            /* let close = {};
                        close.command = "#EXIT";
                        port.postMessage(close.command);*/
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
