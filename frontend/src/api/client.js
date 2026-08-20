const API = import.meta.env.VITE_API_URL || "/api/v1";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("cl_token");
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || res.statusText);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function saveSession({ token, role, fullName }) {
  localStorage.setItem("cl_token", token);
  localStorage.setItem("cl_role", role || "");
  localStorage.setItem("cl_name", fullName || "");
}

export function clearSession() {
  ["cl_token", "cl_role", "cl_name"].forEach((k) => localStorage.removeItem(k));
}

export const session = {
  token: () => localStorage.getItem("cl_token"),
  role: () => localStorage.getItem("cl_role"),
  name: () => localStorage.getItem("cl_name")
};
