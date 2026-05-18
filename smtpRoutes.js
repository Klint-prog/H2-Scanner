const nodemailer = require("nodemailer");

function mask(value) {
  if (!value) return "";
  const text = String(value);
  if (text.length <= 6) return "******";
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER || "",
  };
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
  };
}

function createTransporter() {
  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass || !cfg.from) {
    throw new Error("SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no .env.");
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

function clean(value) {
  return String(value || "").trim();
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
