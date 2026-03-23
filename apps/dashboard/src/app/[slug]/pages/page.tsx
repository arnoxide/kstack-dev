"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Settings2,
  Loader2,
  Check,
  Globe,
  EyeOff,
  Image as ImageIcon,
  Type,
  LayoutTemplate,
  Megaphone,
  Grid3X3,
  Star,
  Minus,
  Layout,
  Layers,
  PanelLeft,
  Plus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────────────────────

type CarouselSlide = { imageUrl: string; title: string; subtitle: string; ctaText: string; ctaUrl: string };

type PageBlock =
  | { id: string; type: "hero"; title: string; subtitle: string; ctaText: string; ctaUrl: string; bgColor: string; textColor: string; height: "small" | "medium" | "large" }
  | { id: string; type: "hero_carousel"; slides: CarouselSlide[]; height: "small" | "medium" | "large"; overlayOpacity: number }
  | { id: string; type: "hero_split"; imageUrl: string; imagePosition: "left" | "right"; title: string; subtitle: string; ctaText: string; ctaUrl: string; bgColor: string; textColor: string; height: "small" | "medium" | "large" }
  | { id: string; type: "featured_products"; title: string; limit: number }
  | { id: string; type: "collection_grid"; title: string }
  | { id: string; type: "text_block"; heading: string; body: string; align: "left" | "center" | "right" }
  | { id: string; type: "image_banner"; imageUrl: string; heading: string; subtext: string; ctaText: string; ctaUrl: string }
  | { id: string; type: "cta_banner"; heading: string; subtext: string; ctaText: string; ctaUrl: string; bgColor: string }
  | { id: string; type: "spacer"; height: number };

// ─── Block defaults & palette ────────────────────────────────────────────────

const newId = () => Math.random().toString(36).slice(2);

const PALETTE_ITEMS: {
  type: PageBlock["type"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaults: () => PageBlock;
}[] = [
  {
    type: "hero",
    label: "Hero — Plain",
    description: "Solid colour hero with CTA",
    icon: Layout,
    defaults: () => ({
      id: newId(),
      type: "hero",
      title: "Welcome to our store",
      subtitle: "Discover our latest collection",
      ctaText: "Shop Now",
      ctaUrl: "/products",
      bgColor: "#111827",
      textColor: "#ffffff",
      height: "medium",
    }),
  },
  {
    type: "hero_carousel",
    label: "Hero — Carousel",
    description: "Auto-advancing image slideshow",
    icon: Layers,
    defaults: () => ({
      id: newId(),
      type: "hero_carousel",
      height: "medium",
      overlayOpacity: 45,
      slides: [
        { imageUrl: "", title: "New Collection", subtitle: "Discover our latest arrivals", ctaText: "Shop Now", ctaUrl: "/products" },
        { imageUrl: "", title: "Summer Sale", subtitle: "Up to 40% off selected items", ctaText: "View Deals", ctaUrl: "/products" },
      ],
    }),
  },
  {
    type: "hero_split",
    label: "Hero — Split",
    description: "Image one side, text the other",
    icon: PanelLeft,
    defaults: () => ({
      id: newId(),
      type: "hero_split",
      imageUrl: "",
      imagePosition: "left",
      title: "Crafted for you",
      subtitle: "Quality products designed with care and attention to detail.",
      ctaText: "Shop Now",
      ctaUrl: "/products",
      bgColor: "#111827",
      textColor: "#ffffff",
      height: "medium",
    }),
  },
  {
    type: "featured_products",
    label: "Featured Products",
    description: "Showcase selected products",
    icon: Star,
    defaults: () => ({
      id: newId(),
      type: "featured_products",
      title: "Featured Products",
      limit: 8,
    }),
  },
  {
    type: "collection_grid",
    label: "Collection Grid",
    description: "Grid of product collections",
    icon: Grid3X3,
    defaults: () => ({
      id: newId(),
      type: "collection_grid",
      title: "Shop by Category",
    }),
  },
  {
    type: "text_block",
    label: "Text Block",
    description: "Heading and body text",
    icon: Type,
    defaults: () => ({
      id: newId(),
      type: "text_block",
      heading: "Our Story",
      body: "Write something meaningful about your brand here.",
      align: "center",
    }),
  },
  {
    type: "image_banner",
    label: "Image Banner",
    description: "Full-width image with overlay",
    icon: ImageIcon,
    defaults: () => ({
      id: newId(),
      type: "image_banner",
      imageUrl: "",
      heading: "New Arrivals",
      subtext: "Explore the latest styles",
      ctaText: "Shop Now",
      ctaUrl: "/products",
    }),
  },
  {
    type: "cta_banner",
    label: "CTA Banner",
    description: "Coloured banner with call-to-action",
    icon: Megaphone,
    defaults: () => ({
      id: newId(),
      type: "cta_banner",
      heading: "Special Offer",
      subtext: "Get 20% off your first order",
      ctaText: "Claim Offer",
      ctaUrl: "/products",
      bgColor: "#f59e0b",
    }),
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Empty vertical spacing",
    icon: Minus,
    defaults: () => ({
      id: newId(),
      type: "spacer",
      height: 40,
    }),
  },
];

function blockIcon(type: PageBlock["type"]): React.ComponentType<{ className?: string }> {
  return PALETTE_ITEMS.find((p) => p.type === type)?.icon ?? LayoutTemplate;
}

function blockLabel(block: PageBlock): string {
  switch (block.type) {
    case "hero": return block.title || "Hero — Plain";
    case "hero_carousel": return `Carousel (${block.slides.length} slide${block.slides.length !== 1 ? "s" : ""})`;
    case "hero_split": return block.title || "Hero — Split";
    case "featured_products": return block.title || "Featured Products";
    case "collection_grid": return block.title || "Collection Grid";
    case "text_block": return block.heading || "Text Block";
    case "image_banner": return block.heading || "Image Banner";
    case "cta_banner": return block.heading || "CTA Banner";
    case "spacer": return `Spacer (${block.height}px)`;
  }
}

// ─── Sortable block card ──────────────────────────────────────────────────────

function SortableBlockCard({
  block,
  isSelected,
  onSelect,
  onDelete,
}: {
  block: PageBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const Icon = blockIcon(block.type);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border p-3.5 flex items-center gap-3 transition-colors ${
        isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200 hover:border-gray-400"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Icon + label */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={onSelect}>
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{blockLabel(block)}</p>
          <p className="text-xs text-gray-500">{PALETTE_ITEMS.find((p) => p.type === block.type)?.label}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onSelect}
          className={`p-1.5 rounded-lg transition-colors ${isSelected ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
          title="Edit"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900";

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={placeholder} />
    </Field>
  );
}

function UrlInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <input type="url" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder="https://" />
    </Field>
  );
}

function NumberInput({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputCls}
        min={min}
        max={max}
      />
    </Field>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
          maxLength={7}
          placeholder="#000000"
        />
      </div>
    </Field>
  );
}

function TextareaInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={`${inputCls} resize-none`}
      />
    </Field>
  );
}

function RadioGroup<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { label: string; value: T }[] }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors ${
              value === opt.value
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

// ─── Property editor ──────────────────────────────────────────────────────────

function BlockEditor({ block, onChange }: { block: PageBlock; onChange: (updated: PageBlock) => void }) {
  const update = (partial: Partial<PageBlock>) => onChange({ ...block, ...partial } as PageBlock);

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-4">
          <TextInput label="Title" value={block.title} onChange={(v) => update({ title: v })} />
          <TextInput label="Subtitle" value={block.subtitle} onChange={(v) => update({ subtitle: v })} />
          <TextInput label="Button text" value={block.ctaText} onChange={(v) => update({ ctaText: v })} />
          <TextInput label="Button URL" value={block.ctaUrl} onChange={(v) => update({ ctaUrl: v })} />
          <ColorInput label="Background colour" value={block.bgColor} onChange={(v) => update({ bgColor: v })} />
          <ColorInput label="Text colour" value={block.textColor} onChange={(v) => update({ textColor: v })} />
          <RadioGroup
            label="Height"
            value={block.height}
            onChange={(v) => update({ height: v })}
            options={[
              { label: "S", value: "small" },
              { label: "M", value: "medium" },
              { label: "L", value: "large" },
            ]}
          />
        </div>
      );

    case "hero_carousel":
      return (
        <div className="space-y-4">
          <RadioGroup
            label="Height"
            value={block.height}
            onChange={(v) => update({ height: v })}
            options={[
              { label: "S", value: "small" },
              { label: "M", value: "medium" },
              { label: "L", value: "large" },
            ]}
          />
          <NumberInput
            label="Overlay darkness (%)"
            value={block.overlayOpacity}
            onChange={(v) => update({ overlayOpacity: Math.min(80, Math.max(0, v)) })}
            min={0}
            max={80}
          />
          <Field label={`Slides (${block.slides.length})`}>
            <div className="space-y-3">
              {block.slides.map((slide, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600">Slide {i + 1}</span>
                    {block.slides.length > 1 && (
                      <button
                        onClick={() => update({ slides: block.slides.filter((_, si) => si !== i) })}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    placeholder="Image URL"
                    value={slide.imageUrl}
                    onChange={(e) => update({ slides: block.slides.map((s, si) => si === i ? { ...s, imageUrl: e.target.value } : s) })}
                    className={inputCls}
                  />
                  <input
                    placeholder="Title"
                    value={slide.title}
                    onChange={(e) => update({ slides: block.slides.map((s, si) => si === i ? { ...s, title: e.target.value } : s) })}
                    className={inputCls}
                  />
                  <input
                    placeholder="Subtitle"
                    value={slide.subtitle}
                    onChange={(e) => update({ slides: block.slides.map((s, si) => si === i ? { ...s, subtitle: e.target.value } : s) })}
                    className={inputCls}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      placeholder="Button text"
                      value={slide.ctaText}
                      onChange={(e) => update({ slides: block.slides.map((s, si) => si === i ? { ...s, ctaText: e.target.value } : s) })}
                      className={inputCls}
                    />
                    <input
                      placeholder="Button URL"
                      value={slide.ctaUrl}
                      onChange={(e) => update({ slides: block.slides.map((s, si) => si === i ? { ...s, ctaUrl: e.target.value } : s) })}
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => update({ slides: [...block.slides, { imageUrl: "", title: "", subtitle: "", ctaText: "", ctaUrl: "" }] })}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-blue-600 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add slide
              </button>
            </div>
          </Field>
        </div>
      );

    case "hero_split":
      return (
        <div className="space-y-4">
          <UrlInput label="Image URL" value={block.imageUrl} onChange={(v) => update({ imageUrl: v })} />
          <RadioGroup
            label="Image position"
            value={block.imagePosition}
            onChange={(v) => update({ imagePosition: v })}
            options={[
              { label: "Left", value: "left" },
              { label: "Right", value: "right" },
            ]}
          />
          <TextInput label="Title" value={block.title} onChange={(v) => update({ title: v })} />
          <TextInput label="Subtitle" value={block.subtitle} onChange={(v) => update({ subtitle: v })} />
          <TextInput label="Button text" value={block.ctaText} onChange={(v) => update({ ctaText: v })} />
          <TextInput label="Button URL" value={block.ctaUrl} onChange={(v) => update({ ctaUrl: v })} />
          <ColorInput label="Background / fade colour" value={block.bgColor} onChange={(v) => update({ bgColor: v })} />
          <ColorInput label="Text colour" value={block.textColor} onChange={(v) => update({ textColor: v })} />
          <RadioGroup
            label="Height"
            value={block.height}
            onChange={(v) => update({ height: v })}
            options={[
              { label: "S", value: "small" },
              { label: "M", value: "medium" },
              { label: "L", value: "large" },
            ]}
          />
        </div>
      );

    case "featured_products":
      return (
        <div className="space-y-4">
          <TextInput label="Section title" value={block.title} onChange={(v) => update({ title: v })} />
          <RadioGroup
            label="Number of products"
            value={String(block.limit) as "4" | "8" | "12"}
            onChange={(v) => update({ limit: Number(v) })}
            options={[
              { label: "4", value: "4" },
              { label: "8", value: "8" },
              { label: "12", value: "12" },
            ]}
          />
        </div>
      );

    case "collection_grid":
      return (
        <div className="space-y-4">
          <TextInput label="Section title" value={block.title} onChange={(v) => update({ title: v })} />
        </div>
      );

    case "text_block":
      return (
        <div className="space-y-4">
          <TextInput label="Heading" value={block.heading} onChange={(v) => update({ heading: v })} />
          <TextareaInput label="Body" value={block.body} onChange={(v) => update({ body: v })} />
          <RadioGroup
            label="Alignment"
            value={block.align}
            onChange={(v) => update({ align: v })}
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]}
          />
        </div>
      );

    case "image_banner":
      return (
        <div className="space-y-4">
          <UrlInput label="Image URL" value={block.imageUrl} onChange={(v) => update({ imageUrl: v })} />
          <TextInput label="Heading" value={block.heading} onChange={(v) => update({ heading: v })} />
          <TextInput label="Subtext" value={block.subtext} onChange={(v) => update({ subtext: v })} />
          <TextInput label="Button text" value={block.ctaText} onChange={(v) => update({ ctaText: v })} />
          <TextInput label="Button URL" value={block.ctaUrl} onChange={(v) => update({ ctaUrl: v })} />
        </div>
      );

    case "cta_banner":
      return (
        <div className="space-y-4">
          <TextInput label="Heading" value={block.heading} onChange={(v) => update({ heading: v })} />
          <TextInput label="Subtext" value={block.subtext} onChange={(v) => update({ subtext: v })} />
          <TextInput label="Button text" value={block.ctaText} onChange={(v) => update({ ctaText: v })} />
          <TextInput label="Button URL" value={block.ctaUrl} onChange={(v) => update({ ctaUrl: v })} />
          <ColorInput label="Background colour" value={block.bgColor} onChange={(v) => update({ bgColor: v })} />
        </div>
      );

    case "spacer":
      return (
        <div className="space-y-4">
          <NumberInput label="Height (px)" value={block.height} onChange={(v) => update({ height: v })} min={8} max={200} />
        </div>
      );
  }
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function PagesPage() {
  const params = useParams<{ slug: string }>();

  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: themes } = trpc.storefront.themes.list.useQuery();
  const activeTheme = themes?.find((t) => t.isActive) ?? themes?.[0];

  const { data: pagesData } = trpc.storefront.pages.list.useQuery(
    { themeId: activeTheme?.id ?? "" },
    { enabled: !!activeTheme?.id }
  );

  const saveContentMutation = trpc.storefront.pages.saveContent.useMutation();
  const publishMutation = trpc.storefront.pages.publish.useMutation();
  const createPageMutation = trpc.storefront.pages.create.useMutation();

  // Load existing home page on mount
  useEffect(() => {
    if (!pagesData) return;
    const homePage = pagesData.find((p) => p.type === "home");
    if (homePage) {
      setPageId(homePage.id);
      setIsPublished(homePage.isPublished ?? false);
      const content = homePage.content as { blocks?: PageBlock[] } | null;
      if (content?.blocks && Array.isArray(content.blocks) && content.blocks.length > 0) {
        setBlocks(content.blocks as PageBlock[]);
      }
    }
  }, [pagesData]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((b) => b.id === active.id);
        const newIndex = items.findIndex((b) => b.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addBlock = (paletteItem: (typeof PALETTE_ITEMS)[number]) => {
    const newBlock = paletteItem.defaults();
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateBlock = (updated: PageBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  const handleSave = async () => {
    setSaving(true);
    try {
      let id = pageId;

      if (!id) {
        if (!activeTheme?.id) {
          alert("No active theme found. Please create and activate a theme first.");
          return;
        }
        const page = await createPageMutation.mutateAsync({
          themeId: activeTheme.id,
          type: "home",
          title: "Home",
          slug: "home",
        });
        id = page.id;
        setPageId(id);
      }

      await saveContentMutation.mutateAsync({
        id,
        mode: "visual",
        content: { blocks },
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!pageId) {
      alert("Save the page first before publishing.");
      return;
    }
    const newPublished = !isPublished;
    await publishMutation.mutateAsync({ id: pageId, isPublished: newPublished });
    setIsPublished(newPublished);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Page Builder</h1>
          <p className="text-gray-600 mt-1">Design your homepage by adding and arranging blocks</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
          <button
            onClick={handlePublishToggle}
            disabled={publishMutation.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              isPublished
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isPublished ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            {isPublished ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left: Block palette */}
        <div className="w-[260px] flex-shrink-0 flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add blocks</h2>
          <div className="space-y-2 overflow-y-auto">
            {PALETTE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => addBlock(item)}
                  className="w-full text-left bg-white border border-gray-200 hover:border-gray-400 rounded-xl p-3 flex items-center gap-3 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Canvas</h2>
          <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-4">
            {blocks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24">
                <LayoutTemplate className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-400 font-medium">Your canvas is empty</p>
                <p className="text-sm text-gray-400 mt-1">Click blocks on the left to add them here</p>
              </div>
            ) : mounted ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {blocks.map((block) => (
                      <SortableBlockCard
                        key={block.id}
                        block={block}
                        isSelected={selectedId === block.id}
                        onSelect={() => setSelectedId(selectedId === block.id ? null : block.id)}
                        onDelete={() => deleteBlock(block.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : null}
          </div>
        </div>

        {/* Right: Property editor */}
        <div className="w-[300px] flex-shrink-0 flex flex-col">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Properties</h2>
          <div className="flex-1 overflow-y-auto">
            {selectedBlock ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  {(() => {
                    const Icon = blockIcon(selectedBlock.type);
                    return <Icon className="w-4 h-4 text-gray-500" />;
                  })()}
                  <p className="text-sm font-semibold text-gray-900">
                    {PALETTE_ITEMS.find((p) => p.type === selectedBlock.type)?.label}
                  </p>
                </div>
                <BlockEditor block={selectedBlock} onChange={updateBlock} />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <Settings2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Select a block to edit its properties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
