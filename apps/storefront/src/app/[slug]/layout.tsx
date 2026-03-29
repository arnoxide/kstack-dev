import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { CartProvider } from "@/context/cart-context";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { ShopNavbar } from "@/components/shop-navbar";
import { ShopFooter } from "@/components/shop-footer";
import { AIChatWidget } from "@/components/ai-chat-widget";
import { PageTracker } from "@/components/page-tracker";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let shop: Awaited<ReturnType<typeof api.public.resolveShop.query>> | null = null;

  try {
    shop = await api.public.resolveShop.query({ slug });
  } catch {
    notFound();
  }

  const themeStyle = shop.theme
    ? ({
        "--shop-primary": shop.theme.settings.primaryColor,
        "--shop-secondary": shop.theme.settings.secondaryColor,
        "--shop-accent": shop.theme.settings.accentColor,
        "--shop-radius": shop.theme.settings.borderRadius,
        // Auto foreground: use dark text on light accent, white on dark primary
        "--shop-primary-fg": "#ffffff",
        "--shop-accent-fg": "#111827",
      } as React.CSSProperties)
    : {};

  const gaId = shop.analytics?.googleMeasurementId;

  if (shop.tenant.maintenanceMode) {
    return (
      <div style={themeStyle} className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-6">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{shop.tenant.name} is under maintenance</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            We&apos;re making some improvements and will be back shortly. Thank you for your patience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={themeStyle}>
      {gaId && (
        <head>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
            }}
          />
        </head>
      )}
      <CartProvider tenantId={shop.tenant.id}>
        <CustomerAuthProvider tenantId={shop.tenant.id}>
          <ShopNavbar shop={shop} />
          <main className="min-h-screen">{children}</main>
          <ShopFooter shop={shop} />
          <AIChatWidget tenantId={shop.tenant.id} shopSlug={slug} />
          <PageTracker tenantId={shop.tenant.id} />
        </CustomerAuthProvider>
      </CartProvider>
    </div>
  );
}
