"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ProductCard } from "@/components/product-card";

// ─── Block types (must mirror dashboard definition) ───────────────────────────

type CarouselSlide = { imageUrl: string; title: string; subtitle: string; ctaText: string; ctaUrl: string };

type PageBlock =
  | { id: string; type: "hero"; title: string; subtitle: string; ctaText: string; ctaUrl: string; bgColor: string; textColor: string; height: "small" | "medium" | "large" }
  | { id: string; type: "hero_carousel"; slides: CarouselSlide[]; height: "small" | "medium" | "large"; overlayOpacity: number }
  | { id: string; type: "hero_split"; imageUrl: string; imagePosition: "left" | "right"; title: string; subtitle: string; ctaText: string; ctaUrl: string; bgColor: string; textColor: string; height: "small" | "medium" | "large" }
  | { id: string; type: "featured_products"; title: string; limit: number }
  | { id: string; type: "collection_grid"; title: string }
  | { id: string; type: "text_block"; heading: string; body: string; align: "left" | "center" | "right" }
  | { id: string; type: "image_banner"; imageUrl: string; heading: string; subtext: string; ctaText: string; ctaUrl: string }
  | { id: string; type: "cta_banner"; heading: string; subtext: string; ctaText: string; ctaUrl: string; bgColor: string }
  | { id: string; type: "spacer"; height: number };

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  minPrice?: number | null;
  primaryImage?: string | null;
}

interface Collection {
  id: string;
  title: string;
  handle: string;
  imageUrl?: string | null;
}

interface BlockRendererProps {
  blocks: PageBlock[];
  slug: string;
  products: Product[];
  collections: Collection[];
  accentColor?: string;
}

const heightClass: Record<"small" | "medium" | "large", string> = {
  small: "py-16",
  medium: "py-28",
  large: "py-40",
};

const fixedHeightClass: Record<"small" | "medium" | "large", string> = {
  small: "h-[360px]",
  medium: "h-[520px]",
  large: "h-[680px]",
};

function HeroBlock({ block, slug }: { block: Extract<PageBlock, { type: "hero" }>; slug: string }) {
  const ctaHref = block.ctaUrl.startsWith("/")
    ? `/${slug}${block.ctaUrl}`
    : block.ctaUrl;

  return (
    <section
      className={`relative px-6 text-center ${heightClass[block.height]}`}
      style={{ backgroundColor: block.bgColor, color: block.textColor }}
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{block.title}</h1>
        {block.subtitle && (
          <p className="mt-4 text-lg opacity-80">{block.subtitle}</p>
        )}
        {block.ctaText && (
          <Link
            href={ctaHref}
            className="mt-8 inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            {block.ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}

function HeroCarouselBlock({ block, slug }: { block: Extract<PageBlock, { type: "hero_carousel" }>; slug: string }) {
  const [current, setCurrent] = useState(0);
  const slides = block.slides.length > 0 ? block.slides : [{ imageUrl: "", title: "", subtitle: "", ctaText: "", ctaUrl: "" }];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current]!;
  const ctaHref = slide.ctaUrl.startsWith("/") ? `/${slug}${slide.ctaUrl}` : slide.ctaUrl;

  return (
    <section className={`relative overflow-hidden ${fixedHeightClass[block.height]}`}>
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
        >
          {s.imageUrl && (
            <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
          )}
        </div>
      ))}

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${(block.overlayOpacity ?? 45) / 100})` }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight drop-shadow">{slide.title}</h1>
        {slide.subtitle && <p className="mt-4 text-lg text-white/80 drop-shadow">{slide.subtitle}</p>}
        {slide.ctaText && (
          <Link
            href={ctaHref}
            className="mt-8 inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            {slide.ctaText}
          </Link>
        )}
      </div>

      {/* Arrow buttons */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white text-xl flex items-center justify-center transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white text-xl flex items-center justify-center transition-colors"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${i === current ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HeroSplitBlock({ block, slug }: { block: Extract<PageBlock, { type: "hero_split" }>; slug: string }) {
  const ctaHref = block.ctaUrl.startsWith("/") ? `/${slug}${block.ctaUrl}` : block.ctaUrl;
  const isLeft = block.imagePosition === "left";

  return (
    <section
      className={`flex flex-col sm:flex-row overflow-hidden ${fixedHeightClass[block.height]}`}
      style={{ backgroundColor: block.bgColor, color: block.textColor }}
    >
      {/* Image side */}
      <div className={`relative w-full sm:w-1/2 h-48 sm:h-full overflow-hidden flex-shrink-0 ${isLeft ? "sm:order-1" : "sm:order-2"}`}>
        {block.imageUrl && (
          <img src={block.imageUrl} alt={block.title} className="w-full h-full object-cover" />
        )}
        {/* Fade toward text area */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isLeft
              ? `linear-gradient(to right, transparent 55%, ${block.bgColor} 100%)`
              : `linear-gradient(to left, transparent 55%, ${block.bgColor} 100%)`,
          }}
        />
        {/* Mobile bottom fade */}
        <div
          className="absolute inset-0 pointer-events-none sm:hidden"
          style={{ background: `linear-gradient(to bottom, transparent 50%, ${block.bgColor} 100%)` }}
        />
      </div>

      {/* Text side */}
      <div
        className={`w-full sm:w-1/2 flex items-center justify-center px-8 py-10 sm:py-0 ${isLeft ? "sm:order-2" : "sm:order-1"}`}
      >
        <div className="max-w-md">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">{block.title}</h1>
          {block.subtitle && <p className="mt-4 text-lg opacity-80 leading-relaxed">{block.subtitle}</p>}
          {block.ctaText && (
            <Link
              href={ctaHref}
              className="mt-8 inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              {block.ctaText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturedProductsBlock({
  block,
  products,
  slug,
}: {
  block: Extract<PageBlock, { type: "featured_products" }>;
  products: Product[];
  slug: string;
}) {
  const displayed = products.slice(0, block.limit);
  if (displayed.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{block.title}</h2>
        <Link
          href={`/${slug}/products`}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {displayed.map((product) => (
          <ProductCard key={product.id} product={product} slug={slug} />
        ))}
      </div>
    </section>
  );
}

function CollectionGridBlock({
  block,
  collections,
  slug,
}: {
  block: Extract<PageBlock, { type: "collection_grid" }>;
  collections: Collection[];
  slug: string;
}) {
  if (collections.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{block.title}</h2>
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
  );
}

function TextBlock({ block }: { block: Extract<PageBlock, { type: "text_block" }> }) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[block.align];

  return (
    <section className={`max-w-3xl mx-auto px-4 sm:px-6 py-16 ${alignClass}`}>
      {block.heading && (
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{block.heading}</h2>
      )}
      {block.body && (
        <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-wrap">{block.body}</p>
      )}
    </section>
  );
}

function ImageBannerBlock({
  block,
  slug,
}: {
  block: Extract<PageBlock, { type: "image_banner" }>;
  slug: string;
}) {
  const ctaHref = block.ctaUrl.startsWith("/") ? `/${slug}${block.ctaUrl}` : block.ctaUrl;

  return (
    <section className="relative overflow-hidden min-h-[320px] flex items-center justify-center bg-gray-800 my-8">
      {block.imageUrl && (
        <img
          src={block.imageUrl}
          alt={block.heading}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative z-10 text-center px-6 py-20">
        {block.heading && (
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">{block.heading}</h2>
        )}
        {block.subtext && (
          <p className="text-white/80 text-lg mb-6">{block.subtext}</p>
        )}
        {block.ctaText && (
          <Link
            href={ctaHref}
            className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            {block.ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}

function CtaBannerBlock({
  block,
  slug,
}: {
  block: Extract<PageBlock, { type: "cta_banner" }>;
  slug: string;
}) {
  const ctaHref = block.ctaUrl.startsWith("/") ? `/${slug}${block.ctaUrl}` : block.ctaUrl;

  return (
    <section
      className="py-16 px-6 text-center my-8"
      style={{ backgroundColor: block.bgColor }}
    >
      <div className="max-w-2xl mx-auto">
        {block.heading && (
          <h2 className="text-3xl font-bold text-white mb-3">{block.heading}</h2>
        )}
        {block.subtext && (
          <p className="text-white/80 text-lg mb-6">{block.subtext}</p>
        )}
        {block.ctaText && (
          <Link
            href={ctaHref}
            className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            {block.ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}

function SpacerBlock({ block }: { block: Extract<PageBlock, { type: "spacer" }> }) {
  return <div style={{ height: `${block.height}px` }} aria-hidden="true" />;
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export function BlockRenderer({ blocks, slug, products, collections }: BlockRendererProps) {
  return (
    <div>
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return <HeroBlock key={block.id} block={block} slug={slug} />;
          case "hero_carousel":
            return <HeroCarouselBlock key={block.id} block={block} slug={slug} />;
          case "hero_split":
            return <HeroSplitBlock key={block.id} block={block} slug={slug} />;
          case "featured_products":
            return (
              <FeaturedProductsBlock
                key={block.id}
                block={block}
                products={products}
                slug={slug}
              />
            );
          case "collection_grid":
            return (
              <CollectionGridBlock
                key={block.id}
                block={block}
                collections={collections}
                slug={slug}
              />
            );
          case "text_block":
            return <TextBlock key={block.id} block={block} />;
          case "image_banner":
            return <ImageBannerBlock key={block.id} block={block} slug={slug} />;
          case "cta_banner":
            return <CtaBannerBlock key={block.id} block={block} slug={slug} />;
          case "spacer":
            return <SpacerBlock key={block.id} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
