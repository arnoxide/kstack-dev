import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ collection?: string }>;
}) {
  const [{ slug }, resolvedSearch] = await Promise.all([params, searchParams]);

  let shop: Awaited<ReturnType<typeof api.public.resolveShop.query>>;
  try {
    shop = await api.public.resolveShop.query({ slug });
  } catch {
    notFound();
  }

  const [products, collections] = await Promise.all([
    api.public.products.query({
      tenantId: shop.tenant.id,
      limit: 96,
      collectionHandle: resolvedSearch.collection,
    }),
    api.public.collections.query({ tenantId: shop.tenant.id }),
  ]);

  return (
    <Catalog
      products={products}
      collections={collections}
      slug={slug}
      tenantId={shop.tenant.id}
      activeCollectionHandle={resolvedSearch.collection}
    />
  );
}
