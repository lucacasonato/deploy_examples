addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handler(event.request));
});

function handler(request: Request): Response {
  console.log(`${request.method} ${request.url}`);
  return new Response("Hello World", {
    headers: { "content-type": "text/plain" },
  });
}
