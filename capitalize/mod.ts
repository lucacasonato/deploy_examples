addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handler(event.request));
});

function handler(request: Request): Response {
  if (!request.body) {
    return new Response("Request must have body!", { status: 400 });
  }

  const capitalizer = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const str = new TextDecoder().decode(chunk);
      const capitalized = str.toUpperCase();
      const resp = new TextEncoder().encode(capitalized);
      controller.enqueue(resp);
    },
  });

  const capitalizedStream = request.body.pipeThrough(capitalizer);

  return new Response(capitalizedStream, {
    headers: { "content-type": "text/plain" },
  });
}
