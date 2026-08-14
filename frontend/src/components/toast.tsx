"use client";

export function Toast({ message, error = false }: { message: string; error?: boolean }) {
  return <div role="status" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${error ? "bg-red-600" : "bg-zinc-900"}`}>{message}</div>;
}
