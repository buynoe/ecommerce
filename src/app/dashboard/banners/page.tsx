"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Image as ImageIcon, Upload, FolderOpen, AlertTriangle, ChevronUp, ChevronDown, X, Edit2, Trash2, RefreshCw, Lightbulb } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import GalleryWidget from "@/components/ui/GalleryWidget";
import Image from "next/image";

interface Banner {
  id: string; title: string; subtitle?: string; buttonText?: string; buttonLink?: string;
  imageUrl?: string; bgColor: string; textColor: string; position: number; isActive: boolean;
}

const empty = (): Omit<Banner, "id"> => ({
  title: "", subtitle: "", buttonText: "Shop Now", buttonLink: "",
  imageUrl: "", bgColor: "#1f2937", textColor: "#ffffff", position: 0, isActive: true,
});

const PRESET_THEMES = [
  { label: "Dark",   bg: "#1f2937", text: "#ffffff" },
  { label: "Green",  bg: "#166534", text: "#ffffff" },
  { label: "Blue",   bg: "#1e40af", text: "#ffffff" },
  { label: "Purple", bg: "#5b21b6", text: "#ffffff" },
  { label: "Orange", bg: "#c2410c", text: "#ffffff" },
  { label: "Rose",   bg: "#9f1239", text: "#ffffff" },
  { label: "Teal",   bg: "#0f766e", text: "#ffffff" },
  { label: "White",  bg: "#ffffff", text: "#111827" },
];

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Omit<Banner, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/banners");
    const d = await r.json();
    setBanners(d.banners || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing) return;
    const e: Record<string, string> = {};
    if (!editing.title.trim()) e.title = "Title is required";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const isNew = !editing.id;
    const url = isNew ? "/api/banners" : `/api/banners/${editing.id}`;
    const method = isNew ? "POST" : "PATCH";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    setSaving(false);
    setEditing(null);
    setErrors({});
    load();
  }

  async function toggle(banner: Banner) {
    await fetch(`/api/banners/${banner.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    load();
  }

  async function deleteBanner(id: string) {
    if (!confirm("Delete this banner? This cannot be undone.")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    load();
  }

  async function moveUp(banner: Banner, idx: number) {
    if (idx === 0) return;
    await fetch(`/api/banners/${banner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position: banner.position - 1 }) });
    load();
  }

  async function moveDown(banner: Banner, idx: number) {
    if (idx === banners.length - 1) return;
    await fetch(`/api/banners/${banner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position: banner.position + 1 }) });
    load();
  }

  async function bulkUpload(files: FileList | null) {
    if (!files?.length) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    const valid = Array.from(files).filter(f => allowed.includes(f.type));
    if (!valid.length) { setBulkError("Only JPEG, PNG, WebP, GIF or AVIF images are allowed."); return; }

    setBulkUploading(true);
    setBulkError("");
    setBulkProgress({ done: 0, total: valid.length });
    const errs: string[] = [];

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("subfolder", "banners");
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (r.ok) {
          const { media } = await r.json();
          // Create a banner record for each uploaded image
          const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          await fetch("/api/banners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, imageUrl: media.url, position: banners.length + i, isActive: true }),
          });
        } else {
          const d = await r.json().catch(() => ({}));
          errs.push(`${file.name}: ${d.error || "Upload failed"}`);
        }
      } catch {
        errs.push(`${file.name}: Network error`);
      }
      setBulkProgress({ done: i + 1, total: valid.length });
    }

    setBulkUploading(false);
    setBulkProgress(null);
    if (errs.length) setBulkError(errs.join(" · "));
    if (bulkInputRef.current) bulkInputRef.current.value = "";
    load();
  }

  function update(key: string, val: unknown) {
    setEditing(p => p ? { ...p, [key]: val } : p);
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  const hasImage = !!(editing?.imageUrl);

  return (
    <div>
      <PageHeader
        title="Homepage Banners"
        subtitle="Create hero banners with full images and a smooth auto-slider on your storefront"
        action={
          <button onClick={() => { setEditing({ ...empty(), position: banners.length }); setErrors({}); }}
            className="btn-brand px-4 py-2 rounded-lg text-sm font-semibold">
            + Add Banner
          </button>
        }
      />

      {/* Tips */}
      <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-sm text-blue-700 flex items-start gap-3">
        <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Banner tips for best results</p>
          <p className="text-blue-600">Use landscape images (1600×600 px or wider). Multiple banners auto-slide every 5 seconds. Drag ↑↓ to reorder. Images are shown full-width with a text overlay.</p>
        </div>
      </div>

      {/* ── Bulk Upload Drop Zone ─────────────────────────────────────────── */}
      <div
        className={`mb-5 border-2 border-dashed rounded-xl transition-colors ${dragOver ? "border-green-400 bg-green-50" : "border-gray-300 bg-white hover:border-gray-400"}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); bulkUpload(e.dataTransfer.files); }}
      >
        <input
          ref={bulkInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="hidden"
          onChange={e => bulkUpload(e.target.files)}
        />
        {bulkUploading && bulkProgress ? (
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                <span>Uploading banners… {bulkProgress.done} / {bulkProgress.total}</span>
                <span className="text-green-600">{Math.round((bulkProgress.done / bulkProgress.total) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => bulkInputRef.current?.click()}
            className="w-full px-6 py-6 flex flex-col items-center gap-2 text-gray-500 cursor-pointer"
          >
            {dragOver ? <FolderOpen className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
            <span className="text-sm font-semibold text-gray-700">Drop multiple banner images here or click to upload</span>
            <span className="text-xs text-gray-400">Each image creates a new banner · Stored in your Cloudinary folder · JPEG, PNG, WebP supported</span>
          </button>
        )}
        {bulkError && (
          <div className="px-5 pb-4 text-xs text-red-600 bg-red-50 border-t border-red-100 rounded-b-xl py-2">
            <AlertTriangle className="w-4 h-4 inline mr-1" />{bulkError}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="mb-3 flex justify-center"><ImageIcon className="w-12 h-12 text-gray-300" /></div>
          <p className="text-gray-600 font-medium mb-2">No banners yet</p>
          <p className="text-sm text-gray-400 mb-6">Add a banner with an image to make your storefront stand out</p>
          <button onClick={() => setEditing({ ...empty() })} className="btn-brand px-5 py-2.5 rounded-lg font-semibold">
            Create First Banner
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((b, idx) => (
            <div key={b.id} className={`bg-white rounded-xl border overflow-hidden transition-opacity ${b.isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
              {/* Banner preview */}
              <div className="relative h-40 overflow-hidden" style={{ backgroundColor: b.bgColor }}>
                {b.imageUrl && (
                  <Image src={b.imageUrl} alt={b.title} fill className="object-cover" unoptimized />
                )}
                {/* Gradient overlay */}
                <div className={`absolute inset-0 ${b.imageUrl ? "bg-gradient-to-r from-black/60 via-black/35 to-black/10" : "bg-gradient-to-br from-black/20 to-transparent"}`} />
                {/* Text */}
                <div className="absolute inset-0 flex items-center px-8 z-10">
                  <div>
                    <h3 className="text-2xl font-extrabold drop-shadow" style={{ color: b.imageUrl ? "#fff" : b.textColor }}>{b.title}</h3>
                    {b.subtitle && <p className="text-sm opacity-85 mt-1 drop-shadow" style={{ color: b.imageUrl ? "rgba(255,255,255,0.9)" : b.textColor }}>{b.subtitle}</p>}
                    {b.buttonText && (
                      <div className="mt-3 inline-block px-4 py-1.5 rounded-xl text-xs font-bold shadow"
                        style={b.imageUrl ? { backgroundColor: "#fff", color: "#111" } : { backgroundColor: b.textColor, color: b.bgColor }}>
                        {b.buttonText} →
                      </div>
                    )}
                  </div>
                </div>
                {/* Badges */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  {!b.imageUrl && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No image</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.isActive ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                    {b.isActive ? "● Active" : "○ Hidden"}
                  </span>
                </div>
                {/* Position badge */}
                <div className="absolute bottom-3 left-3 z-10 text-xs bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Slide {b.position + 1}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-1">
                  <button onClick={() => moveUp(b, idx)} disabled={idx === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 text-gray-500 transition-colors" title="Move up"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveDown(b, idx)} disabled={idx === banners.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 text-gray-500 transition-colors" title="Move down"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(b)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${b.isActive ? "border-gray-200 text-gray-600 hover:bg-gray-100" : "border-green-200 text-green-700 hover:bg-green-50"}`}>
                    {b.isActive ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => { setEditing(b); setErrors({}); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => deleteBanner(b.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit / Create Modal ────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 py-8">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            {/* Header — sticky inside the scrollable overlay */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl bg-white">
              <h2 className="font-bold text-gray-900 text-lg">{editing.id ? "Edit Banner" : "New Banner"}</h2>
              <button onClick={() => setEditing(null)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Live preview */}
            <div className="relative h-48 overflow-hidden mx-6 mt-5 rounded-xl" style={{ backgroundColor: editing.bgColor }}>
              {editing.imageUrl && (
                <Image src={editing.imageUrl} alt={editing.title || "Preview"} fill className="object-cover" unoptimized />
              )}
              <div className={`absolute inset-0 ${hasImage ? "bg-gradient-to-r from-black/60 via-black/35 to-black/10" : "bg-gradient-to-br from-black/20 to-transparent"}`} />
              <div className="absolute inset-0 flex items-center px-8 z-10">
                <div>
                  <h3 className="text-2xl font-extrabold drop-shadow" style={{ color: hasImage ? "#fff" : editing.textColor }}>
                    {editing.title || "Your Banner Title"}
                  </h3>
                  {editing.subtitle && (
                    <p className="text-sm mt-1 opacity-90 drop-shadow" style={{ color: hasImage ? "rgba(255,255,255,0.9)" : editing.textColor }}>{editing.subtitle}</p>
                  )}
                  {editing.buttonText && (
                    <div className="mt-3 inline-block px-4 py-1.5 rounded-xl text-xs font-bold shadow"
                      style={hasImage ? { backgroundColor: "#fff", color: "#111" } : { backgroundColor: editing.textColor, color: editing.bgColor }}>
                      {editing.buttonText} →
                    </div>
                  )}
                </div>
              </div>
              <span className="absolute top-2 right-2 text-xs text-white/60 font-mono bg-black/30 px-2 py-0.5 rounded">Live Preview</span>
            </div>

            <div className="p-6 space-y-5">
              {/* Image picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Banner Image</label>
                {editing.imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 group" style={{ height: 120 }}>
                    <Image src={editing.imageUrl} alt="Banner" fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-3">
                      <button type="button" onClick={() => setGalleryOpen(true)}
                        className="bg-white text-gray-800 px-4 py-2 rounded-lg text-xs font-bold shadow hover:bg-gray-100 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Change Image
                      </button>
                      <button type="button" onClick={() => update("imageUrl", "")}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow hover:bg-red-700 flex items-center gap-1">
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setGalleryOpen(true)}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-500 hover:border-pink-400 hover:bg-green-50 hover:text-pink-500 transition-all group">
                    <ImageIcon className="w-10 h-10 text-gray-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold">Choose Image from Gallery</span>
                    <span className="text-xs text-gray-400">Recommended: 1600 × 600 px or wider</span>
                  </button>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  Images are displayed full-width with your text overlaid.{" "}
                  <button type="button" onClick={() => setGalleryOpen(true)} className="link-brand font-medium">Open Gallery →</button>
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Banner Title <span className="text-red-500">*</span></label>
                <input
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none transition-colors ${errors.title ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                  value={editing.title}
                  onChange={e => update("title", e.target.value)}
                  placeholder="Grand Monsoon Sale — Up to 50% Off"
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subtitle <span className="text-gray-400 font-normal">optional</span></label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  value={editing.subtitle || ""}
                  onChange={e => update("subtitle", e.target.value)}
                  placeholder="Free shipping on orders above ₹499" />
              </div>

              {/* Button */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Button Text <span className="text-gray-400 font-normal">optional</span></label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    value={editing.buttonText || ""}
                    onChange={e => update("buttonText", e.target.value)}
                    placeholder="Shop Now" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Button Link <span className="text-gray-400 font-normal">optional</span></label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    value={editing.buttonLink || ""}
                    onChange={e => update("buttonLink", e.target.value)}
                    placeholder="/collections/sale" />
                </div>
              </div>

              {/* Color theme — only relevant if no image or image overlay color */}
              {!hasImage && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Background Color Theme <span className="text-gray-400 font-normal">(used when no image is set)</span>
                  </label>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {PRESET_THEMES.map(g => (
                      <button key={g.label} type="button"
                        onClick={() => { update("bgColor", g.bg); update("textColor", g.text); }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${editing.bgColor === g.bg ? "ring-2 ring-offset-1 ring-green-500" : ""}`}
                        style={{ backgroundColor: g.bg, color: g.text, borderColor: g.bg === "#ffffff" ? "#e5e7eb" : g.bg }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Custom Background</label>
                      <div className="flex gap-2">
                        <input type="color" value={editing.bgColor} onChange={e => update("bgColor", e.target.value)} className="w-10 h-10 cursor-pointer border border-gray-200 rounded" />
                        <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" value={editing.bgColor} onChange={e => update("bgColor", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Custom Text Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={editing.textColor} onChange={e => update("textColor", e.target.value)} className="w-10 h-10 cursor-pointer border border-gray-200 rounded" />
                        <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" value={editing.textColor} onChange={e => update("textColor", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasImage && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600">
                  <Lightbulb className="w-3.5 h-3.5 inline mr-1" /> When a banner has an image, text is shown white on a dark overlay for readability. Background color is used as fallback while the image loads.
                </div>
              )}

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={editing.isActive} onChange={e => update("isActive", e.target.checked)} />
                  <div className={`w-11 h-6 rounded-full transition-colors ${editing.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editing.isActive ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Show on storefront</span>
              </label>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button onClick={save} disabled={saving}
                  className="flex-1 btn-brand py-3 rounded-xl font-bold disabled:opacity-50 transition-colors">
                  {saving ? "Saving…" : editing.id ? "Save Changes" : "Create Banner"}
                </button>
                <button onClick={() => setEditing(null)}
                  className="flex-1 border border-gray-200 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Gallery Widget */}
      <GalleryWidget
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        multiple={false}
        onSelect={assets => {
          if (assets[0]) update("imageUrl", assets[0].url);
          setGalleryOpen(false);
        }}
      />
    </div>
  );
}
