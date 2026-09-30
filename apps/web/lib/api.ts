import type { ErrorBody } from "@servis-track/shared";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body: unknown = isJson ? await res.json() : undefined;
  if (!res.ok) {
    const err = body as ErrorBody | undefined;
    throw new ApiError(
      res.status,
      err?.error?.message ?? `Request failed (HTTP ${res.status})`,
      err?.error?.code,
      err?.error?.details,
    );
  }
  return body as T;
}

const json = { "content-type": "application/json" };

export function apiGet<T>(path: string, init: { signal?: AbortSignal } = {}): Promise<T> {
  return fetch(`/api${path}`, { cache: "no-store", signal: init.signal }).then((r) => handle<T>(r));
}

export async function apiGetList<T>(
  path: string,
): Promise<{ items: T[]; total: number }> {
  const res = await fetch(`/api${path}`, { cache: "no-store" });
  const items = await handle<T[]>(res);
  const header = res.headers.get("X-Total-Count");
  return { items, total: header !== null ? Number(header) : items.length };
}

export function apiPost<T>(path: string, data?: unknown): Promise<T> {
  return fetch(`/api${path}`, {
    method: "POST",
    headers: json,
    body: data === undefined ? undefined : JSON.stringify(data),
  }).then((r) => handle<T>(r));
}

export function apiPatch<T>(path: string, data: unknown): Promise<T> {
  return fetch(`/api${path}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify(data),
  }).then((r) => handle<T>(r));
}

export function apiPut<T>(path: string, data: unknown): Promise<T> {
  return fetch(`/api${path}`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify(data),
  }).then((r) => handle<T>(r));
}

export function apiDelete<T = void>(path: string): Promise<T> {
  return fetch(`/api${path}`, { method: "DELETE" }).then((r) => handle<T>(r));
}

export function apiUpload<T>(
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const form = new FormData();
  form.append("file", file);

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api${path}`);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status === 204) return resolve(undefined as T);
      const isJson = xhr.getResponseHeader("content-type")?.includes("application/json");
      let body: unknown;
      if (isJson) {
        try {
          body = JSON.parse(xhr.responseText) as unknown;
        } catch {
          body = undefined;
        }
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const err = body as ErrorBody | undefined;
        return reject(
          new ApiError(
            xhr.status,
            err?.error?.message ?? `Request failed (HTTP ${xhr.status})`,
            err?.error?.code,
            err?.error?.details,
          ),
        );
      }
      resolve(body as T);
    });

    xhr.addEventListener("error", () =>
      reject(new ApiError(0, "Network error during upload")),
    );
    xhr.addEventListener("abort", () => reject(new ApiError(0, "Upload cancelled")));

    xhr.send(form);
  });
}
