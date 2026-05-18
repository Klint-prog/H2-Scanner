import { useState, useEffect } from "react";
import { apiFetch, isAdmin } from "./auth.js";

const inp = { background:"#0a0a0f", border:"1px solid #1e293b", color:"#f1f5f9", padding:"8px 12px", borderRadius:6, fontSize:13, fontFamily:"inherit", width:"100%", outline:"none" };
const btn = (bg="#1d4ed8", col="#fff") => ({ background:bg, border:"none", color:col, padding:"8px 16px", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" });

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username:"", password:"", role:"user", email:"", country:"Brasil", goal:"H-2A" });
  const [pwForm, setPwForm] = useState({ currentPassword:"", newPassword:"" });
  const [aiStatus, setAiStatus] = useState(null);
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem("h2_ai_provider") || "openrouter");
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState(isAdmin() ? "users" : "password");

  const flash = (text, ok=true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const loadUsers = async () => {
    if (!isAdmin()) return;
    setLoading(true);
    const res = await apiFetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  const loadAi = async () => {
    const res = await apiFetch("/api/ai/status");
    if (res.ok) setAiStatus(await res.json());
  };

  useEffect(() => { loadUsers(); loadAi(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/users", { method:"POST", body:form });
    const data = await res.json();
    if (res.ok) { flash("✅ Usuário criado!"); setForm({ username:"", password:"", role:"user", email:"", country:"Brasil", goal:"H-2A" }); loadUsers(); }
    else flash("❌ " + data.error, false);
  };

  const toggleActive = async (u) => {
    const res = await apiFetch(`/api/admin/users/${u.id}`, { method:"PUT", body:{ active: u.active ? 0 : 1 } });
    if (res.ok) { flash(u.active ? "⚠️ Usuário desativado" : "✅ Usuário ativado"); loadUsers(); }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Deletar "${u.username}"?`)) return;
    const res = await apiFetch(`/api/admin/users/${u.id}`, { method:"DELETE" });
    if (res.ok) { flash("🗑️ Usuário removido"); loadUsers(); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/api/auth/change-password", { method:"POST", body:pwForm });
    const data = await res.json();
    if (res.ok) { flash("✅ Senha alterada com sucesso!"); setPwForm({ currentPassword:"", newPassword:"" }); }
    else flash("❌ " + data.error, false);
  };

  const testAi = async () => {
    const res = await apiFetch("/api/admin/ai/test", { method:"POST", body:{} });
    const data = await res.json();
    if (res.ok) { setAiStatus(data); flash("✅ Status de IA atualizado"); }
    else flash("❌ " + data.error, false);
  };

  const saveActiveProvider = () => {
    localStorage.setItem("h2_ai_provider", activeProvider);
    flash(`✅ Motor ativo definido: ${activeProvider}`);
  };

  const tabBtn = (t, l) => <button onClick={() => setTab(t)} style={{ background:"transparent", border:"none", borderBottom:tab===t?"2px solid #3b82f6":"2px solid transparent", color:tab===t?"#60a5fa":"#475569", padding:"8px 16px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, marginBottom:-1 }}>{l}</button>;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#0a0a0f", border:"1px solid #1e293b", borderRadius:12, width:"100%", maxWidth:820, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #0f172a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:"#f1f5f9" }}>⚙️ Painel Administrativo</div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #1e293b", color:"#64748b", width:32, height:32, borderRadius:6, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>

        <div style={{ display:"flex", borderBottom:"1px solid #0f172a", padding:"0 20px", flexWrap:"wrap" }}>
          {isAdmin() && tabBtn("users", "👥 Usuários")}
          {isAdmin() && tabBtn("create", "➕ Novo Usuário")}
          {isAdmin() && tabBtn("ai", "🤖 Status IA")}
          {isAdmin() && tabBtn("smtp", "📧 E-mail SMTP")}
          {tabBtn("password", "🔑 Minha Senha")}
        </div>

        {msg && <div style={{ margin:"12px 20px 0", background:msg.ok?"#052e16":"#1c0a0a", border:`1px solid ${msg.ok?"#16a34a":"#991b1b"}`, color:msg.ok?"#4ade80":"#fca5a5", padding:"8px 14px", borderRadius:6, fontSize:13 }}>{msg.text}</div>}

        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
          {tab === "users" && isAdmin() && <div>{loading ? <div style={{ color:"#334155", textAlign:"center", padding:20 }}>Carregando...</div> : users.map(u => <div key={u.id} style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:"12px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:u.role==="admin"?"linear-gradient(135deg,#7c3aed,#1d4ed8)":"linear-gradient(135deg,#0f172a,#1e293b)", border:"1px solid #334155", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{u.role==="admin"?"👑":"👤"}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}><span style={{ color:"#f1f5f9", fontWeight:600 }}>{u.username}</span><Badge color={u.role==="admin"?"#c4b5fd":"#94a3b8"}>{u.role.toUpperCase()}</Badge><Badge color={u.active?"#4ade80":"#f87171"}>{u.active?"ATIVO":"INATIVO"}</Badge></div>
              <div style={{ color:"#334155", fontSize:11, marginTop:3 }}>{u.email || "sem e-mail"} · {u.country || "—"} · {u.goal || "—"} · Último acesso: {u.last_login?.slice(0,16) || "Nunca"}</div>
            </div>
            <div style={{ display:"flex", gap:6 }}><button onClick={() => toggleActive(u)} style={{ ...btn(u.active?"#1c1917":"#052e16", u.active?"#fbbf24":"#4ade80"), padding:"5px 10px", fontSize:11, border:`1px solid ${u.active?"#a16207":"#16a34a"}` }}>{u.active?"Desativar":"Ativar"}</button><button onClick={() => deleteUser(u)} style={{ ...btn("#1c0a0a", "#f87171"), padding:"5px 10px", fontSize:11, border:"1px solid #991b1b" }}>Deletar</button></div>
          </div>)}</div>}

          {tab === "create" && isAdmin() && <form onSubmit={createUser}><div style={{ display:"grid", gap:14 }}>
            <Input label="Usuário"><input value={form.username} onChange={e => setForm({ ...form, username:e.target.value })} placeholder="nome.usuario" required style={inp}/></Input>
            <Input label="E-mail"><input type="email" value={form.email} onChange={e => setForm({ ...form, email:e.target.value })} placeholder="email@dominio.com" style={inp}/></Input>
            <Input label="Senha"><input type="password" value={form.password} onChange={e => setForm({ ...form, password:e.target.value })} placeholder="••••••••" required minLength={6} style={inp}/></Input>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Input label="País"><input value={form.country} onChange={e => setForm({ ...form, country:e.target.value })} style={inp}/></Input>
              <Input label="Objetivo"><select value={form.goal} onChange={e => setForm({ ...form, goal:e.target.value })} style={inp}><option>H-2A</option><option>H-2B</option><option>TI</option><option>Bioinformática</option><option>AgTech</option><option>Outro</option></select></Input>
              <Input label="Nível"><select value={form.role} onChange={e => setForm({ ...form, role:e.target.value })} style={inp}><option value="user">Usuário</option><option value="admin">Admin</option></select></Input>
            </div>
            <button type="submit" style={{ ...btn(), padding:"10px" }}>➕ Criar Usuário</button>
          </div></form>}

          {tab === "ai" && isAdmin() && <div>
            <div style={{ color:"#94a3b8", fontSize:13, lineHeight:1.6, marginBottom:14 }}>
              Escolha abaixo qual motor de IA será usado na varredura. A tela principal continua mostrando apenas o status geral para o usuário comum.
            </div>

            <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:14, marginBottom:14 }}>
              <label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>
                Motor ativo da varredura
              </label>

              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10 }}>
                <select
                  value={activeProvider}
                  onChange={e => setActiveProvider(e.target.value)}
                  style={inp}
                >
                  {Object.entries(aiStatus?.providers || {}).map(([key, p]) => (
                    <option key={key} value={key} disabled={!(p.configured || p.online || p.status === "online")}>
                      {p.label} — {(p.online || p.status === "online") ? "online" : p.configured ? "configurado" : "não configurado"}
                    </option>
                  ))}
                </select>

                <button onClick={saveActiveProvider} style={btn("#16a34a")}>
                  ✅ Usar este motor
                </button>
              </div>

              <div style={{ color:"#334155", fontSize:11, marginTop:8 }}>
                Motor salvo atualmente: <strong style={{ color:"#60a5fa" }}>{localStorage.getItem("h2_ai_provider") || "openrouter"}</strong>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10, marginBottom:14 }}>
              {Object.entries(aiStatus?.providers || {}).map(([key, p]) => (
                <div key={key} style={{
                  background: key === activeProvider ? "#0b2a1a" : "#0f172a",
                  border: key === activeProvider ? "1px solid #16a34a" : "1px solid #1e293b",
                  borderRadius:8,
                  padding:12
                }}>
                  <div style={{ color:"#f1f5f9", fontWeight:700, display:"flex", justifyContent:"space-between", gap:8 }}>
                    <span>{p.label}</span>
                    {key === activeProvider && <span style={{ color:"#4ade80", fontSize:11 }}>ATIVO</span>}
                  </div>
                  <div style={{ marginTop:8 }}>
                    <Badge color={(p.online || p.status === "online") ? "#4ade80" : p.configured ? "#fbbf24" : "#f87171"}>
                      {(p.online || p.status === "online") ? "ONLINE" : p.configured ? "CONFIGURADO" : "NÃO CONFIGURADO"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={testAi} style={btn("#1d4ed8")}>🔄 Testar conexões</button>
            <div style={{ color:"#334155", fontSize:11, marginTop:10 }}>Última checagem: {aiStatus?.checkedAt || "—"}</div>
          </div>}

          {tab === "smtp" && isAdmin() && <div>
            <div style={{ color:"#94a3b8", fontSize:13, lineHeight:1.6, marginBottom:14 }}>
              Configure o servidor SMTP usado para enviar mensagens às empresas a partir das vagas favoritas. As credenciais ficam no backend e não são expostas ao usuário comum.
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:16, marginBottom:14 }}>
              <div style={{ color:"#f1f5f9", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, marginBottom:6 }}>📧 Configuração de envio SMTP</div>
              <div style={{ color:"#64748b", fontSize:12, lineHeight:1.6, marginBottom:14 }}>
                Use esta área para cadastrar host, porta, usuário, senha/app password, remetente e testar envio. Após configurar, os favoritos poderão usar o envio de apresentação do candidato para a empresa.
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <button onClick={() => { window.location.href = "/smtp-admin.html"; }} style={btn("#16a34a")}>⚙️ Abrir configuração SMTP</button>
                <button onClick={() => { window.open("/smtp-admin.html", "_blank", "noopener,noreferrer"); }} style={{ ...btn("#0f172a", "#93c5fd"), border:"1px solid #1d4ed8" }}>↗ Abrir em nova aba</button>
              </div>
            </div>
            <div style={{ background:"#1c1917", border:"1px solid #a16207", color:"#fbbf24", padding:12, borderRadius:8, fontSize:12, lineHeight:1.6 }}>
              Recomendo usar senha de aplicativo do Gmail/Outlook, não a senha principal da conta. Nunca versionar credenciais no GitHub.
            </div>
          </div>}

          {tab === "password" && <form onSubmit={changePw}><div style={{ display:"grid", gap:14 }}><Input label="Senha Atual"><input type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword:e.target.value })} placeholder="••••••••" required style={inp}/></Input><Input label="Nova Senha"><input type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword:e.target.value })} placeholder="••••••••" required minLength={6} style={inp}/></Input><button type="submit" style={{ ...btn("#16a34a"), padding:"10px" }}>🔑 Alterar Senha</button></div></form>}
        </div>
      </div>
    </div>
  );
}

function Input({ label, children }) {
  return <div><label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>{label}</label>{children}</div>;
}

function Badge({ children, color }) {
  return <span style={{ background:"#0a0a0f", border:`1px solid ${color}66`, color, padding:"1px 7px", borderRadius:3, fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{children}</span>;
}
