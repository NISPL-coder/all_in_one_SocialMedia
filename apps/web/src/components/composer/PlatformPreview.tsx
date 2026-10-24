import React, { useState } from 'react';
import {
  PlatformType,
  MediaAssetDTO,
  PLATFORM_CONFIGS,
} from '@socialhub/shared';
import {
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
  Heart,
  Bookmark,
  Share2,
  Check,
  CheckCheck,
  AlertTriangle,
  FileText,
  ExternalLink,
  MapPin,
  Calendar,
} from 'lucide-react';

interface PlatformPreviewProps {
  platform: PlatformType;
  caption: string;
  media: MediaAssetDTO[];
  accountName?: string;
  avatarUrl?: string;
  recipientPhone?: string;
  locationId?: string;
  ctaType?: string;
  ctaUrl?: string;
}

export const PlatformPreview: React.FC<PlatformPreviewProps> = ({
  platform,
  caption,
  media,
  accountName = 'TechVision Global',
  avatarUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  recipientPhone,
  locationId,
  ctaType = 'LEARN_MORE',
  ctaUrl = 'https://techvision.io',
}) => {
  const config = PLATFORM_CONFIGS[platform];
  const charCount = caption?.length || 0;
  const isOverLimit = charCount > config.maxCharacters;

  // Platform specific media checks
  const docMedia = media.filter((m) => m.mediaType === 'DOCUMENT');
  const videoMedia = media.filter((m) => m.mediaType === 'VIDEO');
  const imageMedia = media.filter((m) => m.mediaType === 'IMAGE');

  const warnings: string[] = [];
  if (isOverLimit) {
    warnings.push(`Exceeds limit by ${charCount - config.maxCharacters} characters`);
  }
  if (docMedia.length > 0 && !config.supportsDocuments) {
    warnings.push(`Documents (PDF) are not supported on ${config.name}. File will be omitted.`);
  }
  if (platform === 'INSTAGRAM' && media.length === 0) {
    warnings.push('Instagram requires at least one image or video asset.');
  }
  if (platform === 'WHATSAPP' && !recipientPhone) {
    warnings.push('A designated recipient phone number is required to route this message.');
  }
  if (platform === 'GOOGLE_BUSINESS' && !locationId) {
    warnings.push('A Google Business Profile location must be selected.');
  }

  return (
    <div className="space-y-4">
      {/* Platform Warning Banners */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Platform Restrictions Notice:</span>
          </div>
          <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Realistic Platform Mock Renderers */}
      <div className="bg-slate-100 p-4 sm:p-6 rounded-2xl flex justify-center">
        {platform === 'LINKEDIN' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden text-slate-900 text-xs font-sans">
            {/* Header */}
            <div className="p-3.5 flex items-start gap-2.5">
              <img src={avatarUrl} alt={accountName} className="w-10 h-10 rounded-full object-cover border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs text-slate-900 truncate">{accountName}</span>
                  <span className="text-[10px] text-slate-400">• 1st</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">14,280 followers</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span>Just now</span> • <span>🌐</span>
                </p>
              </div>
            </div>

            {/* Commentary Text */}
            <div className="px-3.5 pb-2 whitespace-pre-wrap leading-relaxed text-slate-800 text-[12px]">
              {caption || <span className="text-slate-400 italic">Post commentary preview...</span>}
            </div>

            {/* Media Attachment */}
            {media.length > 0 && (
              <div className="border-t border-b border-slate-100 bg-slate-50">
                {docMedia.length > 0 ? (
                  <div className="p-6 bg-slate-800 text-white flex flex-col items-center justify-center text-center space-y-2">
                    <FileText className="w-10 h-10 text-brand-400" />
                    <span className="font-semibold text-xs">{docMedia[0].fileName}</span>
                    <span className="text-[10px] text-slate-300">Document Carousel (PDF) • 1 / 8</span>
                  </div>
                ) : imageMedia.length > 0 ? (
                  <img src={imageMedia[0].url} alt="Media" className="w-full max-h-72 object-cover" />
                ) : videoMedia.length > 0 ? (
                  <video src={videoMedia[0].url} className="w-full max-h-72 bg-black" controls />
                ) : null}
              </div>
            )}

            {/* Social Engagement Counters */}
            <div className="px-3.5 py-2 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100">
              <span className="flex items-center gap-1">👍 💡 42</span>
              <span>8 comments • 2 reposts</span>
            </div>

            {/* Action Bar */}
            <div className="px-3 py-1 flex items-center justify-around text-slate-600 font-medium text-[11px]">
              <button className="flex items-center gap-1.5 py-2 px-2 hover:bg-slate-50 rounded">
                <ThumbsUp className="w-3.5 h-3.5" /> Like
              </button>
              <button className="flex items-center gap-1.5 py-2 px-2 hover:bg-slate-50 rounded">
                <MessageSquare className="w-3.5 h-3.5" /> Comment
              </button>
              <button className="flex items-center gap-1.5 py-2 px-2 hover:bg-slate-50 rounded">
                <Repeat2 className="w-3.5 h-3.5" /> Repost
              </button>
              <button className="flex items-center gap-1.5 py-2 px-2 hover:bg-slate-50 rounded">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        )}

        {platform === 'FACEBOOK' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden text-slate-900 text-xs font-sans">
            {/* Header */}
            <div className="p-3.5 flex items-center gap-2.5">
              <img src={avatarUrl} alt={accountName} className="w-9 h-9 rounded-full object-cover border" />
              <div>
                <span className="font-semibold text-xs text-slate-900">{accountName}</span>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span>Just now</span> • <span>🌍</span>
                </p>
              </div>
            </div>

            {/* Message */}
            <div className="px-3.5 pb-2 whitespace-pre-wrap text-slate-800 text-[12px] leading-relaxed">
              {caption || <span className="text-slate-400 italic">Facebook page post preview...</span>}
            </div>

            {/* Media */}
            {imageMedia.length > 0 && (
              <img src={imageMedia[0].url} alt="FB media" className="w-full max-h-72 object-cover border-t border-b" />
            )}
            {videoMedia.length > 0 && (
              <video src={videoMedia[0].url} className="w-full max-h-72 bg-black" controls />
            )}

            {/* Actions */}
            <div className="px-3.5 py-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-b border-slate-100">
              <span>❤️ 👍 68</span>
              <span>12 Comments</span>
            </div>
            <div className="px-2 py-1 flex items-center justify-around text-slate-600 font-medium text-[11px]">
              <button className="flex items-center gap-1 py-1.5 px-3 hover:bg-slate-50 rounded">Like</button>
              <button className="flex items-center gap-1 py-1.5 px-3 hover:bg-slate-50 rounded">Comment</button>
              <button className="flex items-center gap-1 py-1.5 px-3 hover:bg-slate-50 rounded">Share</button>
            </div>
          </div>
        )}

        {platform === 'INSTAGRAM' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-sm w-full overflow-hidden text-slate-900 text-xs font-sans">
            {/* Instagram Header */}
            <div className="p-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                  <img src={avatarUrl} alt="IG" className="w-full h-full rounded-full object-cover border border-white" />
                </div>
                <span className="font-semibold text-xs text-slate-900">techvision.io</span>
              </div>
              <span className="text-slate-400 font-bold">•••</span>
            </div>

            {/* Image / Carousel */}
            <div className="aspect-square bg-slate-900 flex items-center justify-center overflow-hidden">
              {imageMedia.length > 0 ? (
                <img src={imageMedia[0].url} alt="IG photo" className="w-full h-full object-cover" />
              ) : videoMedia.length > 0 ? (
                <video src={videoMedia[0].url} className="w-full h-full object-cover" controls />
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">
                  <p>Instagram requires an image or video.</p>
                </div>
              )}
            </div>

            {/* Action icons */}
            <div className="p-3 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-800">
                <Heart className="w-5 h-5 hover:text-red-500 cursor-pointer" />
                <MessageSquare className="w-5 h-5 cursor-pointer" />
                <Send className="w-5 h-5 cursor-pointer" />
              </div>
              <Bookmark className="w-5 h-5 cursor-pointer" />
            </div>

            {/* Likes & Caption */}
            <div className="px-3 pb-3 space-y-1">
              <p className="font-bold text-[11px] text-slate-900">128 likes</p>
              <div className="text-[11px] text-slate-800 leading-normal">
                <span className="font-bold mr-1.5">techvision.io</span>
                <span className="whitespace-pre-wrap">{caption}</span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider pt-1">Just now</p>
            </div>
          </div>
        )}

        {platform === 'WHATSAPP' && (
          <div className="bg-[#efeae2] rounded-2xl border border-slate-300 shadow-sm max-w-sm w-full p-4 font-sans text-xs">
            <div className="bg-white/90 backdrop-blur rounded-xl p-2.5 mb-3 border border-slate-200 text-center text-[10px] text-slate-500">
              🔒 End-to-end encrypted business messaging • Recipient: {recipientPhone || '+1 (555) 234-5678'}
            </div>

            <div className="flex justify-end">
              <div className="bg-[#d9fdd3] rounded-2xl rounded-tr-none p-3 shadow-xs max-w-[85%] space-y-2 border border-[#c4e9be]">
                {imageMedia.length > 0 && (
                  <img src={imageMedia[0].url} alt="WA" className="w-full rounded-xl object-cover max-h-48" />
                )}
                {docMedia.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="font-medium text-[11px] truncate">{docMedia[0].fileName}</p>
                      <p className="text-[9px] text-slate-400">PDF Document</p>
                    </div>
                  </div>
                )}
                <div className="text-[12px] text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {caption || 'WhatsApp broadcast message...'}
                </div>
                <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500">
                  <span>10:42 AM</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {platform === 'GOOGLE_BUSINESS' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md max-w-sm w-full overflow-hidden font-sans text-xs">
            {imageMedia.length > 0 ? (
              <img src={imageMedia[0].url} alt="GBP" className="w-full h-44 object-cover" />
            ) : (
              <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400">
                <span>Google Business Update</span>
              </div>
            )}

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span className="font-medium text-slate-700">{accountName}</span>
              </div>

              <div className="text-slate-800 text-[12px] whitespace-pre-wrap leading-relaxed">
                {caption || 'Google Business local post summary...'}
              </div>

              {ctaType && ctaType !== 'NONE' && (
                <div className="pt-2">
                  <a
                    href={ctaUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition shadow-sm"
                  >
                    <span>{ctaType.replace('_', ' ')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Length & Limits Status */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <span>
          Character Usage: <strong className={isOverLimit ? 'text-red-600 font-bold' : 'text-slate-800'}>{charCount}</strong> / {config.maxCharacters.toLocaleString()}
        </span>
        <span>
          Media: <strong className="text-slate-800">{media.length}</strong> / {config.maxMediaItems} allowed
        </span>
      </div>
    </div>
  );
};
