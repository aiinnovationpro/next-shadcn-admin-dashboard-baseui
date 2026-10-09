"use client";

import { useEffect, useRef, useState } from "react";

const SRC = "/dashboard/start-here/walkthrough/START-HERE.html";
const RATES = [1, 1.25, 1.5, 2];
const KEY = "walkthrough-rate";

// The page inside has no origin, so it cannot remember anything or see the app's theme. This wrapper does both:
// it passes the app's theme in the address (?theme=dark) and the remembered speed in the hash (#rate=1.5), and it
// hears speed changes back by message. The frame is drawn after mount because both are only known in the browser.
// A speed change only moves the hash, so the frame does not reload; a theme switch reloads it, at the saved speed.
export function WalkthroughFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [dark, setDark] = useState<boolean | null>(null);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const root = document.documentElement;
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (RATES.includes(saved)) setRate(saved);
    } catch {
      // storage blocked: the speed is simply not remembered
    }
    setDark(root.classList.contains("dark"));

    const watch = new MutationObserver(() => setDark(root.classList.contains("dark")));
    watch.observe(root, { attributes: true, attributeFilter: ["class"] });

    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.data?.type !== "akutu-walkthrough-rate") return;
      if (!RATES.includes(e.data.rate)) return;
      setRate(e.data.rate);
      try {
        localStorage.setItem(KEY, String(e.data.rate));
      } catch {
        // storage blocked: the speed is simply not remembered
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      watch.disconnect();
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const className = "h-[75vh] min-h-[32rem] w-full rounded-lg border";
  if (dark === null) return <div className={className} aria-hidden />;
  return (
    <iframe
      ref={frame}
      src={`${SRC}${dark ? "?theme=dark" : ""}#rate=${rate}`}
      title="Start here walkthrough"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      allow="autoplay"
      className={className}
    />
  );
}
