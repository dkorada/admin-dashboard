import { useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

function read(): ThemeChoice {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      if (theme === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  return [theme, setTheme] as const;
}
