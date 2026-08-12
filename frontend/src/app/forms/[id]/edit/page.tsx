"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { api, API_URL } from "@/lib/api";

type QuestionType = "short_text" | "long_text" | "multiple_choice" | "dropdown" | "email" | "number" | "yes_no" | "rating";
type Question = { id: number; form_id: number; type: QuestionType; title: string; description: string | null; required: boolean; order_index: number; options: string[] | null; settings: Record<string, unknown> | null };
type Form = { id: number; title: string; description: string | null; status: "draft" | "published"; public_slug: string | null; theme: { color?: string; font?: string; background?: string } | null; thank_you_message: string; questions: Question[] };

const questionTypes: { type: QuestionType; label: string; icon: string }[] = [
  { type: "short_text", label: "Short text", icon: "Aa" }, { type: "long_text", label: "Long text", icon: "¶" },
  { type: "multiple_choice", label: "Multiple choice", icon: "☷" }, { type: "dropdown", label: "Dropdown", icon: "⌄" },
  { type: "email", label: "Email", icon: "@" }, { type: "number", label: "Number", icon: "#" },
  { type: "yes_no", label: "Yes / No", icon: "↔" }, { type: "rating", label: "Rating", icon: "★" },
];

const defaults: Record<QuestionType, Partial<Question>> = {
  short_text: { title: "What would you like to ask?" }, long_text: { title: "Tell us more" }, email: { title: "What is your email?" },
  number: { title: "How many?", settings: { min: 0, max: 100 } }, rating: { title: "How would you rate this?", settings: { min: 1, max: 5 } },
  multiple_choice: { title: "Choose an option", options: ["Option A", "Option B"] }, dropdown: { title: "Select an option", options: ["Option A", "Option B"] }, yes_no: { title: "Would you recommend us?" },
};

function DraggableQuestion({ question, active }: { question: Question; active: boolean }) {
  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({ id: question.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: question.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return <div ref={(node) => { setDragRef(node); setDropRef(node); }} style={style} className={`mb-2 flex items-center gap-3 rounded-xl border p-3 transition ${active ? "border-[#635bff] bg-[#eeecff]" : isOver ? "border-[#635bff] bg-white" : "border-slate-200 bg-white"}`}>
    <button {...listeners} {...attributes} aria-label={`Drag ${question.title}`} className="cursor-grab touch-none px-1 text-slate-400">⋮⋮</button>
    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{question.title}</p><p className="mt-1 text-xs capitalize text-slate-400">{question.type.replaceAll("_", " ")}</p></div>
  </div>;
}

export default function BuilderPage({ params }: { params: { id: string } }) {
  const formId = Number(params.id);
  const [form, setForm] = useState<Form | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { void api<Form>(`/api/forms/${formId}`).then((data) => { setForm(data); setSelectedId(data.questions[0]?.id ?? null); }).catch((err) => setError(err instanceof Error ? err.message : "Could not load form")).finally(() => setLoading(false)); }, [formId]);
  const selected = useMemo(() => form?.questions.find((question) => question.id === selectedId) ?? null, [form, selectedId]);

  function replaceQuestion(id: number, patch: Partial<Question>) { setForm((current) => current && ({ ...current, questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question) })); }
  async function saveQuestion(patch: Partial<Question>) {
    if (!selected) return;
    setSaving(true);
    try { const updated = await api<Question>(`/api/questions/${selected.id}`, { method: "PATCH", body: JSON.stringify(patch) }); replaceQuestion(selected.id, updated); setNotice("Saved"); window.setTimeout(() => setNotice(""), 1500); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save question"); } finally { setSaving(false); }
  }
  async function addQuestion(type: QuestionType) {
    setPickerOpen(false); setSaving(true);
    try { const created = await api<Question>(`/api/forms/${formId}/questions`, { method: "POST", body: JSON.stringify({ type, title: defaults[type].title, options: defaults[type].options, settings: defaults[type].settings }) }); setForm((current) => current && ({ ...current, questions: [...current.questions, created] })); setSelectedId(created.id); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not add question"); } finally { setSaving(false); }
  }
  async function reorder(event: DragEndEvent) {
    setActiveId(null);
    if (!form || !event.over || event.active.id === event.over.id) return;
    const oldIndex = form.questions.findIndex((q) => q.id === event.active.id); const newIndex = form.questions.findIndex((q) => q.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...form.questions]; const [moved] = next.splice(oldIndex, 1); next.splice(newIndex, 0, moved); next.forEach((q, index) => { q.order_index = index; }); setForm({ ...form, questions: next });
    try { await api(`/api/forms/${formId}/questions/reorder`, { method: "POST", body: JSON.stringify({ question_ids: next.map((q) => q.id) }) }); } catch (err) { setError(err instanceof Error ? err.message : "Could not reorder questions"); }
  }
  async function deleteSelected() { if (!selected || !window.confirm("Delete this question?")) return; await api(`/api/questions/${selected.id}`, { method: "DELETE" }); const next = form!.questions.filter((q) => q.id !== selected.id); setForm({ ...form!, questions: next }); setSelectedId(next[0]?.id ?? null); }
  async function updateForm(patch: Partial<Form>) { if (!form) return; setForm({ ...form, ...patch }); setSaving(true); try { await api(`/api/forms/${formId}`, { method: "PATCH", body: JSON.stringify(patch) }); setNotice("Saved"); window.setTimeout(() => setNotice(""), 1500); } catch (err) { setError(err instanceof Error ? err.message : "Could not save form"); } finally { setSaving(false); } }
  async function publish() { setSaving(true); try { const updated = await api<Form>(`/api/forms/${formId}/${form?.status === "published" ? "unpublish" : "publish"}`, { method: "POST" }); setForm(updated); setNotice(updated.status === "published" ? "Published" : "Unpublished"); } catch (err) { setError(err instanceof Error ? err.message : "Could not update publish status"); } finally { setSaving(false); } }
  async function copyLink() { if (!form?.public_slug) return; await navigator.clipboard.writeText(`${window.location.origin}/f/${form.public_slug}`); setNotice("Link copied"); window.setTimeout(() => setNotice(""), 1500); }

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f7f7fb] text-slate-500">Loading builder…</div>;
  if (!form) return <div className="grid min-h-screen place-items-center bg-[#f7f7fb] text-red-600">{error || "Form not found"}</div>;
  return <main className="min-h-screen bg-[#f7f7fb] text-slate-950">
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="flex items-center gap-5"><Link href="/forms" className="grid h-9 w-9 place-items-center rounded-xl bg-[#635bff] font-bold text-white">t.</Link><div className="h-6 w-px bg-slate-200" /><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onBlur={() => void updateForm({ title: form.title })} className="w-64 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold outline-none hover:border-slate-200 focus:border-[#635bff]" /></div>
      <div className="flex items-center gap-3"><Link href={`/forms/${formId}/results`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Results</Link><Link href={`/f/preview?formId=${formId}`} target="_blank" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:border-[#635bff] hover:text-[#635bff]">Preview</Link><button onClick={() => void publish()} disabled={saving || form.questions.length === 0} className="rounded-lg bg-[#635bff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5148e8] disabled:opacity-50">{form.status === "published" ? "Unpublish" : "Publish"}</button></div>
    </header>
    {notice && <div className="fixed right-6 top-20 z-20 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">{notice}</div>}
    {error && <div className="mx-auto mt-4 max-w-7xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="mx-auto grid max-w-7xl grid-cols-[280px_minmax(0,1fr)_360px] gap-5 px-5 py-5">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">Questions</h2><span className="text-xs text-slate-400">{form.questions.length}</span></div><DndContext sensors={sensors} onDragStart={(e) => setActiveId(Number(e.active.id))} onDragCancel={() => setActiveId(null)} onDragEnd={(e) => void reorder(e)}>{form.questions.map((question) => <div key={question.id} onClick={() => setSelectedId(question.id)} className="block w-full cursor-pointer text-left"><DraggableQuestion question={question} active={selectedId === question.id} /></div>)}<DragOverlay>{activeId ? <div className="rounded-xl bg-white p-3 text-sm shadow-xl">{form.questions.find((q) => q.id === activeId)?.title}</div> : null}</DragOverlay></DndContext><div className="relative mt-4"><button onClick={() => setPickerOpen(!pickerOpen)} className="w-full rounded-xl border border-dashed border-[#635bff] px-4 py-3 text-sm font-semibold text-[#635bff] hover:bg-[#eeecff]">＋ Add question</button>{pickerOpen && <div className="absolute bottom-14 left-0 z-10 grid w-64 grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{questionTypes.map((item) => <button key={item.type} onClick={() => void addQuestion(item.type)} className="flex items-center gap-2 rounded-xl p-2 text-left text-xs hover:bg-[#eeecff]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 font-semibold text-[#635bff]">{item.icon}</span>{item.label}</button>)}</div>}</div></aside>
      <section className="min-h-[calc(100vh-7rem)] rounded-2xl border border-slate-200 bg-white p-10"><div className="mx-auto max-w-2xl"><p className="mb-10 text-xs font-semibold uppercase tracking-[0.18em] text-[#635bff]">Question {selected ? selected.order_index + 1 : 0}</p>{selected ? <><h1 className="text-3xl font-bold tracking-tight">{selected.title}</h1>{selected.description && <p className="mt-3 text-slate-500">{selected.description}</p>}<div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-400">{selected.type === "multiple_choice" || selected.type === "dropdown" ? <div className="space-y-3">{(selected.options ?? []).map((option, index) => <div key={`${option}-${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3">{option}</div>)}</div> : selected.type === "rating" ? <div className="flex gap-3 text-2xl">{Array.from({ length: Number(selected.settings?.max ?? 5) }, (_, index) => <span key={index}>☆</span>)}</div> : selected.type === "yes_no" ? <div className="flex gap-3"><span className="rounded-xl border border-slate-200 bg-white px-6 py-3">Yes</span><span className="rounded-xl border border-slate-200 bg-white px-6 py-3">No</span></div> : <div className="border-b border-slate-300 pb-3">Type your answer…</div>}</div></> : <div className="py-24 text-center text-slate-400">Select a question to edit</div>}</div></section>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Edit question</h2>{selected ? <div className="mt-6 space-y-5"><label className="block text-sm font-medium">Question title<input value={selected.title} onChange={(e) => replaceQuestion(selected.id, { title: e.target.value })} onBlur={() => void saveQuestion({ title: selected.title })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#635bff]" /></label><label className="block text-sm font-medium">Help text<span className="mt-2 block text-xs font-normal text-slate-400">Optional description</span><textarea value={selected.description ?? ""} onChange={(e) => replaceQuestion(selected.id, { description: e.target.value })} onBlur={() => void saveQuestion({ description: selected.description })} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-[#635bff]" /></label><label className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium">Required<input type="checkbox" checked={selected.required} onChange={(e) => { replaceQuestion(selected.id, { required: e.target.checked }); void saveQuestion({ required: e.target.checked }); }} className="h-4 w-4 accent-[#635bff]" /></label>{(selected.type === "multiple_choice" || selected.type === "dropdown") && <div><p className="mb-2 text-sm font-medium">Options</p><div className="space-y-2">{(selected.options ?? []).map((option, index) => <div key={`${option}-${index}`} className="flex gap-2"><input value={option} onChange={(e) => { const options = [...(selected.options ?? [])]; options[index] = e.target.value; replaceQuestion(selected.id, { options }); }} onBlur={() => void saveQuestion({ options: selected.options })} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" /><button onClick={() => { const options = (selected.options ?? []).filter((_, optionIndex) => optionIndex !== index); replaceQuestion(selected.id, { options }); void saveQuestion({ options }); }} className="px-2 text-slate-400 hover:text-red-600">×</button></div>)}</div><button onClick={() => { const options = [...(selected.options ?? []), `Option ${(selected.options?.length ?? 0) + 1}`]; replaceQuestion(selected.id, { options }); void saveQuestion({ options }); }} className="mt-2 text-sm font-semibold text-[#635bff]">＋ Add option</button></div>}{(selected.type === "number" || selected.type === "rating") && <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Min<input type="number" value={Number(selected.settings?.min ?? 0)} onChange={(e) => { const settings = { ...(selected.settings ?? {}), min: Number(e.target.value) }; replaceQuestion(selected.id, { settings }); }} onBlur={() => void saveQuestion({ settings: selected.settings })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="text-sm font-medium">Max<input type="number" value={Number(selected.settings?.max ?? 5)} onChange={(e) => { const settings = { ...(selected.settings ?? {}), max: Number(e.target.value) }; replaceQuestion(selected.id, { settings }); }} onBlur={() => void saveQuestion({ settings: selected.settings })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2" /></label></div>}<button onClick={() => void deleteSelected()} className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">Delete question</button></div> : <p className="mt-5 text-sm text-slate-400">Choose a question from the left to edit it.</p>}<div className="mt-10 border-t border-slate-200 pt-6"><h2 className="text-sm font-semibold">Form settings</h2><label className="mt-4 block text-sm font-medium">Accent color<input type="color" value={form.theme?.color ?? "#635bff"} onChange={(e) => void updateForm({ theme: { ...(form.theme ?? {}), color: e.target.value } })} className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></label><label className="mt-4 block text-sm font-medium">Thank-you message<textarea value={form.thank_you_message} onChange={(e) => setForm({ ...form, thank_you_message: e.target.value })} onBlur={() => void updateForm({ thank_you_message: form.thank_you_message })} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5" /></label>{form.status === "published" && form.public_slug && <div className="mt-5 rounded-xl bg-[#eeecff] p-3"><p className="text-xs font-semibold uppercase tracking-wider text-[#635bff]">Share link</p><p className="mt-2 break-all text-xs text-slate-600">{window.location.origin}/f/{form.public_slug}</p><button onClick={() => void copyLink()} className="mt-3 text-sm font-semibold text-[#635bff]">Copy link</button></div>}<div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">Coming soon</p><p className="mt-1 text-xs leading-5 text-slate-500">Logic jumps, integrations, team sharing, payments, and file uploads.</p></div></div></aside>
    </div>
  </main>;
}
