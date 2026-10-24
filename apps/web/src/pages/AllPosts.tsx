import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { api } from '../lib/api';
import { SocialPostDTO, PostStatus } from '@socialhub/shared';

export const AllPosts: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<SocialPostDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [inspectPost, setInspectPost] = useState<SocialPostDTO | null>(null);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPosts(statusFilter !== 'ALL' ? statusFilter : undefined, search);
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPosts();
  };

  const handlePublishNow = async (id: string) => {
    try {
      const res: any = await api.publishPostNow(id);
      const post = res?.post || res?.data?.post;
      const failedTargets = post?.targets?.filter((t: any) => t.status === 'FAILED') || [];
      if (failedTargets.length > 0) {
        failedTargets.forEach((t: any) => {
          toast.error(`${t.platform} publishing failed: ${t.lastErrorMessage || 'Check account connection'}`, {
            duration: 8000,
          });
        });
      } else {
        toast.success('Post published successfully to all channels!');
      }
      loadPosts();
    } catch (err: any) {
      toast.error(`Publishing failed: ${err.message}`);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const res: any = await api.retryFailedPost(id);
      const post = res?.post || res?.data?.post;
      const failedTargets = post?.targets?.filter((t: any) => t.status === 'FAILED') || [];
      if (failedTargets.length > 0) {
        failedTargets.forEach((t: any) => {
          toast.error(`${t.platform} retry failed: ${t.lastErrorMessage || 'Check account connection'}`, {
            duration: 8000,
          });
        });
      } else {
        toast.success('Retry successful! Post published to channels.');
      }
      loadPosts();
    } catch (err: any) {
      toast.error(`Retry failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.deletePost(id);
      setPosts(posts.filter((p) => p.id !== id));
      toast.success('Post deleted successfully');
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const statuses = [
    'ALL',
    'PUBLISHED',
    'SCHEDULED',
    'DRAFT',
    'PARTIALLY_PUBLISHED',
    'FAILED',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Posts & Publishing Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, inspect channel results, and retry publishing jobs.
          </p>
        </div>

        <button
          onClick={() => navigate('/create')}
          className="py-2 px-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`py-1.5 px-3 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
            <p className="text-xs">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No posts found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or create a new post.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/70">
                  <th className="py-3 px-4">Caption</th>
                  <th className="py-3 px-4">Media</th>
                  <th className="py-3 px-4">Target Platforms</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                        {post.mainCaption || <span className="text-slate-400 italic">No text caption</span>}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      {post.media?.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={post.media[0].thumbnailUrl || post.media[0].url}
                            alt="thumb"
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                          />
                          {post.media.length > 1 && (
                            <span className="text-[10px] font-bold text-slate-500">
                              +{post.media.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {post.targets?.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              if (t.status === 'FAILED') {
                                toast.error(
                                  `${t.platform} Error: ${t.lastErrorMessage || 'Publishing failed. Please check account permissions or token.'}`,
                                  { duration: 9000 }
                                );
                              } else if (t.status === 'SUCCESS') {
                                toast.success(
                                  `${t.platform}: Published successfully!${t.remotePostId ? ` (ID: ${t.remotePostId})` : ''}`,
                                  { duration: 5000 }
                                );
                              } else {
                                toast(`${t.platform} status: ${t.status}`);
                              }
                            }}
                            title={
                              t.status === 'FAILED'
                                ? `Click to see error: ${t.lastErrorMessage || 'Failed'}`
                                : `Click to see ${t.platform} status`
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition hover:opacity-85 hover:scale-105 active:scale-95 ${
                              t.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : t.status === 'FAILED'
                                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 ring-1 ring-red-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.platform.slice(0, 2)}: {t.status}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (post.status === 'FAILED' || post.status === 'PARTIALLY_PUBLISHED') {
                            const failed = post.targets?.filter((t) => t.status === 'FAILED') || [];
                            if (failed.length > 0) {
                              failed.forEach((t) => {
                                toast.error(`${t.platform}: ${t.lastErrorMessage || 'Failed to publish'}`, {
                                  duration: 9000,
                                });
                              });
                            } else {
                              toast.error('Post failed during publishing. Click retry or inspect channels for details.', { duration: 7000 });
                            }
                          } else if (post.status === 'PUBLISHED') {
                            toast.success('Post successfully published to all channels!');
                          } else {
                            toast(`Post status: ${post.status}`);
                          }
                        }}
                        title={post.status === 'FAILED' ? 'Click to see failure error in toast' : undefined}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                          post.status === 'FAILED' ? 'cursor-pointer hover:bg-red-200 hover:ring-1 hover:ring-red-300 active:scale-95' : ''
                        } ${
                          post.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : post.status === 'SCHEDULED'
                            ? 'bg-brand-100 text-brand-800'
                            : post.status === 'PARTIALLY_PUBLISHED'
                            ? 'bg-amber-100 text-amber-800'
                            : post.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {post.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {post.scheduledTime ? (
                        <div className="flex items-center gap-1 text-brand-700">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{new Date(post.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      ) : (
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectPost(post)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          title="Inspect Channels"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(post.status === 'DRAFT' || post.status === 'FAILED') && (
                          <button
                            onClick={() => handlePublishNow(post.id)}
                            className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50"
                            title="Publish Now"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {(post.status === 'PARTIALLY_PUBLISHED' || post.status === 'FAILED') && (
                          <button
                            onClick={() => handleRetry(post.id)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                            title="Retry Failed Channels"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Target Results Inspector Modal */}
      {inspectPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Post Distribution Breakdown
                </span>
                <h3 className="font-bold text-sm text-slate-900">Post ID: {inspectPost.id}</h3>
              </div>
              <button onClick={() => setInspectPost(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-800 border border-slate-200 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {inspectPost.mainCaption}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Channel Status & Live IDs</span>
              {inspectPost.targets?.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-start justify-between text-xs space-y-1"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{t.platform}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          t.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700'
                            : t.status === 'FAILED'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    {t.remotePostId && (
                      <p className="text-[11px] text-slate-500 font-mono mt-1">ID: {t.remotePostId}</p>
                    )}
                    {t.lastErrorMessage && (
                      <p className="text-[11px] text-red-600 mt-1">{t.lastErrorMessage}</p>
                    )}
                  </div>

                  {t.publishedUrl && (
                    <a
                      href={t.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>View Live</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setInspectPost(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
