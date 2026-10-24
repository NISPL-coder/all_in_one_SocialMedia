import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../lib/api';
import { SocialPostDTO } from '@socialhub/shared';

export const PublishingHistory: React.FC = () => {
  const [posts, setPosts] = useState<SocialPostDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPosts();
      setPosts(data.filter((p) => p.status !== 'DRAFT'));
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = posts.filter((p) =>
    search ? p.mainCaption.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Publishing History & Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete immutable log of all broadcast and scheduled attempts with external remote IDs.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-xs">Loading publishing log...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No published or scheduled history recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/70">
                  <th className="py-3 px-4">Post & Caption</th>
                  <th className="py-3 px-4">Channel Target Results</th>
                  <th className="py-3 px-4">Overall Status</th>
                  <th className="py-3 px-4">Execution Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800 line-clamp-2">
                        {post.mainCaption || '(No text)'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {post.id}</p>
                    </td>

                    <td className="py-3.5 px-4 space-y-1.5">
                      {post.targets?.map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : t.status === 'FAILED'
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {t.platform}: {t.status}
                          </span>

                          {t.remotePostId && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              #{t.remotePostId.slice(-12)}
                            </span>
                          )}

                          {t.publishedUrl && (
                            <a
                              href={t.publishedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-brand-600 hover:underline flex items-center gap-0.5"
                            >
                              <span>Link</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}

                          {t.lastErrorMessage && (
                            <span className="text-[10px] text-red-600 truncate max-w-xs" title={t.lastErrorMessage}>
                              ({t.lastErrorMessage})
                            </span>
                          )}
                        </div>
                      ))}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          post.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : post.status === 'SCHEDULED'
                            ? 'bg-brand-100 text-brand-800'
                            : post.status === 'PARTIALLY_PUBLISHED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(post.publishedAt || post.scheduledTime || post.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
