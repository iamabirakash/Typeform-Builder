"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const value = window.localStorage.getItem("typeform_theme") === "dark";
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("typeform_theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="Toggle dark mode"
      className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full transition-colors duration-300 ${
        dark ? "bg-[#1c1620]" : "bg-[#f3e6ff]"
      } ${mounted ? "" : "opacity-0"}`}
    >
      {/* Track icons */}
      <span className="absolute left-2 text-xs text-[#8b5cf6]">☀</span>
      <span className="absolute right-2 text-xs text-white/60">☾</span>

      {/* Sliding knob */}
      <span
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-full bg-app-surface text-xs shadow-md transition-transform duration-300 ease-out ${
          dark ? "translate-x-8" : "translate-x-1"
        }`}
      >
        {dark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}