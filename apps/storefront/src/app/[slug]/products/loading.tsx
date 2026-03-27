// Module: KStack_Loader
import { ProductGridSkeleton } from "@/components/loader";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
