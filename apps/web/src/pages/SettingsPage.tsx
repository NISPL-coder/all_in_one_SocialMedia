import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Settings,
  User,
  Shield,
  Key,
  Globe,
  Bell,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Cpu,
  Layers,
  Server,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';

export const SettingsPage: React.FC = () => {
  const [settingsData, setSettingsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((res) => {
        setSettingsData(res);
        if (res.user) {
          setName(res.user.name);
          setTimezone(res.user.timezone || 'UTC');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSaving(true);
    try {
      await api.updateProfile({
        name,
        timezone,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setStatusMessage('Settings updated successfully.');
      toast.success('Profile settings saved successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success('Redirect URL copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-medium">Loading system configuration & API health...</p>
      </div>
    );
  }

  const readiness = settingsData?.integrationReadiness || {};

  const callbackEndpoints = [
    {
      id: 'li',
      platform: 'LinkedIn',
      badge: 'Community Management API',
      url: readiness.linkedin?.redirectUri || 'http://localhost:4000/api/accounts/linkedin/callback',
      configured: readiness.linkedin?.configured,
      consoleUrl: 'https://www.linkedin.com/developers/apps',
      consoleName: 'LinkedIn Developer Portal',
      instructions: 'Add to Auth > Authorized redirect URLs for your app.',
    },
    {
      id: 'fb',
      platform: 'Meta Facebook',
      badge: 'Graph API Pages',
      url: readiness.facebook?.redirectUri || 'http://localhost:4000/api/accounts/facebook/callback',
      configured: readiness.facebook?.configured,
      consoleUrl: 'https://developers.facebook.com/apps',
      consoleName: 'Meta App Dashboard',
      instructions: 'Add to Facebook Login for Business > Settings > Valid OAuth Redirect URIs.',
    },
    {
      id: 'ig',
      platform: 'Meta Instagram',
      badge: 'Instagram Graph API',
      url: readiness.instagram?.redirectUri || 'http://localhost:4000/api/accounts/instagram/callback',
      configured: readiness.instagram?.configured,
      consoleUrl: 'https://developers.facebook.com/apps',
      consoleName: 'Meta App Dashboard',
      instructions: 'Add to Facebook Login for Business > Settings > Valid OAuth Redirect URIs.',
    },
    {
      id: 'gbp',
      platform: 'Google Business Profile',
      badge: 'Google Cloud OAuth 2.0',
      url: readiness.googleBusiness?.redirectUri || 'http://localhost:4000/api/accounts/google_business/callback',
      configured: readiness.googleBusiness?.configured,
      consoleUrl: 'https://console.cloud.google.com/apis/credentials',
      consoleName: 'Google Cloud Console',
      instructions: 'Add to Credentials > OAuth 2.0 Client ID > Authorized redirect URIs.',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Settings & API Gateway
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Production security, administrator credentials, and official platform OAuth routing for LinkedIn, Facebook, Instagram, and Google Business Profile.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Production Ready
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 rounded-2xl flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{statusMessage}</span>
        </div>
      )}

      {/* Production Architecture & Security Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Security</span>
            <Lock className="w-4 h-4 text-brand-600" />
          </div>
          <p className="font-bold text-sm text-slate-900">AES-256-GCM</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Hardware-grade token encryption at rest. Decrypted only upon publish execution.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Media Engine</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="font-bold text-sm text-slate-900">Sharp Auto-Pipeline</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Automatic WebP to JPEG conversion & cloud staging for Instagram Graph API.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Queue Worker</span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-bold text-sm text-slate-900">Background Poller</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Autonomous multi-platform retry engine with exponential backoff.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Channels</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-bold text-sm text-slate-900">4 Social Networks</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            LinkedIn, Facebook Pages, Instagram Professional, and Google Business Profile.
          </p>
        </div>
      </div>

      {/* Official Platform Callbacks & Redirect URIs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">Official OAuth Redirect URIs</h2>
              <p className="text-[11px] text-slate-500">
                Copy and whitelist these exact redirect URIs in each respective developer console.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {callbackEndpoints.map((ep) => (
            <div
              key={ep.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{ep.platform}</span>
                    <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {ep.badge}
                    </span>
                  </div>
                  {ep.configured ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Configured in .env
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Ready to Connect
                    </span>
                  )}
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all flex items-center justify-between gap-2 shadow-2xs">
                  <span className="truncate">{ep.url}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ep.url, ep.id)}
                    className="shrink-0 p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="Copy to clipboard"
                  >
                    {copiedKey === ep.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  {ep.instructions}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <a
                  href={ep.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition"
                >
                  <span>{ep.consoleName}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Profile & Master Password Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Administrator Security & Profile</h2>
            <p className="text-[11px] text-slate-500">
              Update your display name, timezone schedule reference, and authentication password.
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Administrator Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                System Email Address
              </label>
              <input
                type="email"
                disabled
                value={settingsData?.user?.email || 'admin@socialhub.local'}
                className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Publishing Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST - India Standard Time)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
            </select>
          </div>

          {/* Change Password Block */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Change Master Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Current Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password (min. 8 chars)"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="py-2 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition active:scale-95 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
