// Module: Kasify_Email
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { emailSettings, emailLogs, emailTemplates, EMAIL_TEMPLATE_TYPES } from "@kasify/db";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../trpc";
import {
  sendEmail,
  sendTransactional,
  renderTemplate,
  TEMPLATE_DEFAULTS,
} from "../lib/email";
import nodemailer from "nodemailer";

export const emailRouter = router({

  // ── Settings ────────────────────────────────────────────────────────────────

  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const [row] = await ctx.db
        .select()
        .from(emailSettings)
        .where(eq(emailSettings.tenantId, ctx.tenantId!))
        .limit(1);
      if (!row) return null;
      return {
        ...row,
        smtpPass: row.smtpPass ? "••••••••" : null,
        hasPass: !!row.smtpPass,
      };
    }),

    update: adminProcedure
      .input(
        z.object({
          smtpHost: z.string().optional(),
          smtpPort: z.number().min(1).max(65535).optional(),
          smtpUser: z.string().optional(),
          smtpPass: z.string().optional(),
          smtpSecure: z.boolean().optional(),
          fromEmail: z.string().email().optional(),
          fromName: z.string().optional(),
          enabled: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [existing] = await ctx.db
          .select()
          .from(emailSettings)
          .where(eq(emailSettings.tenantId, ctx.tenantId!))
          .limit(1);

        const values: any = { tenantId: ctx.tenantId!, updatedAt: new Date() };
        if (input.smtpHost !== undefined) values.smtpHost = input.smtpHost;
        if (input.smtpPort !== undefined) values.smtpPort = input.smtpPort;
        if (input.smtpUser !== undefined) values.smtpUser = input.smtpUser;
        if (input.smtpPass !== undefined) values.smtpPass = input.smtpPass || null;
        if (input.smtpSecure !== undefined) values.smtpSecure = input.smtpSecure;
        if (input.fromEmail !== undefined) values.fromEmail = input.fromEmail;
        if (input.fromName !== undefined) values.fromName = input.fromName;
        if (input.enabled !== undefined) values.enabled = input.enabled;

        if (existing) {
          const [updated] = await ctx.db
            .update(emailSettings)
            .set(values)
            .where(eq(emailSettings.id, existing.id))
            .returning();
          return updated;
        }
        const [created] = await ctx.db.insert(emailSettings).values(values).returning();
        return created;
      }),

    test: adminProcedure
      .input(z.object({ toEmail: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const [settings] = await ctx.db
          .select()
          .from(emailSettings)
          .where(eq(emailSettings.tenantId, ctx.tenantId!))
          .limit(1);

        if (!settings?.smtpHost || !settings.fromEmail) {
          return { ok: false, error: "SMTP not configured" };
        }

        try {
          const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort ?? 587,
            secure: settings.smtpSecure,
            auth: { user: settings.smtpUser ?? "", pass: settings.smtpPass ?? "" },
          });
          await transporter.sendMail({
            from: `"${settings.fromName ?? settings.fromEmail}" <${settings.fromEmail}>`,
            to: input.toEmail,
            subject: "Kasify — Test Email",
            html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:600px">
              <h2>Test Email ✅</h2>
              <p>Your email configuration is working correctly.</p>
            </div>`,
          });
          return { ok: true };
        } catch (err: any) {
          return { ok: false, error: err.message ?? "Send failed" };
        }
      }),
  }),

  // ── Templates ────────────────────────────────────────────────────────────────

  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await ctx.db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.tenantId, ctx.tenantId!));

      // Built-in templates: merge DB rows with in-memory defaults
      const byType = new Map(
        rows.filter((r: any) => r.type !== "custom").map((r: any) => [r.type, r]),
      );
      const builtIn = Object.entries(TEMPLATE_DEFAULTS)
        .filter(([type]) => type !== "custom")
        .map(([type, defaults]) => {
          const saved = byType.get(type);
          return saved ?? {
            id: null,
            tenantId: ctx.tenantId,
            type,
            name: defaults.name,
            subject: defaults.subject,
            body: defaults.body,
            isActive: true,
            isCustom: false,
          };
        });

      // Custom templates: rows with type === "custom"
      const custom = rows
        .filter((r: any) => r.type === "custom")
        .map((r: any) => ({ ...r, isCustom: true }));

      return [...builtIn, ...custom];
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          subject: z.string().min(1),
          body: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [created] = await ctx.db
          .insert(emailTemplates)
          .values({
            tenantId: ctx.tenantId!,
            type: "custom",
            name: input.name,
            subject: input.subject,
            body: input.body,
            isActive: true,
          })
          .returning();
        return created;
      }),

    update: adminProcedure
      .input(
        z.object({
          // For built-in templates: identify by type
          type: z.enum(EMAIL_TEMPLATE_TYPES).optional(),
          // For custom templates: identify by id
          id: z.string().uuid().optional(),
          name: z.string().min(1).optional(),
          subject: z.string().min(1),
          body: z.string().min(1),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.id) {
          // Custom template — update by id
          const [updated] = await ctx.db
            .update(emailTemplates)
            .set({
              name: input.name,
              subject: input.subject,
              body: input.body,
              isActive: input.isActive ?? true,
              updatedAt: new Date(),
            })
            .where(
              and(eq(emailTemplates.id, input.id), eq(emailTemplates.tenantId, ctx.tenantId!)),
            )
            .returning();
          return updated;
        }

        // Built-in template — upsert by type
        if (!input.type) throw new TRPCError({ code: "BAD_REQUEST", message: "type or id required" });
        const [existing] = await ctx.db
          .select()
          .from(emailTemplates)
          .where(
            and(
              eq(emailTemplates.tenantId, ctx.tenantId!),
              eq(emailTemplates.type, input.type),
            ),
          )
          .limit(1);

        const defaults = TEMPLATE_DEFAULTS[input.type];
        const values: any = {
          tenantId: ctx.tenantId!,
          type: input.type,
          name: defaults?.name ?? input.type,
          subject: input.subject,
          body: input.body,
          isActive: input.isActive ?? true,
          updatedAt: new Date(),
        };

        if (existing) {
          const [updated] = await ctx.db
            .update(emailTemplates)
            .set(values)
            .where(eq(emailTemplates.id, existing.id))
            .returning();
          return updated;
        }
        const [created] = await ctx.db.insert(emailTemplates).values(values).returning();
        return created;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .delete(emailTemplates)
          .where(
            and(
              eq(emailTemplates.id, input.id),
              eq(emailTemplates.tenantId, ctx.tenantId!),
              eq(emailTemplates.type, "custom"),
            ),
          );
        return { deleted: true };
      }),

    reset: adminProcedure
      .input(z.object({ type: z.enum(EMAIL_TEMPLATE_TYPES) }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .delete(emailTemplates)
          .where(
            and(
              eq(emailTemplates.tenantId, ctx.tenantId!),
              eq(emailTemplates.type, input.type),
            ),
          );
        return { reset: true };
      }),

    preview: protectedProcedure
      .input(z.object({ type: z.enum(EMAIL_TEMPLATE_TYPES) }))
      .query(async ({ ctx, input }) => {
        const [row] = await ctx.db
          .select()
          .from(emailTemplates)
          .where(
            and(
              eq(emailTemplates.tenantId, ctx.tenantId!),
              eq(emailTemplates.type, input.type),
            ),
          )
          .limit(1);

        const defaults = TEMPLATE_DEFAULTS[input.type];
        const body = row?.body ?? defaults?.body ?? "";
        const subject = row?.subject ?? defaults?.subject ?? "";

        const sampleVars: Record<string, string> = {
          customer_name: "Jane Smith",
          store_name: "My Store",
          order_number: "1042",
          order_total: "R 499.00",
          order_status: "Processing",
        };

        return {
          subject: renderTemplate(subject, sampleVars),
          html: renderTemplate(body, sampleVars),
        };
      }),
  }),

  // ── Logs ─────────────────────────────────────────────────────────────────────

  logs: router({
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(30),
          offset: z.number().default(0),
        }),
      )
      .query(async ({ ctx, input }) => {
        return ctx.db
          .select()
          .from(emailLogs)
          .where(eq(emailLogs.tenantId, ctx.tenantId!))
          .orderBy(desc(emailLogs.sentAt))
          .limit(input.limit)
          .offset(input.offset);
      }),
  }),

  // ── Send ─────────────────────────────────────────────────────────────────────

  send: adminProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
        isHtml: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const html = input.isHtml
        ? input.body
        : `<div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;color:#111827">${input.body.replace(/\n/g, "<br/>")}</div>`;

      return sendEmail({
        db: ctx.db,
        tenantId: ctx.tenantId!,
        to: input.to,
        subject: input.subject,
        html,
        type: "custom",
      });
    }),
});
