"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Plus, Package, Pencil, Trash2, Search, Upload, X, Download, CheckCircle2, AlertCircle, Minus } from "lucide-react";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";

// ── CSV helpers ───────────────────────────────────────────────────────────────

const CSV_HEADERS = ["title", "description", "handle", "status", "tags", "price", "compare_price", "sku", "inventory", "variant_title", "image_url", "option_Size", "option_Color"];
const CSV_TEMPLATE = [
  CSV_HEADERS.join(","),
  'Black T-Shirt,"A great black tee",black-t-shirt,active,"clothing,tops",250,,BTS-001,10,,https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800,Small,Black',
  'Black T-Shirt,"A great black tee",black-t-shirt,active,"clothing,tops",250,,BTS-002,8,,,Medium,Black',
  'Black T-Shirt,"A great black tee",black-t-shirt,active,"clothing,tops",250,,BTS-003,5,,,Large,Black',
  'Blue Jeans,,blue-jeans,active,,450,500,BLJ-001,5,Regular Fit,https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=800,32W x 32L,',
  'Blue Jeans,,blue-jeans,active,,480,530,BLJ-002,3,Slim Fit,,34W x 32L,',
].join("\n");

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim(); });
    return row;
  }).filter((r) => r["title"]);
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && !inQuotes) { inQuotes = true; continue; }
    if (ch === '"' && inQuotes) { inQuotes = false; continue; }
    if (ch === "," && !inQuotes) { result.push(cur); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function rowsToImport(parsed: Record<string, string>[]) {
  return parsed.map((r) => {
    // Collect option_* columns into a Record<string, string>
    const options: Record<string, string> = {};
    for (const [key, val] of Object.entries(r)) {
      if (key.startsWith("option_") && val.trim()) {
        const optionName = key.slice(7); // strip "option_"
        options[optionName] = val.trim();
      }
    }
    return {
      title: r["title"] ?? "",
      description: r["description"] || undefined,
      handle: r["handle"] || undefined,
      status: (["draft", "active", "archived"].includes(r["status"]) ? r["status"] : "draft") as "draft" | "active" | "archived",
      tags: r["tags"] || undefined,
      price: parseFloat(r["price"]) || 0,
      comparePrice: r["compare_price"] ? parseFloat(r["compare_price"]) : undefined,
      sku: r["sku"] || undefined,
      inventory: r["inventory"] ? parseInt(r["inventory"]) : 0,
      variantTitle: r["variant_title"] || undefined,
      imageUrl: r["image_url"] || undefined,
      options: Object.keys(options).length > 0 ? options : undefined,
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const confirm = useConfirm();
  const params = useParams<{ slug: string }>();
  const { data: products, isLoading, refetch } = trpc.products.list.useQuery({ limit: 100 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const deleteMutation = trpc.products.delete.useMutation({ onSuccess: () => refetch() });
  const deleteManyMutation = trpc.products.deleteMany.useMutation({
    onSuccess: () => { setSelected(new Set()); refetch(); },
  });
  const importMutation = trpc.products.importCsv.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      refetch();
    },
  });

  // Import modal state
  const [importOpen, setImportOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setParsedRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const rows = rowsToImport(parsedRows);
    if (!rows.length) return;
    importMutation.mutate({ rows });
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const closeImport = () => {
    setImportOpen(false);
    setParsedRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Count unique products (by title) in preview
  const uniqueTitles = new Set(parsedRows.map((r) => r["title"])).size;

  const filtered = (products ?? []).filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.handle.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((p) => next.delete(p.id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((p) => next.add(p.id)); return next; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({ title: `Delete ${selected.size} product${selected.size !== 1 ? "s" : ""}?`, message: "This cannot be undone.", danger: true });
    if (!ok) return;
    deleteManyMutation.mutate({ ids: [...selected] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">
            {products?.length ?? 0} product{(products?.length ?? 0) !== 1 ? "s" : ""} in your store
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setImportOpen(true); setImportResult(null); }}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <Link
            href={`/${params.slug}/products/new`}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "active", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="text-blue-700 font-medium">{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={deleteManyMutation.isPending}
            className="flex items-center gap-1.5 text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteManyMutation.isPending ? "Deleting..." : "Delete selected"}
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading products...</div>
        ) : !products || products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No products yet</h3>
            <p className="text-sm text-gray-500 mb-4">Add your first product to get started</p>
            <Link
              href={`/${params.slug}/products/new`}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add product
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No products match your search.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={toggleAll}
                    className="w-4 h-4 rounded border-2 border-gray-300 flex items-center justify-center hover:border-gray-500 transition-colors"
                    style={{ backgroundColor: allFilteredSelected ? "#111827" : someSelected && filtered.some(p => selected.has(p.id)) ? "#6b7280" : "white" }}
                  >
                    {allFilteredSelected && <X className="w-2.5 h-2.5 text-white" />}
                    {!allFilteredSelected && filtered.some(p => selected.has(p.id)) && <Minus className="w-2.5 h-2.5 text-white" />}
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Product</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Handle</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((product) => (
                <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${selected.has(product.id) ? "bg-blue-50" : ""}`}>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleOne(product.id)}
                      className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
                      style={{ borderColor: selected.has(product.id) ? "#111827" : "#d1d5db", backgroundColor: selected.has(product.id) ? "#111827" : "white" }}
                    >
                      {selected.has(product.id) && <X className="w-2.5 h-2.5 text-white" />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/${params.slug}/products/${product.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {product.title}
                    </Link>
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {product.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                        product.status === "active"
                          ? "bg-green-100 text-green-700"
                          : product.status === "archived"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{product.handle}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${params.slug}/products/${product.id}`}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={async () => {
                          const ok = await confirm({ title: "Delete product", message: `Delete "${product.title}"? This cannot be undone.`, danger: true });
                          if (!ok) return;
                          deleteMutation.mutate({ id: product.id });
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── CSV Import Modal ───────────────────────────────────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Import products from CSV</h2>
              <button onClick={closeImport} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Template download */}
              <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                <span>Need a starting point? Download the sample template.</span>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 font-medium hover:underline">
                  <Download className="w-4 h-4" />
                  Template
                </button>
              </div>

              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV file</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:text-gray-700 file:bg-white hover:file:bg-gray-50"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Columns: title, description, handle, status, tags, price, compare_price, sku, inventory, variant_title.
                  Multiple rows with the same handle = multiple variants.
                </p>
              </div>

              {/* Preview */}
              {parsedRows.length > 0 && !importResult && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Preview — {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} ({uniqueTitles} product{uniqueTitles !== 1 ? "s" : ""})
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Title", "Status", "Price", "SKU", "Inventory", "Variant"].map((h) => (
                            <th key={h} className="text-left font-medium text-gray-500 px-3 py-2 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.slice(0, 8).map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900 max-w-[150px] truncate">{r["title"]}</td>
                            <td className="px-3 py-2 text-gray-500">{r["status"] || "draft"}</td>
                            <td className="px-3 py-2 text-gray-500">{r["price"]}</td>
                            <td className="px-3 py-2 text-gray-500">{r["sku"] || "—"}</td>
                            <td className="px-3 py-2 text-gray-500">{r["inventory"] || "0"}</td>
                            <td className="px-3 py-2 text-gray-500">{r["variant_title"] || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedRows.length > 8 && (
                      <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">
                        + {parsedRows.length - 8} more rows
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Result */}
              {importResult && (
                <div className={`flex items-start gap-3 rounded-lg px-4 py-3 ${importResult.created > 0 ? "bg-green-50 text-green-800" : "bg-yellow-50 text-yellow-800"}`}>
                  {importResult.created > 0
                    ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className="font-medium">
                      {importResult.created > 0
                        ? `${importResult.created} product${importResult.created !== 1 ? "s" : ""} imported successfully`
                        : "No products were imported"}
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm mt-0.5">{importResult.skipped} row{importResult.skipped !== 1 ? "s" : ""} skipped (duplicate handle or error)</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closeImport} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {importResult ? "Close" : "Cancel"}
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={parsedRows.length === 0 || importMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {importMutation.isPending
                    ? "Importing..."
                    : parsedRows.length === 0
                      ? "Select a file first"
                      : `Import ${uniqueTitles} product${uniqueTitles !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
