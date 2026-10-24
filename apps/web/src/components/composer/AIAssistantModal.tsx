import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, X, Check, Copy, Wand2, Hash, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { AICaptionResponse, PlatformType } from '@socialhub/shared';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCaption: (caption: string, platformVariations?: Record<PlatformType, string>) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyCaption,
}) => {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'professional' | 'engaging' | 'casual' | 'promotional' | 'informative'>('engaging');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AICaptionResponse | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.generateAICaptions({
        prompt,
        tone,
        includeHashtags,
        includeEmojis,
      });
      setResult(res);
      toast.success('AI captions generated successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to generate AI content';
      console.error('Failed to generate AI content:', err);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-brand-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">AI Content Strategist</h3>
              <p className="text-xs text-slate-500">Draft, refine and customize captions across platforms</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              What do you want to announce or share?
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. We just released SocialHub 2.0 with unified scheduling and WhatsApp Cloud API support..."
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
          </div>

          {/* Controls: Tone & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="engaging">Engaging & Conversational</option>
                <option value="professional">Executive & Professional</option>
                <option value="promotional">Promotional & Launch Offer</option>
                <option value="casual">Friendly & Casual</option>
                <option value="informative">Technical & Educational</option>
              </select>
            </div>

            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHashtags}
                  onChange={(e) => setIncludeHashtags(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Include Hashtags</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEmojis}
                  onChange={(e) => setIncludeEmojis(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Include Emojis</span>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition shadow disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Crafting Tailored Captions...' : 'Generate Multi-Platform Copy'}</span>
          </button>

          {/* Result Section */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Master Caption
                  </span>
                  <button
                    onClick={() => onApplyCaption(result.caption, result.platformVariations)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply to Composer</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {result.caption}
                </div>
              </div>

              {/* Hashtags */}
              {result.hashtags?.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
                    Suggested Hashtags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.map((h, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-brand-50 text-brand-700 text-xs font-medium border border-brand-100"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Variations Previews */}
              {result.platformVariations && (
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
                    Platform Tailored Versions
                  </span>
                  <div className="space-y-2">
                    {Object.entries(result.platformVariations).map(([plt, text]) => (
                      <div key={plt} className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">{plt}</span>
                          <button
                            onClick={() => onApplyCaption(text as string)}
                            className="text-[11px] font-medium text-brand-600 hover:underline"
                          >
                            Use This Version
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{text as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
