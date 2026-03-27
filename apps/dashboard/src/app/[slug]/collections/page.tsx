"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
  Tag,
  Search,
  ChevronRight,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900";

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Collection list view ─────────────────────────────────────────────────────

function CollectionList({
  onSelect,
  onNew,
}: {
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const confirm = useConfirm();
  const { data: collections, isLoading, refetch } = trpc.collections.list.useQuery();
  const deleteMutation = trpc.collections.delete.useMutation({ onSuccess: () => refetch() });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-600 mt-1">Group products into categories for your storefront</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Collection
        </button>
      </div>

      {!collections || collections.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-1">No collections yet</h3>
          <p className="text-sm text-gray-500 mb-5">Create your first collection to group products by category.</p>
          <button onClick={onNew} className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
            <Plus className="w-4 h-4" /> Create collection
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Collection</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Handle</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Products</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {collections.map((col) => (
                <tr key={col.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {col.imageUrl ? (
                        <img src={col.imageUrl} alt={col.title} className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{col.title}</p>
                        {col.description && <p className="text-xs text-gray-500 truncate max-w-xs">{col.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">{col.handle}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-sm text-gray-700">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      {col.productCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => onSelect(col.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Manage
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({ title: "Delete collection", message: `Delete "${col.title}"?`, danger: true });
                          if (!ok) return;
                          deleteMutation.mutate({ id: col.id });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── New collection form ──────────────────────────────────────────────────────

function NewCollectionForm({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");

  const createMutation = trpc.collections.create.useMutation({
    onSuccess: (col) => { if (col) onDone(col.id); },
    onError: (e) => setError(e.message),
  });

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!handle || handle === slugify(title)) setHandle(slugify(v));
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Collection</h1>
          <p className="text-sm text-gray-500">Create a category to group your products</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Title <span className="text-red-500">*</span></label>
          <input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="e.g. Men's Shoes"
            className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Handle <span className="text-red-500">*</span></label>
          <div className="flex items-center">
            <span className="text-sm text-gray-400 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2.5 bg-gray-50">/products?collection=</span>
            <input value={handle} onChange={(e) => setHandle(slugify(e.target.value))} placeholder="mens-shoes"
              className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional description shown on storefront"
            className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Image URL</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inputCls} />
          {imageUrl && (
            <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => createMutation.mutate({ title, handle, description: description || undefined, imageUrl: imageUrl || undefined })}
            disabled={createMutation.isPending || !title || !handle}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create Collection
          </button>
          <button onClick={onCancel} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Collection detail / product manager ─────────────────────────────────────

function CollectionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: col, refetch: refetchCol } = trpc.collections.get.useQuery({ id });
  const { data: allProducts, refetch: refetchProducts } = trpc.collections.availableProducts.useQuery({ collectionId: id });

  const updateMutation = trpc.collections.update.useMutation({
    onSuccess: () => { refetchCol(); setSaved(true); setTimeout(() => setSaved(false), 2500); setEditingTitle(false); },
  });
  const addMutation = trpc.collections.addProduct.useMutation({ onSuccess: () => { refetchCol(); refetchProducts(); } });
  const removeMutation = trpc.collections.removeProduct.useMutation({ onSuccess: () => { refetchCol(); refetchProducts(); } });

  if (!col) return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  // Init local edit state from loaded data
  if (title === "" && col.title) { setTitle(col.title); setDescription(col.description ?? ""); setImageUrl(col.imageUrl ?? ""); }

  const filtered = (allProducts ?? []).filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{col.title}</h1>
          <p className="text-sm text-gray-500 font-mono">{col.handle}</p>
        </div>
        {saved && <span className="flex items-center gap-1 text-sm text-green-600 font-medium"><Check className="w-4 h-4" /> Saved</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Image URL</label>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                {imageUrl && (
                  <div className="mt-2 w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <button
                onClick={() => updateMutation.mutate({ id, title, description: description || undefined, imageUrl: imageUrl || undefined })}
                disabled={updateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900 flex-1">
                Products <span className="text-gray-400 font-normal ml-1">({col.products.length})</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 w-52"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                {search ? "No products match your search" : "No products available"}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
                {filtered.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        product.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {product.status}
                      </span>
                    </div>
                    {product.inCollection ? (
                      <button
                        onClick={() => removeMutation.mutate({ collectionId: id, productId: product.id })}
                        disabled={removeMutation.isPending}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 transition-colors font-medium"
                      >
                        <Check className="w-3.5 h-3.5" /> Added
                      </button>
                    ) : (
                      <button
                        onClick={() => addMutation.mutate({ collectionId: id, productId: product.id })}
                        disabled={addMutation.isPending}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = { type: "list" } | { type: "new" } | { type: "detail"; id: string };

export default function CollectionsPage() {
  const [view, setView] = useState<View>({ type: "list" });

  if (view.type === "new") {
    return (
      <NewCollectionForm
        onDone={(id) => setView({ type: "detail", id })}
        onCancel={() => setView({ type: "list" })}
      />
    );
  }

  if (view.type === "detail") {
    return <CollectionDetail id={view.id} onBack={() => setView({ type: "list" })} />;
  }

  return (
    <CollectionList
      onSelect={(id) => setView({ type: "detail", id })}
      onNew={() => setView({ type: "new" })}
    />
  );
}
