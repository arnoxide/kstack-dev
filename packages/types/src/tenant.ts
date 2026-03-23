import { z } from "zod";

export const TenantPlanSchema = z.enum(["free", "starter", "pro", "enterprise"]);
export type TenantPlan = z.infer<typeof TenantPlanSchema>;

export const TenantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(3).max(32).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  name: z.string().min(1).max(100),
  plan: TenantPlanSchema,
  email: z.string().email(),
  logoUrl: z.string().url().nullable(),
  createdAt: z.date(),
  suspendedAt: z.date().nullable(),
});
export type Tenant = z.infer<typeof TenantSchema>;

export const CreateTenantSchema = z.object({
  slug: TenantSchema.shape.slug,
  name: TenantSchema.shape.name,
  email: TenantSchema.shape.email,
});
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;

export const DomainSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  hostname: z.string().min(1),
  verified: z.boolean(),
  sslStatus: z.enum(["pending", "active", "failed"]),
  createdAt: z.date(),
});
export type Domain = z.infer<typeof DomainSchema>;
