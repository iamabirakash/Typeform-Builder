"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type InsightResponse = {
  title: string;
  summary: string;
  sentiment: { overall: string; positive: number; negative: number; neutral: number };
  themes: { keyword: string; count: number }[];
  intent: string[];
  recommendations: string[];
};

function getBadgeClasses(overall: string) {
  if (overall === "positive") return "bg-emerald-100 text-emerald-700";
  if (overall === "negative") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [forms, setForms] = useState<{ id: number; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ id: number; title: string }[]>("/api/forms").then((data) => {
      setForms(data);
      if (data[0]) setSelectedFormId(data[0].id);
    }).catch((err) => {
      if (err instanceof ApiError && err.status === 401) {
        setError("Please sign in to view insights.");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load forms");
    });
  }, []);

  useEffect(() => {
    if (!selectedFormId) {
      setInsights(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void api<InsightResponse>(`/api/forms/${selectedFormId}/ai-insights`)
      .then(setInsights)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load AI insights");
        setInsights(null);
      })
      .finally(() => setLoading(false));
  }, [selectedFormId]);

  return (
    <main className="min-h-screen bg-[#f7f6fa] text-[#171719]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/forms" className="grid h-9 w-9 place-items-center rounded-xl bg-[#1c1620] font-bold text-white">t.</Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">AI insights</p>
              <h1 className="text-xl font-bold">Response analysis</h1>
            </div>
          </div>
          <Link href="/forms" className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:border-[#8b5cf6] hover:text-[#8b5cf6]">Back to forms</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">Insights</p>
            <h2 className="text-4xl font-bold tracking-tight">Turn responses into action</h2>
          </div>
          <select
            value={selectedFormId ?? ""}
            onChange={(event) => setSelectedFormId(Number(event.target.value))}
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#8b5cf6]"
          >
            {forms.map((form) => (
              <option key={form.id} value={form.id}>{form.title}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-44 animate-pulse rounded-3xl bg-white" />
            <div className="h-44 animate-pulse rounded-3xl bg-white" />
            <div className="h-44 animate-pulse rounded-3xl bg-white" />
          </div>
        ) : !insights ? (
          <div className="rounded-3xl border border-dashed border-black/15 bg-white px-6 py-20 text-center">
            <h3 className="text-xl font-semibold">No insights available yet</h3>
            <p className="mt-2 text-sm text-black/50">Publish a form and collect open-text answers to surface AI analysis.</p>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-5 md:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-black/40">Sentiment</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getBadgeClasses(insights.sentiment.overall)}`}>{insights.sentiment.overall}</span>
                  <p className="text-2xl font-bold">{insights.sentiment.overall}</p>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-black/40">Positive</p>
                <p className="mt-3 text-3xl font-bold">{insights.sentiment.positive}</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-black/40">Negative</p>
                <p className="mt-3 text-3xl font-bold">{insights.sentiment.negative}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">Summary</p>
                <h3 className="mt-3 text-2xl font-bold">{insights.title}</h3>
                <p className="mt-4 leading-7 text-black/70">{insights.summary}</p>

                <div className="mt-8">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-black/40">Top themes</p>
                  <div className="space-y-3">
                    {insights.themes.length > 0 ? insights.themes.map((theme) => (
                      <div key={theme.keyword}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-black/70">{theme.keyword}</span>
                          <span className="text-black/40">{theme.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#f3e6ff]">
                          <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: `${Math.min(100, theme.count * 30)}%` }} />
                        </div>
                      </div>
                    )) : <p className="text-sm text-black/50">No recurring themes detected yet.</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">Intent</p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-black/70">
                    {insights.intent.map((item) => (
                      <li key={item} className="flex gap-3"><span className="mt-2 h-2 w-2 rounded-full bg-[#8b5cf6]" />{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">Next best actions</p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-black/70">
                    {insights.recommendations.map((item) => (
                      <li key={item} className="flex gap-3"><span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
