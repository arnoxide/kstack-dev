"use client";

import Link from "next/link";
import { ShoppingBag, Menu, X, Heart, User } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { getWishlistIds } from "@/lib/wishlist";
import { useState, useEffect } from "react";

interface ShopNavbarProps {
  shop: {
    tenant: { name: string; slug: string; logoUrl: string | null };
    theme: unknown;
  };
}

export function ShopNavbar({ shop }: ShopNavbarProps) {
  const { count, cart } = useCart();
  const { customer } = useCustomerAuth();
  const slug = shop.tenant.slug;
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    setWishlistCount(getWishlistIds(cart.tenantId).length);
    // Re-read on storage changes (other tabs / wishlist button updates)
    const onStorage = () => setWishlistCount(getWishlistIds(cart.tenantId).length);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cart.tenantId]);

  const links = [
    { href: `/${slug}`, label: "Home" },
    { href: `/${slug}/products`, label: "Products" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-shop-primary border-b border-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={`/${slug}`} className="font-bold text-xl text-shop-primary-fg tracking-tight flex items-center gap-2">
          {shop.tenant.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.tenant.logoUrl} alt={shop.tenant.name} className="w-7 h-7 object-contain rounded" />
          )}
          {shop.tenant.name}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-shop-primary-fg/80 hover:text-shop-primary-fg font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-1">
          {/* Wishlist */}
          <Link
            href={`/${slug}/wishlist`}
            className="relative p-2 text-shop-primary-fg/80 hover:text-shop-primary-fg transition-colors"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {wishlistCount > 9 ? "9+" : wishlistCount}
              </span>
            )}
          </Link>

          {/* Account */}
          <Link
            href={`/${slug}/account`}
            className="relative p-2 text-shop-primary-fg/80 hover:text-shop-primary-fg transition-colors"
            aria-label="Account"
          >
            {customer ? (
              <div className="w-7 h-7 rounded-full bg-shop-accent text-shop-accent-fg flex items-center justify-center text-xs font-bold">
                {customer.firstName?.[0]?.toUpperCase() ?? customer.email[0]?.toUpperCase()}
              </div>
            ) : (
              <User className="w-5 h-5" />
            )}
          </Link>

          {/* Cart */}
          <Link
            href={`/${slug}/cart`}
            className="relative p-2 text-shop-primary-fg/80 hover:text-shop-primary-fg transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-shop-accent text-shop-accent-fg text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="sm:hidden p-2 text-shop-primary-fg/80 hover:text-shop-primary-fg"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="sm:hidden border-t border-black/10 bg-shop-primary px-4 py-3 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium text-shop-primary-fg/80 hover:text-shop-primary-fg"
            >
              {link.label}
            </Link>
          ))}
          <Link href={`/${slug}/wishlist`} onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-shop-primary-fg/80 hover:text-shop-primary-fg">
            Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
          </Link>
          <Link href={`/${slug}/account`} onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-shop-primary-fg/80 hover:text-shop-primary-fg">
            My Account
          </Link>
        </div>
      )}
    </header>
  );
}
