"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, downloadFile } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import localFont from "next/font/local";

const typeformFont = localFont({
  src: "../../../../../public/font/typeform.woff2",
  variable: "--font-typeform",
  weight: "700",
  display: "swap",
});

const regFont = localFont({
  src: "../../../../../public/font/reg.woff2",
  variable: "--font-reg",
  weight: "400",
  display: "swap",
});

type Form = { id: number; title: string };
type ResponseItem = { id: number; submitted_at: string | null; is_complete: boolean };
type ResponsePage = { page: number; page_size: number; total: number; items: ResponseItem[] };
type Answer = { question_id: number; question_title: string; value: unknown };
type ResponseDetail = { id: number; submitted_at: string | null; is_complete: boolean; answers: Answer[] };
type SummaryItem = { question_id: number; question_title: string; type: string; total_answers: number; counts: Record<string, number> | null; average: number | null; distribution: Record<string, number> | null; samples: unknown[] | null };
type Summary = { total_responses: number; completed_responses: number; questions: SummaryItem[] };

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const displayValue = (value: unknown) => typeof value === "object" ? JSON.stringify(value) : String(value ?? "—");

function Bars({ values }: { values: Record<string, number> }) {
  const max = Math.max(...Object.values(values), 1);
  return (
    <div className="mt-6 space-y-4">
      {Object.entries(values).map(([label, count]) => (
        <div key={label}>
          <div className="mb-2 flex justify-between text-sm">
            <span style={{ fontFamily: "var(--font-reg)" }} className="truncate pr-3 text-app-text-muted">{label}</span>
            <span style={{ fontFamily: "var(--font-reg)" }} className="font-semibold text-app-text">{count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-app-border">
            <div className="h-full rounded-full bg-app-text transition-all duration-500 ease-out" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const formId = Number(params.id);
  const [form, setForm] = useState<Form | null>(null);
  const [tab, setTab] = useState<"responses" | "summary">("responses");
  const [page, setPage] = useState<ResponsePage | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<ResponseDetail | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { void api<Form>(`/api/forms/${formId}`).then(setForm).catch((err) => setError(err instanceof Error ? err.message : "Could not load form")); }, [formId]);
  useEffect(() => { if (tab !== "responses") return; setLoading(true); void api<ResponsePage>(`/api/forms/${formId}/responses?page=${pageNumber}&page_size=10`).then(setPage).catch((err) => setError(err instanceof Error ? err.message : "Could not load responses")).finally(() => setLoading(false)); }, [formId, pageNumber, tab]);
  useEffect(() => { if (tab !== "summary" || summary) return; setLoading(true); void api<Summary>(`/api/forms/${formId}/summary`).then(setSummary).catch((err) => setError(err instanceof Error ? err.message : "Could not load summary")).finally(() => setLoading(false)); }, [formId, summary, tab]);

  async function openResponse(id: number, number: number) { try { setSelectedNumber(number); setSelected(await api<ResponseDetail>(`/api/forms/${formId}/responses/${id}`)); } catch (err) { setError(err instanceof Error ? err.message : "Could not load response"); } }
  
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.page_size)) : 1;
  
  return (
    <main style={{ fontFamily: "var(--font-reg)" }} className={`min-h-screen bg-app-bg text-app-text ${typeformFont.variable} ${regFont.variable}`}>
      <header className="sticky top-0 z-10 border-b border-app-border bg-app-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/forms" style={{ fontFamily: "var(--font-reg)" }} className="grid h-10 w-10 place-items-center rounded-xl bg-app-text font-black text-app-bg transition hover:scale-105">t.</Link>
            <div>
              <Link href={`/forms/${formId}/edit`} style={{ fontFamily: "var(--font-reg)" }} className="text-xs text-app-text-muted hover:text-app-text transition">{form?.title ?? "Loading..."}</Link>
              <h1 style={{ fontFamily: "var(--font-typeform)" }} className="text-lg font-bold tracking-tight">Results & Insights</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => void downloadFile(`/api/forms/${formId}/responses-export.csv`, `${form?.title ?? "form"}-responses.csv`).catch((err) => setError(err instanceof Error ? err.message : "Could not export responses"))} className="rounded-xl bg-app-text px-4 py-2.5 text-sm font-semibold text-app-bg transition hover:opacity-90">
              Export CSV
            </button>
            <Link href={`/forms/${formId}/edit`} className="rounded-xl border border-app-border bg-transparent px-4 py-2.5 text-sm font-semibold transition hover:border-app-text hover:text-app-text">
              Builder
            </Link>
          </div>
        </div>
      </header>
      
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 flex flex-col items-center text-center">
          <p style={{ fontFamily: "var(--font-reg)" }} className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">Form Analytics</p>
          <h2 style={{ fontFamily: "var(--font-typeform)" }} className="text-4xl font-bold tracking-tight md:text-5xl">Understand your data</h2>
          <p style={{ fontFamily: "var(--font-reg)" }} className="mt-4 max-w-lg text-app-text-muted">Dive deep into every response or see the big picture at a glance. Uncover the patterns that matter.</p>
        </div>
        
        {error && <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700 shadow-sm">{error}</div>}
        
        <div className="mb-10 flex justify-center">
          <div className="inline-flex gap-2 rounded-2xl border border-app-border bg-app-bg p-1.5 shadow-sm">
            <button onClick={() => setTab("responses")} style={{ fontFamily: "var(--font-reg)" }} className={`rounded-xl px-8 py-2.5 text-sm font-medium transition-all ${tab === "responses" ? "bg-app-text text-app-bg shadow-md" : "text-app-text-muted hover:text-app-text hover:bg-app-surface"}`}>Individual Responses</button>
            <button onClick={() => setTab("summary")} style={{ fontFamily: "var(--font-reg)" }} className={`rounded-xl px-8 py-2.5 text-sm font-medium transition-all ${tab === "summary" ? "bg-app-text text-app-bg shadow-md" : "text-app-text-muted hover:text-app-text hover:bg-app-surface"}`}>Visual Summary</button>
          </div>
        </div>
        
        {loading ? (
          <div className="mx-auto max-w-4xl h-64 animate-pulse rounded-3xl bg-app-surface border border-app-border" />
        ) : tab === "responses" ? (
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-sm">
            {!page?.items.length ? (
              <div className="px-6 py-24 text-center">
                <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-app-bg text-2xl text-app-text-muted">∅</div>
                <h3 style={{ fontFamily: "var(--font-typeform)" }} className="text-xl font-bold">No responses yet</h3>
                <p style={{ fontFamily: "var(--font-reg)" }} className="mt-3 text-sm text-app-text-muted">Once people start submitting your form, their answers will appear here.</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead className="border-b border-app-border bg-app-bg/50 text-xs uppercase tracking-widest text-app-text-muted">
                    <tr>
                      <th className="px-8 py-5 font-semibold">Response</th>
                      <th className="px-8 py-5 font-semibold">Submitted</th>
                      <th className="px-8 py-5 font-semibold">Status</th>
                      <th className="px-8 py-5 text-right font-semibold">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {page.items.map((item, index) => {
                      const number = (pageNumber - 1) * page.page_size + index + 1;
                      return (
                        <tr key={item.id} onClick={() => void openResponse(item.id, number)} className="group cursor-pointer transition hover:bg-app-bg">
                          <td className="px-8 py-6">
                            <span style={{ fontFamily: "var(--font-typeform)" }} className="text-base font-bold text-app-text">#{number}</span>
                          </td>
                          <td className="px-8 py-6 text-sm text-app-text-muted">{formatDate(item.submitted_at)}</td>
                          <td className="px-8 py-6">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${item.is_complete ? "bg-emerald-500/10 text-emerald-600" : "bg-app-border text-app-text-muted"}`}>{item.is_complete ? "Complete" : "Partial"}</span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className="inline-block translate-x-0 text-app-text-muted opacity-50 transition-all group-hover:translate-x-1 group-hover:opacity-100">→</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-app-border bg-app-bg/50 px-8 py-5 text-sm text-app-text-muted">
                  <span style={{ fontFamily: "var(--font-reg)" }}>{page.total} response{page.total === 1 ? "" : "s"} total</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPageNumber((n) => Math.max(1, n - 1))} disabled={pageNumber === 1} className="flex h-8 w-8 items-center justify-center rounded-full border border-app-border transition disabled:opacity-30 hover:bg-app-border">→</button>
                    <span style={{ fontFamily: "var(--font-reg)" }} className="font-medium">Page {pageNumber} of {totalPages}</span>
                    <button onClick={() => setPageNumber((n) => Math.min(totalPages, n + 1))} disabled={pageNumber === totalPages} className="flex h-8 w-8 items-center justify-center rounded-full border border-app-border transition disabled:opacity-30 hover:bg-app-border">→</button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
            {summary?.questions.map((item) => (
              <article key={item.question_id} className="flex flex-col rounded-3xl border border-app-border bg-app-surface p-8 shadow-sm transition hover:shadow-md">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p style={{ fontFamily: "var(--font-reg)" }} className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-app-text-muted">{item.type.replaceAll("_", " ")}</p>
                    <h3 style={{ fontFamily: "var(--font-typeform)" }} className="text-xl font-bold leading-tight text-app-text">{item.question_title}</h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-app-border bg-app-bg px-3 py-1 text-xs font-semibold text-app-text-muted">{item.total_answers} answers</span>
                </div>
                
                <div className="mt-auto">
                  {item.counts && <Bars values={item.counts} />}
                  
                  {item.average !== null && (
                    <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-app-bg py-8">
                      <p style={{ fontFamily: "var(--font-typeform)" }} className="text-5xl font-bold text-app-text">{item.average}</p>
                      <p style={{ fontFamily: "var(--font-reg)" }} className="mt-2 text-xs font-semibold uppercase tracking-widest text-app-text-muted">Average rating</p>
                    </div>
                  )}
                  {item.average !== null && item.distribution && <Bars values={item.distribution} />}
                  
                  {item.samples && (
                    <div className="mt-6 space-y-3">
                      <p style={{ fontFamily: "var(--font-reg)" }} className="text-xs font-semibold uppercase tracking-wider text-app-text-muted">Recent responses</p>
                      {item.samples.map((sample, index) => (
                        <div key={index} className="rounded-2xl border border-app-border bg-app-bg px-5 py-4 text-sm text-app-text shadow-sm transition hover:border-app-text/20">
                          {displayValue(sample)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      
      {selected && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm transition-all" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-app-surface p-10 shadow-2xl border border-app-border" onClick={(event) => event.stopPropagation()}>
            <div className="mb-10 flex items-start justify-between border-b border-app-border pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: "var(--font-reg)" }} className="rounded-full bg-app-bg px-3 py-1 text-xs font-bold uppercase tracking-wider text-app-text-muted">Response #{selectedNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${selected.is_complete ? "bg-emerald-500/10 text-emerald-600" : "bg-app-border text-app-text-muted"}`}>{selected.is_complete ? "Complete" : "Partial"}</span>
                </div>
                <h2 style={{ fontFamily: "var(--font-typeform)" }} className="mt-4 text-3xl font-bold text-app-text">{formatDate(selected.submitted_at)}</h2>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close response" className="grid h-10 w-10 place-items-center rounded-full bg-app-bg text-lg text-app-text-muted transition hover:bg-app-text hover:text-app-bg">×</button>
            </div>
            
            <div className="space-y-8">
              {selected.answers.length === 0 ? (
                <p className="text-center text-app-text-muted italic">No answers provided in this response.</p>
              ) : (
                selected.answers.map((answer, index) => (
                  <div key={answer.question_id} className="group relative rounded-2xl border border-app-border bg-app-bg p-6 transition hover:border-app-text/30">
                    <span className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-app-text text-xs font-bold text-app-bg shadow-sm">{index + 1}</span>
                    <p style={{ fontFamily: "var(--font-typeform)" }} className="text-lg font-bold text-app-text">{answer.question_title}</p>
                    <div className="mt-4 rounded-xl bg-app-surface p-4">
                      <p style={{ fontFamily: "var(--font-reg)" }} className="whitespace-pre-wrap text-base text-app-text-muted">{displayValue(answer.value)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
