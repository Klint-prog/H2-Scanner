export const getToken  = ()       => localStorage.getItem("h2_token");
export const setToken  = (t)      => localStorage.setItem("h2_token", t);
export const clearToken= ()       => localStorage.removeItem("h2_token");
export const getUser   = ()       => { try { const t=getToken(); if(!t) return null; return JSON.parse(atob(t.split(".")[1])); } catch { return null; } };
export const isAdmin   = ()       => getUser()?.role === "admin";

function isSessionExpiredPayload(payload) {
  const error = String(payload?.error || payload?.message || "").toLowerCase();
  return error.includes("token não fornecido") || error.includes("token invalido") || error.includes("token inválido") || error.includes("token expirado") || error.includes("jwt expired") || error.includes("jwt malformed");
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

  // Importante: uma varredura pode receber HTTP 401 do provedor de IA
  // por chave inválida/expirada. Isso NÃO deve derrubar a sessão do usuário.
  // Só limpamos o token quando o 401 veio claramente da autenticação local/JWT.
  if (res.status === 401) {
    const payload = await res.clone().json().catch(() => ({}));
    if (isSessionExpiredPayload(payload)) {
      clearToken();
      window.location.reload();
    }
  }

  return res;
}
