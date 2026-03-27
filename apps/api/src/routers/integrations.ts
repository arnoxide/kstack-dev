import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { integrations, INTEGRATION_PROVIDERS } from "@kstack/db";
import { protectedProcedure, adminProcedure, router } from "../trpc";

export const integrationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(integrations)
      .where(eq(integrations.tenantId, ctx.tenantId));
  }),

  upsert: adminProcedure
    .input(
      z.object({
        provider: z.enum(INTEGRATION_PROVIDERS),
        isEnabled: z.boolean(),
        config: z.record(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.tenantId, ctx.tenantId),
            eq(integrations.provider, input.provider),
          ),
        )
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(integrations)
          .set({
            isEnabled: input.isEnabled,
            config: input.config,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(integrations)
        .values({
          tenantId: ctx.tenantId,
          provider: input.provider,
          isEnabled: input.isEnabled,
          config: input.config,
        })
        .returning();
      return created;
    }),

  disable: adminProcedure
    .input(z.object({ provider: z.enum(INTEGRATION_PROVIDERS) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(integrations)
        .set({ isEnabled: false, updatedAt: new Date() })
        .where(
          and(
            eq(integrations.tenantId, ctx.tenantId),
            eq(integrations.provider, input.provider),
          ),
        );
      return { success: true };
    }),
});
