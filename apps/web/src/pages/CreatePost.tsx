import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Sparkles,
  UploadCloud,
  X,
  FileText,
  Calendar,
  Clock,
  Send,
  Save,
  Eye,
  Check,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Smartphone,
  MapPin,
  Smile,
  Hash,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  PlatformType,
  PLATFORM_CONFIGS,
  MediaAssetDTO,
  ConnectedAccountDTO,
} from '@socialhub/shared';
import { PlatformPreview } from '../components/composer/PlatformPreview';
import { AIAssistantModal } from '../components/composer/AIAssistantModal';

export const CreatePost: React.FC = () => {
  const navigate = useNavigate();

  // Composer State
  const [mainCaption, setMainCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([
    'LINKEDIN',
    'FACEBOOK',
    'INSTAGRAM',
  ]);
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string>>({});
  const [uploadedMedia, setUploadedMedia] = useState<MediaAssetDTO[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Platform Specific Extra Configs
  const [recipientPhone, setRecipientPhone] = useState('+15552345678');
  const [locationId, setLocationId] = useState('locations/10928374619283746192');
  const [ctaType, setCtaType] = useState('LEARN_MORE');
  const [ctaUrl, setCtaUrl] = useState('https://techvision.io');

  // Preview & Tab State
  const [activePreviewTab, setActivePreviewTab] = useState<PlatformType>('LINKEDIN');
  const [showAIModal, setShowAIModal] = useState(false);

  // Scheduling State
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  // Connected Accounts
  const [accounts, setAccounts] = useState<ConnectedAccountDTO[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(console.error);
  }, []);

  // Platform selection toggler
  const togglePlatform = (p: PlatformType) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length === 1) return; // Keep at least one
      setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
      if (activePreviewTab === p) {
        const remaining = selectedPlatforms.filter((item) => item !== p);
        if (remaining.length > 0) setActivePreviewTab(remaining[0]);
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
      setActivePreviewTab(p);
    }
  };

  // Media upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setFeedback(null);
    try {
      const uploadPromises = Array.from(files).map((file) => api.uploadMedia(file));
      const newAssets = await Promise.all(uploadPromises);
      setUploadedMedia((prev) => [...prev, ...newAssets]);
      toast.success(`${newAssets.length} media file(s) uploaded successfully!`);
    } catch (err: any) {
      const msg = err.message || 'Media upload failed';
      setFeedback({ type: 'error', message: msg });
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (id: string) => {
    setUploadedMedia((prev) => prev.filter((m) => m.id !== id));
  };

  // Submit action (Draft, Publish Now, or Schedule)
  const handleSubmit = async (mode: 'DRAFT' | 'PUBLISH_NOW' | 'SCHEDULE') => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      let finalScheduledIso: string | null = null;
      if (mode === 'SCHEDULE') {
        finalScheduledIso = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      }

      const targets = selectedPlatforms.map((p) => {
        const acc = accounts.find((a) => a.platform === p);
        return {
          platform: p,
          connectedAccountId: acc?.id || undefined,
          customCaption: platformOverrides[p] || undefined,
          recipientPhone: p === 'WHATSAPP' ? recipientPhone : undefined,
          locationId: p === 'GOOGLE_BUSINESS' ? locationId : undefined,
          ctaType: p === 'GOOGLE_BUSINESS' ? ctaType : undefined,
          ctaUrl: p === 'GOOGLE_BUSINESS' ? ctaUrl : undefined,
        };
      });

      if (mode === 'PUBLISH_NOW') {
        const demoTargets = targets.filter((t) => {
          const acc = accounts.find((a: any) => a.id === t.connectedAccountId);
          return acc && (acc.isConfigured === false || acc.accountName?.includes('TechVision'));
        });
        if (demoTargets.length > 0) {
          const names = demoTargets.map((t) => t.platform).join(', ');
          const demoMsg = `Cannot publish live: ${names} is currently set to a Demo Placeholder account. Please go to Connected Accounts to link your live account first.`;
          setFeedback({
            type: 'error',
            message: demoMsg,
          });
          toast.error(demoMsg, { duration: 6000 });
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        mainCaption,
        mediaIds: uploadedMedia.map((m) => m.id),
        targets,
        publishNow: mode === 'PUBLISH_NOW',
        scheduledTime: finalScheduledIso,
      };

      const created: any = await api.createPost(payload);

      if (mode === 'PUBLISH_NOW') {
        const failedTargets = created?.targets?.filter((t: any) => t.status === 'FAILED') || [];
        if (failedTargets.length > 0) {
          failedTargets.forEach((t: any) => {
            toast.error(`${t.platform} publishing failed: ${t.lastErrorMessage || 'Check account permissions'}`, {
              duration: 9000,
            });
          });
          setFeedback({
            type: 'error',
            message: `Publishing failed: ${failedTargets.map((t: any) => `${t.platform}: ${t.lastErrorMessage || 'Failed'}`).join(' | ')}`,
          });
          setTimeout(() => navigate('/posts'), 2500);
        } else {
          const successMsg = 'Post successfully published to all channels!';
          setFeedback({
            type: 'success',
            message: successMsg,
          });
          toast.success(successMsg);
          setTimeout(() => navigate('/posts'), 1200);
        }
      } else if (mode === 'SCHEDULE') {
        const schedMsg = `Post successfully scheduled for ${new Date(finalScheduledIso!).toLocaleString()}!`;
        setFeedback({
          type: 'success',
          message: schedMsg,
        });
        toast.success(schedMsg);
        setTimeout(() => navigate('/calendar'), 1200);
      } else {
        const draftMsg = 'Draft saved successfully.';
        setFeedback({
          type: 'success',
          message: draftMsg,
        });
        toast.success(draftMsg);
        setTimeout(() => navigate('/posts'), 1000);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Operation failed';
      setFeedback({
        type: 'error',
        message: errMsg,
      });
      toast.error(errMsg, { duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyAICaption = (
    caption: string,
    variations?: Record<PlatformType, string>
  ) => {
    setMainCaption(caption);
    if (variations) {
      setPlatformOverrides(variations);
    }
    setShowAIModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Unified Content Composer</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create in one place, customize per channel, and publish across all 5 networks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIModal(true)}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-brand-200" />
            <span>AI Copy Assistant</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Composer on Left, Tabbed Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Editor & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Target Platforms Selector Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Select Target Platforms
              </span>
              <span className="text-[11px] text-slate-400">
                {selectedPlatforms.length} of 5 selected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(Object.keys(PLATFORM_CONFIGS) as PlatformType[]).map((platform) => {
                const config = PLATFORM_CONFIGS[platform];
                const isSelected = selectedPlatforms.includes(platform);
                const account = accounts.find((a) => a.platform === platform);

                return (
                  <div
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800 shadow-xs">
                        {platform.slice(0, 2)}
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center ${
                          isSelected ? 'bg-brand-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-900 leading-tight">{config.name}</p>
                      {(account as any)?.accountName?.includes('TechVision') || (account as any)?.isConfigured === false ? (
                        <p className="text-[10px] text-amber-600 font-semibold truncate mt-0.5">
                          ⚠️ Demo Account
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {account?.accountName || 'Connected'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Master Caption Editor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Master Caption
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAIModal(true)}
                  className="text-xs text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enhance with AI</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={6}
                value={mainCaption}
                onChange={(e) => setMainCaption(e.target.value)}
                placeholder="Write your post content here... Mention URLs, announce product launches, or share updates."
                className="w-full text-sm p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed transition"
              />
              <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMainCaption((prev) => `${prev} #Innovation #TechLaunch`)}
                    className="hover:text-slate-700 flex items-center gap-1"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Hashtags</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainCaption((prev) => `${prev} 🚀 ✨`)}
                    className="hover:text-slate-700 flex items-center gap-1"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>Emojis</span>
                  </button>
                </div>
                <span>{mainCaption.length} characters</span>
              </div>
            </div>
          </div>

          {/* 3. Media Uploader */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Media Assets
              </span>
              <span className="text-[11px] text-slate-400">
                Images, Videos, PDF Documents
              </span>
            </div>

            {/* Drag & Drop Area */}
            <label className="border-2 border-dashed border-slate-200 hover:border-brand-400 bg-slate-50/70 hover:bg-brand-50/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center group">
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-brand-600 transition mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Click to browse or drag and drop files here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                JPEG, PNG, WebP (up to 15MB) • MP4, WebM (up to 200MB) • PDF (up to 100MB)
              </p>
              <input
                type="file"
                multiple
                accept="image/*,video/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {isUploading && (
              <div className="p-3 bg-brand-50 rounded-xl flex items-center gap-2 text-xs text-brand-700">
                <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading and generating previews...</span>
              </div>
            )}

            {/* Uploaded Files Thumbnails List */}
            {uploadedMedia.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {uploadedMedia.map((m) => (
                  <div
                    key={m.id}
                    className="relative group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col"
                  >
                    <div className="h-24 bg-slate-100 flex items-center justify-center overflow-hidden">
                      {m.mediaType === 'IMAGE' ? (
                        <img src={m.thumbnailUrl || m.url} alt={m.fileName} className="w-full h-full object-cover" />
                      ) : m.mediaType === 'VIDEO' ? (
                        <div className="p-2 text-center text-slate-500">
                          <span className="text-xs font-bold">🎬 Video</span>
                        </div>
                      ) : (
                        <div className="p-2 text-center text-slate-600">
                          <FileText className="w-7 h-7 mx-auto text-brand-600 mb-1" />
                          <span className="text-[10px] font-bold">PDF Doc</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 flex items-center justify-between text-[11px] bg-white border-t border-slate-100">
                      <span className="truncate max-w-[100px] font-medium text-slate-700">{m.fileName}</span>
                      <span className="text-slate-400 text-[10px]">
                        {(m.fileSize / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedia(m.id)}
                      className="absolute top-1 right-1 p-1 bg-slate-900/70 hover:bg-red-600 text-white rounded-md transition shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Platform-Specific Overrides (Optional Customization) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Channel Customization Overrides
              </span>
              <span className="text-[11px] text-slate-400">Customize per platform</span>
            </div>

            {/* WhatsApp Routing */}
            {selectedPlatforms.includes('WHATSAPP') && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Business Recipient</span>
                </div>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+15551234567 (with country code)"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            )}

            {/* Google Business CTA */}
            {selectedPlatforms.includes('GOOGLE_BUSINESS') && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <MapPin className="w-4 h-4 text-brand-600" />
                  <span>Google Business Call to Action Button</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={ctaType}
                    onChange={(e) => setCtaType(e.target.value)}
                    className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="BOOK">Book Appointment</option>
                    <option value="ORDER">Order Online</option>
                    <option value="SHOP">Shop Products</option>
                    <option value="SIGN_UP">Sign Up</option>
                    <option value="CALL">Call Now</option>
                  </select>
                  <input
                    type="text"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://yourwebsite.com/action"
                    className="text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Individual Platform Caption Override */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Custom caption for {PLATFORM_CONFIGS[activePreviewTab].name}:
              </label>
              <textarea
                rows={2}
                value={platformOverrides[activePreviewTab] ?? ''}
                onChange={(e) =>
                  setPlatformOverrides({
                    ...platformOverrides,
                    [activePreviewTab]: e.target.value,
                  })
                }
                placeholder={`Leave blank to use the master caption, or enter specialized copy for ${PLATFORM_CONFIGS[activePreviewTab].name}...`}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* 5. Publishing Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              5. Dispatch & Publishing Options
            </span>

            {/* Schedule Toggle Drawer */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduling}
                    onChange={(e) => setIsScheduling(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Schedule for future publishing</span>
                </label>
                <Clock className="w-4 h-4 text-brand-600" />
              </div>

              {isScheduling && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Timezone</label>
                    <input
                      type="text"
                      disabled
                      value={selectedTimezone}
                      className="w-full text-xs p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('DRAFT')}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>

              {isScheduling ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit('SCHEDULE')}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Queue for Scheduled Publishing</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit('PUBLISH_NOW')}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Publish to {selectedPlatforms.length} Channels Now</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Realistic Channel Previews (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 sticky top-20">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Live Channel Previews</h3>
              <p className="text-[11px] text-slate-400">Realistic view across target networks</p>
            </div>
            <Eye className="w-4 h-4 text-brand-600" />
          </div>

          {/* Preview Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
            {selectedPlatforms.map((p) => {
              const cfg = PLATFORM_CONFIGS[p];
              const isActive = activePreviewTab === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActivePreviewTab(p)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cfg.name}
                </button>
              );
            })}
          </div>

          {/* Realistic Mock Render */}
          <PlatformPreview
            platform={activePreviewTab}
            caption={platformOverrides[activePreviewTab] || mainCaption}
            media={uploadedMedia}
            recipientPhone={recipientPhone}
            locationId={locationId}
            ctaType={ctaType}
            ctaUrl={ctaUrl}
          />
        </div>
      </div>

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onApplyCaption={handleApplyAICaption}
      />
    </div>
  );
};
