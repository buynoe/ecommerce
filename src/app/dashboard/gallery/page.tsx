"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Image from "next/image";

interface Asset {
  id: string; url: string; thumbnailUrl?: string; filename: string;
  size: number; width?: number; height?: number; alt?: string; folderId?: string | null;
  publicId?: string;
}
interface Folder { id: string; name: string; slug: string; _count?: { files: number } }

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function GalleryPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [detail, setDetail] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFolders = useCallback(async () => {
    const r = await fetch("/api/gallery/folders"); const d = await r.json();
    setFolders(d.folders || []);
  }, []);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeFolderId !== null) params.set("folderId", activeFolderId ?? "null");
    if (search) params.set("search", search);
    const r = await fetch(`/api/gallery/assets?${params}`); const d = await r.json();
    setAssets(d.assets || []); setLoading(false);
  }, [activeFolderId, search]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadAssets(); }, [loadAssets]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setProgress(0);
    let done = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      if (activeFolderId && activeFolderId !== "null") fd.append("folderId", activeFolderId);
      await fetch("/api/upload", { method: "POST", body: fd });
      done++;
      setProgress(Math.round(done / files.length * 100));
    }
    setUploading(false); loadAssets(); loadFolders();
    if (fileRef.current) fileRef.current.value = "";
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    await fetch("/api/gallery/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newFolderName }) });
    setNewFolderName(""); setShowNewFolder(false); loadFolders();
  }

  async function deleteSelected() {
    if (!selected.length || !confirm(`Delete ${selected.length} image(s)?`)) return;
    for (const id of selected) {
      await fetch("/api/gallery/assets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    }
    setSelected([]); setDetail(null); loadAssets(); loadFolders();
  }

  async function updateAlt(id: string, alt: string) {
    await fetch("/api/gallery/assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, alt }) });
    setAssets(a => a.map(x => x.id === id ? { ...x, alt } : x));
    if (detail?.id === id) setDetail(d => d ? { ...d, alt } : d);
  }

  return (
    <div className="flex h-full -mt-6 -mx-6 min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col pt-6">
        <div className="px-4 mb-4">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-3">Folders</h2>
          {showNewFolder ? (
            <div className="flex gap-1 mb-2">
              <input autoFocus className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 focus:outline-none"
                value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createFolder()} placeholder="Folder name" />
              <button onClick={createFolder} className="btn-brand px-2 py-1 rounded text-xs">✓</button>
              <button onClick={() => setShowNewFolder(false)} className="text-gray-400 px-1 text-xs">×</button>
            </div>
          ) : (
            <button onClick={() => setShowNewFolder(true)} className="w-full text-left text-xs link-brand font-semibold hover:underline mb-2">+ New Folder</button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {[
            { id: null, label: "All Images", icon: "🏠" },
            { id: "null", label: "Uncategorized", icon: "📂" },
          ].map(item => (
            <button key={String(item.id)} onClick={() => setActiveFolderId(item.id as string | null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${activeFolderId === item.id ? "btn-brand" : "text-gray-700 hover:bg-gray-200"}`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          {folders.map(f => (
            <button key={f.id} onClick={() => setActiveFolderId(f.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${activeFolderId === f.id ? "btn-brand" : "text-gray-700 hover:bg-gray-200"}`}>
              <span className="flex items-center gap-2 min-w-0"><span>📁</span><span className="truncate">{f.name}</span></span>
              <span className={`text-xs shrink-0 ${activeFolderId === f.id ? "text-green-100" : "text-gray-400"}`}>{f._count?.files}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
          <PageHeader title="Media Gallery" subtitle={`${assets.length} images`} />
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {selected.length > 0 && (
              <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100">
                🗑 Delete ({selected.length})
              </button>
            )}
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none w-44" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 btn-brand px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              📤 Upload Images
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 p-6 overflow-y-auto">
            {uploading && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex justify-between text-sm mb-1"><span className="text-green-700 font-medium">Uploading to Cloudinary…</span><span className="text-[#ec1f78]">{progress}%</span></div>
                <div className="h-2 bg-green-200 rounded-full"><div className="h-full bg-brand-gradient rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            {!loading && assets.length === 0 && (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
                className="h-80 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-green-50 transition-colors"
              >
                <div className="text-6xl mb-4">📸</div>
                <p className="font-semibold text-gray-600 text-lg">Drop images here or click to upload</p>
                <p className="text-sm text-gray-400 mt-1">JPEG, PNG, WebP, GIF, AVIF — max 10 MB each · Uploaded to Cloudinary</p>
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 15 }).map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            )}

            {!loading && assets.length > 0 && (
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                {assets.map(asset => {
                  const isSel = selected.includes(asset.id);
                  return (
                    <div key={asset.id}
                      onClick={() => setSelected(s => s.includes(asset.id) ? s.filter(x => x !== asset.id) : [...s, asset.id])}
                      onDoubleClick={() => setDetail(asset)}
                      className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${isSel ? "border-green-500 ring-2 ring-green-300 ring-offset-1" : "border-transparent hover:border-gray-300"}`}
                    >
                      <div className="aspect-square bg-gray-100">
                        <Image src={asset.thumbnailUrl || asset.url} alt={asset.alt || ""} width={160} height={160} className="w-full h-full object-cover" unoptimized />
                      </div>
                      {isSel && <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow"><span className="text-white text-xs">✓</span></div>}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{asset.filename}</p>
                        <p className="text-gray-300 text-xs">{formatBytes(asset.size)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {detail && (
            <div className="w-64 shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto flex flex-col">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Details</span>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="p-4 space-y-4">
                <div className="aspect-square rounded-xl overflow-hidden bg-white border border-gray-200">
                  <Image src={detail.thumbnailUrl || detail.url} alt={detail.alt || ""} width={256} height={256} className="w-full h-full object-contain" unoptimized />
                </div>
                <div className="text-xs space-y-1 text-gray-500">
                  <p className="font-semibold text-gray-800 break-all">{detail.filename}</p>
                  {detail.width && <p>📐 {detail.width} × {detail.height}px</p>}
                  <p>💾 {formatBytes(detail.size)}</p>
                  {detail.publicId && <p className="text-[#ec1f78] font-medium">☁️ Cloudinary</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Alt Text (SEO)</label>
                  <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-pink-500 focus:outline-none"
                    defaultValue={detail.alt || ""}
                    onBlur={e => updateAlt(detail.id, e.target.value)}
                    placeholder="Describe the image…" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">URL</label>
                  <div className="flex gap-1">
                    <input readOnly className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-100 font-mono truncate" value={detail.url} />
                    <button onClick={() => navigator.clipboard.writeText(detail.url)} className="border border-gray-200 rounded-lg px-2 text-xs hover:bg-gray-100" title="Copy URL">📋</button>
                  </div>
                </div>
                <button onClick={async () => { await fetch("/api/gallery/assets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: detail.id }) }); setDetail(null); setAssets(a => a.filter(x => x.id !== detail.id)); loadFolders(); }}
                  className="w-full py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-semibold">
                  🗑 Delete Image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} />
    </div>
  );
}
