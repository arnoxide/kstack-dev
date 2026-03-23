/**
 * Seed script — creates a demo shop with sample products (Magento-style defaults).
 * Run: pnpm db:seed
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema/index";
import {
  tenants,
  themes,
  products,
  variants,
  productImages,
  collections,
  collectionProducts,
} from "./schema/index";

const connectionString =
  process.env["DATABASE_URL"] ?? "postgresql://kasify:kasify@localhost:5432/kasify";

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const DEMO_SLUG = "demo";

type SeedVariant = {
  title: string;
  price: string;
  comparePrice: string | null;
  inventory: number;
};

type SeedProduct = {
  title: string;
  handle: string;
  description: string;
  tags: string[];
  image: string;
  variants: SeedVariant[];
  collection: string;
};

const SAMPLE_PRODUCTS: SeedProduct[] = [
  // ---- Clothing ----
  {
    title: "Classic White Tee",
    handle: "classic-white-tee",
    description:
      "A timeless staple. Cut from 100% combed cotton with a relaxed fit that looks great on everyone. Soft, breathable, and built to last.",
    tags: ["clothing", "tops", "essentials"],
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
    variants: [
      { title: "S", price: "29.99", comparePrice: "39.99", inventory: 50 },
      { title: "M", price: "29.99", comparePrice: "39.99", inventory: 80 },
      { title: "L", price: "29.99", comparePrice: "39.99", inventory: 60 },
      { title: "XL", price: "29.99", comparePrice: "39.99", inventory: 40 },
    ],
    collection: "clothing",
  },
  {
    title: "Slim Fit Chinos",
    handle: "slim-fit-chinos",
    description:
      "Sharp, versatile, and comfortable all day long. These slim-fit chinos pair perfectly with anything from a casual tee to a blazer.",
    tags: ["clothing", "bottoms", "trousers"],
    image: "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600&q=80",
    variants: [
      { title: "30×30", price: "59.99", comparePrice: "79.99", inventory: 30 },
      { title: "32×30", price: "59.99", comparePrice: "79.99", inventory: 45 },
      { title: "34×32", price: "59.99", comparePrice: "79.99", inventory: 25 },
    ],
    collection: "clothing",
  },
  {
    title: "Wool Blend Overcoat",
    handle: "wool-blend-overcoat",
    description:
      "Elevate your outerwear game. This premium wool-blend overcoat features a tailored silhouette and satin lining — made for cold days and sharp looks.",
    tags: ["clothing", "outerwear", "winter"],
    image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&q=80",
    variants: [
      { title: "S / Camel", price: "189.99", comparePrice: "249.99", inventory: 15 },
      { title: "M / Camel", price: "189.99", comparePrice: "249.99", inventory: 20 },
      { title: "M / Charcoal", price: "189.99", comparePrice: "249.99", inventory: 18 },
      { title: "L / Charcoal", price: "189.99", comparePrice: "249.99", inventory: 10 },
    ],
    collection: "clothing",
  },
  {
    title: "Linen Summer Dress",
    handle: "linen-summer-dress",
    description:
      "Light, airy, and effortlessly chic. Made from 100% natural linen, this midi dress is perfect for warm days and warm evenings.",
    tags: ["clothing", "dresses", "summer"],
    image: "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=600&q=80",
    variants: [
      { title: "XS / White", price: "79.99", comparePrice: null, inventory: 20 },
      { title: "S / White", price: "79.99", comparePrice: null, inventory: 30 },
      { title: "S / Sage", price: "79.99", comparePrice: null, inventory: 25 },
      { title: "M / Sage", price: "79.99", comparePrice: null, inventory: 20 },
    ],
    collection: "clothing",
  },

  // ---- Electronics ----
  {
    title: "Wireless Noise-Cancelling Headphones",
    handle: "wireless-noise-cancelling-headphones",
    description:
      "Immerse yourself in sound. Featuring active noise cancellation, 30-hour battery life, and premium drivers that deliver rich, detailed audio.",
    tags: ["electronics", "audio", "headphones"],
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    variants: [
      { title: "Midnight Black", price: "249.99", comparePrice: "299.99", inventory: 40 },
      { title: "Pearl White", price: "249.99", comparePrice: "299.99", inventory: 35 },
    ],
    collection: "electronics",
  },
  {
    title: "Smart Watch Series X",
    handle: "smart-watch-series-x",
    description:
      "Track your health, stay connected, and look great doing it. Features heart-rate monitoring, GPS, sleep tracking, and a stunning AMOLED display.",
    tags: ["electronics", "wearables", "fitness"],
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    variants: [
      { title: "40mm / Silver", price: "329.99", comparePrice: "399.99", inventory: 25 },
      { title: "44mm / Space Grey", price: "359.99", comparePrice: "429.99", inventory: 20 },
      { title: "44mm / Rose Gold", price: "359.99", comparePrice: "429.99", inventory: 15 },
    ],
    collection: "electronics",
  },
  {
    title: "Portable Bluetooth Speaker",
    handle: "portable-bluetooth-speaker",
    description:
      "360° surround sound in a compact, waterproof body. With 12 hours of playback, it's the perfect companion for outdoor adventures.",
    tags: ["electronics", "audio", "outdoor"],
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80",
    variants: [
      { title: "Slate Grey", price: "89.99", comparePrice: "119.99", inventory: 60 },
      { title: "Ocean Blue", price: "89.99", comparePrice: "119.99", inventory: 55 },
    ],
    collection: "electronics",
  },

  // ---- Home & Living ----
  {
    title: "Ceramic Pour-Over Coffee Set",
    handle: "ceramic-pour-over-coffee-set",
    description:
      "Elevate your morning ritual. This handcrafted ceramic pour-over set includes a dripper, server, and two mugs. Dishwasher safe and endlessly elegant.",
    tags: ["home", "kitchen", "coffee"],
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80",
    variants: [
      { title: "Matte White", price: "64.99", comparePrice: "84.99", inventory: 35 },
      { title: "Speckled Clay", price: "69.99", comparePrice: "84.99", inventory: 28 },
    ],
    collection: "home",
  },
  {
    title: "Linen Throw Pillow Set",
    handle: "linen-throw-pillow-set",
    description:
      "Add warmth and texture to any space. Set of 2 linen throw pillows with feather-down inserts. Available in neutral tones that suit any interior.",
    tags: ["home", "decor", "pillows"],
    image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=600&q=80",
    variants: [
      { title: "Sand / 45×45cm", price: "44.99", comparePrice: null, inventory: 50 },
      { title: "Ivory / 45×45cm", price: "44.99", comparePrice: null, inventory: 45 },
      { title: "Terracotta / 45×45cm", price: "44.99", comparePrice: null, inventory: 30 },
    ],
    collection: "home",
  },
  {
    title: "Solid Oak Desk Organiser",
    handle: "solid-oak-desk-organiser",
    description:
      "Keep your workspace clean and beautiful. Handmade from sustainably sourced solid oak with compartments for pens, cards, and devices.",
    tags: ["home", "office", "desk"],
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
    variants: [
      { title: "Natural Oak", price: "54.99", comparePrice: "69.99", inventory: 40 },
    ],
    collection: "home",
  },
  {
    title: "Scented Soy Wax Candle",
    handle: "scented-soy-wax-candle",
    description:
      "Hand-poured from 100% natural soy wax with cotton wicks. Long 50-hour burn time. Choose from three calming signature scents.",
    tags: ["home", "decor", "candles"],
    image: "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=600&q=80",
    variants: [
      { title: "Cedarwood & Amber", price: "24.99", comparePrice: null, inventory: 80 },
      { title: "Lavender & Sage", price: "24.99", comparePrice: null, inventory: 75 },
      { title: "Lemon & Eucalyptus", price: "24.99", comparePrice: null, inventory: 65 },
    ],
    collection: "home",
  },
  {
    title: "Minimalist Wall Clock",
    handle: "minimalist-wall-clock",
    description:
      "Timekeeping, elevated. This Scandinavian-inspired wall clock features a silent sweep mechanism and a powder-coated steel case in three finishes.",
    tags: ["home", "decor", "clocks"],
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&q=80",
    variants: [
      { title: "30cm / Matte Black", price: "49.99", comparePrice: "64.99", inventory: 45 },
      { title: "30cm / White", price: "49.99", comparePrice: "64.99", inventory: 50 },
      { title: "40cm / Matte Black", price: "64.99", comparePrice: "79.99", inventory: 30 },
    ],
    collection: "home",
  },
];

const SEED_COLLECTIONS = [
  {
    handle: "clothing",
    title: "Clothing",
    description: "Timeless pieces for every wardrobe.",
    image: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&q=80",
  },
  {
    handle: "electronics",
    title: "Electronics",
    description: "The latest in audio, wearables, and tech.",
    image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&q=80",
  },
  {
    handle: "home",
    title: "Home & Living",
    description: "Beautiful objects for everyday living.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
  },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Starting seed...\n");

  // 1. Upsert tenant
  console.log("  → Creating demo tenant...");
  const [tenant] = await db
    .insert(tenants)
    .values({
      slug: DEMO_SLUG,
      name: "Demo Store",
      email: "demo@kasify.dev",
      plan: "pro",
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: { name: "Demo Store", email: "demo@kasify.dev" },
    })
    .returning();
  const tenantId = tenant.id;
  console.log(`     ✓ Tenant id: ${tenantId}\n`);

  // 2. Active theme (skip if one already exists)
  const [existingTheme] = await db
    .select()
    .from(themes)
    .where(eq(themes.tenantId, tenantId))
    .limit(1);

  if (!existingTheme) {
    console.log("  → Creating theme...");
    await db.insert(themes).values({
      tenantId,
      name: "Default",
      isActive: true,
      settings: {
        primaryColor: "#111827",
        secondaryColor: "#ffffff",
        accentColor: "#f59e0b",
        fontHeading: "Inter",
        fontBody: "Inter",
        borderRadius: "0.75rem",
      },
    });
    console.log("     ✓ Theme created\n");
  } else {
    console.log("  ~ Theme already exists, skipping\n");
  }

  // 3. Collections
  console.log("  → Creating collections...");
  const collectionMap: Record<string, string> = {};

  for (const col of SEED_COLLECTIONS) {
    const [existing] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.tenantId, tenantId), eq(collections.handle, col.handle)))
      .limit(1);

    if (existing) {
      collectionMap[col.handle] = existing.id;
      console.log(`     ~ ${col.title} (already exists)`);
    } else {
      const [inserted] = await db
        .insert(collections)
        .values({
          tenantId,
          title: col.title,
          handle: col.handle,
          description: col.description,
          imageUrl: col.image,
        })
        .returning();
      collectionMap[col.handle] = inserted.id;
      console.log(`     ✓ ${col.title}`);
    }
  }
  console.log();

  // 4. Products
  console.log("  → Creating products...");
  for (let i = 0; i < SAMPLE_PRODUCTS.length; i++) {
    const p = SAMPLE_PRODUCTS[i];

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.handle, p.handle)))
      .limit(1);

    if (existing) {
      console.log(`     ~ ${p.title} (already exists)`);
      continue;
    }

    const [inserted] = await db
      .insert(products)
      .values({
        tenantId,
        title: p.title,
        handle: p.handle,
        description: p.description,
        status: "active",
        tags: p.tags,
      })
      .returning();

    const productId = inserted.id;

    // Image
    await db.insert(productImages).values({
      tenantId,
      productId,
      url: p.image,
      altText: p.title,
      sortOrder: 0,
    });

    // Variants
    for (let vi = 0; vi < p.variants.length; vi++) {
      const v = p.variants[vi];
      await db.insert(variants).values({
        tenantId,
        productId,
        title: v.title,
        price: v.price,
        comparePrice: v.comparePrice,
        inventory: v.inventory,
        sortOrder: vi,
        options: p.variants.length === 1 ? {} : { option: v.title },
      });
    }

    // Collection membership
    const colId = collectionMap[p.collection];
    if (colId) {
      await db.insert(collectionProducts).values({
        tenantId,
        productId,
        collectionId: colId,
        sortOrder: i,
      });
    }

    console.log(
      `     ✓ ${p.title}  (${p.variants.length} variant${p.variants.length !== 1 ? "s" : ""})`,
    );
  }

  console.log("\n✅ Seed complete!");
  console.log(`\n   Demo store →  http://localhost:3003/${DEMO_SLUG}`);
  console.log(`   All products → http://localhost:3003/${DEMO_SLUG}/products\n`);

  await client.end();
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
