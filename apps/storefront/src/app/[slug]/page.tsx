import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { BlockRenderer } from "@/components/block-renderer";
import Link from "next/link";

export default async function ShopHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let shop: Awaited<ReturnType<typeof api.public.resolveShop.query>>;
  try {
    shop = await api.public.resolveShop.query({ slug });
  } catch {
    notFound();
  }

  const [products, collections, homePage] = await Promise.all([
    api.public.products.query({ tenantId: shop.tenant.id, limit: 12 }),
    api.public.collections.query({ tenantId: shop.tenant.id }),
    api.public.homePage.query({ tenantId: shop.tenant.id }),
  ]);

  // If a published home page with blocks exists, render it via BlockRenderer
  type PageContent = { blocks?: unknown[] };
  const pageContent = homePage?.content as PageContent | null;
  const hasBuilderContent =
    homePage &&
    pageContent?.blocks &&
    Array.isArray(pageContent.blocks) &&
    pageContent.blocks.length > 0;

  if (hasBuilderContent) {
    return (
      <BlockRenderer
        blocks={pageContent!.blocks as Parameters<typeof BlockRenderer>[0]["blocks"]}
        slug={slug}
        products={products}
        collections={collections}
      />
    );
  }

  // ─── Fallback static homepage ─────────────────────────────────────────────

  return (
    <div>
      {/* Hero */}
      <section
        className="relative py-28 px-6 text-center"
        style={{ backgroundColor: "var(--shop-primary, #111827)" }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {shop.tenant.name}
          </h1>
          <p className="mt-4 text-lg text-white/70">Discover our latest collection</p>
          <Link
            href={`/${slug}/products`}
            className="mt-8 inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Collections */}
      {collections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/${slug}/products?collection=${col.handle}`}
                className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 group"
              >
                {col.imageUrl ? (
                  <img
                    src={col.imageUrl}
                    alt={col.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                  {col.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <Link
              href={`/${slug}/products`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {products.length === 0 && (
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <p className="text-gray-500 text-lg">No products yet. Check back soon!</p>
        </section>
      )}
    </div>
  );
}
