import { useState, useEffect } from "react";
import { apiFetch, isAdmin } from "./auth.js";

const inp = { background:"#0a0a0f", border:"1px solid #1e293b", color:"#f1f5f9", padding:"8px 12px", borderRadius:6, fontSize:13, fontFamily:"inherit", width:"100%", outline:"none" };
const btn = (bg="#1d4ed8",col="#fff") => ({ background:bg, border:"none", color:col, padding:"8px 16px", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" });

export default function AdminPanel({ onClose }) {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ username:"", password:"", role:"user" });
  const [pwForm,   setPwForm]   = useState({ currentPassword:"", newPassword:"" });
  const [msg,      setMsg]      = useState(null);
  const [tab,      setTab]      = useState("users");

  const load = async () => {
    setLoading(true);
    const res = await apiFetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { if (isAdmin()) load(); }, []);

  const flash = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),3000); };

  const createUser = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/api/admin/users", { method:"POST", body:form });
    const data = await res.json();
    if (res.ok) { flash("✅ Usuário criado!"); setForm({username:"",password:"",role:"user"}); load(); }
    else flash("❌ "+data.error, false);
  };

  const toggleActive = async (u) => {
    const res = await apiFetch(`/api/admin/users/${u.id}`, { method:"PUT", body:{ active: u.active ? 0 : 1 } });
    if (res.ok) { flash(u.active ? "⚠️ Usuário desativado" : "✅ Usuário ativado"); load(); }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Deletar "${u.username}"?`)) return;
    const res = await apiFetch(`/api/admin/users/${u.id}`, { method:"DELETE" });
    if (res.ok) { flash("🗑️ Usuário removido"); load(); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    const res = await apiFetch("/api/auth/change-password", { method:"POST", body:pwForm });
    const data = await res.json();
    if (res.ok) { flash("✅ Senha alterada com sucesso!"); setPwForm({currentPassword:"",newPassword:""}); }
    else flash("❌ "+data.error, false);
  };

  const tabBtn = (t,l) => (
    <button onClick={()=>setTab(t)} style={{ background:"transparent", border:"none", borderBottom:tab===t?"2px solid #3b82f6":"2px solid transparent", color:tab===t?"#60a5fa":"#475569", padding:"8px 16px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, transition:"all .15s", marginBottom:-1 }}>{l}</button>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#0a0a0f", border:"1px solid #1e293b", borderRadius:12, width:"100%", maxWidth:640, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #0f172a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:"#f1f5f9" }}>⚙️ Painel Administrativo</div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid #1e293b", color:"#64748b", width:32, height:32, borderRadius:6, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #0f172a", padding:"0 20px" }}>
          {tabBtn("users","👥 Usuários")}
          {tabBtn("create","➕ Novo Usuário")}
          {tabBtn("password","🔑 Minha Senha")}
        </div>

        {/* Toast */}
        {msg && <div style={{ margin:"12px 20px 0", background:msg.ok?"#052e16":"#1c0a0a", border:`1px solid ${msg.ok?"#16a34a":"#991b1b"}`, color:msg.ok?"#4ade80":"#fca5a5", padding:"8px 14px", borderRadius:6, fontSize:13 }}>{msg.text}</div>}

        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>

          {/* USERS TAB */}
          {tab==="users" && (
            <div>
              {loading ? <div style={{ color:"#334155", textAlign:"center", padding:20 }}>Carregando...</div>
              : users.map(u => (
                <div key={u.id} style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:"12px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background: u.role==="admin"?"linear-gradient(135deg,#7c3aed,#1d4ed8)":"linear-gradient(135deg,#0f172a,#1e293b)", border:"1px solid #334155", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                    {u.role==="admin"?"👑":"👤"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ color:"#f1f5f9", fontWeight:600, fontSize:14 }}>{u.username}</span>
                      <span style={{ background:u.role==="admin"?"#3b1d8c":"#0f172a", border:`1px solid ${u.role==="admin"?"#7c3aed":"#334155"}`, color:u.role==="admin"?"#c4b5fd":"#475569", padding:"1px 7px", borderRadius:3, fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{u.role.toUpperCase()}</span>
                      <span style={{ background:u.active?"#052e16":"#1c0a0a", border:`1px solid ${u.active?"#16a34a":"#991b1b"}`, color:u.active?"#4ade80":"#f87171", padding:"1px 7px", borderRadius:3, fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{u.active?"ATIVO":"INATIVO"}</span>
                    </div>
                    <div style={{ color:"#334155", fontSize:11, marginTop:3 }}>
                      Criado: {u.created_at?.slice(0,10)} · Último acesso: {u.last_login?.slice(0,16) || "Nunca"}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={()=>toggleActive(u)} style={{ ...btn(u.active?"#1c1917":"#052e16", u.active?"#fbbf24":"#4ade80"), padding:"5px 10px", fontSize:11, border:`1px solid ${u.active?"#a16207":"#16a34a"}` }}>
                      {u.active?"Desativar":"Ativar"}
                    </button>
                    <button onClick={()=>deleteUser(u)} style={{ ...btn("#1c0a0a","#f87171"), padding:"5px 10px", fontSize:11, border:"1px solid #991b1b" }}>
                      Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CREATE TAB */}
          {tab==="create" && (
            <form onSubmit={createUser}>
              <div style={{ display:"grid", gap:14 }}>
                <div>
                  <label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Usuário</label>
                  <input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="nome.usuario" required style={inp}/>
                </div>
                <div>
                  <label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Senha (mín. 6 caracteres)</label>
                  <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••" required minLength={6} style={inp}/>
                </div>
                <div>
                  <label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Nível de Acesso</label>
                  <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={{...inp,cursor:"pointer"}}>
                    <option value="user">👤 Usuário — acesso ao scanner</option>
                    <option value="admin">👑 Admin — acesso total + gerenciar usuários</option>
                  </select>
                </div>
                <button type="submit" style={{ ...btn(), padding:"10px" }}>➕ Criar Usuário</button>
              </div>
            </form>
          )}

          {/* CHANGE PASSWORD TAB */}
          {tab==="password" && (
            <form onSubmit={changePw}>
              <div style={{ display:"grid", gap:14 }}>
                <div>
                  <label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Senha Atual</label>
                  <input type="password" value={pwForm.currentPassword} onChange={e=>setPwForm({...pwForm,currentPassword:e.target.value})} placeholder="••••••••" required style={inp}/>
                </div>
                <div>
                  <label style={{ display:"block", color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Nova Senha (mín. 6 caracteres)</label>
                  <input type="password" value={pwForm.newPassword} onChange={e=>setPwForm({...pwForm,newPassword:e.target.value})} placeholder="••••••••" required minLength={6} style={inp}/>
                </div>
                <button type="submit" style={{ ...btn("#16a34a"), padding:"10px" }}>🔑 Alterar Senha</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
