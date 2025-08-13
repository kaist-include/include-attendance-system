"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, Laptop, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const effectiveDark = theme === "dark" || (theme === "system" && getSystemPrefersDark());
  if (effectiveDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [index, setIndex] = useState<number>(0);

  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
      const cookieVal = match ? decodeURIComponent(match[1]) : null;
      const stored = (cookieVal as ThemeMode | null) ?? (localStorage.getItem("theme") as ThemeMode | null);
      if (stored === "light" || stored === "dark" || stored === "system") setMode(stored);
      else setMode("system");
    } catch {}
  }, []);

  useEffect(() => {
    applyThemeClass(mode);
    try {
      // Persist to cookie (1 year)
      document.cookie = `theme=${encodeURIComponent(mode)}; path=/; max-age=31536000; SameSite=Lax`;
      // Keep localStorage for backward compatibility
      localStorage.setItem("theme", mode);
    } catch {}
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode === "system") applyThemeClass("system");
    };
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [mode]);

  const Icon = useMemo(() => {
    if (mode === "light") return Sun;
    if (mode === "dark") return Moon;
    return Laptop;
  }, [mode]);

  const options: { label: string; value: ThemeMode; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: '라이트', value: 'light', icon: Sun },
    { label: '다크', value: 'dark', icon: Moon },
    { label: '시스템', value: 'system', icon: Laptop },
  ];

  // Keep index in sync with current mode
  useEffect(() => {
    const i = options.findIndex(o => o.value === mode);
    setIndex(i === -1 ? 0 : i);
  }, [mode]);

  return (
    <div className={cn("relative inline-block", className)}>
      <div className="flex items-center gap-2">
        <button
          aria-label="테마 이전"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={() => {
            const next = (index - 1 + options.length) % options.length;
            setMode(options[next].value);
            setIndex(next);
            window.dispatchEvent(new Event('themechange'));
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          aria-label="테마 변경"
          className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
          onClick={() => {
            const next = (index + 1) % options.length;
            setMode(options[next].value);
            setIndex(next);
            window.dispatchEvent(new Event('themechange'));
          }}
        >
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{options[index].label}</span>
        </button>

        <button
          aria-label="테마 다음"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={() => {
            const next = (index + 1) % options.length;
            setMode(options[next].value);
            setIndex(next);
            window.dispatchEvent(new Event('themechange'));
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ThemeToggle;


