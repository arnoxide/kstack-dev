"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGrid, List, SlidersHorizontal, X, ChevronDown, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { WishlistButton } from "@/components/wishlist-button";

type SortOption = "featured" | "price-asc" | "price-desc" | "title-asc" | "title-desc";

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  tags: string[] | null;
  minPrice?: number | null;
  primaryImage?: string | null;
}

interface Collection {
  id: string;
  title: string;
  handle: string;
  description: string | null;
}

interface CatalogProps {
  products: Product[];
  collections: Collection[];
  slug: string;
  tenantId: string;
  activeCollectionHandle?: string;
}

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "title-asc": "Name: A–Z",
  "title-desc": "Name: Z–A",
};

// ─── Product card (grid) ──────────────────────────────────────────────────────
function GridCard({ product, slug, tenantId }: { product: Product; slug: string; tenantId: string }) {
  return (
    <Link href={`/${slug}/products/${product.handle}`} className="group block">
      <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Wishlist button */}
        <WishlistButton
          tenantId={tenantId}
          item={{ productId: product.id, handle: product.handle, title: product.title, primaryImage: product.primaryImage ?? null, minPrice: product.minPrice ?? null }}
          className="absolute top-2 right-2 w-8 h-8 shadow-sm"
        />
        {/* Quick view overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-shop-primary/80 text-white text-xs font-medium py-2 text-center translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          View product
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-600 leading-tight line-clamp-2 transition-colors">
        {product.title}
      </h3>
      {product.minPrice != null && (
        <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(product.minPrice)}</p>
      )}
    </Link>
  );
}

// ─── Product card (list) ──────────────────────────────────────────────────────
function ListCard({ product, slug }: { product: Product; slug: string }) {
  return (
    <Link
      href={`/${slug}/products/${product.handle}`}
      className="group flex gap-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
    >
      <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.title}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 group-hover:underline line-clamp-1">{product.title}</h3>
        {product.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
        )}
        {product.tags && product.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {product.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        {product.minPrice != null && (
          <p className="text-sm font-bold text-gray-900">{formatCurrency(product.minPrice)}</p>
        )}
      </div>
    </Link>
  );
}

// ─── Main catalog ─────────────────────────────────────────────────────────────
export function Catalog({ products, collections, slug, tenantId, activeCollectionHandle }: CatalogProps) {
  const [sort, setSort] = useState<SortOption>("featured");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = [...products];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Sort
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
        break;
      case "price-desc":
        list.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
        break;
      case "title-asc":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return list;
  }, [products, search, sort]);

  const activeCollection = collections.find((c) => c.handle === activeCollectionHandle);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex gap-8">
        {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
        {collections.length > 0 && (
          <aside className="hidden sm:block w-52 flex-shrink-0 space-y-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Categories
              </p>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={`/${slug}/products`}
                    className={`block text-sm py-2 px-3 rounded-lg transition-colors ${
                      !activeCollectionHandle
                        ? "bg-shop-accent text-shop-accent-fg font-medium"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    All Products
                    <span className="float-right text-xs opacity-60">{products.length}</span>
                  </Link>
                </li>
                {collections.map((col) => {
                  const count = products.length; // placeholder — full count not available per collection here
                  return (
                    <li key={col.id}>
                      <Link
                        href={`/${slug}/products?collection=${col.handle}`}
                        className={`block text-sm py-2 px-3 rounded-lg transition-colors ${
                          activeCollectionHandle === col.handle
                            ? "bg-shop-accent text-shop-accent-fg font-medium"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        {col.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {activeCollection ? activeCollection.title : "All Products"}
            </h1>
            {activeCollection?.description && (
              <p className="text-gray-500 mt-1 text-sm max-w-xl">{activeCollection.description}</p>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 hover:border-gray-500 bg-white transition-colors"
                >
                  <span>{SORT_LABELS[sort]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1">
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => { setSort(key); setSortOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          sort === key ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => setView("grid")}
                  className={`p-2 transition-colors ${view === "grid" ? "bg-shop-accent text-shop-accent-fg" : "text-gray-500 hover:text-gray-700"}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-2 transition-colors ${view === "list" ? "bg-shop-accent text-shop-accent-fg" : "text-gray-500 hover:text-gray-700"}`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile filter button */}
              {collections.length > 0 && (
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="sm:hidden flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 bg-white"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filter
                </button>
              )}
            </div>
          </div>

          {/* Mobile collection pills */}
          {collections.length > 0 && (
            <div className="sm:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
              <Link
                href={`/${slug}/products`}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  !activeCollectionHandle
                    ? "bg-shop-accent text-shop-accent-fg border-shop-accent"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                All
              </Link>
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/${slug}/products?collection=${col.handle}`}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    activeCollectionHandle === col.handle
                      ? "bg-shop-accent text-shop-accent-fg border-shop-accent"
                      : "bg-white text-gray-600 border-gray-300"
                  }`}
                >
                  {col.title}
                </Link>
              ))}
            </div>
          )}

          {/* Count */}
          <p className="text-sm text-gray-400 mb-4">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            {search && ` for "${search}"`}
          </p>

          {/* Products */}
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-gray-400 text-lg">No products found{search ? ` for "${search}"` : ""}.</p>
              {search && (
                <button onClick={() => setSearch("")} className="mt-3 text-sm text-blue-600 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filtered.map((product) => (
                <GridCard key={product.id} product={product} slug={slug} tenantId={tenantId} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 px-4 divide-y divide-gray-100">
              {filtered.map((product) => (
                <ListCard key={product.id} product={product} slug={slug} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile filter drawer ───────────────────────────────────────── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filter by Category</h3>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-1">
              <li>
                <Link
                  href={`/${slug}/products`}
                  onClick={() => setMobileFiltersOpen(false)}
                  className={`block text-sm py-2.5 px-3 rounded-lg ${
                    !activeCollectionHandle ? "bg-shop-accent text-shop-accent-fg font-medium" : "text-gray-700"
                  }`}
                >
                  All Products
                </Link>
              </li>
              {collections.map((col) => (
                <li key={col.id}>
                  <Link
                    href={`/${slug}/products?collection=${col.handle}`}
                    onClick={() => setMobileFiltersOpen(false)}
                    className={`block text-sm py-2.5 px-3 rounded-lg ${
                      activeCollectionHandle === col.handle ? "bg-shop-accent text-shop-accent-fg font-medium" : "text-gray-700"
                    }`}
                  >
                    {col.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
