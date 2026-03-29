// Module: KStack_Contact
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { contactMessages } from "@kstack/db";
import { protectedProcedure, router } from "../trpc";

export const contactRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.tenantId, ctx.tenantId))
      .orderBy(desc(contactMessages.createdAt));
  }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "read", "replied"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(contactMessages)
        .set({ status: input.status })
        .where(and(eq(contactMessages.id, input.id), eq(contactMessages.tenantId, ctx.tenantId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(contactMessages)
        .where(and(eq(contactMessages.id, input.id), eq(contactMessages.tenantId, ctx.tenantId)));
      return { ok: true };
    }),
});
