import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { ProductVariantSelector } from "@/components/product-variant-selector";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { ProductReviews, type Review } from "@/components/product-reviews";
import { WishlistButton } from "@/components/wishlist-button";
import { AIRecommendations } from "@/components/ai-recommendations";
import { GaViewItem } from "@/components/ga-view-item";
import Link from "next/link";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; handle: string }>;
}) {
  const { slug, handle } = await params;

  let shop: Awaited<ReturnType<typeof api.public.resolveShop.query>>;
  try {
    shop = await api.public.resolveShop.query({ slug });
  } catch {
    notFound();
  }

  let product: Awaited<ReturnType<typeof api.public.product.query>>;
  try {
    product = await api.public.product.query({ tenantId: shop.tenant.id, handle });
  } catch {
    notFound();
  }

  const primaryImage = product.images[0]?.url ?? null;
  const sortedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const reviewsData = await api.reviews.list.query({ tenantId: shop.tenant.id, productId: product.id });

  const minPrice = product.variants[0] ? Number(product.variants[0].price) : 0;
  const firstTag = product.tags?.[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <GaViewItem id={product.id} title={product.title} price={minPrice} {...(firstTag && { category: firstTag })} />
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8 flex items-center gap-2 flex-wrap">
        <Link href={`/${slug}`} className="hover:text-gray-900 transition-colors">Home</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/${slug}/products`} className="hover:text-gray-900 transition-colors">Products</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery */}
        <ProductImageGallery images={sortedImages} title={product.title} />

        {/* Details */}
        <div className="flex flex-col">
          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/${slug}/products?q=${encodeURIComponent(tag)}`}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">{product.title}</h1>
            <WishlistButton
              tenantId={shop.tenant.id}
              item={{ productId: product.id, handle: product.handle, title: product.title, primaryImage: sortedImages[0]?.url ?? null, minPrice: product.variants[0] ? Number(product.variants[0].price) : null }}
              className="w-10 h-10 border border-gray-200 flex-shrink-0 mt-1"
            />
          </div>

          {/* Variant selector + price + add to cart */}
          <ProductVariantSelector
            tenantId={shop.tenant.id}
            shopSlug={slug}
            productId={product.id}
            productTitle={product.title}
            primaryImage={primaryImage}
            variants={product.variants.map((v) => ({
              id: v.id,
              title: v.title,
              price: v.price,
              comparePrice: v.comparePrice,
              inventory: v.inventory,
            }))}
          />

          {/* Description */}
          {product.description && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>
            </div>
          )}

          {/* Meta */}
          <div className="mt-6 pt-4 border-t border-gray-100 space-y-1.5 text-xs text-gray-400">
            <p>Handle: <span className="font-mono">{product.handle}</span></p>
            {product.variants.length > 0 && product.variants[0]?.sku && (
              <p>SKU: <span className="font-mono">{product.variants[0]?.sku}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ProductReviews
        tenantId={shop.tenant.id}
        productId={product.id}
        shopSlug={slug}
        initialReviews={reviewsData.reviews as unknown as Review[]}
        initialAvg={reviewsData.avgRating}
        initialTotal={reviewsData.total}
      />

      {/* AI Recommendations */}
      <AIRecommendations
        tenantId={shop.tenant.id}
        shopSlug={slug}
        productId={product.id}
      />
    </div>
  );
}
