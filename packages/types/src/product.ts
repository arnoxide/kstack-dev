import { z } from "zod";

export const ProductStatusSchema = z.enum(["draft", "active", "archived"]);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  handle: z.string().min(1).max(255),
  status: ProductStatusSchema,
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Product = z.infer<typeof ProductSchema>;

export const VariantSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  tenantId: z.string().uuid(),
  sku: z.string().nullable(),
  title: z.string().min(1),
  price: z.number().min(0),
  comparePrice: z.number().min(0).nullable(),
  inventory: z.number().int().min(0),
  options: z.record(z.string()),
  imageUrl: z.string().url().nullable(),
  createdAt: z.date(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const CreateProductSchema = z.object({
  title: ProductSchema.shape.title,
  description: ProductSchema.shape.description,
  handle: ProductSchema.shape.handle.optional(),
  status: ProductStatusSchema.default("draft"),
  tags: z.array(z.string()).default([]),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const CreateVariantSchema = z.object({
  sku: z.string().nullable().default(null),
  title: z.string().min(1),
  price: z.number().min(0),
  comparePrice: z.number().min(0).nullable().default(null),
  inventory: z.number().int().min(0).default(0),
  options: z.record(z.string()).default({}),
  imageUrl: z.string().url().nullable().default(null),
});
export type CreateVariantInput = z.infer<typeof CreateVariantSchema>;
