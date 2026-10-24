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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then((res) => {
      setSettingsData(res);
      if (res.user) {
        setName(res.user.name);
        setTimezone(res.user.timezone || 'UTC');
      }
      setIsLoading(false);
    }).catch(console.error);
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      await api.updateProfile({
        name,
        timezone,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setStatusMessage('Settings updated successfully.');
      toast.success('Settings updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <p className="text-xs">Loading application configuration...</p>
      </div>
    );
  }

  const readiness = settingsData?.integrationReadiness || {};

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Application Settings & Configuration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Profile management, timezone preferences, OAuth webhook endpoints, and API health.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Profile & Password Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <User className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-sm text-slate-900">Admin User Profile</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={settingsData?.user?.email || 'admin@socialhub.local'}
                className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
          </div>

          {/* Change Password Block */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Change Master Password</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow transition"
            >
              Save Profile Settings
            </button>
          </div>
        </form>
      </div>

      {/* Integration Readiness & Endpoints Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Key className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-sm text-slate-900">API Readiness & Webhook Callbacks</h2>
        </div>

        <p className="text-xs text-slate-500">
          Configure these callback URLs in your official Meta, Google Cloud, and LinkedIn Developer consoles.
        </p>

        <div className="space-y-3">
          {/* LinkedIn */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-800">LinkedIn OAuth Callback:</span>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">{readiness.linkedin?.redirectUri}</p>
            </div>
            <button
              onClick={() => copyToClipboard(readiness.linkedin?.redirectUri, 'li')}
              className="py-1 px-2.5 rounded-lg border text-slate-600 bg-white hover:bg-slate-100 self-start sm:self-auto shrink-0 flex items-center gap-1"
            >
              {copiedKey === 'li' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'li' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Meta Facebook */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-800">Meta Facebook OAuth Callback:</span>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">{readiness.facebook?.redirectUri}</p>
            </div>
            <button
              onClick={() => copyToClipboard(readiness.facebook?.redirectUri, 'fb')}
              className="py-1 px-2.5 rounded-lg border text-slate-600 bg-white hover:bg-slate-100 self-start sm:self-auto shrink-0 flex items-center gap-1"
            >
              {copiedKey === 'fb' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'fb' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* WhatsApp Webhook */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-800">WhatsApp Cloud Webhook URL:</span>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">{readiness.whatsapp?.webhookUrl}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Verify Token: {readiness.whatsapp?.verifyToken}</p>
            </div>
            <button
              onClick={() => copyToClipboard(readiness.whatsapp?.webhookUrl, 'wa')}
              className="py-1 px-2.5 rounded-lg border text-slate-600 bg-white hover:bg-slate-100 self-start sm:self-auto shrink-0 flex items-center gap-1"
            >
              {copiedKey === 'wa' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'wa' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Google Business Profile */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-800">Google OAuth 2.0 Redirect URI:</span>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">{readiness.googleBusiness?.redirectUri}</p>
            </div>
            <button
              onClick={() => copyToClipboard(readiness.googleBusiness?.redirectUri, 'gbp')}
              className="py-1 px-2.5 rounded-lg border text-slate-600 bg-white hover:bg-slate-100 self-start sm:self-auto shrink-0 flex items-center gap-1"
            >
              {copiedKey === 'gbp' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'gbp' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
