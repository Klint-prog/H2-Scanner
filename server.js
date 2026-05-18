require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const fetch    = require("node-fetch");
const path     = require("path");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const Database = require("better-sqlite3");
const fs       = require("fs");

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "h2visa_change_this_secret_in_production";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "scanner.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    UNIQUE NOT NULL,
    password  TEXT    NOT NULL,
    role      TEXT    NOT NULL DEFAULT 'user',
    active    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT   NOT NULL DEFAULT (datetime('now')),
    last_login TEXT
  );
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY,
    email   TEXT,
    country TEXT,
    goal    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const adminExists = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')").run("admin", hash);
  console.log("👤  Admin criado — usuário: admin | senha:", process.env.ADMIN_PASSWORD || "admin123");
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "client", "dist")));

function publicUser(user) {
  const profile = db.prepare("SELECT email, country, goal FROM user_profiles WHERE user_id = ?").get(user.id) || {};
  return { id: user.id, username: user.username, role: user.role, email: profile.email, country: profile.country, goal: profile.goal };
}

function signUser(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ error: "Token não fornecido" });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "Token inválido ou expirado" }); }
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso restrito ao administrador" });
  next();
}

app.post("/api/auth/register", (req, res) => {
  const { username, email, password, country = "Brasil", goal = "H-2A" } = req.body;
  if (!username || !password || !email) return res.status(400).json({ error: "Usuário, e-mail e senha são obrigatórios" });
  if (password.length < 6) return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres" });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "E-mail inválido" });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'user')").run(username.trim(), hash);
    db.prepare("INSERT INTO user_profiles (user_id, email, country, goal) VALUES (?, ?, ?, ?)").run(result.lastInsertRowid, email.trim(), country, goal);
    const user = db.prepare("SELECT id, username, role FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = signUser(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) {
    res.status(409).json({ error: "Usuário já existe" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Usuário e senha obrigatórios" });
  const user = db.prepare("SELECT * FROM users WHERE username = ? AND active = 1").get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Usuário ou senha incorretos" });
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
  res.json({ token: signUser(user), user: publicUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT id, username, role, created_at, last_login FROM users WHERE id = ?").get(req.user.id);
  res.json(publicUser(user));
});

app.get("/api/ai/status", requireAuth, (req, res) => {
  const providers = {
    anthropic:  { label: "Claude",     configured: Boolean(process.env.ANTHROPIC_API_KEY),  online: Boolean(process.env.ANTHROPIC_API_KEY) },
    openrouter: { label: "OpenRouter", configured: Boolean(process.env.OPENROUTER_API_KEY), online: Boolean(process.env.OPENROUTER_API_KEY) },
    openai:     { label: "OpenAI",     configured: Boolean(process.env.OPENAI_API_KEY),     online: Boolean(process.env.OPENAI_API_KEY) },
    gemini:     { label: "Gemini",     configured: Boolean(process.env.GEMINI_API_KEY),     online: Boolean(process.env.GEMINI_API_KEY) },
  };
  const configured = Object.values(providers).filter(p => p.configured).length;
  res.json({ configured, online: configured > 0, providers, checkedAt: new Date().toISOString() });
});

app.post("/api/admin/ai/test", requireAuth, requireAdmin, (req, res) => {
  const providers = {
    anthropic:  { label: "Claude",     status: process.env.ANTHROPIC_API_KEY  ? "online" : "not_configured" },
    openrouter: { label: "OpenRouter", status: process.env.OPENROUTER_API_KEY ? "online" : "not_configured" },
    openai:     { label: "OpenAI",     status: process.env.OPENAI_API_KEY     ? "online" : "not_configured" },
    gemini:     { label: "Gemini",     status: process.env.GEMINI_API_KEY     ? "online" : "not_configured" },
  };
  res.json({ providers, checkedAt: new Date().toISOString(), note: "Teste rápido: verifica configuração de chaves no ambiente. Não consome créditos de IA." });
});

app.get("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.active, u.created_at, u.last_login, p.email, p.country, p.goal
    FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id ORDER BY u.id
  `).all();
  res.json(users);
});

app.post("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
  const { username, password, role = "user", email = "", country = "", goal = "" } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Usuário e senha obrigatórios" });
  if (!["admin","user"].includes(role)) return res.status(400).json({ error: "Role inválido" });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, hash, role);
    if (email || country || goal) db.prepare("INSERT INTO user_profiles (user_id, email, country, goal) VALUES (?, ?, ?, ?)").run(result.lastInsertRowid, email, country, goal);
    res.json({ id: result.lastInsertRowid, username, role, active: 1, email, country, goal });
  } catch (e) { res.status(409).json({ error: "Usuário já existe" }); }
});

app.put("/api/admin/users/:id", requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { password, role, active } = req.body;
  if (Number(id) === req.user.id && active === 0) return res.status(400).json({ error: "Você não pode desativar sua própria conta" });
  const fields = [], vals = [];
  if (password) { fields.push("password = ?"); vals.push(bcrypt.hashSync(password, 10)); }
  if (role) { fields.push("role = ?"); vals.push(role); }
  if (active !== undefined) { fields.push("active = ?"); vals.push(active ? 1 : 0); }
  if (!fields.length) return res.status(400).json({ error: "Nada para atualizar" });
  vals.push(id);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  res.json({ ok: true });
});

app.delete("/api/admin/users/:id", requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) return res.status(400).json({ error: "Não é possível deletar sua própria conta" });
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Campos obrigatórios" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Nova senha deve ter ao menos 6 caracteres" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) return res.status(401).json({ error: "Senha atual incorreta" });
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

app.post("/api/anthropic", requireAuth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY não configurada no .env" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type":"application/json", "x-api-key":apiKey, "anthropic-version":"2023-06-01" }, body: JSON.stringify(req.body) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/openrouter", requireAuth, async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY não configurada no .env" });
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}`, "HTTP-Referer":"http://localhost:3001", "X-Title":"H2 Visa Scanner" }, body: JSON.stringify(req.body) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/openai", requireAuth, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada no .env" });
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}` }, body: JSON.stringify(req.body) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/health", (req, res) => res.json({ status:"ok", timestamp:new Date().toISOString() }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "client", "dist", "index.html")));

app.listen(PORT, () => {
  console.log(`\n🛂  H-2 Visa Scanner Pro`);
  console.log(`📡  http://localhost:${PORT}`);
  console.log(`🔐  Autenticação JWT ativa\n`);
});
