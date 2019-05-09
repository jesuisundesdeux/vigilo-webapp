const CONTENT_TYPE_X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded"
let requests_cache = {};
export function request(options, nocache) {
    nocache = nocache || false;
    if (typeof options == "string") {
        options = { url: options }
    }
    options.method = options.method || "GET";
    options.headers = options.headers || {};

    if (options.headers["Content-Type"] == CONTENT_TYPE_X_WWW_FORM_URLENCODED && typeof (options.body) != typeof ("")) {
        options.body = Object.entries(options.body).map(x => x[0] + "=" + encodeURIComponent(x[1])).join("&")
    }

    if (!nocache && options.method == "GET" && requests_cache[options.url] !== undefined) {
        return Promise.resolve(requests_cache[options.url]);
    } else {
        return (new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(options.method, options.url);
            for (var i in options.headers) {
                xhr.setRequestHeader(i, options.headers[i]);
            }
            xhr.onload = () => resolve(xhr);
            xhr.onerror = () => reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`);
            xhr.send(options.body);
        })).then((xhr) => {
            if (xhr.status != 200) {
                return Promise.reject()
            }
            try {
                var response = JSON.parse(xhr.responseText)
                if (response.status !== undefined && response.status != 0) {
                    throw new Error('error parsing json');
                }
                requests_cache[options.url] = response;
                return Promise.resolve(response)
            } catch (e) {
                return Promise.reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`)
            }
        });
    }

};