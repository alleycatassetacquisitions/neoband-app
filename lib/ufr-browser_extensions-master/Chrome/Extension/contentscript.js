const ufrAttribute = document.getElementsByTagName("html")[0].getAttribute("ufr");
if (ufrAttribute != null) {

    const script = this.document.createElement('script')
    script.src = chrome.runtime.getURL("ufr_content.js")
    let element = (document.head || document.documentElement)
    element.appendChild(script)

    // ! listen for get-ufr event from web application
    document.addEventListener("send-ufr", function (data) {
        let request = data.detail;
        chrome.runtime.sendMessage(request);
    });

    let cal = function (response, sender, sendResponse) {
        window.sessionStorage["response"] = JSON.stringify(response);

        let event = new CustomEvent("get-ufr", { // ! send event for web app to fetch response
            bubbles: false,
            cancelable: true
        });

        document.dispatchEvent(event);
    }
    // ! listen for message from ufr extension
    chrome.runtime.onMessage.addListener(cal);

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

        if (request.method === "getHTML") {
            if (ufrAttribute != null) {
                sendResponse({ data: "yes" });
            } else {
                sendResponse({ data: "no" });
            }
        } else 
        {
            sendResponse({data: "ok"});
        }

        return true;
    });
}