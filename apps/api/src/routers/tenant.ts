import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { domains, tenants } from "@kstack/db";
import { protectedProcedure, adminProcedure, router } from "../trpc";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";

export const tenantRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [tenant] = await ctx.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
    return tenant;
  }),

  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        logoUrl: z.string().url().nullable().optional(),
        socialLinks: z.record(z.string()).optional(),
        contactInfo: z.record(z.string()).optional(),
        legalPages: z.object({
          privacy: z.string().optional(),
          terms: z.string().optional(),
          disclaimer: z.string().optional(),
        }).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tenants)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(tenants.id, ctx.tenantId))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  domains: {
    list: protectedProcedure.query(async ({ ctx }) => {
      return ctx.db.select().from(domains).where(eq(domains.tenantId, ctx.tenantId));
    }),

    add: adminProcedure
      .input(z.object({ hostname: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db
          .select()
          .from(domains)
          .where(eq(domains.hostname, input.hostname))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Domain already registered" });
        }

        const verificationToken = randomBytes(16).toString("hex");

        const [domain] = await ctx.db
          .insert(domains)
          .values({
            tenantId: ctx.tenantId,
            hostname: input.hostname,
            verificationToken,
          })
          .returning();

        return domain;
      }),

    remove: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .delete(domains)
          .where(and(eq(domains.id, input.id), eq(domains.tenantId, ctx.tenantId)));

        return { success: true };
      }),
  },

  setMaintenance: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tenants)
        .set({ maintenanceMode: input.enabled, updatedAt: new Date() })
        .where(eq(tenants.id, ctx.tenantId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  setFrozen: adminProcedure
    .input(z.object({ frozen: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tenants)
        .set({ frozenAt: input.frozen ? new Date() : null, updatedAt: new Date() })
        .where(eq(tenants.id, ctx.tenantId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db
        .delete(tenants)
        .where(eq(tenants.id, ctx.tenantId));
      return { success: true };
    }),
});
