import React, { useState } from 'react';
import { UserState } from '../types';
import { Wifi, WifiOff, Users, Server, RefreshCw, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface SyncViewProps {
  user: UserState | null;
  onLogin: (user: UserState) => void;
  onAdminLogin: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
  pendingChangesCount: number;
  onTriggerSync: () => Promise<{ added: number; updated: number }>;
  onTriggerPull: () => Promise<void>;
  lastSyncedAt: string;
}

export default function SyncView({
  user,
  onLogin,
  onAdminLogin,
  onLogout,
  pendingChangesCount,
  onTriggerSync,
  onTriggerPull,
  lastSyncedAt
}: SyncViewProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Profile preferences to sync with Google identifier at enrollment
  const [role, setRole] = useState<'Field officer' | 'Analyst' | 'Admin'>('Field officer');
  const [org, setOrg] = useState('Anesvad Alliance');
  const [serverUrl, setServerUrl] = useState(`http://localhost:3000`);
  const [adminName, setAdminName] = useState('Anesvad');
  const [adminPassword, setAdminPassword] = useState('11223344');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      // Connect to Firebase Client auth popup
      const providerResult = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await providerResult.user.getIdToken();
      
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: providerResult.user.displayName || providerResult.user.email || 'National Auditor',
          role,
          org
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Profile synchronization with cloud database failed.");
      }

      const activeUser: UserState = {
        name: data.user.name,
        email: data.user.email,
        role: data.user.role as any,
        org: data.user.org,
        serverUrl: serverUrl,
        token: idToken
      };

      onLogin(activeUser);
      setFeedback({ 
        type: 'success', 
        msg: `Google authenticated securely! Session established for ${data.user.name} (${data.user.role}).` 
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ 
        type: 'error', 
        msg: err.message || "Google Sign-In abort sequence executed." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncClick = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await onTriggerSync();
      setFeedback({
        type: 'success',
        msg: `Synchronization complete! Added ${res.added} new records and updated ${res.updated} properties server-side.`
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: `Cloud sync collapsed: ${err.message}. Running offline storage.` });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async () => {
    setLoading(true);
    setFeedback(null);
    const result = await onAdminLogin(adminName, adminPassword);
    if (result.success) {
      setFeedback({ type: 'success', msg: result.message });
    } else {
      setFeedback({ type: 'error', msg: result.message });
    }
    setLoading(false);
  };

  const handlePullClick = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      await onTriggerPull();
      setFeedback({ type: 'success', msg: `Health repository refreshed with central database records.` });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: `Pull failed: ${err.message}.` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Account panel: Login / Register */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5 border-b border-brand-bg pb-4">
          <div className="p-2 rounded-xl bg-brand-emerald/5 border border-brand-emerald/15">
            <Users className="w-5 h-5 text-brand-emerald" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-brand-dark text-sm tracking-tight">Operator Session Admin</h4>
            <p className="text-[11px] text-brand-grey mt-0.5 font-medium">Control cloud connection parameters and access tokens.</p>
          </div>
        </div>

        {user ? (
          <div className="flex flex-col gap-5">
            <div className="p-5 bg-brand-bg/50 rounded-2xl border border-brand-border flex items-start gap-3.5 text-xs leading-relaxed text-[#21352E] font-semibold">
              <CheckCircle className="w-5 h-5 text-brand-emerald mt-0.5 shrink-0" />
              <div>
                <p className="font-extrabold text-brand-dark text-sm tracking-tight">Authenticated Session active</p>
                <div className="mt-3 space-y-1.5 text-brand-dark/90">
                  <p><strong className="text-brand-grey">Operator:</strong> {user.name} ({user.email})</p>
                  <p><strong className="text-brand-grey">Capacity role:</strong> {user.role}</p>
                  <p><strong className="text-brand-grey">Federated Org:</strong> {user.org}</p>
                  <p><strong className="text-brand-grey">Cloud URL:</strong> {user.serverUrl}</p>
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-4.5 py-2.5 bg-rose-50 border border-rose-100 text-[#B91C1C] font-extrabold text-xs rounded-xl hover:bg-rose-100/70 hover:text-rose-800 transition-colors flex items-center gap-2 w-max cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Terminate auth session
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">ADMIN USERNAME</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full text-xs font-semibold text-brand-dark border border-brand-border rounded-xl p-3 outline-none focus:border-brand-emerald bg-brand-bg/30 transition-all font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-brand-grey uppercase tracking-wider mb-1.5 font-mono">ADMIN PASSWORD</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full text-xs font-semibold text-brand-dark border border-brand-border rounded-xl p-3 outline-none focus:border-brand-emerald bg-brand-bg/30 transition-all font-sans"
                  required
                />
              </div>
            </div>

            <button
              onClick={handleAdminSubmit}
              disabled={loading}
              className="w-full py-3 bg-brand-emerald hover:bg-brand-emerald/90 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer select-none"
            >
              {loading ? 'Verifying admin credentials...' : 'Login as Admin'}
            </button>

            <div className="p-4 rounded-2xl bg-brand-bg/70 border border-brand-border text-xs text-brand-grey">
              Enter the fixed admin credentials to approve and upload pending submissions.
              <div className="mt-2 font-bold text-brand-dark text-[11px]">Username: Anesvad | Password: 11223344</div>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Sync panel */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-5 border-b border-brand-bg pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-emerald/5 border border-brand-emerald/15">
                <Server className="w-5 h-5 text-brand-emerald" />
              </div>
              <h4 className="font-sans font-bold text-brand-dark text-sm tracking-tight">Online Sync Control</h4>
            </div>
            {user ? (
              <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase text-brand-emerald bg-brand-emerald/10 px-2.5 py-0.5 rounded-full border border-brand-emerald/25 font-mono shadow-sm">
                <Wifi className="w-3 h-3" /> Connectable
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase text-brand-grey bg-brand-bg px-2.5 py-0.5 rounded-full border border-brand-border font-mono shadow-inner select-none">
                <WifiOff className="w-3 h-3 block" /> Local scope
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-brand-bg/80 rounded-xl border border-brand-border text-xs leading-relaxed text-brand-dark/95">
              <p className="font-extrabold text-brand-grey mb-1 uppercase tracking-wider font-mono text-[9px]">BENEFITS OF SYNCING</p>
              <p className="font-medium">
                Centralizing allows Anesvad to run aggregate regional audits, map portfolio clusters across West African departments, and resolve conflicting records across remote team dispatch logs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-brand-border p-4 rounded-xl flex flex-col justify-between hover:border-brand-grey/25 transition-all bg-brand-bg/15 group">
                <span className="text-brand-grey font-extrabold uppercase tracking-wider text-[9px] font-mono">Pending Push</span>
                <strong className={`text-xl mt-1.5 block leading-none font-mono font-bold ${pendingChangesCount > 0 ? 'text-[#F59E0B]' : 'text-brand-dark'}`}>
                  {pendingChangesCount} local edits
                </strong>
              </div>
              <div className="border border-brand-border p-4 rounded-xl flex flex-col justify-between hover:border-brand-grey/25 transition-all bg-brand-bg/15">
                <span className="text-brand-grey font-extrabold uppercase tracking-wider text-[9px] font-mono">Last Synchronized</span>
                <strong className="text-xs font-bold mt-2 text-brand-dark block whitespace-normal truncate-2-lines leading-tight font-sans">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never this session'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex gap-3 border-t border-brand-bg pt-4 flex-wrap sm:flex-nowrap mt-6">
          <button
            onClick={handlePullClick}
            disabled={loading}
            className="flex-1 py-3 border border-brand-border font-bold text-brand-grey text-xs rounded-xl hover:bg-brand-bg hover:text-brand-dark hover:shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            Retrieve central data
          </button>
          <button
            onClick={handleSyncClick}
            disabled={loading}
            className="flex-1 py-3 bg-brand-emerald hover:bg-brand-emerald/90 font-bold text-white text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Push and Merge edits
          </button>
        </div>
      </div>

      {/* Complete verification logs overlay */}
      {feedback && (
        <div className={`col-span-1 lg:col-span-2 p-3.5 rounded-xl text-xs border flex items-start gap-2.5 mt-2 ${
          feedback.type === 'success' 
            ? 'bg-[#EAF7F2] border-[#B9E3D3] text-[#14533D]' 
            : 'bg-rose-50 border-rose-200 text-rose-850'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-brand-emerald mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          )}
          <div>
            <span className="font-extrabold block mb-0.5">{feedback.type === 'success' ? 'Session Sync OK' : 'Operational warn'}</span>
            <span className="font-medium text-brand-dark">{feedback.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
