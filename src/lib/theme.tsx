import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Mode = "dark" | "light";
type Ctx = { mode: Mode; toggle: () => void };

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Mode | null;
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", mode === "light");
    root.classList.toggle("dark", mode === "dark");
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => {
      const next = m === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ mode, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
