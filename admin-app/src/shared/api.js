export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(typeof window !== "undefined" && window.__ERP_PORTAL_ROLE__ ? { "X-ERP-Portal-Role": window.__ERP_PORTAL_ROLE__ } : {}),
      ...(options.headers || {}),
    },
    ...(options.body && typeof options.body !== "string" ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || `Request failed (${response.status}).`);
  return payload;
}

export const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const prettyStatus = (status = "Draft") => String(status).replace(/([a-z])([A-Z])/g, "$1 $2");
