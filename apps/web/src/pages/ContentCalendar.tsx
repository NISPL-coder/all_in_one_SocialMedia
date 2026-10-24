import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Filter,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { api } from '../lib/api';
import { SocialPostDTO, PlatformType, PLATFORM_CONFIGS } from '@socialhub/shared';

export const ContentCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<SocialPostDTO[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedPost, setSelectedPost] = useState<SocialPostDTO | null>(null);

  useEffect(() => {
    api.getPosts().then(setPosts).catch(console.error);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const filteredPosts = posts.filter((p) => {
    if (selectedPlatform !== 'ALL') {
      return p.targets?.some((t) => t.platform === selectedPlatform);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Content Calendar</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual timeline of scheduled and published social media distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Platform Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Networks</option>
              {Object.keys(PLATFORM_CONFIGS).map((k) => (
                <option key={k} value={k}>
                  {PLATFORM_CONFIGS[k as PlatformType].name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/create')}
            className="py-2 px-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {/* Calendar Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-slate-900 min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          Jump to Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 text-center py-2 text-xs font-semibold text-slate-500 bg-slate-50">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {calendarDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            // Find posts scheduled or published on this day
            const dayPosts = filteredPosts.filter((p) => {
              const targetDate = p.scheduledTime ? new Date(p.scheduledTime) : new Date(p.createdAt);
              return isSameDay(targetDate, day);
            });

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition ${
                  isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-400'
                } ${isToday ? 'ring-2 ring-brand-500/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                      isToday ? 'bg-brand-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-bold">{dayPosts.length}</span>
                  )}
                </div>

                <div className="space-y-1 mt-1 overflow-y-auto max-h-[80px]">
                  {dayPosts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPost(p)}
                      className={`p-1.5 rounded-lg border text-[10px] font-medium cursor-pointer transition truncate ${
                        p.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : p.status === 'SCHEDULED'
                          ? 'bg-brand-50 text-brand-800 border-brand-200 hover:bg-brand-100'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-bold mr-1">
                        {p.scheduledTime ? format(new Date(p.scheduledTime), 'HH:mm') : 'Draft'}
                      </span>
                      <span>{p.mainCaption || 'Post'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Post Modal / Detail Drawer */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Post Details
                </span>
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedPost.status} • {new Date(selectedPost.scheduledTime || selectedPost.createdAt).toLocaleString()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-800 p-3 bg-slate-50 rounded-xl whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-slate-200">
              {selectedPost.mainCaption}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">Target Channels</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedPost.targets?.map((t) => (
                  <span
                    key={t.id}
                    className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
                  >
                    {t.platform}: <strong className="font-bold">{t.status}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setSelectedPost(null)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedPost(null);
                  navigate('/posts');
                }}
                className="py-2 px-4 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow"
              >
                View in Posts Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
