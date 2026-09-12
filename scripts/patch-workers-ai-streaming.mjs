import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "node_modules/workers-ai-provider/dist/index.mjs");

const marker =
  "if (Array.isArray(deltaToolCalls)) {\n\t\t\t\t\tif (reasoningId) {";
const patch =
  "if (Array.isArray(deltaToolCalls) && !nativeToolCallsInChunk) {\n\t\t\t\t\tif (reasoningId) {";

const chunkMarker = "if (Array.isArray(chunk.tool_calls)) {";
const chunkPatch =
  "let nativeToolCallsInChunk = false;\n\t\t\tif (Array.isArray(chunk.tool_calls)) {\n\t\t\t\tnativeToolCallsInChunk = true;";

let source = readFileSync(target, "utf8");

if (source.includes("nativeToolCallsInChunk")) {
  process.exit(0);
}

if (!source.includes(chunkMarker) || !source.includes(marker)) {
  console.warn(
    "[patch-workers-ai-streaming] workers-ai-provider layout changed; skipping patch"
  );
  process.exit(0);
}

source = source.replace(chunkMarker, chunkPatch);
source = source.replace(marker, patch);
writeFileSync(target, source);
console.log("[patch-workers-ai-streaming] applied duplicate tool-call guard");
