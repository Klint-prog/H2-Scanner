export const getToken  = ()       => localStorage.getItem("h2_token");
export const setToken  = (t)      => localStorage.setItem("h2_token", t);
export const clearToken= ()       => localStorage.removeItem("h2_token");
export const getUser   = ()       => { try { const t=getToken(); if(!t) return null; return JSON.parse(atob(t.split(".")[1])); } catch { return null; } };
export const isAdmin   = ()       => getUser()?.role === "admin";

export async function apiFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) { clearToken(); window.location.reload(); }
  return res;
}
