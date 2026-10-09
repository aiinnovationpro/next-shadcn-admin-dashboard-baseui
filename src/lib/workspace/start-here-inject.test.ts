import { injectStartHere } from "./start-here-inject.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

const MARK = "data-akutu-injected";
const count = (s: string, needle: string) => s.split(needle).length - 1;

test("goes in before the last closing body tag, not an earlier mention of it", () => {
  const html = '<html><body><p>write &lt;/body&gt; as text</p><script>var s="</body>";</script><i>x</i></body></html>';
  const out = injectStartHere(html, { dark: false });
  const at = out.indexOf(`<script ${MARK}>`);
  assert.ok(at > out.indexOf("<i>x</i>"), "after the page's own content");
  assert.ok(out.endsWith("</body></html>"));
  assert.equal(out.slice(0, at) + out.slice(out.indexOf("</script>", at) + 9), html);
});

test("matches the closing tag whatever its case or spacing", () => {
  const out = injectStartHere("<BODY><p>x</p></BODY >", { dark: false });
  assert.ok(out.indexOf(`<script ${MARK}>`) < out.indexOf("</BODY >"));
});

test("a page without a closing body tag still gets the script, at the end", () => {
  const out = injectStartHere("<p>no body tag", { dark: false });
  assert.ok(out.startsWith("<p>no body tag<script"));
});

test("injecting twice changes nothing the second time", () => {
  for (const dark of [false, true]) {
    const once = injectStartHere("<body>x</body>", { dark });
    assert.equal(injectStartHere(once, { dark }), once);
    assert.equal(count(once, `<script ${MARK}>`), 1);
  }
});

test("the dark style is added only when asked, the script always", () => {
  const light = injectStartHere("<body>x</body>", { dark: false });
  const dark = injectStartHere("<body>x</body>", { dark: true });
  assert.equal(count(light, "<style"), 0);
  assert.equal(count(dark, "<style"), 1);
  assert.equal(count(light, "<script"), 1);
  assert.equal(count(dark, "<script"), 1);
});

test("the script cannot be cut short by its own text, and reaches nothing outside the frame", () => {
  const out = injectStartHere("<body></body>", { dark: true });
  const script = out.slice(out.indexOf(`<script ${MARK}>`) + 22, out.lastIndexOf("</script>"));
  assert.equal(script.includes("</"), false);
  assert.equal(/localStorage|sessionStorage|document\.cookie/.test(script), false);
});
