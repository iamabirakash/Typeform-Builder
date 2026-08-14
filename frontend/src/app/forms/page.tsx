"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, clearToken, hasToken, type FormListItem } from "@/lib/api";
import { Toast } from "@/components/toast";
import { ThemeToggle } from "@/components/theme-toggle";

type Template = { id: string; title: string; description: string; questions: { type: string; title: string; required?: boolean; settings?: Record<string, unknown> }[] };
type Activity = { id: number; action: string; details: string | null; created_at: string | null };

function formatDate(value: string | null) {
  if (!value) return "Not updated yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

const sidebarLinks = [
  { label: "Home", icon: "⌂", href: "/forms", active: true },
  { label: "Contacts", icon: "◎", href: "/contacts", active: false },
  { label: "Insights", icon: "▤", href: "/insights", active: false },
  { label: "Connect", icon: "⟡", href: "/integrations", active: false },
];

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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

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
    setOpenMenuId(null);
    setBusyId(id);
    try { await api(`/api/forms/${id}/${name}`, { method: "POST" }); setToast(name === "archive" ? "Form archived" : name === "restore" ? "Form restored" : name === "duplicate" ? "Form duplicated" : name === "publish" ? "Form published" : "Form unpublished"); await loadForms(); }
    catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusyId(null); }
  }

  async function showActivity(form: FormListItem) {
    setOpenMenuId(null);
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

  async function generateFormWithAi() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError("Describe the form you want to build.");
      return;
    }
    setAiGenerating(true);
    setError("");
    try {
      const suggestion = await api<{ title: string; description: string; questions: Template["questions"] }>("/api/ai/form-suggestions", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      const form = await api<{ id: number }>("/api/forms", { method: "POST", body: JSON.stringify({ title: suggestion.title, description: suggestion.description }) });
      for (const question of suggestion.questions) {
        await api(`/api/forms/${form.id}/questions`, { method: "POST", body: JSON.stringify(question) });
      }
      setAiPrompt("");
      window.location.href = `/forms/${form.id}/edit`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate form");
    } finally {
      setAiGenerating(false);
    }
  }

  const folders = Array.from(new Set(forms.map((form) => form.folder).filter(Boolean))) as string[];

  return (
    <main className="flex min-h-screen bg-zinc-50/50 text-zinc-900 font-sans selection:bg-zinc-200">
      {toast && <Toast message={toast} />}

      {/* Minimal Icon Sidebar */}
      <aside className="hidden w-20 flex-col items-center justify-between border-r border-zinc-200 bg-white py-6 lg:flex">
        <div className="flex flex-col items-center gap-8">
          <Link href="/forms" className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-sm font-black text-white transition-transform hover:scale-105">
            t.
          </Link>
          <nav className="flex flex-col items-center gap-3">
            {sidebarLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                title={link.label}
                className={`grid h-11 w-11 place-items-center rounded-xl text-lg transition-all ${
                  link.active ? "bg-zinc-100 text-zinc-900 shadow-sm" : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {link.icon}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={() => { clearToken(); router.push("/auth"); }}
          title="Log out"
          className="grid h-11 w-11 place-items-center rounded-xl text-lg text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
        >
          ⏻
        </button>
      </aside>

      <div className="flex-1">
        {/* Minimal Header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/forms" className="flex items-center gap-2 text-lg font-bold tracking-tight lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-xs text-white">t.</span>
            </Link>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-sm font-medium text-zinc-500">Workspace</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button onClick={() => { clearToken(); router.push("/auth"); }} className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
                Log out
              </button>
              <button
                onClick={() => void createForm()}
                disabled={busyId === -1}
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-50"
              >
                {busyId === -1 ? "Creating…" : "Create form"}
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Your forms</h1>
              <p className="mt-2 text-sm text-zinc-500">Manage, track, and organize your data collection.</p>
            </div>
            <div className="flex rounded-lg border border-zinc-200 bg-zinc-100/50 p-1">
              <button onClick={() => setShowArchived(false)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${!showArchived ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>Active</button>
              <button onClick={() => setShowArchived(true)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${showArchived ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>Archive</button>
            </div>
          </div>

          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search forms..." className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all" />
            </div>
            <select value={folder} onChange={(e) => setFolder(e.target.value)} className="w-full sm:w-auto rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all cursor-pointer">
              <option value="">All folders</option>
              {folders.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          {error && <div className="mb-8 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-600">{error}</div>}

          {!showArchived && (
            <div className="mb-12 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">Create with AI</h2>
                    <p className="mt-1 text-sm text-zinc-500">Describe your goal and we'll draft the form structure.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((template) => (
                      <button key={template.id} onClick={() => void createForm(template.title, template)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900">
                        {template.title}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    placeholder="e.g., Collect product feedback from beta users..."
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all"
                  />
                  <button
                    onClick={() => void generateFormWithAi()}
                    disabled={aiGenerating}
                    className="whitespace-nowrap rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-50"
                  >
                    {aiGenerating ? "Generating…" : "Generate Form"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-56 animate-pulse rounded-2xl bg-zinc-100/50" />
              ))}
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-transparent px-6 py-24 text-center">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
              </div>
              <h2 className="text-base font-semibold text-zinc-900">{showArchived ? "Archive is empty" : "No forms yet"}</h2>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
                {showArchived ? "Archived forms will appear here." : "Create your first form to start collecting responses."}
              </p>
              {!showArchived && <button onClick={() => void createForm()} className="mt-6 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">Create new form</button>}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {forms.map((form) => (
                <article key={form.id} className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void updateForm(form.id, { is_favorite: !form.is_favorite }, form.is_favorite ? "Removed from favorites" : "Added to favorites")}
                            aria-label="Favorite form"
                            className={`text-lg transition ${form.is_favorite ? "text-amber-400" : "text-zinc-300 hover:text-amber-400"}`}
                          >
                            {form.is_favorite ? "★" : "☆"}
                          </button>
                          <Link href={`/forms/${form.id}/edit`} className="truncate text-base font-medium text-zinc-900 hover:underline">{form.title}</Link>
                        </div>
                        <p className="mt-1 pl-7 text-xs text-zinc-500">Updated {formatDate(form.updated_at)}</p>
                      </div>

                      <div className="relative shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === form.id ? null : form.id)}
                          aria-label={`More actions for ${form.title}`}
                          className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-900"
                        >
                          ⋯
                        </button>
                        {openMenuId === form.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                              <Link href={`/forms/${form.id}/edit`} className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Edit</Link>
                              <Link href={`/forms/${form.id}/results`} className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Results</Link>
                              <button onClick={() => void showActivity(form)} className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">History</button>
                              <button onClick={() => void action(form.id, "duplicate")} className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">Duplicate</button>
                              <div className="my-1 h-px bg-zinc-100" />
                              <button onClick={() => void action(form.id, showArchived ? "restore" : "archive")} className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">
                                {showArchived ? "Restore" : "Archive"}
                              </button>
                              <button onClick={() => { setOpenMenuId(null); setDeleteTarget(form); }} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pl-7">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide ${form.status === "published" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" : "bg-zinc-100 text-zinc-600 border border-zinc-200/50"}`}>
                          {form.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-4">
                        <span className="text-2xl font-semibold tracking-tight text-zinc-900">{form.response_count}</span>
                        <span className="ml-1.5 text-xs text-zinc-500">Responses</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-1.5 pl-7 border-t border-zinc-100 pt-4">
                    <input
                      defaultValue={(form.tags ?? []).join(", ")}
                      onBlur={(e) => void updateForm(form.id, { tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }, "Tags saved")}
                      placeholder="+ add tags"
                      className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-xs text-zinc-600 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200 rounded"
                    />
                    <input
                      defaultValue={form.folder ?? ""}
                      onBlur={(e) => void updateForm(form.id, { folder: e.target.value.trim() || null }, "Folder saved")}
                      placeholder="+ folder"
                      className="w-20 bg-transparent px-1 py-0.5 text-xs text-zinc-600 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200 rounded"
                    />
                  </div>
                  {busyId === form.id && (
                    <div className="absolute inset-0 z-10 rounded-2xl bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-xs font-medium text-zinc-600">Working…</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Minimal Activity Modal */}
      {activity && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 px-4 backdrop-blur-sm transition-opacity" onClick={() => setActivity(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900">Activity History</h2>
              <button onClick={() => setActivity(null)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-zinc-500 mb-6">{activity.form.title}</p>
            <div className="max-h-[300px] space-y-4 overflow-y-auto pr-2">
              {activity.items.length ? (
                activity.items.map((item) => (
                  <div key={item.id} className="relative pl-4 border-l border-zinc-200">
                    <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-zinc-200" />
                    <p className="text-sm font-medium text-zinc-900 capitalize">{item.action}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{item.details || "System action"} · {item.created_at ? formatDate(item.created_at) : "Recently"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 italic">No activity recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Minimal Delete Modal */}
      {deleteTarget && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 px-4 backdrop-blur-sm transition-opacity" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-zinc-900">Delete form?</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Are you sure you want to delete <span className="font-medium text-zinc-900">{deleteTarget.title}</span>? This action cannot be undone and will erase all responses.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={() => void confirmDelete()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}