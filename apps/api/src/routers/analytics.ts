// Module: KStack_Analytics
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { pageviews } from "@kstack/db";
import { eq, and, gte, sql, desc, count, countDistinct } from "drizzle-orm";

export const analyticsRouter = router({
  // Called from storefront on every page navigation
  track: publicProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        path: z.string().max(500),
        referrer: z.string().max(500).optional(),
        sessionId: z.string().max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(pageviews).values({
        tenantId: input.tenantId,
        path: input.path,
        referrer: input.referrer ?? null,
        sessionId: input.sessionId,
      });
      return { ok: true };
    }),

  // Returns web traffic stats for the dashboard
  stats: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const baseFilter = and(
        eq(pageviews.tenantId, ctx.tenantId),
        gte(pageviews.createdAt, since),
      );

      // Total pageviews + unique sessions
      const [totals] = await ctx.db
        .select({
          totalPageviews: count(),
          uniqueSessions: countDistinct(pageviews.sessionId),
        })
        .from(pageviews)
        .where(baseFilter);

      // Daily pageviews for the last `days` days
      const daily = await ctx.db
        .select({
          date: sql<string>`DATE(${pageviews.createdAt})`.as("date"),
          views: count(),
        })
        .from(pageviews)
        .where(baseFilter)
        .groupBy(sql`DATE(${pageviews.createdAt})`)
        .orderBy(sql`DATE(${pageviews.createdAt})`);

      // Top pages
      const topPages = await ctx.db
        .select({
          path: pageviews.path,
          views: count(),
        })
        .from(pageviews)
        .where(baseFilter)
        .groupBy(pageviews.path)
        .orderBy(desc(count()))
        .limit(10);

      return {
        totalPageviews: totals?.totalPageviews ?? 0,
        uniqueSessions: totals?.uniqueSessions ?? 0,
        daily,
        topPages,
      };
    }),
});
