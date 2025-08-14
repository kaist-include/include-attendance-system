"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type ThemeMode = "light" | "dark" | "system";

function getStoredTheme(): ThemeMode | null {
  try {
    const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
    const cookieVal = match ? decodeURIComponent(match[1]) : null;
    const stored = (cookieVal as ThemeMode | null) ?? (localStorage.getItem("theme") as ThemeMode | null);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    return null;
  } catch {
    return null;
  }
}

function applyTheme(theme: ThemeMode | null) {
  const systemDark = typeof window !== "undefined" && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveDark = theme === "dark" || (theme === "system" && systemDark);
  if (effectiveDark) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

export default function ThemeProvider() {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, [pathname]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(getStoredTheme());
    mql.addEventListener?.('change', onChange);
    window.addEventListener('storage', onChange);
    window.addEventListener('themechange', onChange as EventListener);
    return () => {
      mql.removeEventListener?.('change', onChange);
      window.removeEventListener('storage', onChange);
      window.removeEventListener('themechange', onChange as EventListener);
    };
  }, []);

  return null;
}


