export function getBackendApiUrl(): string {
  const url =
    process.env.JOBPILOT_API_URL ||
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000";
  return url.replace(/\/+$/, "");
}

export function getBackendHeaders(
  request?: Request,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
  }

  return headers;
}
