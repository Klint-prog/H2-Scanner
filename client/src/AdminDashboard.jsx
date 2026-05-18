import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./auth.js";

const card = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 10,
  padding: 14,
};

const muted = { color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 };

function isOnline(user) {
  const raw = user.last_seen || user.last_login;
  if (!raw) return false;
  const t = new Date(String(raw).replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= 5 * 60 * 1000;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar dashboard");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => Number(u.active) === 1).length;
    const admins = users.filter(u => u.role === "admin").length;
    const online = users.filter(isOnline).length;
    const today = dayKey(new Date());
    const loginsToday = users.filter(u => String(u.last_login || "").slice(0, 10) === today).length;
    return { total, active, admins, online, loginsToday };
  }, [users]);

  const chart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return dayKey(d);
    });
    return days.map(day => ({
      day,
      value: users.filter(u => String(u.last_login || "").slice(0, 10) === day).length,
    }));
  }, [users]);

  const max = Math.max(1, ...chart.map(d => d.value));
  const recent = [...users].sort((a, b) => String(b.last_login || b.created_at || "").localeCompare(String(a.last_login || a.created_at || ""))).slice(0, 6);

  if (loading) return <div style={{ color: "#64748b", padding: 20 }}>Carregando dashboard administrativo...</div>;
  if (error) return <div style={{ color: "#fca5a5", background: "#1c0a0a", border: "1px solid #991b1b", padding: 12, borderRadius: 8 }}>❌ {error}</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", color: "#f1f5f9", fontSize: 18, fontWeight: 800 }}>📊 Dashboard Administrativo</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>Usuários, atividade recente e presença online estimada</div>
        </div>
        <button onClick={load} style={{ background: "#1d4ed8", border: "none", color: "#fff", padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontWeight: 700 }}>🔄 Atualizar</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 10, marginBottom: 14 }}>
        <Metric label="Usuários" value={stats.total} color="#60a5fa" />
        <Metric label="Ativos" value={stats.active} color="#22c55e" />
        <Metric label="Online" value={stats.online} color="#4ade80" />
        <Metric label="Admins" value={stats.admins} color="#a78bfa" />
        <Metric label="Logins hoje" value={stats.loginsToday} color="#f59e0b" />
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: "#f1f5f9", fontWeight: 800, marginBottom: 12 }}>📈 Logins dos últimos 7 dias</div>
        <div style={{ display: "flex", alignItems: "end", gap: 10, minHeight: 150 }}>
          {chart.map(item => (
            <div key={item.day} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 110, display: "flex", alignItems: "end", justifyContent: "center" }}>
                <div title={`${item.day}: ${item.value}`} style={{ width: "72%", minHeight: item.value ? 8 : 2, height: `${Math.max(2, (item.value / max) * 100)}%`, background: "linear-gradient(180deg,#60a5fa,#1d4ed8)", borderRadius: "7px 7px 2px 2px" }} />
              </div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>{item.day.slice(5)}</div>
              <div style={{ color: "#64748b", fontSize: 10 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card }}>
        <div style={{ color: "#f1f5f9", fontWeight: 800, marginBottom: 10 }}>👥 Usuários recentes</div>
        {recent.length ? recent.map(u => (
          <div key={u.id} style={{ borderTop: "1px solid #1e293b", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div>
              <div style={{ color: "#f1f5f9", fontWeight: 700 }}>{u.username} <span style={{ color: "#64748b", fontSize: 11 }}>({u.role})</span></div>
              <div style={{ color: "#64748b", fontSize: 11 }}>{u.email || "sem e-mail"} · último login: {u.last_login || "nunca"}</div>
            </div>
            <span style={{ color: isOnline(u) ? "#4ade80" : "#64748b", border: `1px solid ${isOnline(u) ? "#16a34a" : "#334155"}`, borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>
              {isOnline(u) ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        )) : <div style={{ color: "#64748b" }}>Nenhum usuário cadastrado.</div>}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return <div style={card}><div style={muted}>{label}</div><div style={{ color, fontSize: 30, fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, marginTop: 4 }}>{value}</div></div>;
}
