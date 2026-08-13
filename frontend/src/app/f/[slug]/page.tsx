"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Question = { id: number; type: string; title: string; description: string | null; required: boolean; order_index: number; options: string[] | null; settings: Record<string, any> | null };
type PublicForm = { id: number; title: string; description: string | null; theme: { color?: string; background?: string } | null; welcome_message: string; thank_you_message: string; public_slug: string; questions: Question[] };

function visible(question: Question, answers: Record<number, string>) {
  const logic = question.settings?.logic;
  if (!logic?.question_id) return true;
  const actual = answers[Number(logic.question_id)] ?? "";
  return logic.operator === "is_not" ? actual !== String(logic.value ?? "") : actual === String(logic.value ?? "");
}

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const preview = params.slug === "preview" && Boolean(search.get("formId"));
  const [form, setForm] = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [index, setIndex] = useState(0);
  const [responseId, setResponseId] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const path = preview ? `/api/forms/${search.get("formId")}` : `/api/public/forms/${params.slug}`;
    void api<PublicForm>(path).then(setForm).catch(() => setError("This form isn't available")).finally(() => setSaving(false));
  }, [params.slug, preview, search]);
  useEffect(() => {
    if (!form || preview || responseId) return;
    void api<{ response_id: number }>(`/api/public/forms/${form.public_slug}/responses`, { method: "POST", body: JSON.stringify({}) }).then((item) => setResponseId(item.response_id)).catch(() => setError("We couldn't start this response."));
  }, [form, preview, responseId]);

  const questions = useMemo(() => form?.questions.filter((question) => visible(question, answers)) ?? [], [answers, form]);
  const question = questions[index] ?? null;
  const value = question ? answers[question.id] ?? "" : "";
  const setValue = (next: string) => { if (question) setAnswers((current) => ({ ...current, [question.id]: next })); setError(""); };
  const accent = form?.theme?.color ?? "#635bff";

  async function advance() {
    if (!form || !question || saving) return;
    if (question.required && !value.trim()) { setError("This question is required."); return; }
    if (question.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError("Enter a valid email address."); return; }
    setSaving(true);
    try {
      if (!preview && responseId) await api(`/api/public/responses/${responseId}/answers`, { method: "PATCH", body: JSON.stringify({ question_id: question.id, value }) });
      if (index >= questions.length - 1) { if (!preview && responseId) await api(`/api/public/responses/${responseId}/complete`, { method: "POST" }); setComplete(true); }
      else setIndex((current) => current + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "We couldn't save that answer."); }
    finally { setSaving(false); }
  }

  function renderAnswer() {
    if (!question) return null;
    if (question.settings?.input_type === "file_upload") return <input autoFocus type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) setValue(file.name); }} className="mt-8 w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-lg" />;
    if (question.type === "multiple_choice") return <div className="mt-8 space-y-3">{(question.options ?? []).map((option, optionIndex) => <button key={`${option}-${optionIndex}`} onClick={() => setValue(option)} className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left text-lg ${value === option ? "border-current bg-white shadow-md" : "border-slate-200 bg-white/60"}`}><span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-sm">{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div>;
    if (question.type === "dropdown") return <select autoFocus value={value} onChange={(event) => setValue(event.target.value)} className="mt-8 w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-lg"><option value="">Select an option...</option>{(question.options ?? []).map((option) => <option key={option}>{option}</option>)}</select>;
    if (question.type === "yes_no") return <div className="mt-8 flex gap-4"><button onClick={() => setValue("yes")} className={`rounded-2xl border-2 px-8 py-4 text-lg ${value === "yes" ? "border-current bg-white shadow-md" : "border-slate-200 bg-white/60"}`}>Yes</button><button onClick={() => setValue("no")} className={`rounded-2xl border-2 px-8 py-4 text-lg ${value === "no" ? "border-current bg-white shadow-md" : "border-slate-200 bg-white/60"}`}>No</button></div>;
    if (question.type === "rating") { const min = Number(question.settings?.min ?? 1); const max = Number(question.settings?.max ?? 5); return <div className="mt-8 flex flex-wrap gap-3">{Array.from({ length: max - min + 1 }, (_, offset) => min + offset).map((rating) => <button key={rating} onClick={() => setValue(String(rating))} className={`grid h-14 w-14 place-items-center rounded-2xl border-2 text-lg ${value === String(rating) ? "border-current bg-white shadow-md" : "border-slate-200 bg-white/60"}`}>{rating}</button>)}</div>; }
    const common = { autoFocus: true, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(event.target.value), placeholder: String(question.settings?.placeholder ?? "Type your answer here...") };
    return question.type === "long_text" ? <textarea {...common} className="mt-8 min-h-32 w-full resize-none border-b-2 border-slate-300 bg-transparent py-3 text-2xl outline-none" /> : <input {...common} type={question.type === "email" ? "email" : question.type === "number" ? "number" : "text"} className="mt-8 w-full border-b-2 border-slate-300 bg-transparent py-3 text-2xl outline-none" />;
  }

  if (error && !form) return <main className="grid min-h-screen place-items-center text-red-600">{error}</main>;
  if (!form) return <main className="grid min-h-screen place-items-center text-slate-500">Loading form...</main>;
  if (!started) return <main style={{ background: form.theme?.background ?? "#f8f7ff", color: accent }} className="grid min-h-screen place-items-center px-6"><div className="max-w-2xl text-center"><p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em]">{form.title}</p><h1 className="text-4xl font-bold text-slate-950 md:text-5xl">{form.welcome_message}</h1>{form.description && <p className="mt-5 text-lg text-slate-500">{form.description}</p>}<button onClick={() => setStarted(true)} className="mt-8 rounded-xl px-6 py-3 font-semibold text-white" style={{ backgroundColor: accent }}>Start →</button></div></main>;
  if (complete) return <main style={{ background: form.theme?.background ?? "#f8f7ff" }} className="grid min-h-screen place-items-center px-6"><div className="max-w-2xl text-center"><div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-full bg-white text-3xl shadow-sm" style={{ color: accent }}>✓</div><h1 className="text-4xl font-bold text-slate-950 md:text-5xl">{form.thank_you_message}</h1><p className="mt-5 text-slate-500">Your response has been recorded.</p></div></main>;
  const progress = ((index + 1) / Math.max(questions.length, 1)) * 100;
  return <main style={{ background: form.theme?.background ?? "#f8f7ff", color: accent }} className="min-h-screen"><div className="fixed left-0 right-0 top-0 z-10 h-1 bg-black/5"><div className="h-full" style={{ width: `${progress}%`, backgroundColor: accent }} /></div><div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10 md:px-12"><div className="flex items-center justify-between text-xs font-semibold text-slate-400"><span>{preview ? "Preview" : form.title}</span><span>{index + 1} / {questions.length}</span></div><div className="flex flex-1 items-center py-16"><div className="w-full"><p className="mb-4 text-sm font-semibold">{question?.settings?.section_title ? String(question.settings.section_title) : `Question ${index + 1}`}</p><h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 md:text-5xl">{question?.title}{question?.required && <span> *</span>}</h1>{question?.description && <p className="mt-4 max-w-2xl text-lg text-slate-500">{question.description}</p>}<div className="max-w-2xl">{renderAnswer()}</div>{error && <p role="alert" className="mt-5 text-sm font-medium text-red-600">{error}</p>}</div></div><div className="flex items-center justify-between"><button onClick={() => { setError(""); setIndex((current) => Math.max(0, current - 1)); }} disabled={index === 0} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 disabled:invisible">← Back</button><button onClick={() => void advance()} disabled={saving || (!preview && !responseId)} className="rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: accent }}>{saving ? "Saving..." : index === questions.length - 1 ? "Finish" : "Continue"} →</button></div></div></main>;
}
