import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { pages, themes } from "@kstack/db";
import { protectedProcedure, adminProcedure, router } from "../trpc";

export const storefrontRouter = router({
  // Themes
  themes: {
    list: protectedProcedure.query(async ({ ctx }) => {
      return ctx.db.select().from(themes).where(eq(themes.tenantId, ctx.tenantId));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const [theme] = await ctx.db
          .select()
          .from(themes)
          .where(and(eq(themes.id, input.id), eq(themes.tenantId, ctx.tenantId)))
          .limit(1);
        if (!theme) throw new TRPCError({ code: "NOT_FOUND" });
        return theme;
      }),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const [theme] = await ctx.db
          .insert(themes)
          .values({ tenantId: ctx.tenantId, name: input.name })
          .returning();
        return theme;
      }),

    activate: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        // Deactivate all, then activate the chosen one
        await ctx.db
          .update(themes)
          .set({ isActive: false })
          .where(eq(themes.tenantId, ctx.tenantId));

        const [activated] = await ctx.db
          .update(themes)
          .set({ isActive: true })
          .where(and(eq(themes.id, input.id), eq(themes.tenantId, ctx.tenantId)))
          .returning();

        if (!activated) throw new TRPCError({ code: "NOT_FOUND" });
        return activated;
      }),

    updateSettings: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          settings: z.object({
            primaryColor: z.string().optional(),
            secondaryColor: z.string().optional(),
            accentColor: z.string().optional(),
            fontHeading: z.string().optional(),
            fontBody: z.string().optional(),
            borderRadius: z.string().optional(),
          }),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [current] = await ctx.db
          .select()
          .from(themes)
          .where(and(eq(themes.id, input.id), eq(themes.tenantId, ctx.tenantId)))
          .limit(1);

        if (!current) throw new TRPCError({ code: "NOT_FOUND" });

        const [updated] = await ctx.db
          .update(themes)
          .set({ settings: { ...current.settings, ...input.settings } as typeof current.settings })
          .where(eq(themes.id, input.id))
          .returning();

        return updated;
      }),
  },

  // Pages
  pages: {
    list: protectedProcedure
      .input(z.object({ themeId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        return ctx.db
          .select()
          .from(pages)
          .where(and(eq(pages.tenantId, ctx.tenantId), eq(pages.themeId, input.themeId)));
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const [page] = await ctx.db
          .select()
          .from(pages)
          .where(and(eq(pages.id, input.id), eq(pages.tenantId, ctx.tenantId)))
          .limit(1);
        if (!page) throw new TRPCError({ code: "NOT_FOUND" });
        return page;
      }),

    create: adminProcedure
      .input(
        z.object({
          themeId: z.string().uuid(),
          title: z.string().min(1),
          slug: z.string().min(1),
          type: z.enum(["home", "product", "collection", "blog", "custom", "404"]).default("custom"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [page] = await ctx.db
          .insert(pages)
          .values({
            tenantId: ctx.tenantId,
            themeId: input.themeId,
            title: input.title,
            slug: input.slug,
            type: input.type,
            mode: "visual",
          })
          .returning();
        return page;
      }),

    saveContent: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          mode: z.enum(["visual", "code"]),
          content: z.record(z.unknown()).optional(),
          customCode: z
            .object({ html: z.string(), css: z.string(), js: z.string() })
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [updated] = await ctx.db
          .update(pages)
          .set({
            mode: input.mode,
            content: input.content ?? null,
            customCode: input.customCode ?? null,
            updatedAt: new Date(),
          })
          .where(and(eq(pages.id, input.id), eq(pages.tenantId, ctx.tenantId)))
          .returning();

        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
        return updated;
      }),

    publish: adminProcedure
      .input(z.object({ id: z.string().uuid(), isPublished: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const [updated] = await ctx.db
          .update(pages)
          .set({ isPublished: input.isPublished, updatedAt: new Date() })
          .where(and(eq(pages.id, input.id), eq(pages.tenantId, ctx.tenantId)))
          .returning();

        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
        return updated;
      }),
  },
});
