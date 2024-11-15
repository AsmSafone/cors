export default {
  async fetch(request: Request): Promise<Response> {
    const reqHeaders = new Headers(request.headers);
    const response: {
      body: BodyInit | null;
      contentType: string | null;
      status: number;
      text: string;
      headers: Headers;
    } = {
      body: null,
      contentType: null,
      status: 200,
      text: "OK",
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          reqHeaders.get("Access-Control-Allow-Headers") ||
          "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token",
      }),
    };

    try {
      // get rid of https://
      let url = request.url.substring(8);
      // decode the original request url
      url = decodeURIComponent(url.substring(url.indexOf("/") + 1));

      if (
        request.method == "OPTIONS" ||
        url.length < 3 ||
        url.indexOf(".") == -1 ||
        url == "favicon.ico" ||
        url == "robots.txt"
      ) {
        const invalid = !(request.method == "OPTIONS" || url.length === 0);
        response.body = await getHelp(new URL(request.url));
        response.contentType = "text/html";
        response.status = invalid ? 400 : 200;
      } else {
        url = fixUrl(url);

        let fetchRequest: {
          headers: Headers;
          method: string;
          body?: BodyInit;
        } = {
          method: request.method,
          headers: new Headers(),
        };

        const dropHeaders = ["content-length", "content-type", "host"];
        for (let [key, value] of reqHeaders.entries()) {
          if (!dropHeaders.includes(key)) {
            fetchRequest.headers.set(key, value);
          }
        }

        if (["POST", "PUT", "PATCH", "DELETE"].indexOf(request.method) >= 0) {
          const ct = (reqHeaders.get("content-type") || "").toLowerCase();
          if (ct.includes("application/json")) {
            fetchRequest.body = JSON.stringify(await request.json());
          } else if (
            ct.includes("application/text") ||
            ct.includes("text/html")
          ) {
            fetchRequest.body = await request.text();
          } else if (ct.includes("form")) {
            fetchRequest.body = await request.formData();
          } else {
            fetchRequest.body = await request.blob();
          }
        }

        let fetchResponse = await fetch(url, fetchRequest);
        response.contentType = fetchResponse.headers.get("content-type");
        response.status = fetchResponse.status;
        response.text = fetchResponse.statusText;
        response.body = fetchResponse.body;

      }
    } catch (err) {
      if (err instanceof Error) {
        response.contentType = "application/json";
        response.body = JSON.stringify({
          code: -1,
          msg: JSON.stringify(err.stack) || err,
        });
        response.status = 500;
      }
    }

    if (response.contentType && response.contentType != "") {
      response.headers.set("content-type", response.contentType);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.text,
      headers: response.headers,
    });
  },
};

function fixUrl(url: string) {
  if (url.includes("://")) {
    return url;
  } else if (url.includes(":/")) {
    return url.replace(":/", "://");
  } else {
    return "http://" + url;
  }
}

async function getHelp(url: URL) {
  return `<!DOCTYPE html>
  <html>
	<head>
	  <title>Safone's CORS Proxy</title>
	  <style>
		body {
		  font-family: "Courier New", Courier, monospace;
		}
	  </style>
	</head>
	<body>
	  <p>Welcome to Safone's CORS Proxy!</p>
	  <p>
    This enables cross-origin requests to anywhere.
    <br>
		You can use this proxy to bypass CORS in the browser.
	  </p>
	  <p>USAGE:</p>
	  <p>
		&nbsp;&nbsp;&nbsp;&nbsp;${url.protocol}//${url.hostname}/&lt;url-to-resource&gt;
	  </p>
	  <p>EXAMPLES:</p>
	  <p>&nbsp;&nbsp;&nbsp;&nbsp;${url.protocol}//${url.hostname}/https://api.github.com/repos/AsmSafone/SafoneAPI</p>
	  <p>&nbsp;&nbsp;&nbsp;&nbsp;${url.protocol}//${url.hostname}/https://api.github.com/repos/AsmSafone/SafoneAPI/releases</p>
    <br/>
    <footer>
      <p align="center">
        <a href="https://github.com/AsmSafone">GitHub Repository</a>
        | <a href="https://buymeacoffee.com/safone">Buy Me a Coffee!</a>
      </p>
    </footer>
	</body>
  </html>
  `;
}
