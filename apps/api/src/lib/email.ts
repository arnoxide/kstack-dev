// Module: Kasify_Email — core sending utility
import nodemailer from "nodemailer";
import { and, eq } from "drizzle-orm";
import { emailSettings, emailLogs, emailTemplates } from "@kasify/db";
import type { EmailTemplateType } from "@kasify/db";

// ── Default HTML templates ────────────────────────────────────────────────────

const TEMPLATE_DEFAULTS: Record<string, { name: string; subject: string; body: string }> = {
  order_confirmation: {
    name: "Order Confirmation",
    subject: "Order #{{order_number}} confirmed — {{store_name}}",
    body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:4px">Order Confirmed! 🎉</h1>
  <p style="color:#6b7280;margin-bottom:24px">Thank you for shopping with us.</p>

  <p>Hi <strong>{{customer_name}}</strong>,</p>
  <p>Your order from <strong>{{store_name}}</strong> has been received and is being processed.</p>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:24px 0">
    <p style="margin:0 0 8px 0"><strong>Order Number:</strong> #{{order_number}}</p>
    <p style="margin:0 0 8px 0"><strong>Order Total:</strong> {{order_total}}</p>
    <p style="margin:0"><strong>Status:</strong> {{order_status}}</p>
  </div>

  <p>We'll send you another email when your order ships.</p>
  <p style="color:#6b7280;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
    This email was sent by {{store_name}}. Please do not reply to this email.
  </p>
</div>`,
  },

  shipping_update: {
    name: "Shipping Update",
    subject: "Your order #{{order_number}} has shipped — {{store_name}}",
    body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:4px">Your order is on its way! 🚚</h1>

  <p>Hi <strong>{{customer_name}}</strong>,</p>
  <p>Great news — your order from <strong>{{store_name}}</strong> has been shipped.</p>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:24px 0">
    <p style="margin:0 0 8px 0"><strong>Order Number:</strong> #{{order_number}}</p>
    <p style="margin:0"><strong>Status:</strong> {{order_status}}</p>
  </div>

  <p style="color:#6b7280;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
    This email was sent by {{store_name}}.
  </p>
</div>`,
  },

  welcome: {
    name: "Welcome Email",
    subject: "Welcome to {{store_name}}! 👋",
    body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:4px">Welcome aboard! 👋</h1>

  <p>Hi <strong>{{customer_name}}</strong>,</p>
  <p>Thanks for creating an account at <strong>{{store_name}}</strong>. We're thrilled to have you!</p>
  <p>You can now track your orders, save your address, and enjoy a faster checkout experience.</p>

  <p style="color:#6b7280;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
    This email was sent by {{store_name}}.
  </p>
</div>`,
  },

  password_reset: {
    name: "Password Reset",
    subject: "Reset your password — {{store_name}}",
    body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:4px">Password Reset Request</h1>

  <p>Hi <strong>{{customer_name}}</strong>,</p>
  <p>We received a request to reset your password for your account at <strong>{{store_name}}</strong>.</p>
  <p>If you didn't request this, you can safely ignore this email.</p>

  <p style="color:#6b7280;font-size:13px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
    This email was sent by {{store_name}}.
  </p>
</div>`,
  },
};

// ── Variable substitution ─────────────────────────────────────────────────────

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── Transporter factory ───────────────────────────────────────────────────────

function makeTransporter(settings: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: { user: settings.smtpUser, pass: settings.smtpPass },
  });
}

// ── Core send function ────────────────────────────────────────────────────────

export interface SendEmailOptions {
  db: any;
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const { db, tenantId, to, subject, html, type = "custom", metadata } = opts;

  const [settings] = await db
    .select()
    .from(emailSettings)
    .where(eq(emailSettings.tenantId, tenantId))
    .limit(1);

  if (!settings?.enabled || !settings.smtpHost || !settings.fromEmail) {
    // Log as failed but don't throw — email is non-critical
    await db.insert(emailLogs).values({
      tenantId, to, subject, type, status: "failed",
      errorMessage: "Email not configured or disabled",
      metadata: metadata ?? {},
    });
    return { ok: false, error: "Email not configured" };
  }

  try {
    const transporter = makeTransporter({
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort ?? 587,
      smtpUser: settings.smtpUser ?? "",
      smtpPass: settings.smtpPass ?? "",
      smtpSecure: settings.smtpSecure,
    });

    await transporter.sendMail({
      from: `"${settings.fromName ?? settings.fromEmail}" <${settings.fromEmail}>`,
      to,
      subject,
      html,
    });

    await db.insert(emailLogs).values({
      tenantId, to, subject, type, status: "sent", metadata: metadata ?? {},
    });

    return { ok: true };
  } catch (err: any) {
    const errorMessage = err?.message ?? "Unknown error";
    await db.insert(emailLogs).values({
      tenantId, to, subject, type, status: "failed", errorMessage, metadata: metadata ?? {},
    });
    return { ok: false, error: errorMessage };
  }
}

// ── Send a transactional email by template type ───────────────────────────────

export async function sendTransactional(opts: {
  db: any;
  tenantId: string;
  to: string;
  type: keyof typeof TEMPLATE_DEFAULTS;
  vars: Record<string, string>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { db, tenantId, to, type, vars, metadata } = opts;

  // Load tenant-customized template, fall back to default
  const [tmpl] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.tenantId, tenantId))
    .limit(1);

  const defaults = TEMPLATE_DEFAULTS[type];
  if (!defaults) return;

  const subject = renderTemplate(
    tmpl?.type === type && tmpl.subject ? tmpl.subject : defaults.subject,
    vars,
  );
  const html = renderTemplate(
    tmpl?.type === type && tmpl.body ? tmpl.body : defaults.body,
    vars,
  );

  await sendEmail({ db, tenantId, to, subject, html, type, ...(metadata !== undefined ? { metadata } : {}) });
}

// ── Seed default templates for a tenant ──────────────────────────────────────

export async function seedDefaultTemplates(db: any, tenantId: string): Promise<void> {
  for (const [type, tpl] of Object.entries(TEMPLATE_DEFAULTS)) {
    const [existing] = await db
      .select({ id: emailTemplates.id })
      .from(emailTemplates)
      .where(eq(emailTemplates.tenantId, tenantId))
      .limit(1);

    if (!existing) {
      await db.insert(emailTemplates).values({
        tenantId,
        type: type as EmailTemplateType,
        name: tpl.name,
        subject: tpl.subject,
        body: tpl.body,
      }).onConflictDoNothing();
    }
  }
}

// ── Send a custom (user-created) template by name ────────────────────────────

export async function sendByTemplateName(opts: {
  db: any;
  tenantId: string;
  to: string;
  templateName: string;
  vars?: Record<string, string>;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const { db, tenantId, to, templateName, vars = {}, metadata } = opts;

  const [tmpl] = await db
    .select()
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.tenantId, tenantId),
        eq(emailTemplates.name, templateName),
        eq(emailTemplates.type, "custom"),
      ),
    )
    .limit(1);

  if (!tmpl) {
    return { ok: false, error: `Custom template "${templateName}" not found` };
  }

  if (!tmpl.isActive) {
    return { ok: false, error: `Template "${templateName}" is inactive` };
  }

  return sendEmail({
    db,
    tenantId,
    to,
    subject: renderTemplate(tmpl.subject, vars),
    html: renderTemplate(tmpl.body, vars),
    type: "custom",
    ...(metadata !== undefined ? { metadata } : {}),
  });
}

export { TEMPLATE_DEFAULTS };
