import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "stacks-skin-v5";

function apply(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === "dark") {
        setTheme("dark");
        apply("dark");
      } else {
        setTheme("light");
        apply("light");
      }
    } catch {
      apply("light");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? "grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg"}
      aria-label={theme === "light" ? "Switch to dark skin" : "Switch to light skin"}
      title={theme === "light" ? "Dark skin" : "Light skin"}
    >
      {theme === "light" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
    </button>
  );
}
