import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  minPrice?: number | null;
  primaryImage?: string | null;
}

interface ProductCardProps {
  product: Product;
  slug: string;
}

export function ProductCard({ product, slug }: ProductCardProps) {
  return (
    <Link href={`/${slug}/products/${product.handle}`} className="group block">
      {/* Image */}
      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3 group-hover:opacity-90 transition-opacity">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.title}
            width={400}
            height={400}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 group-hover:underline leading-tight line-clamp-2">
          {product.title}
        </h3>
        {product.minPrice != null && (
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {formatCurrency(product.minPrice)}
          </p>
        )}
        {product.description && !product.minPrice && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
        )}
      </div>
    </Link>
  );
}
