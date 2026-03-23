import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, signAccessToken, signRefreshToken, verifyPassword } from "@kasify/auth";
import { merchantUsers, refreshTokens, tenants, users } from "@kasify/db";
import { LoginSchema, RegisterSchema } from "@kasify/types";
import { publicProcedure, protectedProcedure, router } from "../trpc";
import { createHash, randomBytes } from "node:crypto";
import { LIMITS } from "../lib/rateLimiter";

export const authRouter = router({
  register: publicProcedure.input(RegisterSchema).mutation(async ({ ctx, input }) => {
    LIMITS.register(ctx.ip, "auth.register");
    // Check email uniqueness
    const existing = await ctx.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing.length > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
    }

    // Check slug uniqueness
    const existingTenant = await ctx.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, input.shopSlug))
      .limit(1);
    if (existingTenant.length > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "Shop URL already taken" });
    }

    const passwordHash = await hashPassword(input.password);

    // Create user + tenant + merchantUser in a transaction
    const result = await ctx.db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({ email: input.email, name: input.name, passwordHash })
        .returning();

      if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [newTenant] = await tx
        .insert(tenants)
        .values({ slug: input.shopSlug, name: input.shopName, email: input.email })
        .returning();

      if (!newTenant) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await tx.insert(merchantUsers).values({
        userId: newUser.id,
        tenantId: newTenant.id,
        role: "owner",
      });

      return { user: newUser, tenant: newTenant };
    });

    const accessToken = await signAccessToken({
      sub: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
      role: "owner",
    });

    const rawRefreshToken = randomBytes(40).toString("hex");
    const tokenHash = createHash("sha256").update(rawRefreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await ctx.db.insert(refreshTokens).values({
      userId: result.user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        name: result.tenant.name,
      },
    };
  }),

  login: publicProcedure.input(LoginSchema).mutation(async ({ ctx, input }) => {
    LIMITS.auth(ctx.ip, "auth.login");
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }

    // Get the user's first tenant (owners can have multiple tenants later)
    const [mu] = await ctx.db
      .select()
      .from(merchantUsers)
      .where(eq(merchantUsers.userId, user.id))
      .limit(1);

    if (!mu) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No shop associated with this account" });
    }

    const [tenant] = await ctx.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, mu.tenantId))
      .limit(1);

    if (!tenant || tenant.suspendedAt) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Shop is suspended" });
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: mu.role as "owner" | "admin" | "staff",
    });

    const rawRefreshToken = randomBytes(40).toString("hex");
    const tokenHash = createHash("sha256").update(rawRefreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await ctx.db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    };
  }),

  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = createHash("sha256").update(input.refreshToken).digest("hex");

      const [storedToken] = await ctx.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid refresh token" });
      }

      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, storedToken.userId))
        .limit(1);

      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [mu] = await ctx.db
        .select()
        .from(merchantUsers)
        .where(eq(merchantUsers.userId, user.id))
        .limit(1);

      if (!mu) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Rotate: revoke old, issue new
      await ctx.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, storedToken.id));

      const newRaw = randomBytes(40).toString("hex");
      const newHash = createHash("sha256").update(newRaw).digest("hex");
      await ctx.db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: newHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const accessToken = await signAccessToken({
        sub: user.id,
        email: user.email,
        tenantId: mu.tenantId,
        role: mu.role as "owner" | "admin" | "staff",
      });

      return { accessToken, refreshToken: newRaw };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.sub))
      .limit(1);

    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    const [tenant] = await ctx.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    return {
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      tenant: tenant
        ? { id: tenant.id, slug: tenant.slug, name: tenant.name, plan: tenant.plan }
        : null,
    };
  }),

  logout: protectedProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = createHash("sha256").update(input.refreshToken).digest("hex");
      await ctx.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
      return { success: true };
    }),

  // ── Team management ────────────────────────────────────────────────────────

  listTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        muId: merchantUsers.id,
        role: merchantUsers.role,
        createdAt: merchantUsers.createdAt,
        userId: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(merchantUsers)
      .innerJoin(users, eq(merchantUsers.userId, users.id))
      .where(eq(merchantUsers.tenantId, ctx.tenantId));
    return rows;
  }),

  addTeamMember: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["admin", "staff"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can add team members" });
      }

      // Check email not already a user
      const [existing] = await ctx.db.select().from(users).where(eq(users.email, input.email)).limit(1);

      let targetUserId: string;

      if (existing) {
        // Check not already on this tenant
        const [alreadyMember] = await ctx.db
          .select()
          .from(merchantUsers)
          .where(and(eq(merchantUsers.userId, existing.id), eq(merchantUsers.tenantId, ctx.tenantId)))
          .limit(1);
        if (alreadyMember) {
          throw new TRPCError({ code: "CONFLICT", message: "This person is already a team member" });
        }
        targetUserId = existing.id;
      } else {
        const passwordHash = await hashPassword(input.password);
        const [newUser] = await ctx.db
          .insert(users)
          .values({ email: input.email, name: input.name, passwordHash })
          .returning();
        if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        targetUserId = newUser.id;
      }

      await ctx.db.insert(merchantUsers).values({
        userId: targetUserId,
        tenantId: ctx.tenantId,
        role: input.role,
      });

      return { success: true };
    }),

  updateTeamMemberRole: protectedProcedure
    .input(z.object({ muId: z.string().uuid(), role: z.enum(["admin", "staff"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners can change roles" });
      }
      await ctx.db
        .update(merchantUsers)
        .set({ role: input.role })
        .where(and(eq(merchantUsers.id, input.muId), eq(merchantUsers.tenantId, ctx.tenantId)));
      return { success: true };
    }),

  removeTeamMember: protectedProcedure
    .input(z.object({ muId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can remove team members" });
      }
      // Cannot remove yourself
      const [target] = await ctx.db
        .select()
        .from(merchantUsers)
        .where(and(eq(merchantUsers.id, input.muId), eq(merchantUsers.tenantId, ctx.tenantId)))
        .limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.userId === ctx.user.sub) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove yourself" });
      }
      if (target.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the store owner" });
      }
      await ctx.db
        .delete(merchantUsers)
        .where(and(eq(merchantUsers.id, input.muId), eq(merchantUsers.tenantId, ctx.tenantId)));
      return { success: true };
    }),
});
