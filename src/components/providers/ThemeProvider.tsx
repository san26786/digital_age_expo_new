"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

/** localStorage key. Namespaced so it cannot collide with a hub site on the same origin. */
export const THEME_STORAGE_KEY = "dae-theme";

/**
 * Runs BEFORE first paint, as the first child of <body>.
 *
 * This is the only part of the theme that cannot be a React component. React renders after the
 * document has been parsed, so a provider that set `data-theme` in an effect would leave the
 * browser painting the default (dark) theme first and then repainting — the white-flash-on-load
 * that makes a theme toggle feel broken. A blocking inline script at the top of <body> runs while
 * the rest of the document is still being parsed, so the correct attribute is on <html> before
 * anything is drawn.
 *
 * The order it resolves the theme in matters:
 *   1. an explicit choice in localStorage — the person decided, so nothing overrides it;
 *   2. the operating system's `prefers-color-scheme`;
 *   3. dark, this site's original and default appearance.
 *
 * It is wrapped in try/catch because localStorage throws outright in Safari's private mode and
 * under some cookie-blocking settings. A theme is decoration: it must never be the reason a page
 * fails to render.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY
)};var s=null;try{s=window.localStorage.getItem(k);}catch(e){}var t=(s==="light"||s==="dark")?s:((window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches)?"light":"dark");var e=document.documentElement;e.setAttribute("data-theme",t);e.classList.toggle("dark",t==="dark");}catch(err){document.documentElement.setAttribute("data-theme","dark");}})();`;

interface ThemeContextValue {
  theme: Theme;
  /** False until the client has read the real theme off <html>. */
  mounted: boolean;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  mounted: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  /*
   * Seeded with "dark" rather than with readTheme(), deliberately.
   *
   * The server renders this tree too, and there it has no way to know what the visitor chose —
   * so the server's HTML always says dark. If the client seeded state from the DOM instead, the
   * first client render could disagree with the server's and React would report a hydration
   * mismatch. Reading the real value in an effect keeps the first render identical on both sides.
   *
   * Nothing flickers as a result, because no visible styling is driven from this state: the
   * appearance comes from `data-theme` on <html>, which the inline script already set. This
   * state exists only so the toggle can label itself and announce `aria-checked`.
   */
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(readTheme());
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;

    /*
     * The cross-fade is a class that lives for the length of the change and is then removed,
     * not a standing `transition` on every element. A permanent one competes with every hover
     * and focus transition in the app and makes the whole interface feel a frame behind.
     */
    root.classList.add("theme-switching");
    root.setAttribute("data-theme", next);
    root.classList.toggle("dark", next === "dark");

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Private mode, or storage blocked. The theme still applies for this page view. */
    }

    window.setTimeout(() => root.classList.remove("theme-switching"), 320);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  /*
   * Follow the OS while the visitor has not made a choice of their own. Once they have used the
   * toggle, localStorage holds a value and their choice wins for good.
   */
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (event: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      if (stored === "light" || stored === "dark") return;

      const next: Theme = event.matches ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      setThemeState(next);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mounted, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
