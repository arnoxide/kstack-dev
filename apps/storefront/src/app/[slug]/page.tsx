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
  type PageContent = { blocks?: Array<{ type: string }> };
  const pageContent = homePage?.content as PageContent | null;
  const hasBuilderContent =
    homePage &&
    pageContent?.blocks &&
    Array.isArray(pageContent.blocks) &&
    pageContent.blocks.length > 0;

  if (hasBuilderContent) {
    const blocks = pageContent!.blocks as Parameters<typeof BlockRenderer>[0]["blocks"];
    // Check if the merchant explicitly added a products/collections block
    const hasProductBlock = (pageContent!.blocks as Array<{ type: string }>).some(
      (b) => b.type === "featured_products" || b.type === "collection_grid",
    );

    return (
      <div>
        <BlockRenderer blocks={blocks} slug={slug} products={products} collections={collections} />

        {/* Always show products below builder content if no product block was added */}
        {!hasProductBlock && products.length > 0 && (
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
      </div>
    );
  }

  // ─── Fallback static homepage ─────────────────────────────────────────────

  const hasProducts = products.length > 0;

  return (
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: "var(--shop-primary, #111827)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10 blur-3xl bg-white" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-10 blur-3xl bg-white" />

        <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-36 text-center">
          {hasProducts && (
            <span className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              New arrivals in stock
            </span>
          )}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-none">
            {shop.tenant.name}
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-white/60 max-w-xl mx-auto">
            {hasProducts
              ? "Curated picks, delivered to your door. Shop the latest collection."
              : "We're getting ready. Something amazing is on its way."}
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href={`/${slug}/products`}
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-8 py-3.5 rounded-full hover:bg-gray-100 transition-colors shadow-lg"
            >
              Shop Now
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </Link>
            {collections.length > 0 && (
              <Link
                href={`/${slug}/products`}
                className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors border border-white/20 px-6 py-3.5 rounded-full hover:border-white/40"
              >
                Browse categories
              </Link>
            )}
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative h-16 overflow-hidden">
          <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0 64L1440 64L1440 28C1200 60 960 0 720 28C480 56 240 0 0 28L0 64Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              ),
              label: "Fast Delivery",
              sub: "Quick shipping",
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              ),
              label: "Secure Checkout",
              sub: "100% protected",
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              ),
              label: "Easy Returns",
              sub: "Hassle-free",
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              ),
              label: "24/7 Support",
              sub: "Always here",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-2">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                  {item.icon}
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Collections ──────────────────────────────────────────────────────── */}
      {collections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Browse</p>
              <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
            </div>
            <Link href={`/${slug}/products`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              All products →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/${slug}/products?collection=${col.handle}`}
                className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 group"
              >
                {col.imageUrl ? (
                  <img
                    src={col.imageUrl}
                    alt={col.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ background: "linear-gradient(135deg, var(--shop-primary, #111827) 0%, var(--shop-secondary, #374151) 100%)" }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-4">
                  <span className="text-white font-semibold text-sm sm:text-base">{col.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Products ─────────────────────────────────────────────────── */}
      {hasProducts && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Handpicked</p>
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            </div>
            <Link
              href={`/${slug}/products`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4 transition-colors"
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

      {/* ── Promo banner (only when there are products) ───────────────────────── */}
      {hasProducts && (
        <section
          className="mx-4 sm:mx-6 lg:mx-8 mb-16 rounded-3xl overflow-hidden relative"
          style={{ backgroundColor: "var(--shop-primary, #111827)" }}
        >
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10 blur-3xl bg-white" />
          <div className="relative px-8 py-12 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-2">Don&apos;t miss out</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Explore the full collection
              </h3>
              <p className="text-white/60 mt-2 text-sm max-w-md">
                New items added regularly. Find exactly what you&apos;re looking for.
              </p>
            </div>
            <Link
              href={`/${slug}/products`}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-8 py-3.5 rounded-full hover:bg-gray-100 transition-colors shadow-lg whitespace-nowrap"
            >
              Shop the collection
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* ── Coming soon (no products) ─────────────────────────────────────────── */}
      {!hasProducts && (
        <section className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-8 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-10 h-10 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Something exciting is coming
          </h2>
          <p className="text-gray-500 text-lg mb-2">
            {shop.tenant.name} is stocking up. Products go live very soon.
          </p>
          <p className="text-gray-400 text-sm mb-10">
            Bookmark this page and be the first to shop when we launch.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 text-sm text-gray-600">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              Store is live — products dropping soon
            </div>
            <Link
              href={`/${slug}/products`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors underline underline-offset-4"
            >
              Browse all listings
            </Link>
          </div>

          {/* Value props for empty stores */}
          <div className="mt-16 grid grid-cols-3 gap-6 border-t border-gray-100 pt-12">
            {[
              { emoji: "🚚", label: "Fast shipping", desc: "Quick delivery on all orders" },
              { emoji: "🔒", label: "Safe payments", desc: "Your info is always protected" },
              { emoji: "💬", label: "Great support", desc: "We're here whenever you need" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
