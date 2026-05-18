const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const SETTINGS_PATH = process.env.SMTP_SETTINGS_PATH || path.join(__dirname, "data", "smtp-settings.json");

function mask(value) {
  if (!value) return "";
  const text = String(value);
  if (text.length <= 6) return "******";
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function clean(value) {
  return String(value || "").trim();
}

function readStoredConfig() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {};
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeStoredConfig(config) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(config, null, 2));
}

function getEnvConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER || "",
    source: "env",
  };
}

function getSmtpConfig() {
  const stored = readStoredConfig();
  const env = getEnvConfig();
  const merged = {
    host: stored.host || env.host,
    port: Number(stored.port || env.port || 587),
    secure: Boolean(stored.secure ?? env.secure),
    user: stored.user || env.user,
    pass: stored.pass || env.pass,
    from: stored.from || env.from,
    replyTo: stored.replyTo || env.replyTo,
    source: stored.host ? "admin_panel" : env.source,
    updatedAt: stored.updatedAt || null,
  };
  return merged;
}

function publicSmtpConfig() {
  const cfg = getSmtpConfig();
  return {
    configured: Boolean(cfg.host && cfg.user && cfg.pass && cfg.from),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: mask(cfg.user),
    from: cfg.from,
    replyTo: cfg.replyTo,
    source: cfg.source,
    updatedAt: cfg.updatedAt,
  };
}

function createTransporter() {
  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass || !cfg.from) {
    throw new Error("SMTP não configurado. Configure pelo painel Admin ou defina as variáveis SMTP no .env.");
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

function buildCandidateEmail({ job = {}, candidate = {}, message = "" }) {
  const subject = `Application interest — ${clean(job.position) || "Seasonal position"} — ${clean(candidate.name) || "Candidate"}`;
  const body = `Hello,

My name is ${clean(candidate.name) || "the candidate"}. I am contacting you regarding the seasonal opportunity below:

Company: ${clean(job.company) || "N/A"}
Position: ${clean(job.position) || "N/A"}
Location: ${clean(job.location) || "N/A"}
Period: ${clean(job.period) || "N/A"}
Wage: ${clean(job.wage) || "N/A"}
DOL Certification: ${clean(job.dolCert) || "N/A"}

Candidate profile:
Name: ${clean(candidate.name) || "N/A"}
Email: ${clean(candidate.email) || "N/A"}
Phone/WhatsApp: ${clean(candidate.phone) || "N/A"}
Country: ${clean(candidate.country) || "N/A"}
English level: ${clean(candidate.englishLevel) || "N/A"}
Spanish level: ${clean(candidate.spanishLevel) || "N/A"}
Experience: ${clean(candidate.experience) || "N/A"}
Skills: ${clean(candidate.skills) || "N/A"}
LinkedIn/Portfolio: ${clean(candidate.linkedin) || "N/A"}
Resume/CV link: ${clean(candidate.cvLink) || "N/A"}

Message:
${clean(message) || "I would like to learn more about this opportunity and how to apply officially."}

Thank you for your attention.

${clean(candidate.name) || "Candidate"}
`;
  return { subject, body };
}

function registerSmtpRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/admin/smtp/config", requireAuth, requireAdmin, (req, res) => {
    res.json(publicSmtpConfig());
  });

  app.post("/api/admin/smtp/config", requireAuth, requireAdmin, (req, res) => {
    const current = readStoredConfig();
    const body = req.body || {};
    const next = {
      host: clean(body.host),
      port: Number(body.port || 587),
      secure: Boolean(body.secure),
      user: clean(body.user),
      pass: clean(body.pass) || current.pass || "",
      from: clean(body.from),
      replyTo: clean(body.replyTo),
      updatedAt: new Date().toISOString(),
    };

    if (!next.host || !next.user || !next.from) {
      return res.status(400).json({ error: "Host, usuário SMTP e remetente são obrigatórios." });
    }

    writeStoredConfig(next);
    res.json(publicSmtpConfig());
  });

  app.post("/api/admin/smtp/test", requireAuth, requireAdmin, async (req, res) => {
    try {
      const to = clean(req.body?.to) || getSmtpConfig().replyTo;
      if (!to) return res.status(400).json({ error: "Informe um e-mail de destino para o teste." });
      const transporter = createTransporter();
      const cfg = getSmtpConfig();
      await transporter.sendMail({
        from: cfg.from,
        to,
        replyTo: cfg.replyTo || cfg.from,
        subject: "H-2 Visa Scanner Pro — SMTP test",
        text: "SMTP configurado com sucesso no H-2 Visa Scanner Pro.",
      });
      res.json({ ok: true, message: `E-mail de teste enviado para ${to}.` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/smtp/status", requireAuth, (req, res) => {
    res.json(publicSmtpConfig());
  });

  app.post("/api/favorites/send-email", requireAuth, async (req, res) => {
    try {
      const { job, candidate, message } = req.body || {};
      const to = clean(job?.contactEmail || job?.agentEmail || job?.email);
      if (!to) return res.status(400).json({ error: "Esta vaga não possui e-mail de contato disponível." });
      const transporter = createTransporter();
      const cfg = getSmtpConfig();
      const email = buildCandidateEmail({ job, candidate, message });
      await transporter.sendMail({
        from: cfg.from,
        to,
        replyTo: clean(candidate?.email) || cfg.replyTo || cfg.from,
        subject: email.subject,
        text: email.body,
      });
      res.json({ ok: true, to, subject: email.subject });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { registerSmtpRoutes };
