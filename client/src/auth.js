export const getToken  = ()       => localStorage.getItem("h2_token");
export const setToken  = (t)      => localStorage.setItem("h2_token", t);
export const clearToken= ()       => localStorage.removeItem("h2_token");
export const getUser   = ()       => { try { const t=getToken(); if(!t) return null; return JSON.parse(atob(t.split(".")[1])); } catch { return null; } };
export const isAdmin   = ()       => getUser()?.role === "admin";

const USER_SCOPED_LOCAL_KEYS = ["h2_favorites", "h2_scan_history", "h2_last_jobs", "h2_last_summary"];

export function userStoragePrefix(user = getUser()) {
  if (!user) return "guest";
  return `user_${user.id || user.username || "unknown"}`;
}

export function scopedStorageKey(baseKey, user = getUser()) {
  return `${baseKey}:${userStoragePrefix(user)}`;
}

export function readScopedJson(baseKey, fallback = [], user = getUser()) {
  try { return JSON.parse(localStorage.getItem(scopedStorageKey(baseKey, user)) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

export function writeScopedJson(baseKey, value, user = getUser()) {
  localStorage.setItem(scopedStorageKey(baseKey, user), JSON.stringify(value));
}

export function removeScopedItem(baseKey, user = getUser()) {
  localStorage.removeItem(scopedStorageKey(baseKey, user));
}

export function setupUserScopedLocalStorage() {
  if (window.__h2ScopedLocalStorageInstalled) return;
  window.__h2ScopedLocalStorageInstalled = true;

  const rawGet = Storage.prototype.getItem;
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;

  function parseJwt(token) {
    try { return JSON.parse(atob(String(token || "").split(".")[1] || "")); }
    catch { return null; }
  }

  function scopedKey(key) {
    if (!USER_SCOPED_LOCAL_KEYS.includes(key)) return key;
    const token = rawGet.call(localStorage, "h2_token");
    const user = parseJwt(token);
    if (!user) return `${key}:guest`;
    return `${key}:user_${user.id || user.username || "unknown"}`;
  }

  Storage.prototype.getItem = function(key) {
    return rawGet.call(this, scopedKey(key));
  };

  Storage.prototype.setItem = function(key, value) {
    return rawSet.call(this, scopedKey(key), value);
  };

  Storage.prototype.removeItem = function(key) {
    return rawRemove.call(this, scopedKey(key));
  };
}

const AI_PROXY_ROUTES = ["/api/anthropic", "/api/openrouter", "/api/openai"];
const AUTH_ROUTES_THAT_CAN_EXPIRE_SESSION = ["/api/auth/me", "/api/auth/change-password", "/api/admin", "/api/ai/status"];

function shouldHandle401AsLocalSession(url, payload) {
  const path = String(url || "");

  // Nunca derrubar sessão por 401 vindo dos proxies de IA.
  // OpenAI/OpenRouter/Anthropic podem devolver 401 por chave inválida,
  // falta de crédito, header incorreto ou credencial do provedor.
  if (AI_PROXY_ROUTES.some(route => path.startsWith(route))) return false;

  const error = String(payload?.error || payload?.message || "").toLowerCase();
  const looksLikeJwtError =
    error.includes("token não fornecido") ||
    error.includes("token invalido") ||
    error.includes("token inválido") ||
    error.includes("token expirado") ||
    error.includes("jwt expired") ||
    error.includes("jwt malformed") ||
    error.includes("invalid token");

  const isLocalProtectedRoute = AUTH_ROUTES_THAT_CAN_EXPIRE_SESSION.some(route => path.startsWith(route));
  return isLocalProtectedRoute && looksLikeJwtError;
}

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

  if (res.status === 401) {
    const payload = await res.clone().json().catch(() => ({}));
    if (shouldHandle401AsLocalSession(url, payload)) {
      clearToken();
      window.location.reload();
    }
  }

  return res;
}
