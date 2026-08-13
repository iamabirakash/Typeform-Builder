"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import localFont from "next/font/local";
import { API_URL, api, saveToken } from "@/lib/api";

/**
 * NOTE on font paths: next/font/local resolves `src` relative to THIS file.
 * These paths point to the local files in /public/font.
 * and that this file lives two directories below the project root
 * (e.g. app/auth/page.tsx). Adjust the "../../" if your file sits elsewhere.
 */
const typeformFont = localFont({
  src: "../../../public/font/typeform.woff2",
  variable: "--font-typeform",
  weight: "700",
  display: "swap",
});
const regFont = localFont({
  src: "../../../public/font/reg.woff2",
  variable: "--font-reg",
  weight: "400",
  display: "swap",
});

const slides = [
  {
    eyebrow: "Contacts & Automations",
    title: "Trigger actions that drive growth",
    accent: "from-[#f3e6ff] to-[#e9d6ff]",
    badge: "#8b5cf6",
  },
  {
    eyebrow: "Forms & Surveys",
    title: "Ask questions people actually answer",
    accent: "from-[#ffe9f2] to-[#ffd6e8]",
    badge: "#ec4899",
  },
  {
    eyebrow: "Analytics & Insights",
    title: "See what your data is telling you",
    accent: "from-[#e6f7ff] to-[#d6f0ff]",
    badge: "#0ea5e9",
  },
  {
    eyebrow: "Quizzes & Scoring",
    title: "Turn answers into personalized results",
    accent: "from-[#fff3d6] to-[#ffe8b3]",
    badge: "#d97706",
  },
  {
    eyebrow: "Payments",
    title: "Collect payments right inside a form",
    accent: "from-[#e6ffee] to-[#d0ffe0]",
    badge: "#16a34a",
  },
  {
    eyebrow: "Team Workspaces",
    title: "Build and share forms with your team",
    accent: "from-[#ece6ff] to-[#dcd0ff]",
    badge: "#6366f1",
  },
];

const trustedLogos = ["Amplitude", "Mailchimp", "HubSpot", "airbnb"];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (params.get("mode") === "signup") setMode("signup");
    if (token) {
      saveToken(token);
      router.replace(params.get("next") || "/forms");
    }
  }, [router]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [playing]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api<{ access_token: string }>(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }),
      });
      saveToken(result.access_token);
      router.push("/forms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const active = slides[slide];

  return (
    <main
      className={`grid h-screen min-h-screen grid-rows-1 overflow-hidden bg-white lg:grid-cols-2 ${typeformFont.variable} ${regFont.variable}`}
    >
      {/* Left: dark carousel panel */}
      <section className="relative hidden h-full flex-col justify-center overflow-hidden bg-[#1c1620] px-10 py-6 lg:flex 2xl:px-14">
        <div className="pointer-events-none absolute -left-10 top-1/2 h-64 w-24 -translate-y-1/2 rounded-[2rem] bg-white/5" />

        <div className="relative mx-auto w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-2xl 2xl:max-w-md 2xl:p-8">
          <p style={{ fontFamily: "var(--font-reg)" }} className="text-center text-base text-black/70 2xl:text-lg">
            {active.eyebrow}
          </p>
          <h3
            style={{ fontFamily: "var(--font-typeform)" }}
            className="mt-1 text-center text-xl font-bold tracking-tight 2xl:text-2xl"
          >
            {active.title}
          </h3>

          <div className={`mt-5 overflow-hidden rounded-2xl bg-gradient-to-br p-4 2xl:mt-7 2xl:p-5 ${active.accent}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2.5">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="flex items-center gap-2 text-xs font-bold text-[#171719]">
                    <span
                      className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-white"
                      style={{ backgroundColor: active.badge }}
                    >
                      ⚡
                    </span>
                    Trigger
                  </p>
                  <p className="mt-2 text-[11px] text-black/50">Start automation when</p>
                  <div className="mt-1 rounded-md border border-black/10 px-2 py-1 text-[11px]">contact is added</div>
                  <p className="mt-2 text-[11px] text-black/50">to</p>
                  <div className="mt-1 rounded-md border border-black/10 px-2 py-1 text-[11px]">
                    recommended product
                  </div>
                </div>
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="flex items-center gap-2 text-xs font-bold text-[#171719]">
                    <span
                      className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-white"
                      style={{ backgroundColor: active.badge }}
                    >
                      ✉
                    </span>
                    Send email
                  </p>
                  <p className="mt-2 text-[11px] text-black/50">To: Contact</p>
                  <p className="text-[11px] text-black/50">Subject: You&apos;ve been matched</p>
                </div>
              </div>
              <div className="flex flex-col justify-between rounded-xl bg-[#171719] p-3 text-white">
                <div>
                  <p className="text-xs font-bold italic">Roll</p>
                  <p className="mt-2 text-xs leading-snug">You&apos;ve been matched with The Turbo</p>
                </div>
                <div className="mt-3 aspect-square w-full rounded-lg bg-gradient-to-br from-white/20 to-white/5" />
                <span
                  className="mt-3 self-start rounded-full px-3 py-1 text-[10px] font-bold"
                  style={{ backgroundColor: active.badge }}
                >
                  Buy now
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="relative mt-5 flex items-center justify-center gap-3 2xl:mt-8 2xl:gap-4">
          <button
            aria-label="Previous slide"
            onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}
            className="text-white/50 transition hover:text-white"
          >
            ‹
          </button>
          <button
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setPlaying((p) => !p)}
            className="grid h-6 w-6 place-items-center rounded-full text-white transition hover:bg-white/10 2xl:h-7 2xl:w-7"
          >
            {playing ? "❚❚" : "▶"}
          </button>

          {/* Scrollable slide-dot rail: handles many slides without overflowing the panel */}
          <div className="flex max-w-[9rem] items-center gap-2 overflow-x-auto px-1 2xl:max-w-[12rem]" style={{ scrollbarWidth: "none" }}>
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`shrink-0 rounded-full transition-all ${
                  i === slide ? "h-2.5 w-2.5 bg-white" : "h-2 w-2 bg-white/30"
                }`}
              />
            ))}
          </div>

          <button
            aria-label="Next slide"
            onClick={() => setSlide((s) => (s + 1) % slides.length)}
            className="text-white/50 transition hover:text-white"
          >
            ›
          </button>
        </div>

        <p style={{ fontFamily: "var(--font-reg)" }} className="relative mt-6 text-center text-xs text-white/60 2xl:mt-12 2xl:text-sm">
          Trusted by over 150,000 brands.
        </p>
        <div className="relative mt-3 flex items-center justify-center gap-6 text-white/50 2xl:mt-5 2xl:gap-8">
          {trustedLogos.map((l) => (
            <span key={l} className="text-sm font-bold 2xl:text-lg">
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* Right: centered auth panel */}
      <section className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-6">
        <Link
          href="/"
          style={{ fontFamily: "var(--font-typeform)" }}
          className="flex items-center gap-2 text-xl font-bold text-[#171719] 2xl:text-2xl"
        >
          <span className="flex h-5 w-7 gap-1 2xl:h-6 2xl:w-8">
            <span className="h-full w-1.5 rounded-sm bg-[#171719] 2xl:w-2" />
            <span className="h-full w-3.5 rounded-sm bg-[#171719] 2xl:w-4" />
          </span>
          Typeform
        </Link>

        <h1
          style={{ fontFamily: "var(--font-typeform)" }}
          className="mt-5 max-w-lg text-center text-2xl font-bold leading-tight tracking-tight text-[#171719] 2xl:mt-10 2xl:text-4xl"
        >
          Get better data with conversational forms, surveys, quizzes and more.
        </h1>

        <div className="mt-5 w-full max-w-md space-y-2.5 2xl:mt-10 2xl:space-y-3">
          <button
            onClick={() => {
              window.location.href = `${API_URL}/api/auth/google/start`;
            }}
            style={{ fontFamily: "var(--font-reg)" }}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-[#171719] transition hover:bg-black/[0.03] 2xl:py-4 2xl:text-base"
          >
            <span className="text-lg font-bold text-[#4285F4]">G</span>
            Sign up with Google
          </button>

          <p style={{ fontFamily: "var(--font-reg)" }} className="py-0.5 text-center text-xs text-black/40 2xl:py-1 2xl:text-sm">
            OR
          </p>

          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              style={{ fontFamily: "var(--font-reg)" }}
              className="w-full rounded-2xl bg-[#1c1620] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2a2130] 2xl:py-4 2xl:text-base"
            >
              Sign up with email
            </button>
          ) : (
            <form onSubmit={submit} className="space-y-2.5 rounded-2xl border border-black/10 p-4 2xl:space-y-3 2xl:p-5">
              {mode === "signup" && (
                <label style={{ fontFamily: "var(--font-reg)" }} className="block text-sm font-semibold">
                  Name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal outline-none focus:border-[#8b5cf6] 2xl:mt-2 2xl:py-3"
                  />
                </label>
              )}
              <label style={{ fontFamily: "var(--font-reg)" }} className="block text-sm font-semibold">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal outline-none focus:border-[#8b5cf6] 2xl:mt-2 2xl:py-3"
                />
              </label>
              <label style={{ fontFamily: "var(--font-reg)" }} className="block text-sm font-semibold">
                Password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal outline-none focus:border-[#8b5cf6] 2xl:mt-2 2xl:py-3"
                />
              </label>
              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 2xl:py-3">
                  {error}
                </p>
              )}
              <button
                disabled={loading}
                style={{ fontFamily: "var(--font-reg)" }}
                className="w-full rounded-xl bg-[#1c1620] px-4 py-3 text-sm font-bold text-white hover:bg-[#2a2130] disabled:opacity-60 2xl:py-3.5"
              >
                {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
              </button>
            </form>
          )}

          <p style={{ fontFamily: "var(--font-reg)" }} className="pt-1.5 text-center text-xs text-slate-500 2xl:pt-2 2xl:text-sm">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              className="font-bold text-[#8b5cf6]"
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}