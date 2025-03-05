if (document.getElementsByTagName("html")[0].getAttribute("ufr") != null) {

    let actualCode = 'function ufResponse(){return JSON.parse(window.sessionStorage["response"]);}function ufRequest(e,n){var t=new CustomEvent("send-ufr",{detail:e,bubbles:!0,cancelable:!0});document.dispatchEvent(t);var u=0;document.addEventListener("get-ufr",function(e){0==u&&n(e),u++})}async function uFR_Response(e){return new Promise(e=>{document.addEventListener("get-ufr",function(n){e(JSON.parse(window.sessionStorage.response))})})}function uFR_Request(e){return new Promise(n=>{request(e,async function(){let e=await uFR_Response();n(e)})})}function request(e,n){let u = 0;let t = new CustomEvent("send-ufr",{detail:e,bubbles:false,cancelable:true});0==u&&n(e);u++;document.dispatchEvent(t);}';
    let script = document.createElement('script');
    script.textContent = actualCode;
    (document.head || document.documentElement).appendChild(script);

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

    // ! Below code used for fetching 'ufr' tag from HTML
    chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
        if (request.method == "getHTML")
            if (document.getElementsByTagName("html")[0].getAttribute("ufr") != null) {
                sendResponse({ data: "yes" })
            }
            else {
                sendResponse({ data: "no" })
            }
    });

}