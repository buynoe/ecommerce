"use client";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Image from "next/image";
import { cloudinaryTransform } from "@/lib/cloudinary-url";

const COLLECTION_TRANSFORMS = "w_600,h_300,c_fill,g_auto,q_auto,f_auto";

interface Collection { id: string; title: string; handle: string; type: string; status: string; imageUrl?: string | null; _count: { products: number } }

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "MANUAL", status: "ACTIVE", imageUrl: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { load(); }, []);
  async function load() { const r = await fetch("/api/collections"); const d = await r.json(); setCollections(d.collections || []); setLoading(false); }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("subfolder", "collections");
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (!r.ok) return null;
    const { media } = await r.json();
    return media?.url ?? null;
  }

  async function handleFormImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) setForm(f => ({ ...f, imageUrl: url }));
    setUploading(false);
  }

  async function handleCardImageChange(e: React.ChangeEvent<HTMLInputElement>, collectionId: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(collectionId);
    const url = await uploadImage(file);
    if (url) {
      await fetch(`/api/collections/${collectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      load();
    }
    setUploadingId(null);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ title: "", description: "", type: "MANUAL", status: "ACTIVE", imageUrl: "" });
    load();
  }

  return (
    <div>
      <PageHeader title="Collections" subtitle="Group products into collections"
        action={<button onClick={() => setShowForm(true)} className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">+ Create Collection</button>}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create Collection</h2>
            <form onSubmit={create} className="space-y-3">
              <input required placeholder="Collection name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <textarea rows={2} placeholder="Description (optional)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="MANUAL">Manual</option>
                  <option value="AUTOMATED">Automated</option>
                </select>
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              {/* Image upload */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Collection Image <span className="text-gray-400 font-normal">(optional)</span></p>
                {form.imageUrl ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 group">
                    <Image src={cloudinaryTransform(form.imageUrl, COLLECTION_TRANSFORMS)} alt="Collection" fill className="object-cover" unoptimized />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >Remove</button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                    <span className="text-2xl mb-1">{uploading ? "⏳" : "🖼️"}</span>
                    <span className="text-xs text-gray-500">{uploading ? "Uploading…" : "Click to upload image"}</span>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFormImageChange} />
                  </label>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setForm({ title: "", description: "", type: "MANUAL", status: "ACTIVE", imageUrl: "" }); }} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 btn-brand rounded-lg py-2 text-sm font-medium disabled:opacity-60">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 p-12 text-center text-gray-400">Loading…</div>
          : collections.length === 0 ? <div className="col-span-3 p-16 text-center text-gray-400"><div className="text-4xl mb-3">🗂️</div>No collections yet</div>
          : collections.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Image area */}
              <div className="relative w-full h-32 bg-gray-50 group">
                {c.imageUrl ? (
                  <Image src={cloudinaryTransform(c.imageUrl, COLLECTION_TRANSFORMS)} alt={c.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300">
                    <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                  </div>
                )}
                <label className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploadingId === c.id ? "opacity-100" : ""}`}>
                  <span className="bg-white/90 text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg shadow">
                    {uploadingId === c.id ? "Uploading…" : c.imageUrl ? "Change Image" : "Add Image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingId !== null}
                    ref={el => { cardFileRefs.current[c.id] = el; }}
                    onChange={e => handleCardImageChange(e, c.id)}
                  />
                </label>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.type === "AUTOMATED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{c.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
                <p className="text-xs text-gray-400 mt-1">/collections/{c.handle}</p>
                <p className="text-sm text-gray-500 mt-3">{c._count.products} products</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
