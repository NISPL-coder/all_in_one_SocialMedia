import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Key,
  Info,
  Check,
  X,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { ConnectedAccountDTO, PlatformType, PLATFORM_CONFIGS } from '@socialhub/shared';

export const ConnectedAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Direct Token Modal state
  const [modalPlatform, setModalPlatform] = useState<PlatformType | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [customExternalId, setCustomExternalId] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [tokenModalError, setTokenModalError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // Check if redirected from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const connectedPlatform = urlParams.get('connected');
    const oauthError = urlParams.get('error');

    if (connectedPlatform) {
      toast.success(`Successfully connected your ${connectedPlatform} account!`);
      window.history.replaceState({}, document.title, window.location.pathname);
      loadAccounts();
    } else if (oauthError) {
      toast.error(`Authentication notice: ${oauthError}`, { duration: 6000 });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await api.testAccount(id);
      const msg = res.message || (res.success ? 'Connection verified successfully.' : 'Connection check failed.');
      setTestResult({
        id,
        success: res.success,
        message: msg,
      });
      if (res.success) {
        toast.success(msg);
      } else {
        toast.error(msg);
      }
      loadAccounts();
    } catch (err: any) {
      const errMsg = err.message || 'API test request failed.';
      setTestResult({
        id,
        success: false,
        message: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setTestingId(null);
    }
  };

  const handleConnectOAuth = async (platform: PlatformType) => {
    try {
      const res = await api.connectAccount(platform);
      if (res.authUrl) {
        window.location.href = res.authUrl;
      } else if (res.requiresCredentials) {
        toast.error(`${res.message} Please check your .env file credentials.`, { duration: 6000 });
      }
    } catch (err: any) {
      toast.error(`OAuth initiation failed: ${err.message}`);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!window.confirm('Disconnect this account?')) return;
    try {
      await api.disconnectAccount(id);
      setAccounts(accounts.filter((a) => a.id !== id));
      toast.success('Account disconnected successfully');
    } catch (err: any) {
      toast.error(`Disconnect failed: ${err.message}`);
    }
  };

  const handleOpenTokenModal = (platform: PlatformType) => {
    setModalPlatform(platform);
    setTokenInput('');
    setCustomName('');
    setCustomExternalId('');
    setTokenModalError(null);
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPlatform || !tokenInput.trim()) return;

    setIsSavingToken(true);
    setTokenModalError(null);

    try {
      const res = await api.saveAccountToken(modalPlatform, {
        accessToken: tokenInput.trim(),
        accountName: customName.trim() || undefined,
        externalId: customExternalId.trim() || undefined,
      });

      if (res.success) {
        setModalPlatform(null);
        await loadAccounts();
        const notice = res.warning || res.data?.warning;
        if (notice) {
          toast.success(`Live ${modalPlatform} account connected! Notice: ${notice}`, { duration: 6000 });
        } else {
          toast.success(`Live ${modalPlatform} account connected and verified successfully!`);
        }
      } else {
        const failMsg = res.message || 'Failed to verify token with platform';
        setTokenModalError(failMsg);
        toast.error(failMsg);
      }
    } catch (err: any) {
      const errData = err.response?.data;
      const code = errData?.details?.errorCode || errData?.errorCode;
      let msg = errData?.error || errData?.message || err.message || 'Verification failed';
      if (code === 'MISSING_PUBLISH_PERMISSION') {
        msg = `⚠️ Publishing Permission Missing: ${msg}`;
      } else if (code === 'INVALID_ACCESS_TOKEN' || code === 'INVALID_OR_EXPIRED_TOKEN') {
        msg = `⚠️ Invalid/Expired Token: ${msg}`;
      }
      setTokenModalError(msg);
    } finally {
      setIsSavingToken(false);
    }
  };

  const platforms: PlatformType[] = [
    'LINKEDIN',
    'FACEBOOK',
    'INSTAGRAM',
    'WHATSAPP',
    'GOOGLE_BUSINESS',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Connected Accounts & Channels</h1>
          <p className="text-xs text-slate-500 mt-1">
            Connect your real LinkedIn profile or Company Page to enable real-time publishing to your live feeds.
          </p>
        </div>
      </div>

      {/* Security Architecture Info Box */}
      <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200 text-xs text-brand-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-brand-900">Official Platform API Publishing Notice</p>
          <p className="text-brand-800 leading-relaxed text-[11px]">
            To publish real posts to your live LinkedIn account, connect your account via <strong>OAuth 2.0</strong> or paste a <strong>LinkedIn Access Token</strong> with <code>w_member_social</code> scope. Posts sent to demo placeholder accounts will not appear on your personal profile.
          </p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {platforms.map((platform) => {
          const cfg = PLATFORM_CONFIGS[platform];
          const account = accounts.find((a) => a.platform === platform);
          const isDemoAccount = account && (account.isConfigured === false || account.accountName?.includes('TechVision'));
          const isConnected = account && account.status === 'CONNECTED';
          const isTestingThis = testingId === account?.id;
          const currentTest = testResult?.id === account?.id ? testResult : null;

          return (
            <div
              key={platform}
              className={`rounded-2xl border p-5 bg-white shadow-sm flex flex-col justify-between transition-all ${
                isConnected
                  ? isDemoAccount
                    ? 'border-amber-300 ring-1 ring-amber-100'
                    : 'border-slate-200'
                  : 'border-dashed border-slate-300'
              }`}
            >
              <div className="space-y-4">
                {/* Platform Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-800 shadow-xs">
                      {platform.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{cfg.name}</h3>
                      <span className="text-[10px] text-slate-400 font-medium">{cfg.badge}</span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isDemoAccount
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : isConnected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDemoAccount ? 'bg-amber-500' : isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    <span>{isDemoAccount ? 'Demo Seed' : isConnected ? 'Live Account' : 'Unconnected'}</span>
                  </span>
                </div>

                {/* Account Details or Setup Prompt */}
                {account ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    {isDemoAccount && (
                      <div className="p-2 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-[10px] leading-tight flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Placeholder:</strong> Posts to this account are not uploaded to your personal LinkedIn. Please connect your real account below.
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <img
                        src={account.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                        alt={account.accountName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 truncate">{account.accountName}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{account.externalId}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>Type: {account.accountType}</span>
                      <span>
                        {account.tokenExpiresAt
                          ? `Expires: ${new Date(account.tokenExpiresAt).toLocaleDateString()}`
                          : 'Never expires'}
                      </span>
                    </div>

                    {account.scopes && account.scopes.length > 0 && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Scopes: {account.scopes.join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
                    <p className="font-medium text-slate-700">Not connected</p>
                    <p className="text-[11px] text-slate-400">
                      Connect via OAuth 2.0 or paste an Access Token
                    </p>
                  </div>
                )}

                {/* Test Feedback Notice */}
                {currentTest && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] leading-tight ${
                      currentTest.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <p className="font-bold mb-0.5">{currentTest.success ? 'Test Passed' : 'Test Warning'}</p>
                    <p>{currentTest.message}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleConnectOAuth(platform)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{account && !isDemoAccount ? 'Reconnect' : 'Connect OAuth'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenTokenModal(platform)}
                    title="Enter API Access Token directly"
                    className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    <span>Enter Token</span>
                  </button>
                </div>

                {account && (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={isTestingThis}
                      onClick={() => handleTestConnection(account.id)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTestingThis ? 'animate-spin' : ''}`} />
                      <span>{isTestingThis ? 'Testing...' : 'Test API'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDisconnect(account.id)}
                      className="text-[11px] text-red-500 hover:text-red-700 font-medium transition"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct Token Modal */}
      {modalPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Connect {PLATFORM_CONFIGS[modalPlatform].name} with Token
                  </h3>
                  <p className="text-xs text-slate-400">Directly link your live account credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPlatform(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tokenModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{tokenModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveToken} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Access Token <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={`Paste your ${PLATFORM_CONFIGS[modalPlatform].name} Access Token here...`}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {modalPlatform === 'LINKEDIN'
                    ? 'Requires "w_member_social" publishing permission. OpenID Connect ("openid profile") is optional for auto-fetching name/avatar.'
                    : 'Encrypted securely at rest using AES-256-GCM.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. My LinkedIn Profile or Company Name"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {modalPlatform === 'LINKEDIN' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Member or Organization URN (Optional)
                  </label>
                  <input
                    type="text"
                    value={customExternalId}
                    onChange={(e) => setCustomExternalId(e.target.value)}
                    placeholder="e.g. urn:li:person:abcdef or urn:li:organization:123456"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Auto-detected if your token includes OpenID scopes. If using a standalone token, you can provide your author URN here.
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-brand-600" /> AES-256-GCM Hardware Encrypted
                </p>
                <p>
                  Tokens are never exposed to the client browser and are only decrypted during publish execution to official API endpoints.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalPlatform(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingToken || !tokenInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 transition shadow-xs"
                >
                  {isSavingToken ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying with LinkedIn...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Verify Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

