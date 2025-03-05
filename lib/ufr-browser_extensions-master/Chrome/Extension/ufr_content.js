function ufResponse() {
    return JSON.parse(window.sessionStorage["response"]);
}

function ufRequest(e, n) {
    var t = new CustomEvent("send-ufr", {
        detail: e,
        bubbles: !0,
        cancelable: !0
    });
    document.dispatchEvent(t);
    var u = 0;
    document.addEventListener("get-ufr", function (e) {
        0 == u && n(e), u++
    })
}
async function uFR_Response(e) {
    return new Promise(e => {
        document.addEventListener("get-ufr", function (n) {
            e(JSON.parse(window.sessionStorage.response))
        })
    })
}

function uFR_Request(e) {
    return new Promise(n => {
        request(e, async function () {
            let e = await uFR_Response();
            n(e)
        })
    })
}

function request(e, n) {
    let u = 0;
    let t = new CustomEvent("send-ufr", {
        detail: e,
        bubbles: false,
        cancelable: true
    });
    0 == u && n(e);
    u++;
    document.dispatchEvent(t);
}