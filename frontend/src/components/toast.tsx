"use client";

export function Toast({ message, error = false }: { message: string; error?: boolean }) {
  return <div role="status" className={`fixed right-6 top-6 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${error ? "bg-red-600" : "bg-slate-950"}`}>{message}</div>;
}
