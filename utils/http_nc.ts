// This is a version of the unix `nc` (netcat) utility that works ontop of
// HTTP streams instead of TCP.

/// <reference lib="deno.window" />

import {
  readableStreamFromAsyncIterator,
  readerFromStreamReader,
} from "https://deno.land/std@0.87.0/io/streams.ts";

Deno.setRaw(Deno.stdin.rid, true, { cbreak: true });

const resp = await fetch(Deno.args[0], {
  method: "POST",
  body: readableStreamFromAsyncIterator(Deno.iter(Deno.stdin)),
});

if (resp.status !== 200) {
  console.error("Failed to connect!");
  Deno.exit(1);
}

if (resp.body) {
  Deno.copy(readerFromStreamReader(resp.body!.getReader()), Deno.stdout);
}
