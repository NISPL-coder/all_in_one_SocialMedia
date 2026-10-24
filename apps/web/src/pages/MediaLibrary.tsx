import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Image as ImageIcon,
  UploadCloud,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  FileText,
  Video,
  Eye,
  Plus,
  Check,
} from 'lucide-react';
import { api } from '../lib/api';
import { MediaAssetDTO, MediaType } from '@socialhub/shared';

export const MediaLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [mediaList, setMediaList] = useState<MediaAssetDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAssetDTO | null>(null);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMediaList();
      setMediaList(data);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const f of Array.from(files)) {
        const item = await api.uploadMedia(f);
        setMediaList((prev) => [item, ...prev]);
      }
      toast.success('Media files uploaded successfully!');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this media asset?')) return;
    try {
      await api.deleteMedia(id);
      setMediaList(mediaList.filter((m) => m.id !== id));
      if (previewAsset?.id === id) setPreviewAsset(null);
      toast.success('Media asset deleted');
    } catch (err: any) {
      toast.error(`Delete error: ${err.message}`);
    }
  };

  const filtered = mediaList.filter((m) => {
    if (typeFilter !== 'ALL' && m.mediaType !== typeFilter) return false;
    if (search && !m.fileName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Media Assets Library</h1>
          <p className="text-xs text-slate-500 mt-1">
            Central repository for images, videos, and PDF brochures for multi-platform distribution.
          </p>
        </div>

        <label className="py-2 px-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          <span>Upload Files</span>
          <input
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {['ALL', 'IMAGE', 'VIDEO', 'DOCUMENT'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`py-1.5 px-3 rounded-xl text-xs font-medium transition ${
                typeFilter === t
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All Assets' : `${t}S`}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filenames..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {isUploading && (
        <div className="p-3 bg-brand-50 rounded-xl flex items-center gap-2 text-xs text-brand-700 border border-brand-200">
          <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Uploading asset and generating optimized thumbnails...</span>
        </div>
      )}

      {/* Media Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <p className="text-xs">Loading media library...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
          <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-medium text-slate-700">No media assets found</p>
          <p className="text-xs text-slate-400">Upload images, videos or documents to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div
                className="h-36 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer relative"
                onClick={() => setPreviewAsset(item)}
              >
                {item.mediaType === 'IMAGE' ? (
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : item.mediaType === 'VIDEO' ? (
                  <div className="text-center p-4">
                    <Video className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-500">Video Asset</span>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <FileText className="w-8 h-8 mx-auto text-brand-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-700">Document (PDF)</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <span className="p-1.5 rounded-full bg-white/90 text-slate-800">
                    <Eye className="w-4 h-4" />
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-900 truncate" title={item.fileName}>
                  {item.fileName}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{(item.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                  <span className="uppercase">{item.mediaType}</span>
                </div>
              </div>

              <div className="px-3 pb-3 flex items-center justify-between border-t border-slate-100 pt-2">
                <button
                  onClick={() => navigate('/create')}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  Use in Post
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-slate-400 hover:text-red-600 transition"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Asset Details
                </span>
                <h3 className="font-bold text-sm text-slate-900 truncate max-w-md">
                  {previewAsset.fileName}
                </h3>
              </div>
              <button onClick={() => setPreviewAsset(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="flex justify-center bg-slate-100 rounded-xl overflow-hidden max-h-96">
              {previewAsset.mediaType === 'IMAGE' ? (
                <img src={previewAsset.url} alt="full" className="max-h-96 object-contain" />
              ) : previewAsset.mediaType === 'VIDEO' ? (
                <video src={previewAsset.url} controls className="max-h-96 w-full" />
              ) : (
                <div className="p-12 text-center space-y-3">
                  <FileText className="w-16 h-16 text-brand-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">{previewAsset.fileName}</p>
                  <a
                    href={previewAsset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow"
                  >
                    <span>Open PDF Document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
              <div>
                <span>Size: {(previewAsset.fileSize / 1024 / 1024).toFixed(2)} MB • MIME: {previewAsset.mimeType}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewAsset.url);
                    toast.success('Asset URL copied to clipboard');
                  }}
                  className="py-1.5 px-3 rounded-lg border text-slate-600 hover:bg-slate-50"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
