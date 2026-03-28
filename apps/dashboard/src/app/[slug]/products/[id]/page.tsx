"use client";

import { useState, useEffect } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ExternalLink,
  ImageIcon,
  Star,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Image gallery manager ────────────────────────────────────────────────────
function ImageManager({
  productId,
  images,
  onChanged,
}: {
  productId: string;
  images: { id: string; url: string; altText: string | null; sortOrder: number }[];
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [urlInput, setUrlInput] = useState("");
  const [altInput, setAltInput] = useState("");
  const [urlError, setUrlError] = useState("");

  const addMutation = trpc.products.addImage.useMutation({
    onSuccess: () => { setUrlInput(""); setAltInput(""); setUrlError(""); onChanged(); },
    onError: (err) => setUrlError(err.message),
  });

  const deleteMutation = trpc.products.deleteImage.useMutation({
    onSuccess: () => onChanged(),
  });

  const handleAdd = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch { setUrlError("Enter a valid URL"); return; }
    setUrlError("");
    addMutation.mutate({ productId, url: trimmed, altText: altInput.trim() || undefined });
  };

  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">
        Images <span className="text-sm text-gray-400 font-normal">({images.length})</span>
      </h2>

      {/* Grid of existing images */}
      {sorted.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
          {sorted.map((img, i) => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              {/* Plain img — user-supplied URLs can be any host */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText ?? "Product image"}
                className="w-full h-full object-cover"
              />
              {/* Primary badge */}
              {i === 0 && (
                <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />
                  Main
                </div>
              )}
              {/* Delete overlay */}
              <button
                onClick={async () => {
                  const ok = await confirm({ title: "Remove image", danger: true });
                  if (!ok) return;
                  deleteMutation.mutate({ id: img.id });
                }}
                disabled={deleteMutation.isPending}
                className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-red-50 hover:text-red-600 rounded text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {/* Alt text tooltip */}
              {img.altText && (
                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.altText}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-10 mb-4 text-gray-400">
          <ImageIcon className="w-8 h-8 mb-2" />
          <p className="text-sm">No images yet</p>
          <p className="text-xs mt-0.5">Add an image URL below</p>
        </div>
      )}

      {/* Add by URL */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Add image by URL</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            onClick={handleAdd}
            disabled={addMutation.isPending || !urlInput.trim()}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
        <input
          type="text"
          value={altInput}
          onChange={(e) => setAltInput(e.target.value)}
          placeholder="Alt text (optional, good for SEO)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {urlError && <p className="text-xs text-red-600">{urlError}</p>}
        <p className="text-xs text-gray-400">
          Tip: use Unsplash URLs like{" "}
          <code className="bg-gray-100 px-1 rounded">https://images.unsplash.com/photo-...?w=600&q=80</code>
        </p>
      </div>
    </div>
  );
}

// ─── Options editor (shared by VariantRow + AddVariantForm) ──────────────────
function OptionsEditor({
  options,
  onChange,
}: {
  options: Record<string, string>;
  onChange: (opts: Record<string, string>) => void;
}) {
  const entries = Object.entries(options);

  const updateKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(options)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...options, [key]: value });
  };

  const remove = (key: string) => {
    const next = { ...options };
    delete next[key];
    onChange(next);
  };

  const add = () => {
    // Find a name not yet used
    const used = new Set(Object.keys(options));
    const suggestions = ["Size", "Color", "Material", "Style", "Fit", "Length", "Weight", "Option"];
    const name = suggestions.find((s) => !used.has(s)) ?? `Option ${entries.length + 1}`;
    onChange({ ...options, [name]: "" });
  };

  return (
    <div className="col-span-2 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">Options <span className="text-gray-400">(Size, Color, etc.)</span></label>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <Plus className="w-3 h-3" />
          Add option
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No options yet — click "Add option" to add Size, Color, etc.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                value={key}
                onChange={(e) => updateKey(key, e.target.value)}
                placeholder="Option name"
                className="w-28 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 font-medium"
              />
              <span className="text-gray-400 text-xs">:</span>
              <input
                value={value}
                onChange={(e) => updateValue(key, e.target.value)}
                placeholder="Value"
                className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                type="button"
                onClick={() => remove(key)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inline variant row ───────────────────────────────────────────────────────
function VariantRow({
  variant,
  onDelete,
  onSaved,
}: {
  variant: {
    id: string;
    title: string;
    sku: string | null;
    price: string | number;
    comparePrice: string | number | null;
    inventory: number;
    isOnSale: boolean;
    options: Record<string, string> | null;
  };
  onDelete: (id: string) => void;
  onSaved: () => void;
}) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(variant.title);
  const [sku, setSku] = useState(variant.sku ?? "");
  const [price, setPrice] = useState(String(variant.price));
  const [comparePrice, setComparePrice] = useState(
    variant.comparePrice != null ? String(variant.comparePrice) : "",
  );
  const [inventory, setInventory] = useState(String(variant.inventory));
  const [isOnSale, setIsOnSale] = useState(variant.isOnSale);
  const [options, setOptions] = useState<Record<string, string>>(variant.options ?? {});

  const updateMutation = trpc.products.updateVariant.useMutation({
    onSuccess: () => { setEditing(false); onSaved(); },
  });
  const deleteMutation = trpc.products.deleteVariant.useMutation({
    onSuccess: () => onDelete(variant.id),
  });

  const optionEntries = Object.entries(variant.options ?? {});

  if (!editing) {
    return (
      <div className="py-3 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{variant.title}</p>
            {optionEntries.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {optionEntries.map(([k, v]) => (
                  <span key={k} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-md">
                    {k}: {v}
                  </span>
                ))}
              </div>
            )}
            {variant.sku && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {variant.sku}</p>
            )}
          </div>
          <div className="text-sm text-gray-900 font-medium w-24 text-right">
            {formatCurrency(Number(variant.price))}
          </div>
          {variant.comparePrice ? (
            <div className="text-sm text-gray-400 line-through w-24 text-right hidden sm:block">
              {formatCurrency(Number(variant.comparePrice))}
            </div>
          ) : (
            <div className="w-24 hidden sm:block" />
          )}
          <div className="text-sm text-gray-600 w-20 text-right">
            {variant.inventory} in stock
          </div>
          <div className="w-16 flex justify-center">
            {variant.isOnSale && (
              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Sale</span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={async () => {
                const ok = await confirm({ title: "Delete variant", danger: true });
                if (!ok) return;
                deleteMutation.mutate({ id: variant.id });
              }}
              disabled={deleteMutation.isPending}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">SKU <span className="text-gray-400">(optional)</span></label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. WHT-TEE-M"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Price *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Compare-at price <span className="text-gray-400">(optional)</span></label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={comparePrice}
            onChange={(e) => setComparePrice(e.target.value)}
            placeholder="—"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Inventory</label>
          <input
            type="number"
            min="0"
            step="1"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id={`sale-${variant.id}`}
            checked={isOnSale}
            onChange={(e) => setIsOnSale(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <label htmlFor={`sale-${variant.id}`} className="text-xs font-medium text-gray-700">On Sale</label>
        </div>
        <OptionsEditor options={options} onChange={setOptions} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            updateMutation.mutate({
              id: variant.id,
              data: {
                title,
                sku: sku.trim() || null,
                price: Number(price),
                comparePrice: comparePrice ? Number(comparePrice) : null,
                inventory: parseInt(inventory, 10),
                isOnSale,
                options,
              },
            })
          }
          disabled={updateMutation.isPending}
          className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save variant
        </button>
        <button
          onClick={() => { setEditing(false); setTitle(variant.title); setSku(variant.sku ?? ""); setPrice(String(variant.price)); setIsOnSale(variant.isOnSale); setOptions(variant.options ?? {}); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Add variant form ─────────────────────────────────────────────────────────
function AddVariantForm({
  productId,
  onAdded,
  onCancel,
}: {
  productId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [inventory, setInventory] = useState("0");
  const [isOnSale, setIsOnSale] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>({});

  const createMutation = trpc.products.createVariant.useMutation({
    onSuccess: () => { onAdded(); setTitle(""); setSku(""); setPrice(""); setComparePrice(""); setInventory("0"); setOptions({}); },
  });

  return (
    <div className="pt-4 border-t border-gray-200 space-y-3">
      <p className="text-sm font-medium text-gray-700">New variant</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Large / Blue"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">SKU <span className="text-gray-400">(optional)</span></label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. WHT-TEE-L"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Price *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Compare-at price <span className="text-gray-400">(optional)</span></label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={comparePrice}
            onChange={(e) => setComparePrice(e.target.value)}
            placeholder="—"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Inventory</label>
          <input
            type="number"
            min="0"
            step="1"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="new-sale"
            checked={isOnSale}
            onChange={(e) => setIsOnSale(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <label htmlFor="new-sale" className="text-xs font-medium text-gray-700">On Sale</label>
        </div>
        <OptionsEditor options={options} onChange={setOptions} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (!title.trim() || !price) return;
            createMutation.mutate({
              productId,
              data: {
                title: title.trim(),
                sku: sku.trim() || null,
                price: Number(price),
                comparePrice: comparePrice ? Number(comparePrice) : null,
                inventory: parseInt(inventory, 10),
                isOnSale,
                options,
              },
            });
          }}
          disabled={createMutation.isPending || !title || !price}
          className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add variant
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main edit page ───────────────────────────────────────────────────────────
export default function EditProductPage() {
  const confirm = useConfirm();
  const params = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const storefrontBase = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3003";

  const { data: product, isLoading, refetch } = trpc.products.get.useQuery({ id: params.id });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [tagsInput, setTagsInput] = useState("");
  const [isRecommended, setIsRecommended] = useState(false);
  const [goesWithInput, setGoesWithInput] = useState("");
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setDescription(product.description ?? "");
      setStatus(product.status);
      setTagsInput((product.tags ?? []).join(", "));
      setIsRecommended(product.isRecommended);
      setGoesWithInput((product.goesWithIds ?? []).join(", "));
    }
  }, [product]);

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      refetch();
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => router.push(`/${params.slug}/products`),
  });

  const handleSave = () => {
    setError("");
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const goesWithIds = goesWithInput.split(",").map((t) => t.trim()).filter(Boolean);
    updateMutation.mutate({
      id: params.id,
      data: {
        title: title.trim(),
        description: description || null,
        status,
        tags,
        isRecommended,
        goesWithIds,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Product not found.</p>
        <Link href={`/${params.slug}/products`} className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/${params.slug}/products`}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 truncate max-w-sm">{product.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">/{product.handle}</p>
          </div>
        </div>
        <a
          href={`${storefrontBase}/${params.slug}/products/${product.handle}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview
        </a>
      </div>

      <div className="space-y-5">
        {/* Images */}
        <ImageManager
          productId={product.id}
          images={product.images}
          onChanged={refetch}
        />

        {/* Product details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Product details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isRecommended"
              checked={isRecommended}
              onChange={(e) => setIsRecommended(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <label htmlFor="isRecommended" className="text-sm font-medium text-gray-700">
              Show as recommended product
            </label>
          </div>
        </div>

        {/* Merchandising */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Merchandising</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goes with products <span className="text-gray-400 font-normal">(comma separated IDs)</span>
            </label>
            <input
              type="text"
              value={goesWithInput}
              onChange={(e) => setGoesWithInput(e.target.value)}
              placeholder="e.g. prod_uuid_1, prod_uuid_2"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-gray-400 font-normal">(comma separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. clothing, sale"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Status</h2>
          <div className="flex gap-3">
            {(["draft", "active", "archived"] as const).map((s) => (
              <label
                key={s}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${status === s
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
              >
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
                <span className="capitalize">{s}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {status === "draft" && "Saved but not visible in the storefront."}
            {status === "active" && "Live and visible to customers."}
            {status === "archived" && "Hidden and no longer for sale."}
          </p>
        </div>

        {/* Variants */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Variants</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}
              </p>
            </div>
            {!showAddVariant && (
              <button
                onClick={() => setShowAddVariant(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add variant
              </button>
            )}
          </div>

          {product.variants.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No variants yet. Add one below.</p>
          ) : (
            <div>
              {/* Column headers */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="flex-1">Title / SKU</div>
                <div className="w-24 text-right">Price</div>
                <div className="w-24 text-right hidden sm:block">Compare</div>
                <div className="w-20 text-right">Stock</div>
                <div className="w-16 text-center">Sale</div>
                <div className="w-16" />
              </div>
              {product.variants.map((v) => (
                <VariantRow
                  key={v.id}
                  variant={v}
                  onDelete={() => refetch()}
                  onSaved={() => refetch()}
                />
              ))}
            </div>
          )}

          {showAddVariant && (
            <AddVariantForm
              productId={product.id}
              onAdded={() => { refetch(); setShowAddVariant(false); }}
              onCancel={() => setShowAddVariant(false)}
            />
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            Product saved successfully
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pb-8">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </button>

          <button
            onClick={async () => {
              const ok = await confirm({ title: "Delete product", message: "This cannot be undone.", danger: true });
              if (!ok) return;
              deleteMutation.mutate({ id: params.id });
            }}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete product
          </button>
        </div>
      </div>
    </div>
  );
}
