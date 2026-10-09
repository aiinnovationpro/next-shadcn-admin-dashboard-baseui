"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

// Re-renders the open page when a workspace file changes. The timer keeps the "x min ago" source ages honest.
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const events = new EventSource("/api/workspace-events");
    events.onmessage = () => router.refresh();
    const timer = setInterval(() => router.refresh(), 60_000);
    return () => {
      events.close();
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
