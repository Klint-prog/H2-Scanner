import { useState } from "react";
import { setToken } from "./auth.js";

const baseInput = {
  width: "100%",
  background: "#020408",
  border: "1px solid #1e293b",
  color: "#f1f5f9",
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "'DM Sans',sans-serif",
};

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", country: "Brasil", goal: "H-2A" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "register" && form.password !== form.confirmPassword) {
      setError("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register"
        ? { username: form.username, email: form.email, password: form.password, country: form.country, goal: form.goal }
        : { username: form.username, password: form.password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao autenticar");
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;600&family=DM+Sans:wght@400;500&display=swap');
        html,body,#root{margin:0;padding:0;background:#020408;width:100%;height:100%;}
        *,*::before,*::after{box-sizing:border-box;}
        input,select{outline:none;} input:focus,select:focus{border-color:#3b82f6!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
      <div style={{ minHeight: "100vh", background: "#020408", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
        <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(#0f172a 1px,transparent 1px)", backgroundSize: "32px 32px", opacity: .6, pointerEvents: "none" }} />
        <div style={{ width: "100%", maxWidth: 460, animation: "fadeUp .5s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#16a34a,#7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16, boxShadow: "0 0 40px #16a34a33" }}>🛂</div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: "#f1f5f9", margin: 0, letterSpacing: -.5 }}>
              H-2 Visa Scanner <span style={{ color: "#22c55e" }}>Pro</span>
            </h1>
            <p style={{ color: "#334155", fontSize: 11, marginTop: 6, fontFamily: "'JetBrains Mono',monospace", letterSpacing: .5 }}>
              DOL VALIDATOR · IA STATUS · PERFIL DO CANDIDATO
            </p>
          </div>

          <div style={{ background: "#0a0a0f", border: "1px solid #1e293b", borderRadius: 14, padding: "28px", boxShadow: "0 24px 48px rgba(0,0,0,.4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
              <button type="button" onClick={() => setMode("login")} style={{ padding: 10, borderRadius: 8, cursor: "pointer", border: `1px solid ${mode === "login" ? "#3b82f6" : "#1e293b"}`, background: mode === "login" ? "#1e3a5f55" : "#020408", color: mode === "login" ? "#60a5fa" : "#64748b", fontWeight: 800 }}>Entrar</button>
              <button type="button" onClick={() => setMode("register")} style={{ padding: 10, borderRadius: 8, cursor: "pointer", border: `1px solid ${mode === "register" ? "#22c55e" : "#1e293b"}`, background: mode === "register" ? "#052e1655" : "#020408", color: mode === "register" ? "#4ade80" : "#64748b", fontWeight: 800 }}>Cadastrar</button>
            </div>

            <div style={{ color: "#475569", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20, fontFamily: "'JetBrains Mono',monospace" }}>
              {mode === "login" ? "🔐 Acesso ao Sistema" : "📝 Criar Cadastro"}
            </div>

            <form onSubmit={submit}>
              <Field label="Usuário">
                <input type="text" value={form.username} onChange={e => setField("username", e.target.value)} placeholder="seu.usuario" autoComplete="username" required style={baseInput} />
              </Field>

              {mode === "register" && <Field label="E-mail">
                <input type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="seu@email.com" autoComplete="email" required style={baseInput} />
              </Field>}

              <Field label="Senha">
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setField("password", e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} style={{ ...baseInput, paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>{showPw ? "🙈" : "👁"}</button>
                </div>
              </Field>

              {mode === "register" && <>
                <Field label="Confirmar Senha">
                  <input type={showPw ? "text" : "password"} value={form.confirmPassword} onChange={e => setField("confirmPassword", e.target.value)} placeholder="••••••••" required minLength={6} style={baseInput} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="País">
                    <input value={form.country} onChange={e => setField("country", e.target.value)} placeholder="Brasil" style={baseInput} />
                  </Field>
                  <Field label="Objetivo">
                    <select value={form.goal} onChange={e => setField("goal", e.target.value)} style={baseInput}>
                      <option>H-2A</option><option>H-2B</option><option>TI</option><option>Bioinformática</option><option>AgTech</option><option>Outro</option>
                    </select>
                  </Field>
                </div>
              </>}

              {error && <div style={{ background: "#1c0a0a", border: "1px solid #991b1b", color: "#fca5a5", padding: "10px 14px", borderRadius: 7, fontSize: 13, marginBottom: 16 }}>❌ {error}</div>}

              <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: loading ? "#0f172a" : "linear-gradient(135deg,#16a34a,#7c3aed)", border: loading ? "1px solid #1e293b" : "none", color: loading ? "#334155" : "#fff", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: .3 }}>
                {loading ? <span style={{ animation: "pulse 1s infinite" }}>⏳ Processando...</span> : mode === "login" ? "→ Entrar" : "→ Criar conta"}
              </button>
            </form>
          </div>

          <p style={{ textAlign: "center", color: "#1e293b", fontSize: 11, marginTop: 20, fontFamily: "'JetBrains Mono',monospace" }}>H-2 Visa Scanner Pro · {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 15 }}><label style={{ display: "block", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</label>{children}</div>;
}
