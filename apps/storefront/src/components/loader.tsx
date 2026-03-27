// Module: KStack_Loader

export function Spinner({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

/** Grid of product card skeletons */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-square bg-gray-200 rounded-lg" />
          <SkeletonBar className="h-4 w-3/4" />
          <SkeletonBar className="h-4 w-1/3" />
          <SkeletonBar className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Product detail page skeleton */
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="aspect-square bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
        {/* Info */}
        <div className="space-y-5 pt-2">
          <SkeletonBar className="h-8 w-3/4" />
          <SkeletonBar className="h-6 w-1/4" />
          <div className="space-y-2">
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-2/3" />
          </div>
          <div className="space-y-2">
            <SkeletonBar className="h-4 w-24" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 w-16 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
          <SkeletonBar className="h-12 w-full rounded-lg" />
          <SkeletonBar className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Checkout page skeleton */
export function CheckoutSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <SkeletonBar className="h-8 w-32 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <SkeletonBar className="h-5 w-40 mb-1" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonBar className="h-11 rounded-lg" />
            <SkeletonBar className="h-11 rounded-lg" />
          </div>
          <SkeletonBar className="h-11 rounded-lg" />
          <SkeletonBar className="h-11 rounded-lg" />
          <SkeletonBar className="h-5 w-40 mt-4 mb-1" />
          <SkeletonBar className="h-11 rounded-lg" />
          <SkeletonBar className="h-11 rounded-lg" />
          <SkeletonBar className="h-11 rounded-lg" />
          <SkeletonBar className="h-12 w-full rounded-lg mt-2" />
        </div>
        <div className="space-y-4">
          <SkeletonBar className="h-5 w-32 mb-1" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBar className="h-4 w-3/4" />
                <SkeletonBar className="h-4 w-1/4" />
              </div>
              <SkeletonBar className="h-4 w-16" />
            </div>
          ))}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between">
              <SkeletonBar className="h-4 w-20" />
              <SkeletonBar className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <SkeletonBar className="h-5 w-16" />
              <SkeletonBar className="h-5 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Generic page content skeleton (homepage, account, orders) */
export function PageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <SkeletonBar className="h-8 w-48" />
      <SkeletonBar className="h-5 w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-video bg-gray-200 rounded-xl" />
            <SkeletonBar className="h-5 w-2/3" />
            <SkeletonBar className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
