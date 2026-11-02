const AUTH_ENDPOINTS = new Set(["/api/login"]);
let redirecting = false;

/** Session expired: clear the (already-invalid) cookie and send the user back to sign in. */
function redirectToLogin() {
  if (redirecting || typeof window === "undefined") return;
  redirecting = true;
  fetch("/api/logout", { method: "POST" }).finally(() => {
    window.location.href = "/login";
  });
}

/** Fetch JSON without throwing on non-JSON bodies. Throws Error with a readable message on non-2xx. */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  fallbackMessage = "Request failed",
): Promise<T> {
  const response = await fetch(url, {
    ...(init?.method && init.method !== "GET"
      ? {}
      : { cache: "no-store" as const }),
    ...init,
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    let message = fallbackMessage;
    if (data && typeof data === "object") {
      if ("error" in data && typeof data.error === "string") message = data.error;
      else if ("message" in data && typeof data.message === "string") message = data.message;
    }
    if (response.status === 401 && !AUTH_ENDPOINTS.has(url)) redirectToLogin();
    throw new Error(message);
  }
  return data as T;
}
