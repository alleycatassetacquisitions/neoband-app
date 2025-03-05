let not = true;
let not1 = true;
if (document.getElementsByTagName("html")[0].getAttribute("ufr") != null) {

    let actualCode = 'function ufResponse(){return JSON.parse(window.sessionStorage["response"]);}function ufRequest(e,n){var t=new CustomEvent("send-ufr",{detail:e,bubbles:!0,cancelable:!0});document.dispatchEvent(t);var u=0;document.addEventListener("get-ufr",function(e){0==u&&n(e),u++})}async function uFR_Response(e){return new Promise(e=>{document.addEventListener("get-ufr",function(n){e(JSON.parse(window.sessionStorage.response))})})}function uFR_Request(e){return new Promise(n=>{request(e,async function(){let e=await uFR_Response();n(e)})})}function request(e,n){let u = 0;let t = new CustomEvent("send-ufr",{detail:e,bubbles:false,cancelable:true});0==u&&n(e);u++;document.dispatchEvent(t);}';
    let script = document.createElement('script');
    script.textContent = actualCode;
    (document.head || document.documentElement).appendChild(script);
	
	  /*  let r = document.createElement("response");
		r.id="respTemporary";
		    document.body.appendChild(r);*/

    document.addEventListener("send-ufr", function (data) {
        let request = data.detail;
       // console.info(request);
       // chrome.runtime.sendMessage(request, null);
        chrome.runtime.sendMessage(request);
    });

    chrome.runtime.onMessage.addListener(function (response, sender, sendResponse) {
	
		//window.sessionStorage["response"] = JSON.stringify(response);
		window.sessionStorage["response"] = JSON.stringify(response);
		
		//let rsp = JSON.stringify(response);
	
		//document.getElementById('respTemporary').dataset.resp = rsp; 
		

		
        let event = new CustomEvent("get-ufr", {
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    });


}

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	
    if (request.method == "getHTML")
        if (document.getElementsByTagName("html")[0].getAttribute("ufr") != null) {
            sendResponse({data: "yes"})
        }
        else {
            sendResponse({data: "no"})

        }
    else
        sendResponse({});
});
