import Image from "next/image";

interface ShopFooterProps {
  shop: { tenant: { name: string; slug: string } };
}

export function ShopFooter({ shop }: ShopFooterProps) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} {shop.tenant.name}. All rights reserved.
        </p>
        <a href="https://zansify.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
          <span className="text-xs text-gray-400">Powered by</span>
          <Image src="/zansify-logo.png" alt="Zansify" width={72} height={24} />
        </a>
      </div>
    </footer>
  );
}
