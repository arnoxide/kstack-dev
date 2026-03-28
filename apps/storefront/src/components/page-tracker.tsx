"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

function getSessionId(): string {
  const key = "kstack_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export function PageTracker({ tenantId }: { tenantId: string }) {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    try {
      const sessionId = getSessionId();
      const referrer = document.referrer || undefined;
      api.analytics.track.mutate({ tenantId, path: pathname, referrer, sessionId }).catch(() => {
        // fire-and-forget; ignore errors
      });
    } catch {
      // sessionStorage not available (SSR guard)
    }
  }, [pathname, tenantId]);

  return null;
}
