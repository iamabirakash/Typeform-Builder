"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type FormListItem } from "@/lib/api";

function formatDate(value: string | null) {
  if (!value) return "Not updated yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      setForms(await api<FormListItem[]>("/api/forms"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadForms(); }, [loadForms]);

  async function createForm() {
    setBusyId(-1);
    try {
      const form = await api<{ id: number }>("/api/forms", { method: "POST", body: JSON.stringify({ title: "Untitled form" }) });
      window.location.href = `/forms/${form.id}/edit`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create form");
      setBusyId(null);
    }
  }

  async function performAction(id: number, action: "duplicate" | "publish" | "unpublish" | "delete") {
    if (action === "delete" && !window.confirm("Delete this form? This cannot be undone.")) return;
    setBusyId(id);
    try {
      if (action === "delete") {
        await api(`/api/forms/${id}`, { method: "DELETE" });
      } else {
        await api(`/api/forms/${id}/${action}`, { method: "POST" });
      }
      await loadForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/forms" className="flex items-center gap-3 text-lg font-bold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#635bff] text-sm text-white">t.</span>
            typeform
          </Link>
          <button onClick={createForm} disabled={busyId === -1} className="rounded-xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5148e8] disabled:cursor-wait disabled:opacity-60">
            {busyId === -1 ? "Creating…" : "+ Create form"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#635bff]">Workspace</p>
          <h1 className="text-4xl font-bold tracking-tight">Your forms</h1>
          <p className="mt-3 max-w-xl text-slate-500">Create forms that feel like a conversation. Your responses, insights, and ideas live here.</p>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-3xl bg-white" /><div className="h-48 animate-pulse rounded-3xl bg-white" /></div>
        ) : forms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#eeecff] text-2xl text-[#635bff]">＋</div>
            <h2 className="text-xl font-semibold">Start with your first form</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Build a beautiful, focused flow for feedback, signups, or anything you want to ask.</p>
            <button onClick={createForm} className="mt-6 rounded-xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white">Create a form</button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {forms.map((form) => (
              <article key={form.id} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/forms/${form.id}/edit`} className="text-xl font-semibold tracking-tight hover:text-[#635bff]">{form.title}</Link>
                    <p className="mt-2 text-sm text-slate-500">Updated {formatDate(form.updated_at)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{form.status}</span>
                </div>
                <div className="mt-8 flex items-end justify-between">
                  <div><p className="text-3xl font-bold">{form.response_count}</p><p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">Responses</p></div>
                  <div className="flex flex-wrap justify-end gap-2 text-sm">
                    <Link href={`/forms/${form.id}/edit`} className="rounded-lg border border-slate-200 px-3 py-2 font-medium hover:border-[#635bff] hover:text-[#635bff]">Edit</Link>
                    <Link href={`/forms/${form.id}/results`} className="rounded-lg border border-slate-200 px-3 py-2 font-medium hover:border-[#635bff] hover:text-[#635bff]">Results</Link>
                    <button onClick={() => void performAction(form.id, "duplicate")} disabled={busyId === form.id} className="rounded-lg border border-slate-200 px-3 py-2 font-medium hover:border-[#635bff] hover:text-[#635bff]">Duplicate</button>
                    <button onClick={() => void performAction(form.id, form.status === "published" ? "unpublish" : "publish")} disabled={busyId === form.id} className="rounded-lg bg-slate-950 px-3 py-2 font-medium text-white hover:bg-slate-700">{form.status === "published" ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => void performAction(form.id, "delete")} disabled={busyId === form.id} aria-label={`Delete ${form.title}`} className="rounded-lg px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600">×</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
