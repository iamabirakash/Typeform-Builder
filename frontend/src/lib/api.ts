export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export type FormListItem = {
  id: number;
  title: string;
  status: "draft" | "published";
  response_count: number;
  updated_at: string | null;
  tags?: string[] | null;
  folder?: string | null;
  is_favorite: boolean;
  is_archived: boolean;
};

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("typeform_access_token") : null;
  const timeout = typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(15000) : undefined;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers ?? {}) },
      signal: options?.signal ?? timeout,
    });
  } catch (error) {
    throw new Error(error instanceof DOMException && error.name === "TimeoutError" ? "The server took too long to respond. Is the backend running?" : "Unable to connect to the backend. Start the FastAPI server and try again.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Something went wrong", response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function saveToken(token: string) { window.localStorage.setItem("typeform_access_token", token); }
export function clearToken() { window.localStorage.removeItem("typeform_access_token"); }
export function hasToken() { return typeof window !== "undefined" && Boolean(window.localStorage.getItem("typeform_access_token")); }

export async function downloadFile(path: string, filename: string) {
  const token = window.localStorage.getItem("typeform_access_token");
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new ApiError("Could not download the file", response.status);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
