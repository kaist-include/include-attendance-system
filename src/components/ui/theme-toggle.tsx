"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, Laptop } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme") as ThemeMode | null;
      if (stored === "light" || stored === "dark") setMode(stored);
      else setMode("system");
    } catch {}
  }, []);

  useEffect(() => {
    applyThemeClass(mode);
    try {
      if (mode === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", mode);
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

  return (
    <div className={cn("relative", className)}>
      <button
        aria-label="테마 변경"
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className="w-5 h-5" />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-40 rounded-md border border-border bg-card text-card-foreground shadow z-50"
          role="menu"
        >
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-t-md hover:bg-accent hover:text-accent-foreground",
              mode === "light" && "bg-accent/60"
            )}
            onClick={() => {
              setMode("light");
              setOpen(false);
            }}
          >
            <Sun className="w-4 h-4" /> 라이트
          </button>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
              mode === "dark" && "bg-accent/60"
            )}
            onClick={() => {
              setMode("dark");
              setOpen(false);
            }}
          >
            <Moon className="w-4 h-4" /> 다크
          </button>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-b-md hover:bg-accent hover:text-accent-foreground",
              mode === "system" && "bg-accent/60"
            )}
            onClick={() => {
              setMode("system");
              setOpen(false);
            }}
          >
            <Laptop className="w-4 h-4" /> 시스템
          </button>
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;


