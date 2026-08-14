import Link from "next/link";
import localFont from "next/font/local";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * NOTE on font paths: next/font/local resolves `src` relative to THIS file.
 * These assume /public/font/typeform.woff2 and /public/font/reg.woff2, with
 * this file living at src/components/coming-soon-page.tsx.
 */
const typeformFont = localFont({
  src: "../../public/font/typeform.woff2",
  variable: "--font-typeform",
  weight: "700",
  display: "swap",
});
const regFont = localFont({
  src: "../../public/font/reg.woff2",
  variable: "--font-reg",
  weight: "400",
  display: "swap",
});

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <main
      style={{ fontFamily: "var(--font-reg)" }}
      className={`min-h-screen bg-app-bg text-app-text ${typeformFont.variable} ${regFont.variable}`}
    >
      <header className="border-b border-app-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/forms" style={{ fontFamily: "var(--font-typeform)" }} className="flex items-center gap-2.5 text-sm font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1c1620] text-white dark:bg-white dark:text-[#1c1620]">t.</span>
            Workspace
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/forms" className="text-sm font-semibold text-app-text-muted transition hover:text-app-accent">
              Back to forms
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-2xl place-items-center overflow-hidden px-6 text-center">
        {/* Soft ambient accent, no clutter */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6]/10 blur-[100px]" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-app-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-app-accent" />
            On the roadmap
          </span>

          <h1
            style={{ fontFamily: "var(--font-typeform)" }}
            className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl"
          >
            {title}
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-app-text-muted">
            {description}
          </p>

          <Link
            href="/forms"
            className="mt-10 inline-flex rounded-full border border-app-border px-6 py-3 text-sm font-semibold transition hover:border-app-accent hover:text-app-accent"
          >
            Return to your forms
          </Link>
        </div>
      </section>
    </main>
  );
}
