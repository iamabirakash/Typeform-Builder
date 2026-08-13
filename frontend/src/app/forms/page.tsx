"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, clearToken, hasToken, type FormListItem } from "@/lib/api";
import { Toast } from "@/components/toast";

type Template = { id: string; title: string; description: string; questions: { type: string; title: string; required?: boolean; settings?: Record<string, unknown> }[] };
type Activity = { id: number; action: string; details: string | null; created_at: string | null };

function formatDate(value: string | null) {
  if (!value) return "Not updated yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FormListItem | null>(null);
  const [activity, setActivity] = useState<{ form: FormListItem; items: Activity[] } | null>(null);

  const loadForms = useCallback(async () => {
    if (!hasToken()) { router.replace(`/auth?next=${encodeURIComponent("/forms")}`); return; }
    setLoading(true);
    try { setForms(await api<FormListItem[]>(`/api/forms?search=${encodeURIComponent(search)}&archived=${showArchived}${folder ? `&folder=${encodeURIComponent(folder)}` : ""}`)); setError(""); }
    catch (err) { if (err instanceof ApiError && err.status === 401) { clearToken(); router.replace(`/auth?next=${encodeURIComponent("/forms")}`); return; } setError(err instanceof Error ? err.message : "Could not load your forms"); }
    finally { setLoading(false); }
  }, [folder, router, search, showArchived]);

  useEffect(() => { void loadForms(); }, [loadForms]);
  useEffect(() => { void api<Template[]>("/api/forms/templates").then(setTemplates).catch(() => undefined); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2200); return () => window.clearTimeout(timer); }, [toast]);

  async function createForm(title = "Untitled form", template?: Template) {
    setBusyId(-1);
    try {
      const form = await api<{ id: number }>("/api/forms", { method: "POST", body: JSON.stringify({ title }) });
      if (template) for (const question of template.questions) await api(`/api/forms/${form.id}/questions`, { method: "POST", body: JSON.stringify(question) });
      window.location.href = `/forms/${form.id}/edit`;
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create form"); setBusyId(null); }
  }

  async function updateForm(id: number, patch: Record<string, unknown>, message: string) {
    setBusyId(id);
    try { await api(`/api/forms/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); setToast(message); await loadForms(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update form"); }
    finally { setBusyId(null); }
  }

  async function action(id: number, name: "duplicate" | "publish" | "unpublish" | "archive" | "restore") {
    setBusyId(id);
    try { await api(`/api/forms/${id}/${name}`, { method: "POST" }); setToast(name === "archive" ? "Form archived" : name === "restore" ? "Form restored" : name === "duplicate" ? "Form duplicated" : name === "publish" ? "Form published" : "Form unpublished"); await loadForms(); }
    catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusyId(null); }
  }

  async function showActivity(form: FormListItem) {
    try { setActivity({ form, items: await api<Activity[]>(`/api/forms/${form.id}/activity`) }); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load activity"); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget; setDeleteTarget(null); setBusyId(target.id);
    try { await api(`/api/forms/${target.id}`, { method: "DELETE" }); setToast("Form deleted"); await loadForms(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete form"); }
    finally { setBusyId(null); }
  }

  const folders = Array.from(new Set(forms.map((form) => form.folder).filter(Boolean))) as string[];
  return <main className="min-h-screen bg-[#f7f7fb] text-slate-950">
    {toast && <Toast message={toast} />}
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><Link href="/forms" className="flex items-center gap-3 text-lg font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#635bff] text-sm text-white">t.</span>typeform</Link><div className="flex items-center gap-2"><button onClick={() => { clearToken(); router.push("/auth"); }} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Log out</button><button onClick={() => void createForm()} disabled={busyId === -1} className="rounded-xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#5148e8]">+ Create form</button></div></div></header>
    <section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#635bff]">Workspace</p><h1 className="text-4xl font-bold tracking-tight">Your forms</h1><p className="mt-3 text-slate-500">Search, organize, and keep your best forms close.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setShowArchived(false)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${!showArchived ? "bg-slate-950 text-white" : "bg-white text-slate-500"}`}>Active</button><button onClick={() => setShowArchived(true)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${showArchived ? "bg-slate-950 text-white" : "bg-white text-slate-500"}`}>Archive</button></div></div>
      <div className="mb-8 grid gap-3 md:grid-cols-[1fr_12rem_auto]"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search forms..." className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#635bff]" /><select value={folder} onChange={(e) => setFolder(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><option value="">All folders</option>{folders.map((item) => <option key={item}>{item}</option>)}</select><button onClick={() => void loadForms()} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:border-[#635bff]">Search</button></div>
      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}
      {!showArchived && <div className="mb-8 rounded-3xl border border-[#d9ff4f] bg-[#efffb2] p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h2 className="text-lg font-bold">Start from a template</h2><p className="mt-1 text-sm text-slate-600">Get a useful first draft, then make it yours.</p></div><div className="flex flex-wrap gap-2">{templates.map((template) => <button key={template.id} onClick={() => void createForm(template.title, template)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50">{template.title}</button>)}</div></div></div>}
      {loading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-3xl bg-white" /><div className="h-48 animate-pulse rounded-3xl bg-white" /></div> : forms.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center"><h2 className="text-xl font-semibold">{showArchived ? "Your archive is empty" : "Start with your first form"}</h2>{!showArchived && <button onClick={() => void createForm()} className="mt-6 rounded-xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white">Create a form</button>}</div> : <div className="grid gap-5 md:grid-cols-2">{forms.map((form) => <article key={form.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><button onClick={() => void updateForm(form.id, { is_favorite: !form.is_favorite }, form.is_favorite ? "Removed from favorites" : "Added to favorites")} aria-label="Favorite form" className="text-xl">{form.is_favorite ? "★" : "☆"}</button><Link href={`/forms/${form.id}/edit`} className="truncate text-xl font-semibold tracking-tight hover:text-[#635bff]">{form.title}</Link></div><p className="mt-2 text-sm text-slate-500">Updated {formatDate(form.updated_at)}</p><div className="mt-3 flex flex-wrap gap-1">{(form.tags ?? []).map((tag) => <span key={tag} className="rounded-full bg-[#eeecff] px-2 py-1 text-xs text-[#635bff]">{tag}</span>)}{form.folder && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{form.folder}</span>}</div></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{form.status}</span></div><div className="mt-8 flex items-end justify-between gap-3"><div><p className="text-3xl font-bold">{form.response_count}</p><p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">Responses</p></div><div className="flex flex-wrap justify-end gap-2 text-sm"><Link href={`/forms/${form.id}/edit`} className="rounded-lg border border-slate-200 px-3 py-2 font-medium hover:border-[#635bff]">Edit</Link><Link href={`/forms/${form.id}/results`} className="rounded-lg border border-slate-200 px-3 py-2 font-medium hover:border-[#635bff]">Results</Link><button onClick={() => void showActivity(form)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium">History</button><button onClick={() => void action(form.id, "duplicate")} disabled={busyId === form.id} className="rounded-lg border border-slate-200 px-3 py-2 font-medium">Duplicate</button><button onClick={() => void action(form.id, showArchived ? "restore" : "archive")} disabled={busyId === form.id} className="rounded-lg bg-slate-950 px-3 py-2 font-medium text-white">{showArchived ? "Restore" : "Archive"}</button><button onClick={() => setDeleteTarget(form)} disabled={busyId === form.id} className="rounded-lg px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600">×</button></div></div><div className="mt-4 flex gap-2"><input defaultValue={(form.tags ?? []).join(", ")} onBlur={(e) => void updateForm(form.id, { tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }, "Tags saved")} placeholder="Tags: feedback, ux" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs" /><input defaultValue={form.folder ?? ""} onBlur={(e) => void updateForm(form.id, { folder: e.target.value.trim() || null }, "Folder saved")} placeholder="Folder" className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-xs" /></div></article>)}</div>}
    </section>
    {activity && <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-5" onClick={() => setActivity(null)}><div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Activity history</h2><button onClick={() => setActivity(null)} className="text-2xl text-slate-400">×</button></div><p className="mt-1 text-sm text-slate-500">{activity.form.title}</p><div className="mt-6 space-y-3">{activity.items.length ? activity.items.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold capitalize">{item.action}</p><p className="mt-1 text-xs text-slate-500">{item.details || "Form activity"} · {item.created_at ? formatDate(item.created_at) : "Recently"}</p></div>) : <p className="text-sm text-slate-500">No activity recorded yet.</p>}</div></div></div>}
    {deleteTarget && <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-5" onClick={() => setDeleteTarget(null)}><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}><h2 className="text-xl font-bold">Delete {deleteTarget.title}?</h2><p className="mt-2 text-sm text-slate-500">This removes the form and its responses permanently.</p><div className="mt-7 flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button onClick={() => void confirmDelete()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white">Delete form</button></div></div></div>}
  </main>;
}
