#!/usr/bin/env -S deno run -A

/// <reference lib="deno.window" />

import { resolve, toFileUrl } from "https://deno.land/std@0.87.0/path/mod.ts";
import { yellow } from "https://deno.land/std@0.87.0/fmt/colors.ts";

function error(message: string): never {
  console.log(`%cerror%c: ${message}`, "color:red", "");
  Deno.exit(1);
}

function loaderCode(script: string, addr: string) {
  const loader = `import type {} from "${new URL(
    "../deploy.d.ts",
    import.meta.url
  )}";import "${toFileUrl(script)}";`;
  const runtime = `import {serve} from "${new URL(
    "./runtime.bundle.js",
    import.meta.url
  )}";serve("${addr}");await import("data:application/typescript;base64,${btoa(
    loader
  )}");`;
  return runtime;
}

let script = Deno.args[Deno.args.length - 1];
const noCheck = Deno.args.includes("--no-check");
if (!script) error("First argument must be a filepath.");
script = resolve(Deno.cwd(), script);
try {
  await Deno.stat(script);
} catch (err) {
  if (!script) error(err.toString());
}

const dataURL = loaderCode(script, ":8080");

async function analyzeDeps(script: string): Promise<string[]> {
  const proc = Deno.run({
    cmd: [Deno.execPath(), "info", "--json", "--unstable", script],
    stdout: "piped",
  });
  const status = await proc.status();
  if (!status) throw new Error("Failed to analyze dependencies.");
  const raw = await proc.output();
  const json = JSON.parse(new TextDecoder().decode(raw));
  const files = Object.keys(json.files);
  return files
    .filter((file) => file.startsWith("file://"))
    .map((file) => file.slice(7));
}

function startProc() {
  return Deno.run({
    cmd: [
      Deno.execPath(),
      "eval",
      "--config",
      tsconfig,
      ...(noCheck ? [] : []),
      dataURL,
    ],
  });
}

const tsconfig = await Deno.makeTempFile({
  prefix: "tsconfig-",
  suffix: ".json",
});
await Deno.writeTextFile(
  tsconfig,
  JSON.stringify({
    compilerOptions: {
      lib: [],
      jsxFactory: "h",
      jsxFragmentFactory: "Fragment",
    },
  })
);

let deps = await analyzeDeps(script);
let proc = startProc();
let debouncer = null;

while (true) {
  const watcher = Deno.watchFs(deps);
  for await (const event of watcher) {
    if (typeof debouncer == "number") clearTimeout(debouncer);
    debouncer = setTimeout(async () => {
      console.log(yellow(`${event.paths[0]} changed. Restarting...`));
      if (proc) {
        proc.close();
      }
      proc = startProc();
      try {
        const newDeps = await analyzeDeps(script);
        const depsChanged = new Set([...deps, ...newDeps]).size;
        if (depsChanged) {
          deps = newDeps;
          watcher.return?.();
        }
      } catch {
        // ignore the error
      }
    }, 100);
  }
}
