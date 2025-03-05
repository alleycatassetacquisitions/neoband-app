let port;
let started = false;
let tabs = new Set();

chrome.action.setIcon({ path: "/icons/ufr_icon_off_128.png" });

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

  if (changeInfo.status === 'complete') {
    chrome.tabs.query({ active: true, currentWindow: true }, (queriedTabs) => {
      const currentTab = queriedTabs[0];
      if (!currentTab) return;

      chrome.tabs.sendMessage(currentTab.id, { method: "getHTML" },
        (results) => {
          if (chrome.runtime.lastError) {
            console.warn("getHtml error: ", chrome.runtime.lastError.message);
            return;
          }

          if (typeof results !== "undefined") {
            const response = results.data;
            if (response === 'yes') {
              tabs.add(currentTab.id);
              if (!started) {
                port = chrome.runtime.connectNative('ufr.dlogic.chrome');
                started = true;

                if (port !== "undefined") {
                  port.onDisconnect.addListener(() => {
                    //console.info('Disconnected.');
                    started = false;
                  });
                }

                port.onMessage.addListener((msg1) => {
                  msg1 = msg1.trim();
                  msg1 = atob(msg1);
                  msg1 = msg1.replace(/%%/g, '"');
                  msg1 = msg1.replace(/&&x/g, '\\x');
                  //console.log("Shell replied: ", msg1);

                  let result = {};
                  if (msg1 === 'Unknown command') {
                    result['Status'] = 'Unknown command';
                  } else {
                    const spl = msg1.split('||');
                    for (let i = 0; i < spl.length; i++) {
                      const keyVal = spl[i].split(' -> ');
                      result[keyVal[0]] = keyVal[1];
                    }
                  }
                  chrome.tabs.query({ active: true, currentWindow: true }, (queriedRspTabs) => {
                    chrome.tabs.sendMessage(
                      queriedRspTabs[0].id,
                      result,
                      function (rsp) { }
                    );
                  });

                });
              }
              chrome.action.setIcon({ path: "/icons/ufr_icon_on_128.png" });
            } else {
              chrome.browserAction.setIcon({ path: 'icon128off.png' });
            }
          }
        });
    });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (tabs.has(activeInfo.tabId)) {
    chrome.action.setIcon({ path: "/icons/ufr_icon_on_128.png" });
  } else {
    chrome.action.setIcon({ path: "/icons/ufr_icon_off_128.png" });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  msg = msg.replace(/"/g, '%%');
  msg = msg.replace(/\\x/g, '&&x');

  if (msg.length % 8 === 0) {
    msg += ' ';
  }

  port.postMessage(msg);
});

chrome.tabs.onRemoved.addListener((tabId, removed) => {
  tabs.delete(tabId);

  if (tabs.size === 0) {
    port.postMessage('#EXIT');
    chrome.action.setIcon({ path: "/icons/ufr_icon_off_128.png" });
    started = false;
  }
});

chrome.runtime.onConnect.addListener((externalPort) => {
  externalPort.onDisconnect.addListener(() => {
    console.info('Disconnected.');
    started = false;
  });
});
