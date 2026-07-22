import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const portableDefault =
  'return getSetting(runtime, "X402_ARTIFACT_ROOT") || ".nishvault-artifacts";';

test("source and package build force a portable artifact root", async () => {
  const [source, dist] = await Promise.all([
    readFile(new URL("../src/index.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/index.js", import.meta.url), "utf8"),
  ]);

  assert.ok(source.includes(portableDefault));
  assert.ok(dist.includes(portableDefault));
  assert.doesNotMatch(source, /\/Users\/rasimcakir\/Developer\/fikirbul/);
  assert.doesNotMatch(dist, /\/Users\/rasimcakir\/Developer\/fikirbul/);
});
