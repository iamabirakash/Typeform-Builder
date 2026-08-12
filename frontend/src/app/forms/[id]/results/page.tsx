"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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
  return <div className="mt-5 space-y-3">{Object.entries(values).map(([label, count]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><span className="truncate pr-3 text-slate-600">{label}</span><span className="font-semibold">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#635bff]" style={{ width: `${count / max * 100}%` }} /></div></div>)}</div>;
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
  return <main className="min-h-screen bg-[#f7f7fb] text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><div className="flex items-center gap-4"><Link href="/forms" className="grid h-9 w-9 place-items-center rounded-xl bg-[#635bff] font-bold text-white">t.</Link><div><Link href={`/forms/${formId}/edit`} className="text-sm text-slate-400 hover:text-[#635bff]">{form?.title ?? "Form"}</Link><h1 className="text-xl font-bold">Results</h1></div></div><Link href={`/forms/${formId}/edit`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-[#635bff] hover:text-[#635bff]">Back to builder</Link></div></header>
    <section className="mx-auto max-w-6xl px-6 py-10"><div className="mb-8"><p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#635bff]">Insights</p><h2 className="text-4xl font-bold tracking-tight">See what people said</h2><p className="mt-3 text-slate-500">Understand every response and spot the patterns that matter.</p></div>{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}<div className="mb-6 flex max-w-sm gap-1 rounded-xl bg-slate-200/60 p-1"><button onClick={() => setTab("responses")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === "responses" ? "bg-white shadow-sm" : "text-slate-500"}`}>Responses</button><button onClick={() => setTab("summary")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === "summary" ? "bg-white shadow-sm" : "text-slate-500"}`}>Summary</button></div>
      {loading ? <div className="h-64 animate-pulse rounded-3xl bg-white" /> : tab === "responses" ? <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{!page?.items.length ? <div className="px-6 py-20 text-center"><h3 className="text-lg font-semibold">No responses yet</h3><p className="mt-2 text-sm text-slate-500">Publish your form and share the link to start collecting responses.</p></div> : <><table className="w-full text-left"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-4">Response</th><th className="px-6 py-4">Submitted</th><th className="px-6 py-4">Status</th><th /></tr></thead><tbody className="divide-y divide-slate-100">{page.items.map((item, index) => { const number = (pageNumber - 1) * page.page_size + index + 1; return <tr key={item.id} onClick={() => void openResponse(item.id, number)} className="cursor-pointer hover:bg-[#faf9ff]"><td className="px-6 py-5 font-semibold">#{number}</td><td className="px-6 py-5 text-sm text-slate-500">{formatDate(item.submitted_at)}</td><td className="px-6 py-5"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.is_complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.is_complete ? "Complete" : "Partial"}</span></td><td className="px-6 py-5 text-right">→</td></tr>; })}</tbody></table><div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-500"><span>{page.total} total response{page.total === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><button onClick={() => setPageNumber((n) => Math.max(1, n - 1))} disabled={pageNumber === 1} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">←</button><span>Page {pageNumber} of {totalPages}</span><button onClick={() => setPageNumber((n) => Math.min(totalPages, n + 1))} disabled={pageNumber === totalPages} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">→</button></div></div></>}</div> : <div className="grid gap-5 md:grid-cols-2">{summary?.questions.map((item) => <article key={item.question_id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-[#635bff]">{item.type.replaceAll("_", " ")}</p><h3 className="mt-2 text-lg font-semibold">{item.question_title}</h3><span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.total_answers} answers</span>{item.counts && <Bars values={item.counts} />}{item.average !== null && <><p className="mt-8 text-4xl font-bold">{item.average}</p><p className="text-sm text-slate-500">Average rating</p>{item.distribution && <Bars values={item.distribution} />}</>}{item.samples && <div className="mt-5 space-y-2">{item.samples.map((sample, index) => <div key={index} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{displayValue(sample)}</div>)}</div>}</article>)}</div>}
    </section>
    {selected && <div role="dialog" aria-modal="true" className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 px-4 py-8" onClick={() => setSelected(null)}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#635bff]">Response #{selectedNumber}</p><h2 className="mt-2 text-2xl font-bold">{formatDate(selected.submitted_at)}</h2></div><button onClick={() => setSelected(null)} aria-label="Close response" className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xl text-slate-500">×</button></div><div className="mt-7 space-y-5">{selected.answers.map((answer) => <div key={answer.question_id} className="border-b border-slate-100 pb-5"><p className="text-sm font-semibold">{answer.question_title}</p><p className="mt-2 whitespace-pre-wrap text-slate-600">{displayValue(answer.value)}</p></div>)}</div></div></div>}
  </main>;
}
