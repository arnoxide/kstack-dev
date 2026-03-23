import { z } from "zod";

export const PageTypeSchema = z.enum(["home", "product", "collection", "blog", "custom", "404"]);
export type PageType = z.infer<typeof PageTypeSchema>;

export const BuilderNodeSchema = z.lazy(() =>
  z.object({
    type: z.object({ resolvedName: z.string() }),
    isCanvas: z.boolean().optional(),
    props: z.record(z.unknown()),
    displayName: z.string().optional(),
    custom: z.record(z.unknown()).optional(),
    parent: z.string().nullable().optional(),
    nodes: z.array(z.string()).optional(),
    linkedNodes: z.record(z.string()).optional(),
    hidden: z.boolean().optional(),
  }),
);

export interface BuilderNode {
  type: { resolvedName: string };
  isCanvas?: boolean;
  props: Record<string, unknown>;
  displayName?: string;
  custom?: Record<string, unknown>;
  parent?: string | null;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
  hidden?: boolean;
}

export type BuilderState = Record<string, BuilderNode>;

export const CustomCodeSchema = z.object({
  html: z.string(),
  css: z.string(),
  js: z.string(),
});
export type CustomCode = z.infer<typeof CustomCodeSchema>;

export const PageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  themeId: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  type: PageTypeSchema,
  mode: z.enum(["visual", "code"]),
  content: z.record(z.unknown()).nullable(),
  customCode: CustomCodeSchema.nullable(),
  isPublished: z.boolean(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Page = z.infer<typeof PageSchema>;

export const ThemeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  isActive: z.boolean(),
  settings: z.object({
    primaryColor: z.string().default("#000000"),
    secondaryColor: z.string().default("#ffffff"),
    accentColor: z.string().default("#3b82f6"),
    fontHeading: z.string().default("Inter"),
    fontBody: z.string().default("Inter"),
    borderRadius: z.string().default("0.5rem"),
  }),
  createdAt: z.date(),
});
export type Theme = z.infer<typeof ThemeSchema>;
