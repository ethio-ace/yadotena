"use client";

import { useCallback, useState } from "react";

const KEY = "yadotena.sidebar.collapsed";

/**
 * Sidebar collapse state persisted in localStorage so the sidebar does not
 * "jump" between expanded and collapsed when moving between the role shells
 * and pages rendered in the shared chrome.
 */
export function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return { isCollapsed, toggle };
}
