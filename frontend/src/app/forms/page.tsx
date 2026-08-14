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

const thumbnailAccents = [
  "from-[#f3e6ff] to-[#e0c9ff]",
  "from-[#ffe9f2] to-[#ffcfe4]",
  "from-[#e6f7ff] to-[#c9ecff]",
  "from-[#fff3d6] to-[#ffe3a8]",
  "from-[#e6ffee] to-[#c6ffdc]",
];

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

  const folders = Array.from(new Set(forms.map((form) => form.folder).filter(Boolean))) as string[];

  return (
    <main className="flex min-h-screen bg-[#f7f6fa] text-[#171719]">
      {toast && <Toast message={toast} />}

      {/* Icon sidebar */}
      <aside className="hidden w-20 flex-col items-center justify-between bg-[#1c1620] py-6 lg:flex">
        <div className="flex flex-col items-center gap-8">
          <Link href="/forms" className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-black text-[#1c1620]">
            t.
          </Link>
          <nav className="flex flex-col items-center gap-2">
            {sidebarLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                title={link.label}
                className={`grid h-11 w-11 place-items-center rounded-xl text-lg transition ${
                  link.active ? "bg-[#8b5cf6] text-white" : "text-white/50 hover:bg-white/10 hover:text-white"
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
          className="grid h-11 w-11 place-items-center rounded-xl text-lg text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          ⏻
        </button>
      </aside>

      <div className="flex-1">
        {/* Top bar */}
        <header className="border-b border-black/5 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
            <Link href="/forms" className="flex items-center gap-2 text-lg font-bold tracking-tight lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1c1620] text-sm text-white">t.</span>
              typeform
            </Link>
            <div className="hidden items-center gap-2 lg:flex">
              <p className="text-sm font-semibold text-black/40">Workspace</p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button onClick={() => { clearToken(); router.push("/auth"); }} className="rounded-xl px-3 py-2 text-sm font-semibold text-black/50 hover:bg-black/5">
                Log out
              </button>
              <button
                onClick={() => void createForm()}
                disabled={busyId === -1}
                className="rounded-full bg-[#1c1620] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8b5cf6] disabled:cursor-wait disabled:opacity-60"
              >
                {busyId === -1 ? "Creating…" : "+ Create form"}
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#8b5cf6]">Workspace</p>
              <h1 className="text-4xl font-bold tracking-tight">Your forms</h1>
              <p className="mt-3 text-black/50">Search, organize, and keep your best forms close.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowArchived(false)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!showArchived ? "bg-[#1c1620] text-white" : "bg-white text-black/50 hover:bg-black/5"}`}>Active</button>
              <button onClick={() => setShowArchived(true)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${showArchived ? "bg-[#1c1620] text-white" : "bg-white text-black/50 hover:bg-black/5"}`}>Archive</button>
            </div>
          </div>

          <div className="mb-8 grid gap-3 md:grid-cols-[1fr_12rem_auto]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/30">⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search forms..." className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-4 outline-none focus:border-[#8b5cf6]" />
            </div>
            <select value={folder} onChange={(e) => setFolder(e.target.value)} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#8b5cf6]">
              <option value="">All folders</option>
              {folders.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button onClick={() => void loadForms()} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold transition hover:border-[#8b5cf6] hover:text-[#8b5cf6]">Search</button>
          </div>

          {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

          {!showArchived && templates.length > 0 && (
            <div className="mb-8 rounded-3xl border border-[#8b5cf6]/25 bg-gradient-to-br from-[#f3e6ff] to-[#e9d9ff] p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-bold">Start from a template</h2>
                  <p className="mt-1 text-sm text-black/60">Get a useful first draft, then make it yours.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <button key={template.id} onClick={() => void createForm(template.title, template)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <div className="h-64 animate-pulse rounded-3xl bg-white" />
              <div className="h-64 animate-pulse rounded-3xl bg-white" />
              <div className="h-64 animate-pulse rounded-3xl bg-white" />
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white px-6 py-20 text-center">
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#f3e6ff] text-2xl text-[#8b5cf6]">＋</div>
              <h2 className="text-xl font-semibold">{showArchived ? "Your archive is empty" : "Start with your first form"}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-black/50">
                {showArchived ? "Forms you archive will show up here." : "Build a beautiful, focused flow for feedback, signups, or anything you want to ask."}
              </p>
              {!showArchived && <button onClick={() => void createForm()} className="mt-6 rounded-full bg-[#1c1620] px-5 py-3 text-sm font-semibold text-white hover:bg-[#8b5cf6]">Create a form</button>}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {forms.map((form, i) => (
                <article key={form.id} className="group relative rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <Link href={`/forms/${form.id}/edit`} className="block">
                    <div className={`flex h-24 items-start justify-between rounded-t-3xl bg-gradient-to-br p-4 ${thumbnailAccents[i % thumbnailAccents.length]}`}>
                      <span className={`rounded-full bg-white/80 px-3 py-1 text-xs font-semibold backdrop-blur ${form.status === "published" ? "text-emerald-700" : "text-black/60"}`}>
                        {form.status}
                      </span>
                    </div>
                  </Link>

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void updateForm(form.id, { is_favorite: !form.is_favorite }, form.is_favorite ? "Removed from favorites" : "Added to favorites")}
                            aria-label="Favorite form"
                            className="text-lg text-[#8b5cf6]"
                          >
                            {form.is_favorite ? "★" : "☆"}
                          </button>
                          <Link href={`/forms/${form.id}/edit`} className="truncate text-lg font-semibold tracking-tight hover:text-[#8b5cf6]">{form.title}</Link>
                        </div>
                        <p className="mt-1 text-xs text-black/40">Updated {formatDate(form.updated_at)}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(form.tags ?? []).map((tag) => (
                            <span key={tag} className="rounded-full bg-[#f3e6ff] px-2 py-1 text-xs text-[#8b5cf6]">{tag}</span>
                          ))}
                          {form.folder && <span className="rounded-full bg-black/5 px-2 py-1 text-xs text-black/50">{form.folder}</span>}
                        </div>
                      </div>

                      {/* Overflow menu */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === form.id ? null : form.id)}
                          aria-label={`More actions for ${form.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-black/40 hover:bg-black/5 hover:text-black"
                        >
                          ⋯
                        </button>
                        {openMenuId === form.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-2xl border border-black/10 bg-white py-1.5 shadow-xl">
                              <Link href={`/forms/${form.id}/edit`} className="block px-4 py-2.5 text-sm font-medium hover:bg-[#f7f6fa]">Edit</Link>
                              <Link href={`/forms/${form.id}/results`} className="block px-4 py-2.5 text-sm font-medium hover:bg-[#f7f6fa]">Results</Link>
                              <button onClick={() => void showActivity(form)} className="block w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[#f7f6fa]">History</button>
                              <button onClick={() => void action(form.id, "duplicate")} className="block w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[#f7f6fa]">Duplicate</button>
                              <button onClick={() => void action(form.id, showArchived ? "restore" : "archive")} className="block w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[#f7f6fa]">
                                {showArchived ? "Restore" : "Archive"}
                              </button>
                              <button onClick={() => { setOpenMenuId(null); setDeleteTarget(form); }} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold">{form.response_count}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-black/40">Responses</p>
                      </div>
                      {busyId === form.id && <span className="text-xs font-medium text-black/40">Working…</span>}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input
                        defaultValue={(form.tags ?? []).join(", ")}
                        onBlur={(e) => void updateForm(form.id, { tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }, "Tags saved")}
                        placeholder="Tags: feedback, ux"
                        className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-xs outline-none focus:border-[#8b5cf6]"
                      />
                      <input
                        defaultValue={form.folder ?? ""}
                        onBlur={(e) => void updateForm(form.id, { folder: e.target.value.trim() || null }, "Folder saved")}
                        placeholder="Folder"
                        className="w-28 rounded-lg border border-black/10 px-3 py-2 text-xs outline-none focus:border-[#8b5cf6]"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {activity && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-[#1c1620]/50 px-5" onClick={() => setActivity(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Activity history</h2>
              <button onClick={() => setActivity(null)} className="text-2xl text-black/40">×</button>
            </div>
            <p className="mt-1 text-sm text-black/50">{activity.form.title}</p>
            <div className="mt-6 max-h-80 space-y-3 overflow-y-auto">
              {activity.items.length ? (
                activity.items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-[#f7f6fa] p-3">
                    <p className="text-sm font-semibold capitalize">{item.action}</p>
                    <p className="mt-1 text-xs text-black/50">{item.details || "Form activity"} · {item.created_at ? formatDate(item.created_at) : "Recently"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-black/50">No activity recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-[#1c1620]/50 px-5" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-xl text-red-600">!</div>
            <h2 className="mt-5 text-xl font-bold">Delete {deleteTarget.title}?</h2>
            <p className="mt-2 text-sm leading-6 text-black/50">This removes the form and its responses permanently.</p>
            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={() => void confirmDelete()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Delete form</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}