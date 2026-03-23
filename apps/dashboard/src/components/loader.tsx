// Module: Kasify_Loader

export function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-gray-400 ${className}`}
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

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

/** Full-page skeleton for dashboard route transitions */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <SkeletonBar className="h-7 w-48" />
        <SkeletonBar className="h-4 w-72" />
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center">
        <SkeletonBar className="h-9 w-40" />
        <SkeletonBar className="h-9 w-28" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <SkeletonBar className="h-3 w-32" />
          <SkeletonBar className="h-3 w-24 ml-auto" />
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="h-3 w-16" />
        </div>
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-gray-200" />
            <SkeletonBar className="h-4 flex-1 max-w-[200px]" />
            <SkeletonBar className="h-4 w-20 ml-auto" />
            <SkeletonBar className="h-4 w-16" />
            <SkeletonBar className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
