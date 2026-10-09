import { startHereFile } from "./start-here-files.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

test("the walkthrough page and the deck's files are served", () => {
  assert.equal(startHereFile(["START-HERE.html"])?.path, "START-HERE.html");
  assert.equal(startHereFile(["reference", "start-here-deck", "slide-11.html"])?.type, "text/html; charset=utf-8");
  assert.equal(startHereFile(["reference", "start-here-deck", "start-here-walkthrough.mp4"])?.type, "video/mp4");
});

test("anything else is refused, traversal included", () => {
  assert.equal(startHereFile([]), undefined);
  assert.equal(startHereFile(["context", "STATUS.md"]), undefined);
  assert.equal(startHereFile(["..", "START-HERE.html"]), undefined);
  assert.equal(startHereFile(["reference", "..", "context", "STATUS.md"]), undefined);
  assert.equal(startHereFile(["..%2fSTART-HERE.html"]), undefined);
  assert.equal(startHereFile(["reference", "start-here-deck", "slide-12.html"]), undefined);
  assert.equal(startHereFile(["START-HERE.html/"]), undefined);
});

test("no page is ever given the app's origin, and only the walkthrough may run a script besides the deck", () => {
  assert.match(
    startHereFile(["START-HERE.html"])?.sandbox ?? "",
    /^allow-scripts allow-popups allow-popups-to-escape-sandbox$/,
  );
  for (const name of [
    "START-HERE.html",
    "reference/start-here-deck/index.html",
    "reference/start-here-deck/slide-1.html",
  ]) {
    const sandbox = startHereFile(name.split("/"))?.sandbox ?? "";
    assert.ok(sandbox, `${name} is sandboxed`);
    assert.equal(sandbox.includes("allow-same-origin"), false, name);
  }
});
