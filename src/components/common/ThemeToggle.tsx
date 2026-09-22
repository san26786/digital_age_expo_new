"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

/**
 * Light / dark switch.
 *
 * WHY THE ICONS ARE SWAPPED BY CSS AND NOT BY REACT
 * -------------------------------------------------
 * Both icons are always rendered, and which one is visible is decided by
 * `:root[data-theme]` rules in globals.css rather than by a ternary on React state.
 *
 * That is not a stylistic choice. The server cannot know which theme this visitor picked, so a
 * ternary would render the dark-mode icon on the server and, for someone on light, the light one
 * on the client — a hydration mismatch on every single page load. Worse, it would show the wrong
 * icon for the few hundred milliseconds before hydration, on a control whose entire job is to
 * report the current state.
 *
 * Driving it from the attribute that the blocking init script has already set means the correct
 * icon is painted in the very first frame, before React has run at all.
 *
 * The icon shown is the one you are switching TO — a sun in dark mode reads as "turn the lights
 * on" — which is the convention on GitHub, Tailwind's own docs and most editors.
 *
 * `role="switch"` with `aria-checked` rather than a plain button: a screen reader then announces
 * the state as well as the action. `aria-checked` tracks React state, which is correct — it is
 * only read after hydration, and `mounted` keeps it honest until then.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mounted ? !isDark : undefined}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
      className={`
        group relative inline-flex h-9 w-9 shrink-0 items-center justify-center
        rounded-xl border border-white/10 bg-white/5
        text-zinc-400 transition-all duration-200
        hover:-translate-y-px hover:border-white/20 hover:bg-white/10 hover:text-white
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/70
        ${className}
      `}
    >
      <span className="relative block h-[18px] w-[18px]">
        <Sun
          className="theme-toggle-icon theme-toggle-sun absolute inset-0 h-[18px] w-[18px]"
          aria-hidden="true"
        />
        <Moon
          className="theme-toggle-icon theme-toggle-moon absolute inset-0 h-[18px] w-[18px]"
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
