"use client";

import Link from "next/link";
import { useState } from "react";
import localFont from "next/font/local";

const typeformFont = localFont({
  src: "../../public/font/typeform.woff2",
  display: "swap",
});

const regularFont = localFont({
  src: "../../public/font/reg.woff2",
  display: "swap",
});

const pillarCards = [
  {
    prompt: "Build a lead generation form for my business, FitCo",
    title: "Build forms at the drop of a prompt",
    copy: "Gain more data with expertly-designed forms, then complete the picture with built-in AI data enrichment.",
  },
  {
    title: "Analyze customer data with AI precision",
    copy: "Compare key differences in form response data. Identify customer segments and growth opportunities.",
  },
  {
    title: "Act on data with automatic AI workflows",
    copy: "Act on form data automatically. Segment your customer contacts and send customized follow-up flows.",
  },
];

const journeyTabs = [
  {
    label: "Acquire",
    copy: "Gain more data with expertly-designed forms, then complete the picture with built-in AI data enrichment.",
  },
  {
    label: "Onboard",
    copy: "Turn new signups into active users with guided, conversational onboarding flows that adapt as people answer.",
  },
  {
    label: "Engage",
    copy: "Keep the conversation going with automated check-ins and follow-ups triggered straight from form responses.",
  },
  {
    label: "Retain",
    copy: "Spot at-risk accounts early with sentiment and satisfaction data, then trigger the right retention flow automatically.",
  },
];

const trustedLogos = ["Webflow", "Zapier", "Barry's", "HubSpot", "Hermès"];

const storyCards = [
  { stat: "SmartBug Media increased qualified leads 40% with one form", color: "#7c3aed" },
  { stat: "Double Denim Marketing drove $3.67 million in sales", color: "#9333ea" },
  { stat: "Viva scaled talent acquisition and cut time to hire by 75%", color: "#a855f7" },
];

const accordionItems = [
  {
    title: "Forms & data enrichment",
    bullets: [
      "High-converting forms embedded directly on your site",
      "New and existing leads organized in one contacts hub",
      "Additional data filled in through built-in enrichment",
    ],
  },
  {
    title: "Analysis & understanding",
    bullets: [
      "Sentiment and topic analysis pulled from every response",
      "Side-by-side comparison across respondent segments",
      "Drop-off tracking to see exactly where forms lose people",
    ],
  },
  {
    title: "Integrations & automation",
    bullets: [
      "Two-way sync with your CRM, inbox, and calendar",
      "No-code automations triggered by any form event",
      "150+ ready-made integrations, no dev time required",
    ],
  },
];

const integrationsRow1 = ["ActiveCampaign", "Calendly", "CallRail", "Intercom", "klaviyo", "slack", "stripe"];
const integrationsRow2 = ["CallRail", "Calendly", "ActiveCampaign", "zapier", "Webflow", "stripe", "slack"];

const stats = [
  { label: "WORKFLOW", value: "6M+", copy: "powered by automated workflows" },
  { label: "PAYMENTS", value: "5M+", copy: "collected directly through forms" },
  { label: "RESPONSES", value: "48M+", copy: "collected every month" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [openAccordion, setOpenAccordion] = useState(0);

  return (
    <main className={`overflow-hidden bg-[#f7f6fa] text-[#171719] ${regularFont.className}`}>
      {/* Hero (dark) */}
      <section className="relative bg-[#1c1620]">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-7 lg:px-12">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
            <span className="flex h-6 w-8 gap-1">
              <span className="h-full w-2 rounded-sm bg-white" />
              <span className="h-full w-4 rounded-sm bg-white" />
            </span>
            Typeform
          </Link>
          <Link
            href="/auth?mode=signup"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#171719] transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            Sign up
          </Link>
        </nav>

        <div className="pointer-events-none absolute left-1/2 top-32 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[#8b5cf6]/25 blur-[90px]" />

        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-8 text-center lg:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#a78bfa]">AI forms &amp; workflows</p>
          <h1
            className={`${typeformFont.className} mt-6 text-[clamp(2.75rem,7vw,5.25rem)] font-normal leading-[1.05] text-white`}
          >
            The form is only
            <br />
            the beginning
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-white/70">
            Collect, analyze, and act on customer data with the complete platform for AI forms and workflows.
          </p>
          <Link
            href="/auth?mode=signup"
            className="mt-9 inline-flex rounded-full bg-white px-7 py-4 text-sm font-bold text-[#171719] transition hover:-translate-y-1 hover:bg-white/90"
          >
            Get started—it&apos;s free
          </Link>
        </div>

        {/* Pillar cards, angled purple gradient */}
        <div className="relative mx-auto grid max-w-[1400px] gap-5 px-6 pb-24 lg:grid-cols-3 lg:px-12">
          {pillarCards.map((card, i) => (
            <div
              key={card.title}
              className="overflow-hidden rounded-[1.75rem] border border-white/10"
              style={{
                background: "radial-gradient(120% 100% at 30% 0%, #a855f7 0%, #6d28d9 55%, #2a1b3d 100%)",
              }}
            >
              <div className="flex h-48 items-center justify-center p-6">
                {i === 0 ? (
                  <div className="w-full rounded-xl bg-black/25 p-4 text-left text-sm text-white/80">
                    {card.prompt}
                  </div>
                ) : (
                  <div className="w-full rounded-xl bg-[#6b5d23] p-4 text-left text-white">
                    <p className="text-xs font-bold italic">FitCo</p>
                    <p className="mt-3 text-lg font-bold leading-tight">
                      {i === 1 ? "Enjoying the Iron Strength HIIT class?" : "Book a HIIT class now"}
                    </p>
                  </div>
                )}
              </div>
              <div className="bg-[#171719] p-7">
                <h3 className={`${typeformFont.className} text-2xl font-black leading-tight tracking-tight text-white`}>{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{card.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Customer journey (light) — interactive tabs */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8b5cf6]">Customer journey</p>
        <h2 className={`${typeformFont.className} mt-6 text-[clamp(2.25rem,5vw,3.75rem)] font-normal leading-[1.1]`}>
          Collect, analyze, and
          <br />
          act on customer data
        </h2>
        <div className="mt-12 flex justify-center gap-8 border-b border-black/10 text-sm font-semibold text-black/40">
          {journeyTabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`pb-4 transition-colors ${
                i === activeTab ? "border-b-2 border-[#171719] text-[#171719]" : "hover:text-black/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-xl leading-8 text-black/70">{journeyTabs[activeTab].copy}</p>
      </section>

      {/* Trusted logos + story cards */}
      <section className="border-t border-black/5 px-6 py-20 lg:px-12">
        <div className="mx-auto max-w-[1400px]">
          <h3 className={`${typeformFont.className} text-center text-3xl font-bold tracking-tight lg:text-4xl`}>
            Trusted by 95% of Fortune 500 companies
          </h3>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-14 gap-y-6 text-xl font-bold text-black/70">
            {trustedLogos.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {storyCards.map((s) => (
              <div
                key={s.stat}
                className="flex min-h-[16rem] items-end rounded-[1.75rem] p-7 text-lg font-semibold leading-tight text-white"
                style={{ background: `radial-gradient(120% 100% at 50% 0%, ${s.color} 0%, #2a1b3d 100%)` }}
              >
                {s.stat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark accordion + workflow mockup — interactive */}
      <section className="bg-[#1c1620] px-6 py-24 text-white lg:px-12">
        <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            {accordionItems.map((item, i) => {
              const isOpen = i === openAccordion;
              return (
                <div key={item.title} className="border-b border-white/10 py-6">
                  <button
                    onClick={() => setOpenAccordion(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <h3 className={`${typeformFont.className} text-2xl font-bold tracking-tight`}>{item.title}</h3>
                    <span className="text-xl">{isOpen ? "︿" : "﹀"}</span>
                  </button>
                  {isOpen && (
                    <div className="mt-5 space-y-2 text-white/65">
                      <p>Generate leads and convert customers with:</p>
                      <ul className="ml-5 list-disc space-y-1">
                        {item.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-[1.75rem] border border-[#8b5cf6]/30 bg-gradient-to-b from-[#3b2a52] to-[#1c1620] p-6">
            <div className="rounded-xl border border-white/15 bg-[#241a30] p-4">
              <p className="text-xs text-white/50">Start automation when</p>
              <div className="mt-2 rounded-lg border border-white/15 px-4 py-2 text-sm">Contact is added</div>
              <p className="mt-4 text-xs text-white/50">To</p>
              <div className="mt-2 rounded-lg border border-white/15 px-4 py-2 text-sm">New subscribers</div>
            </div>
            <div className="my-4 flex justify-center">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-white/20 text-sm">+</span>
            </div>
            <div className="rounded-xl border border-white/15 bg-[#241a30] p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#a855f7]">✉</span>
                <p className="text-sm font-semibold">Send SMS</p>
              </div>
              <p className="mt-3 text-xs text-white/50">To:</p>
              <div className="mt-1 rounded-lg border border-white/15 px-4 py-2 text-sm">Contact</div>
              <p className="mt-3 text-xs text-white/50">Preview:</p>
              <div className="mt-1 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70">
                Thanks for subscribing! Here&apos;s…
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-[1200px] rounded-[2.5rem] bg-white p-10 text-center shadow-[0_20px_60px_rgba(30,20,50,0.08)] lg:p-16">
          <h3 className={`${typeformFont.className} text-3xl font-bold tracking-tight lg:text-4xl`}>Integrates with every tech stack</h3>
          <div className="mt-10 space-y-4">
            <div className="flex flex-wrap justify-center gap-3">
              {integrationsRow1.map((i) => (
                <span key={i} className="rounded-full bg-[#f2f0f7] px-6 py-3 text-sm font-bold">
                  {i}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {integrationsRow2.map((i) => (
                <span key={i} className="rounded-full bg-[#f2f0f7] px-6 py-3 text-sm font-bold">
                  {i}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/auth?mode=signup"
            className="mt-10 inline-flex rounded-full bg-[#171719] px-7 py-4 text-sm font-bold text-white hover:bg-[#8b5cf6]"
          >
            Browse 150+ integrations
          </Link>
        </div>
      </section>

      {/* Stats (dark) */}
      <section className="bg-[#1c1620] px-6 py-16 lg:px-12">
        <div className="mx-auto grid max-w-[1400px] gap-5 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/15 p-8 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">{s.label}</p>
              <p className={`${typeformFont.className} mt-3 text-6xl`}>{s.value}</p>
              <p className="mt-3 text-sm text-white/60">{s.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA (light) */}
      <section className="px-6 py-24 text-center lg:px-12">
        <h2
          className={`${typeformFont.className} mx-auto max-w-2xl text-[clamp(2.25rem,5vw,3.75rem)] font-normal leading-[1.1]`}
        >
          Try the complete platform
          <br />
          for forms and workflows
        </h2>
        <div className="mt-9 flex items-center justify-center gap-6">
          <Link
            href="/auth?mode=signup"
            className="rounded-full bg-[#171719] px-7 py-4 text-sm font-bold text-white hover:bg-[#8b5cf6]"
          >
            Get started—it&apos;s free
          </Link>
          <a href="#pricing" className="text-sm font-bold underline underline-offset-4">
            Compare plans
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1c1620] px-6 py-10 text-white lg:px-12">
        <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-5 w-7 gap-1">
              <span className="h-full w-1.5 rounded-sm bg-white" />
              <span className="h-full w-3.5 rounded-sm bg-white" />
            </span>
            Typeform
          </Link>
          <p className="text-sm text-white/35">Built for better questions.</p>
        </div>
      </footer>
    </main>
  );
}
