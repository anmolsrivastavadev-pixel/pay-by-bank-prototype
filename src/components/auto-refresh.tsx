"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-loads the page's data from the server every few seconds.
// Used while we're still waiting for the bank to answer.
export default function AutoRefresh({ everyMs = 2000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs]);
  return null;
}
