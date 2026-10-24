import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  FileEdit,
  AlertTriangle,
  ArrowRight,
  Plus,
  Calendar,
  Share2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { SocialPostDTO, DashboardSummaryDTO, PLATFORM_CONFIGS, PlatformType } from '@socialhub/shared';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<SocialPostDTO[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumData, postsData, accsData] = await Promise.all([
        api.getDashboardSummary(),
        api.getPosts(),
        api.getAccounts(),
      ]);
      setSummary(sumData);
      setRecentPosts(postsData);
      setAccounts(accsData);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const upcomingScheduled = recentPosts
    .filter((p) => p.status === 'SCHEDULED' && p.scheduledTime)
    .sort((a, b) => new Date(a.scheduledTime!).getTime() - new Date(b.scheduledTime!).getTime())
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-500">Loading live publishing metrics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Posts',
      count: summary?.totalPosts || 0,
      icon: FileText,
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
    },
    {
      label: 'Published',
      count: summary?.publishedPosts || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      label: 'Scheduled',
      count: summary?.scheduledPosts || 0,
      icon: Clock,
      color: 'text-brand-600',
      bgColor: 'bg-brand-50',
      borderColor: 'border-brand-200',
    },
    {
      label: 'Drafts',
      count: summary?.draftPosts || 0,
      icon: FileEdit,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      label: 'Failed Jobs',
      count: summary?.failedPosts || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Publishing Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status across LinkedIn, Facebook, Instagram, WhatsApp, and Google Business Profile.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
            title="Refresh statistics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => navigate('/create')}
            className="py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`p-4 rounded-2xl bg-white border ${c.borderColor} shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{c.label}</span>
                <div className={`p-2 rounded-xl ${c.bgColor} ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight text-slate-900">{c.count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Publishing Actions Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 text-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Compose once, distribute to all platforms</h2>
            <p className="text-xs text-brand-200 max-w-xl">
              Write your caption, upload multi-resolution media or PDF brochures, and review realistic mock previews for all 5 official platform engines before publishing.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/calendar')}
              className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => navigate('/create')}
              className="py-2 px-4 rounded-xl bg-white text-brand-900 hover:bg-brand-50 text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Launch Composer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Platform Health & Upcoming Schedules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Status & Analytics */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Platform-Wise Publishing Activity</h3>
              <p className="text-[11px] text-slate-400">Total success, pending and error breakdown</p>
            </div>
            <button
              onClick={() => navigate('/accounts')}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Manage Accounts</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {(Object.keys(PLATFORM_CONFIGS) as PlatformType[]).map((platform) => {
              const cfg = PLATFORM_CONFIGS[platform];
              const stats = summary?.platformStats?.[platform] || { published: 0, scheduled: 0, failed: 0, connected: false };
              const acc = accounts.find((a) => a.platform === platform);

              return (
                <div
                  key={platform}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shadow-xs">
                      {platform.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-slate-900">{cfg.name}</span>
                        {acc?.status === 'CONNECTED' ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.2 rounded">
                            Not Configured
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {acc?.accountName || 'No account attached'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="font-semibold text-emerald-600">{stats.published}</span>
                      <span className="text-slate-400 text-[10px] block">Published</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-brand-600">{stats.scheduled}</span>
                      <span className="text-slate-400 text-[10px] block">Scheduled</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${stats.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {stats.failed}
                      </span>
                      <span className="text-slate-400 text-[10px] block">Errors</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Scheduled Posts Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Upcoming Queue</h3>
              <p className="text-[11px] text-slate-400">Next scheduled distribution jobs</p>
            </div>
            <button
              onClick={() => navigate('/calendar')}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {upcomingScheduled.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">No posts currently queued in scheduling worker.</p>
              <button
                onClick={() => navigate('/create')}
                className="text-xs text-brand-600 font-medium underline"
              >
                Schedule a post now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingScheduled.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate('/posts')}
                  className="p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/20 cursor-pointer transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                      {new Date(p.scheduledTime!).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      {p.targets?.map((t) => (
                        <span key={t.id} className="px-1 bg-slate-100 rounded">
                          {t.platform.slice(0, 2)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-800 font-medium line-clamp-2">
                    {p.mainCaption || '(Media post without master text)'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Errors Alert Box (If Any) */}
      {summary?.recentErrors && summary.recentErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
          <div className="flex items-center gap-2 text-red-800 font-semibold text-xs">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Recent Publishing Diagnostic Notices ({summary.recentErrors.length})</span>
          </div>
          <div className="space-y-1.5">
            {summary.recentErrors.map((err: any) => (
              <div key={err.id} className="text-xs text-red-700 bg-white/80 p-2 rounded-lg flex items-center justify-between border border-red-100">
                <span className="font-medium">[{err.platform}] {err.errorMessage}</span>
                <span className="text-[10px] text-slate-400 font-mono">{err.errorCode || 'ERR'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">Recent Posts</h3>
            <p className="text-[11px] text-slate-400">Unified posts created in the workspace</p>
          </div>
          <button
            onClick={() => navigate('/posts')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>View All Posts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPosts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No posts created yet.</p>
            <button
              onClick={() => navigate('/create')}
              className="py-2 px-4 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition"
            >
              Compose Your First Post
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Caption</th>
                  <th className="py-2.5 px-3">Media</th>
                  <th className="py-2.5 px-3">Target Platforms</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPosts.slice(0, 5).map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 max-w-xs">
                      <p className="font-medium text-slate-800 line-clamp-1">{post.mainCaption || 'No caption text'}</p>
                    </td>
                    <td className="py-3 px-3">
                      {post.media?.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={post.media[0].thumbnailUrl || post.media[0].url}
                            alt="preview"
                            className="w-7 h-7 rounded object-cover border border-slate-200"
                          />
                          {post.media.length > 1 && (
                            <span className="text-[10px] text-slate-400 font-semibold">+{post.media.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        {post.targets?.map((t) => (
                          <span
                            key={t.id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : t.status === 'FAILED'
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.platform.slice(0, 2)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
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
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate('/posts')}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Inspect
                      </button>
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
