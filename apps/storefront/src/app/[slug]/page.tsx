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
        <section className="max-w-2xl mx-auto px-6 py-24 text-center">
          {/* Animated dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-gray-300"
                style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Something exciting is coming
          </h2>
          <p className="text-gray-500 text-lg mb-2">
            {shop.tenant.name} is stocking up. Our products will be live very soon.
          </p>
          <p className="text-gray-400 text-sm mb-10">
            Bookmark this page and be the first to shop when we launch.
          </p>

          {/* Share row */}
          <div className="inline-flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 text-sm text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            Store is live — products dropping soon
          </div>
        </section>
      )}
    </div>
  );
}
