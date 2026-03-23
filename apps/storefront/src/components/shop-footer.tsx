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
        <p>
          Powered by{" "}
          <a href="/" className="font-medium text-gray-700 hover:text-gray-900">
            Kasify
          </a>
        </p>
      </div>
    </footer>
  );
}
