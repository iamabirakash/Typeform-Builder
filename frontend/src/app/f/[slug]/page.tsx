"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Question = { id: number; type: "short_text" | "long_text" | "multiple_choice" | "dropdown" | "email" | "number" | "yes_no" | "rating"; title: string; description: string | null; required: boolean; order_index: number; options: string[] | null; settings: Record<string, unknown> | null };
type PublicForm = { id: number; title: string; description: string | null; theme: { color?: string; background?: string } | null; thank_you_message: string; public_slug: string; questions: Question[] };

const emptyValue = (question: Question) => question.type === "yes_no" ? "" : "";

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPreview = params.slug === "preview" && Boolean(searchParams.get("formId"));
  const previewId = searchParams.get("formId");
  const [form, setForm] = useState<PublicForm | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [responseId, setResponseId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const path = isPreview ? `/api/forms/${previewId}` : `/api/public/forms/${params.slug}`;
    void api<PublicForm>(path).then((data) => { setForm(data); }).catch(() => setError("This form isn't available")).finally(() => setLoading(false));
  }, [isPreview, params.slug, previewId]);

  useEffect(() => {
    if (!form || isPreview || responseId) return;
    void api<{ response_id: number }>(`/api/public/forms/${form.public_slug}/responses`, { method: "POST", body: JSON.stringify({}) }).then((data) => setResponseId(data.response_id)).catch(() => setError("We couldn't start this response. Please try again."));
  }, [form, isPreview, responseId]);

  const question = form?.questions[index] ?? null;
  const accent = form?.theme?.color ?? "#635bff";
  const currentValue = question ? answers[question.id] ?? emptyValue(question) : "";
  const setValue = (value: string) => { if (question) setAnswers((current) => ({ ...current, [question.id]: value })); setError(""); };

  const validate = useCallback(() => {
    if (!question) return "";
    const value = answers[question.id]?.trim() ?? "";
    if (question.required && !value) return "This question is required.";
    if (!value) return "";
    if (question.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
    if (question.type === "number") {
      const number = Number(value); const min = Number(question.settings?.min); const max = Number(question.settings?.max);
      if (!Number.isFinite(number)) return "Enter a valid number.";
      if (Number.isFinite(min) && number < min) return `Enter a number of at least ${min}.`;
      if (Number.isFinite(max) && number > max) return `Enter a number no more than ${max}.`;
    }
    if (question.type === "rating") {
      const rating = Number(value); const min = Number(question.settings?.min ?? 1); const max = Number(question.settings?.max ?? 5);
      if (!Number.isInteger(rating) || rating < min || rating > max) return `Choose a rating from ${min} to ${max}.`;
    }
    return "";
  }, [answers, question]);

  const advance = useCallback(async () => {
    if (!form || !question || saving) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(""); setSaving(true);
    try {
      if (!isPreview && responseId) await api(`/api/public/responses/${responseId}/answers`, { method: "PATCH", body: JSON.stringify({ question_id: question.id, value: answers[question.id] ?? "" }) });
      if (index === form.questions.length - 1) {
        if (!isPreview && responseId) await api(`/api/public/responses/${responseId}/complete`, { method: "POST" });
        setComplete(true);
      } else setIndex((current) => current + 1);
    } catch { setError("We couldn't save that answer. Check your connection and try again."); } finally { setSaving(false); }
  }, [answers, form, index, isPreview, question, responseId, saving, validate]);

  const goBack = useCallback(() => { setError(""); setIndex((current) => Math.max(0, current - 1)); }, []);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowUp") { event.preventDefault(); goBack(); return; }
      if (event.key === "Enter" || event.key === "ArrowDown") { if ((event.target as HTMLElement)?.tagName !== "TEXTAREA" || event.key === "ArrowDown") { event.preventDefault(); void advance(); } }
      if (question?.type === "multiple_choice" && /^[a-z]$/i.test(event.key)) { const optionIndex = event.key.toUpperCase().charCodeAt(0) - 65; const option = question.options?.[optionIndex]; if (option) setValue(option); }
    }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, goBack, question]);

  const questionContent = useMemo(() => {
    if (!question) return null;
    if (question.type === "long_text") return <textarea autoFocus value={currentValue} onChange={(e) => setValue(e.target.value)} placeholder="Type your answer here…" className="min-h-32 w-full resize-none border-b-2 border-slate-300 bg-transparent py-3 text-2xl outline-none transition placeholder:text-slate-300 focus:border-current" />;
    if (question.type === "multiple_choice") return <div className="mt-8 space-y-3">{(question.options ?? []).map((option, optionIndex) => <button autoFocus={optionIndex === 0 && !currentValue} key={option} onClick={() => setValue(option)} className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left text-lg transition ${currentValue === option ? "border-current bg-white shadow-md" : "border-slate-200 bg-white/60 hover:border-slate-400"}`}><span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-sm font-semibold">{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div>;
    if (question.type === "dropdown") return <select autoFocus value={currentValue} onChange={(e) => setValue(e.target.value)} className="mt-8 w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-lg outline-none focus:border-current"><option value="">Select an option…</option>{(question.options ?? []).map((option) => <option key={option}>{option}</option>)}</select>;
    if (question.type === "yes_no") return <div className="mt-8 flex gap-4"><button autoFocus onClick={() => setValue("yes")} className={`rounded-2xl border-2 px-8 py-4 text-lg ${currentValue === "yes" ? "border-current bg-white shadow-md" : "border-slate-200 bg-white/60"}`}>Yes</button><button onClick={() => setValue("no")} className={`rounded-2xl border-2 px-8 py-4 text-lg ${currentValue === "no" ? "border-current bg-white shadow-md" : "border-slate-200 bg-white/60"}`}>No</button></div>;
    if (question.type === "rating") { const min = Number(question.settings?.min ?? 1); const max = Number(question.settings?.max ?? 5); return <div className="mt-8 flex flex-wrap gap-3">{Array.from({ length: max - min + 1 }, (_, offset) => min + offset).map((rating) => <button autoFocus={rating === min} key={rating} onClick={() => setValue(String(rating))} className={`grid h-14 w-14 place-items-center rounded-2xl border-2 text-lg font-semibold ${currentValue === String(rating) ? "border-current bg-white shadow-md" : "border-slate-200 bg-white/60"}`}>{rating}</button>)}</div>; }
    return <input autoFocus value={currentValue} onChange={(e) => setValue(e.target.value)} type={question.type === "email" ? "email" : question.type === "number" ? "number" : "text"} placeholder="Type your answer here…" className="mt-8 w-full border-b-2 border-slate-300 bg-transparent py-3 text-2xl outline-none transition placeholder:text-slate-300 focus:border-current" />;
  }, [currentValue, question]);

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] text-slate-500">Loading form…</main>;
  if (error && !form) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] px-6 text-center"><div><div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white text-2xl shadow-sm">⊙</div><h1 className="text-2xl font-bold">This form isn&apos;t available</h1><p className="mt-2 text-slate-500">It may have been unpublished or the link may be incorrect.</p></div></main>;
  if (!form) return null;
  if (complete) return <main style={{ color: accent, background: form.theme?.background ?? "#f8f7ff" }} className="grid min-h-screen place-items-center px-6"><motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl text-center"><div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-full bg-white text-3xl shadow-sm">✓</div><h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">{form.thank_you_message}</h1><p className="mt-5 text-slate-500">Your response has been recorded.</p></motion.div></main>;
  const progress = ((index + 1) / form.questions.length) * 100;
  return <main style={{ color: accent, background: form.theme?.background ?? "#f8f7ff" }} className="min-h-screen"><div className="fixed left-0 right-0 top-0 z-10 h-1 bg-black/5"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full" style={{ backgroundColor: accent }} /></div><div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10 md:px-12"><div className="flex items-center justify-between text-xs font-semibold text-slate-400"><span>{isPreview ? "Preview" : form.title}</span><span>{index + 1} / {form.questions.length}</span></div><div className="flex flex-1 items-center py-16"><AnimatePresence mode="wait"><motion.div key={question?.id} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.3 }} className="w-full"><p className="mb-4 text-sm font-semibold" style={{ color: accent }}>Question {index + 1}</p><h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 md:text-5xl">{question?.title}{question?.required && <span style={{ color: accent }}> *</span>}</h1>{question?.description && <p className="mt-4 max-w-2xl text-lg text-slate-500">{question.description}</p>}<div className="max-w-2xl">{questionContent}</div>{error && <p role="alert" className="mt-5 text-sm font-medium text-red-600">{error}</p>}</motion.div></AnimatePresence></div><div className="flex items-center justify-between"><button onClick={goBack} disabled={index === 0} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-white disabled:invisible">↑ Back</button><div className="flex items-center gap-4"><span className="hidden text-xs text-slate-400 md:inline">Press Enter ↵</span><button onClick={() => void advance()} disabled={saving || (!isPreview && !responseId)} className="rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-50" style={{ backgroundColor: accent }}>{saving ? "Saving…" : index === form.questions.length - 1 ? "Finish" : "Continue"} <span className="ml-2">→</span></button></div></div></div></main>;
}
