"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const value = window.localStorage.getItem("typeform_theme") === "dark"; setDark(value); document.documentElement.classList.toggle("dark", value); }, []);
  function toggle() { const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); window.localStorage.setItem("typeform_theme", next ? "dark" : "light"); }
  return <button onClick={toggle} aria-label="Toggle dark mode" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-[#635bff] dark:border-slate-700 dark:text-slate-300">{dark ? "Light mode" : "Dark mode"}</button>;
}
