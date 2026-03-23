import { z } from "zod";

export const UserRoleSchema = z.enum(["owner", "admin", "staff", "customer"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const MerchantUserSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: UserRoleSchema,
  createdAt: z.date(),
});
export type MerchantUser = z.infer<typeof MerchantUserSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  shopName: z.string().min(3).max(100),
  shopSlug: z.string().min(3).max(32).regex(/^[a-z0-9-]+$/),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  tenantId: z.string().uuid(),
  role: UserRoleSchema,
  iat: z.number(),
  exp: z.number(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
