// What the Start Here route adds to the workspace's START-HERE.html on its way out. The workspace file is never
// changed; this is HTML in, HTML out. Both pieces are owned by this app, not read from the workspace.

const MARK = "data-akutu-injected";

// Plays the walkthrough video and wires the speed buttons the page already has. The frame has no origin, so it
// cannot keep the speed itself: it reads the speed from the address (#rate=1.5) and tells the page around it.
const SCRIPT = `(function () {
  var v = document.getElementById("deckvideo");
  if (!v) return;
  var bar = document.querySelector(".deckspeed");
  var m = /rate=([0-9.]+)/.exec(location.hash);
  var rate = m ? parseFloat(m[1]) : 1;
  if (!(rate >= 1 && rate <= 2)) rate = 1;
  function apply(r) {
    rate = r;
    v.playbackRate = r;
    if (bar) bar.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("on", parseFloat(b.dataset.rate) === r);
    });
  }
  apply(rate);
  v.addEventListener("loadedmetadata", function () { v.playbackRate = rate; });
  if (bar) bar.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-rate]");
    if (!b) return;
    apply(parseFloat(b.dataset.rate));
    parent.postMessage({ type: "akutu-walkthrough-rate", rate: rate }, "*");
  });
  v.play().catch(function () {
    v.muted = true;
    v.play().catch(function () {});
  });
})();`;

// The page paints itself from these variables, so redefining them turns it dark and leaves the video and the
// pictures alone. The few colours the page writes out by hand are overridden below.
const DARK_CSS = `:root {
  color-scheme: dark;
  --bg: #121614;
  --card: #1a201d;
  --border: #2a322e;
  --border-strong: #3b4540;
  --text: #e8efeb;
  --text-2: #b9c5be;
  --text-3: #8d9993;
  --brand: #4cc796;
  --brand-deep: #8fdcb9;
  --brand-soft: #1c2c25;
  --sev-red: #f08a7e;
  --red-soft: #3a1f1b;
  --red-border: #6b3a34;
  --red-deep: #f4a99f;
  --sev-amber: #f0a766;
  --amber-soft: #3a2a17;
  --amber-border: #6b4c25;
  --amber-deep: #f3bf8c;
  --shadow-1: none;
  --shadow-2: none;
}
.deckspeed button.on, .plan-hd .plan-n, .ev details.mb summary { color: #0b1f17; }
details.kpi.wide .kpi-ico { background: var(--card); }`;

/** Add the walkthrough script, and the dark style when asked, before the last closing body tag. Idempotent. */
export function injectStartHere(html: string, { dark }: { dark: boolean }): string {
  if (html.includes(MARK)) return html;
  const extra = `${dark ? `<style ${MARK}>${DARK_CSS}</style>` : ""}<script ${MARK}>${SCRIPT}</script>`;
  const last = [...html.matchAll(/<\/body\s*>/gi)].at(-1);
  return last ? html.slice(0, last.index) + extra + html.slice(last.index) : html + extra;
}
