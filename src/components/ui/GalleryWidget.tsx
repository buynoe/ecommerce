"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Image as ImageIcon, Upload, AlertTriangle, Check, Home, FolderOpen, Folder } from "lucide-react";

interface Asset {
  id: string; url: string; thumbnailUrl?: string; filename: string;
  size: number; width?: number; height?: number; alt?: string; folderId?: string | null;
}
interface Folder { id: string; name: string; slug: string; _count?: { files: number } }

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (assets: Asset[]) => void;
  multiple?: boolean;
  selected?: string[];
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function GalleryWidget({ open, onClose, onSelect, multiple = true, selected: externalSelected = [] }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [detail, setDetail] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    try {
      const r = await fetch("/api/gallery/folders");
      if (!r.ok) return;
      const d = await r.json();
      setFolders(d.folders || []);
    } catch {
      // non-critical, ignore
    }
  }, []);

  const loadAssets = useCallback(async (folderId: string | null, q: string) => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (folderId !== null) params.set("folderId", folderId);
      if (q.trim()) params.set("search", q.trim());
      const r = await fetch(`/api/gallery/assets?${params}`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setLoadError(err.error || `Error ${r.status}`);
        setAssets([]);
        return;
      }
      const d = await r.json();
      setAssets(d.assets || []);
    } catch (e) {
      setLoadError("Network error — could not load images");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load when gallery opens
  useEffect(() => {
    if (!open) return;
    setActiveFolderId(null);
    setSearch("");
    setSelected(externalSelected);
    setDetail(null);
    setUploadError("");
    setLoadError("");
    loadFolders();
    loadAssets(null, "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reload when folder changes
  useEffect(() => {
    if (!open) return;
    loadAssets(activeFolderId, search);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolderId]);

  // Debounced search
  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadAssets(activeFolderId, val);
    }, 350);
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError("");
    let done = 0;
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (activeFolderId && activeFolderId !== "null") fd.append("folderId", activeFolderId);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          errors.push(`${file.name}: ${d.error || "Upload failed"}`);
        }
      } catch {
        errors.push(`${file.name}: Network error`);
      }
      done++;
      setUploadProgress(Math.round((done / files.length) * 100));
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (errors.length) setUploadError(errors.join(" · "));
    // Reload regardless — some may have succeeded
    await loadAssets(activeFolderId, search);
    await loadFolders();
  }

  // ── Folder ────────────────────────────────────────────────────────────────

  async function createFolder() {
    if (!newFolderName.trim()) return;
    await fetch("/api/gallery/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName }),
    });
    setNewFolderName(""); setShowNewFolder(false);
    loadFolders();
  }

  // ── Asset actions ─────────────────────────────────────────────────────────

  async function deleteAsset(id: string) {
    if (!confirm("Delete this image permanently?")) return;
    await fetch("/api/gallery/assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDetail(null);
    setAssets(a => a.filter(x => x.id !== id));
    loadFolders();
  }

  async function updateAlt(id: string, alt: string) {
    await fetch("/api/gallery/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, alt }),
    });
    setAssets(a => a.map(x => x.id === id ? { ...x, alt } : x));
    if (detail?.id === id) setDetail(d => d ? { ...d, alt } : d);
  }

  function toggleSelect(id: string) {
    if (!multiple) { setSelected([id]); return; }
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function confirm_() {
    const chosen = assets.filter(a => selected.includes(a.id));
    onSelect(chosen);
    onClose();
  }

  // ── Drag-and-drop on grid ─────────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col" style={{ height: "min(85vh, 700px)" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-gray-500" />
            <h2 className="font-bold text-gray-900 text-lg">Media Gallery</h2>
            {selected.length > 0 && (
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {selected.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search images…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none w-48"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? `Uploading ${uploadProgress}%` : <><Upload className="w-4 h-4" /> Upload</>}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Upload error ── */}
        {uploadError && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {uploadError}</span>
            <button onClick={() => setUploadError("")} className="text-red-400 hover:text-red-600 ml-3">×</button>
          </div>
        )}

        {/* ── Upload progress bar ── */}
        {uploading && (
          <div className="mx-4 mt-3 shrink-0">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-green-700 font-medium">Uploading…</span>
              <span className="text-green-600">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* ── Folder Sidebar ── */}
          <div className="w-52 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 overflow-y-auto">
            <div className="p-3 border-b border-gray-200">
              <button
                onClick={() => setShowNewFolder(v => !v)}
                className="w-full text-left text-xs text-green-600 font-semibold hover:underline flex items-center gap-1"
              >
                + New Folder
              </button>
              {showNewFolder && (
                <div className="mt-2 flex gap-1">
                  <input
                    autoFocus
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-green-500 focus:outline-none"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && createFolder()}
                    placeholder="Folder name"
                  />
                  <button onClick={createFolder} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold"><Check className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            <div className="flex-1 p-2 space-y-0.5">
              {[
                { id: null, label: "All Images", Icon: Home },
                { id: "null", label: "Uncategorized", Icon: FolderOpen },
              ].map(item => (
                <button
                  key={String(item.id)}
                  onClick={() => setActiveFolderId(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    activeFolderId === item.id ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <item.Icon className="w-4 h-4 shrink-0" /> {item.label}
                </button>
              ))}

              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFolderId(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors ${
                    activeFolderId === f.id ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Folder className="w-4 h-4 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </span>
                  {f._count?.files !== undefined && (
                    <span className={`text-xs shrink-0 ${activeFolderId === f.id ? "text-green-100" : "text-gray-400"}`}>
                      {f._count.files}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Main Grid ── */}
          <div className="flex-1 flex min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4" onDragOver={e => e.preventDefault()} onDrop={onDrop}>

              {/* Load error */}
              {loadError && !loading && (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                  <p className="text-red-600 font-medium text-sm">{loadError}</p>
                  <button onClick={() => loadAssets(activeFolderId, search)}
                    className="text-sm text-green-600 hover:underline font-semibold">Try again</button>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && !loadError && (
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {/* Empty state / drop zone */}
              {!loading && !loadError && assets.length === 0 && (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={onDrop}
                  className="h-64 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <Upload className="w-12 h-12 mb-3 text-gray-400" />
                  <p className="font-semibold text-gray-600 mb-1">Drop images here or click to upload</p>
                  <p className="text-xs text-gray-400">JPEG, PNG, WebP, GIF — max 10 MB each</p>
                </div>
              )}

              {/* Image grid */}
              {!loading && !loadError && assets.length > 0 && (
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
                >
                  {assets.map(asset => {
                    const isSel = selected.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                          isSel ? "border-green-500 ring-2 ring-green-300" : "border-transparent hover:border-gray-300"
                        }`}
                        onClick={() => toggleSelect(asset.id)}
                        onDoubleClick={() => setDetail(asset)}
                      >
                        <div className="aspect-square bg-gray-100 relative">
                          <Image
                            src={asset.thumbnailUrl || asset.url}
                            alt={asset.alt || asset.filename}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        {isSel && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">{asset.filename}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Detail Panel ── */}
            {detail && (
              <div className="w-64 shrink-0 border-l border-gray-200 flex flex-col bg-gray-50 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Image Details</span>
                  <button onClick={() => setDetail(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">×</button>
                </div>
                <div className="p-3 space-y-3 flex-1">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative">
                    <Image
                      src={detail.thumbnailUrl || detail.url}
                      alt={detail.alt || ""}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p className="font-semibold text-gray-700 truncate">{detail.filename}</p>
                    {detail.width && <p>{detail.width} × {detail.height} px</p>}
                    <p>{formatBytes(detail.size)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Alt Text</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500 focus:outline-none"
                      defaultValue={detail.alt || ""}
                      onBlur={e => updateAlt(detail.id, e.target.value)}
                      placeholder="Describe the image…"
                    />
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <button
                      onClick={() => { toggleSelect(detail.id); setDetail(null); }}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                        selected.includes(detail.id)
                          ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {selected.includes(detail.id) ? "Deselect" : "Select Image"}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(detail.url)}
                      className="w-full py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Copy URL
                    </button>
                    <button
                      onClick={() => deleteAsset(detail.id)}
                      className="w-full py-2 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Delete Image
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-2xl">
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${assets.length} image${assets.length !== 1 ? "s" : ""}`}
            {selected.length > 0 && <span className="text-green-600 font-medium"> · {selected.length} selected</span>}
            {!loading && assets.length > 0 && <span className="text-gray-400"> · Double-click for details</span>}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 font-medium transition-colors">
              Cancel
            </button>
            <button
              onClick={confirm_}
              disabled={selected.length === 0}
              className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {selected.length > 0 ? `Insert ${selected.length} image${selected.length > 1 ? "s" : ""}` : "Select an image"}
            </button>
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} />
    </div>
  );
}
