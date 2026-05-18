import { useState } from "react";
import { setToken } from "./auth.js";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao fazer login");
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
        input{outline:none;} input:focus{border-color:#3b82f6!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
      <div style={{ minHeight:"100vh", background:"#020408", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:20 }}>

        {/* BG grid decoration */}
        <div style={{ position:"fixed", inset:0, backgroundImage:"radial-gradient(#0f172a 1px,transparent 1px)", backgroundSize:"32px 32px", opacity:.6, pointerEvents:"none" }}/>

        <div style={{ width:"100%", maxWidth:400, animation:"fadeUp .5s ease" }}>

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ width:60, height:60, borderRadius:16, background:"linear-gradient(135deg,#16a34a,#7c3aed)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:16, boxShadow:"0 0 40px #16a34a33" }}>🛂</div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:"#f1f5f9", margin:0, letterSpacing:-.5 }}>
              H-2 Visa Scanner <span style={{ color:"#22c55e" }}>Pro</span>
            </h1>
            <p style={{ color:"#334155", fontSize:11, marginTop:6, fontFamily:"'JetBrains Mono',monospace", letterSpacing:.5 }}>
              DOL VALIDATOR · MULTI-AI ENGINE
            </p>
          </div>

          {/* Card */}
          <div style={{ background:"#0a0a0f", border:"1px solid #1e293b", borderRadius:14, padding:"32px 28px", boxShadow:"0 24px 48px rgba(0,0,0,.4)" }}>
            <div style={{ color:"#475569", fontSize:12, textTransform:"uppercase", letterSpacing:1.5, marginBottom:24, fontFamily:"'JetBrains Mono',monospace" }}>
              🔐 Acesso ao Sistema
            </div>

            <form onSubmit={submit}>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Usuário</label>
                <input
                  type="text" value={username} onChange={e=>setUsername(e.target.value)}
                  placeholder="seu.usuario" autoComplete="username" required
                  style={{ width:"100%", background:"#020408", border:"1px solid #1e293b", color:"#f1f5f9", padding:"10px 14px", borderRadius:8, fontSize:14, fontFamily:"'DM Sans',sans-serif" }}
                />
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Senha</label>
                <div style={{ position:"relative" }}>
                  <input
                    type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" required
                    style={{ width:"100%", background:"#020408", border:"1px solid #1e293b", color:"#f1f5f9", padding:"10px 40px 10px 14px", borderRadius:8, fontSize:14, fontFamily:"'DM Sans',sans-serif" }}
                  />
                  <button type="button" onClick={()=>setShowPw(!showPw)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"#475569", cursor:"pointer", fontSize:16 }}>
                    {showPw?"🙈":"👁"}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background:"#1c0a0a", border:"1px solid #991b1b", color:"#fca5a5", padding:"10px 14px", borderRadius:7, fontSize:13, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
                  ❌ {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ width:"100%", padding:"12px", background:loading?"#0f172a":"linear-gradient(135deg,#16a34a,#7c3aed)", border:loading?"1px solid #1e293b":"none", color:loading?"#334155":"#fff", borderRadius:8, cursor:loading?"not-allowed":"pointer", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, letterSpacing:.3, transition:"all .2s" }}>
                {loading ? <span style={{ animation:"pulse 1s infinite" }}>⏳ Entrando...</span> : "→ Entrar"}
              </button>
            </form>
          </div>

          <p style={{ textAlign:"center", color:"#1e293b", fontSize:11, marginTop:20, fontFamily:"'JetBrains Mono',monospace" }}>
            H-2 Visa Scanner Pro · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}
