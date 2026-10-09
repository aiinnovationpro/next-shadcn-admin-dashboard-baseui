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
