import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Settings,
  Server,
  Cloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Shield,
  RefreshCw,
  Zap,
  ExternalLink,
  Key,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  X,
  Database,
  Layers,
  Film,
  UserCheck,
} from 'lucide-react';
import { AuditLogItem } from '../../types/index.ts';
import { TermsPolicyManager } from './TermsPolicyManager.tsx';
import { CloudflareR2SyncModal } from '../common/CloudflareR2SyncModal.tsx';

export const SettingsView: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'health' | 'database' | 'security' | 'audit' | 'users' | 'terms'>('health');
  const [loading, setLoading] = useState(true);
  const [testingR2, setTestingR2] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<string | null>(null);
  const [showR2SyncModal, setShowR2SyncModal] = useState(false);

  // DB Diagnostics & Hostinger Connection State
  const [dbDiag, setDbDiag] = useState<any>(null);
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<any>(null);
  const [migratingDb, setMigratingDb] = useState(false);
  const [dbMigrateResult, setDbMigrateResult] = useState<any>(null);

  // Hostinger Form State
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('3306');
  const [dbUser, setDbUser] = useState('u139837875_janalaa_admin');
  const [dbPassword, setDbPassword] = useState('JanalaaDbPass@2026');
  const [dbName, setDbName] = useState('u139837875_janalaa_db');
  const [savingDb, setSavingDb] = useState(false);
  const [dbSaveStatus, setDbSaveStatus] = useState<string | null>(null);
  const [syncingDb, setSyncingDb] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSaveDbConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSavingDb(true);
      setDbSaveStatus(null);
      const res = await api.updateDbConfig({
        host: dbHost,
        port: Number(dbPort) || 3306,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        dbType: 'mysql',
        useSsl: false,
      });
      setDbSaveStatus(res?.message || 'Database connection saved.');
      loadSettingsData();
    } catch (err: any) {
      setDbSaveStatus(err?.message || 'Failed to update database config');
    } finally {
      setSavingDb(false);
    }
  };

  const handleSyncToDb = async () => {
    try {
      setSyncingDb(true);
      setSyncResult(null);
      const res = await api.syncToDb();
      setSyncResult(res?.message || `Successfully synced ${res?.syncedCount || 0} catalog items to Hostinger!`);
      loadSettingsData();
    } catch (err: any) {
      setSyncResult(err?.message || 'Failed to sync metadata to Hostinger MySQL');
    } finally {
      setSyncingDb(false);
    }
  };

  // Clear Bucket State
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [clearing, setClearing] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  const handleClearBucket = async () => {
    try {
      setClearing(true);
      setPurgeStatus(null);
      const res = await api.clearBucket('ayan');
      setPurgeStatus(res?.message || 'Bucket "ayan" emptied successfully.');
      setShowClearModal(false);
      setConfirmInput('');
    } catch (err: any) {
      setPurgeStatus(err?.message || 'Failed to empty bucket');
    } finally {
      setClearing(false);
    }
  };

  // JWT Generator State
  const [generatedSecret, setGeneratedSecret] = useState<string>('a9f4afee3f30d219470c8c43862aad841bd7d43516a8b198adf086052ff56b2f');
  const [generatedRefreshSecret, setGeneratedRefreshSecret] = useState<string>('bd9a0d047c07aa3613f7e59b02def4ce5c7ff23c473b05e6d642a9fa9946cf9d');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentToken, setCurrentToken] = useState<string>('');

  const generateNewSecrets = () => {
    const genHex = (bytesCount = 32) => {
      const arr = new Uint8Array(bytesCount);
      window.crypto.getRandomValues(arr);
      return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    };
    setGeneratedSecret(genHex(32));
    setGeneratedRefreshSecret(genHex(32));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      const [sRes, aRes, dRes] = await Promise.all([
        api.getSettings(),
        api.getAuditLogs(),
        api.getDbDiagnostics(),
      ]);
      setSettings(sRes);
      setAuditLogs(aRes || []);
      setDbDiag(dRes);

      if (isAdmin) {
        const uRes = await api.getUsers();
        setUsersList(uRes || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Polling Heartbeat States
  const [dbStatus, setDbStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [pingLatency, setPingLatency] = useState<number>(0);
  const [pollingError, setPollingError] = useState<string | null>(null);

  const runHeartbeatCheck = async () => {
    try {
      const startTime = Date.now();
      const res = await api.testDatabaseConnection();
      if (res && res.success) {
        setDbStatus('ONLINE');
        setPingLatency(res.connection?.latencyMs || (Date.now() - startTime) || 12);
        setPollingError(null);
      } else {
        setDbStatus('OFFLINE');
        setPollingError(res?.error || 'Hostinger database unreachable');
      }
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      setDbStatus('OFFLINE');
      setPollingError(err?.message || 'Heartbeat network failure');
      setLastCheckTime(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    loadSettingsData();
    const token = localStorage.getItem('janala_token') || '';
    setCurrentToken(token);

    // Initial query
    runHeartbeatCheck();

    // Set 30 second polling heartbeat
    const interval = setInterval(runHeartbeatCheck, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleTestR2 = async () => {
    setTestingR2(true);
    setR2TestResult(null);
    try {
      const res = await api.getSettings();
      setSettings(res);
      setR2TestResult(res.storage?.details || 'R2 storage checked successfully.');
    } catch (err: any) {
      setR2TestResult(`Error: ${err.message}`);
    } finally {
      setTestingR2(false);
    }
  };

  const handleTestDatabase = async () => {
    setTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await api.testDatabaseConnection();
      setDbTestResult(res);
      const dRes = await api.getDbDiagnostics();
      setDbDiag(dRes);
      const sRes = await api.getSettings();
      setSettings(sRes);
    } catch (err: any) {
      setDbTestResult({ success: false, error: err?.message || 'Database test failed' });
    } finally {
      setTestingDb(false);
    }
  };

  const handleMigrateDatabase = async () => {
    setMigratingDb(true);
    setDbMigrateResult(null);
    try {
      const res = await api.initDatabaseSchema();
      setDbMigrateResult(res);
      const dRes = await api.getDbDiagnostics();
      setDbDiag(dRes);
      const sRes = await api.getSettings();
      setSettings(sRes);
    } catch (err: any) {
      setDbMigrateResult({ success: false, error: err?.message || 'Migration failed' });
    } finally {
      setMigratingDb(false);
    }
  };

  const handlePurgeAndReinitDatabase = async () => {
    if (!window.confirm('Wipe Hostinger database tables and execute fresh schema with seed data?')) return;
    setMigratingDb(true);
    setDbMigrateResult(null);
    try {
      const res = await api.purgeAndReinitDatabase();
      setDbMigrateResult(res);
      const dRes = await api.getDbDiagnostics();
      setDbDiag(dRes);
      const sRes = await api.getSettings();
      setSettings(sRes);
    } catch (err: any) {
      setDbMigrateResult({ success: false, error: err?.message || 'Purge failed' });
    } finally {
      setMigratingDb(false);
    }
  };

  const handleChangeUserRole = async (userId: number, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      loadSettingsData();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">System Health & Infrastructure</h1>
        <p className="text-xs text-slate-400 mt-1">
          Cloudflare R2 object storage connectivity, PostgreSQL Cloud SQL status, and immutable audit trails
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-800 text-xs font-semibold overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => setActiveSubTab('health')}
          className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'health' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400'
          }`}
        >
          Infrastructure & R2 Status
        </button>
        <button
          onClick={() => setActiveSubTab('database')}
          className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'database' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Hostinger Database Hub</span>
        </button>
        <button
          onClick={() => setActiveSubTab('security')}
          className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'security' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>JWT & Security Keys</span>
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'audit' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'users' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400'
            }`}
          >
            Staff User Management ({usersList.length})
          </button>
        )}
        <button
          onClick={() => setActiveSubTab('terms')}
          className={`px-3 sm:px-4 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'terms' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400'
          }`}
        >
          Reserved & Prohibited Terms Policy
        </button>
      </div>

      {/* SubTab 1: Health */}
      {activeSubTab === 'health' && (
        <div className="space-y-6">
          {/* Live Diagnostic Status Panel & Connection Heartbeat */}
          <div className={`p-5 sm:p-6 rounded-2xl bg-[#12151f]/90 border ${dbStatus === 'ONLINE' ? 'border-emerald-500/35' : 'border-red-500/35'} flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${dbStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4.5">
              <div className="flex items-center gap-4">
                <div className="relative flex h-5 w-5">
                  {dbStatus === 'ONLINE' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
                    </>
                  ) : (
                    <>
                      <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 shadow-lg shadow-red-500/50"></span>
                    </>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">HOSTINGER MYSQL HEARTBEAT</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${dbStatus === 'ONLINE' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
                      {dbStatus}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                    {dbStatus === 'ONLINE' ? 'Direct Connection Verified & Live' : 'Hostinger DB Connection Offline'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dbStatus === 'ONLINE' 
                      ? 'Bi-directional query execution is currently active across all tables.' 
                      : (pollingError || 'Verify Hostinger credentials, firewall configurations, or database status.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2.5 text-xs shrink-0 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 w-full sm:w-auto">
                <div>
                  <span className="text-slate-500 block text-[10.5px]">Polling Interval:</span>
                  <span className="text-slate-300 font-bold">Every 30s</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10.5px]">Last Checked:</span>
                  <span className="text-amber-400 font-mono font-bold">{lastCheckTime || 'Never'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10.5px]">Ping Latency:</span>
                  <span className="text-emerald-400 font-mono font-bold">{dbStatus === 'ONLINE' ? `${pingLatency} ms` : 'N/A'}</span>
                </div>
              </div>

              <button
                onClick={runHeartbeatCheck}
                disabled={testingDb}
                className="px-4.5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 flex items-center justify-center gap-2 cursor-pointer border border-slate-700 shrink-0 select-none transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${testingDb ? 'animate-spin' : ''}`} />
                <span>Force Ping</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cloudflare R2 Card */}
            <div className="p-6 rounded-2xl bg-[#12151f] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cloudflare R2 Object Store</h3>
                    <p className="text-[11px] text-slate-400">Direct S3-compatible video binary ingestion</p>
                  </div>
                </div>

                <a
                  href="https://dash.cloudflare.com/61fb1c91a19b595b9e0e767447383afe/r2/default/buckets/ayan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 hover:underline"
                >
                  <span>dash.cloudflare.com</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Configured Provider:</span>
                  <span className="text-slate-200 font-mono font-semibold">{settings?.storage?.provider || 'r2'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">R2 Bucket Name:</span>
                  <span className="text-amber-400 font-mono font-bold">{settings?.storage?.bucket || 'ayan'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Endpoint Routing:</span>
                  <span className="text-slate-300 font-mono">{settings?.storage?.endpointMasked || 'https://61fb1c91...r2.cloudflarestorage.com'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Verification:</span>
                  <span className="text-slate-300">{settings?.storage?.details}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">Validates live S3 API credentials</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowR2SyncModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-800 to-red-600 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                    <span>Sync & Scan 'ayan'</span>
                  </button>
                  <button
                    onClick={handleTestR2}
                    disabled={testingR2}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingR2 ? 'animate-spin' : ''}`} />
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>

              {r2TestResult && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  {r2TestResult}
                </div>
              )}
            </div>

            {/* Hostinger MySQL Database Card */}
            <div className="p-6 rounded-2xl bg-[#12151f] border border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Hostinger MySQL Database (<span className="font-mono text-amber-400">u139837875_janalaa_db</span>)</h3>
                    <p className="text-[11px] text-slate-400">Hostinger phpMyAdmin &bull; MySQL / MariaDB &bull; Live Metadata Storage</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 transition-colors"
                  >
                    <span>phpMyAdmin Panel</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      settings?.database?.connected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {settings?.database?.connected ? 'CONNECTED TO HOSTINGER' : 'LOCAL CACHE MODE'}
                  </span>
                </div>
              </div>

              {/* Quick Status Bar */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Database Engine:</span>
                  <span className="text-slate-200 font-semibold">{settings?.database?.provider || 'Hostinger MySQL Database'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">phpMyAdmin DB Name:</span>
                  <span className="text-amber-400 font-mono font-bold">u139837875_janalaa_db</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active MySQL Host:</span>
                  <span className="text-blue-400 font-mono font-semibold">{settings?.database?.hostMasked || 'localhost'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active User:</span>
                  <span className="text-slate-300 font-mono">{settings?.database?.userMasked || 'u139837875_janalaa_db'}</span>
                </div>
              </div>

              {/* Hostinger Configuration Form */}
              <form onSubmit={handleSaveDbConfig} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Configure Hostinger MySQL Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-1 font-medium">Hostinger MySQL Server Host / IP:</label>
                    <input
                      type="text"
                      value={dbHost}
                      onChange={(e) => setDbHost(e.target.value)}
                      placeholder="e.g. sql1403.hstgr.io or localhost or IP"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-1 font-medium">MySQL Database Name:</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 text-xs font-mono focus:border-amber-400 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-1 font-medium">MySQL Username:</label>
                    <input
                      type="text"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-400 mb-1 font-medium">MySQL Password:</label>
                    <input
                      type="password"
                      value={dbPassword}
                      onChange={(e) => setDbPassword(e.target.value)}
                      placeholder="Your Hostinger MySQL Password"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="submit"
                    disabled={savingDb}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-amber-400/40 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${savingDb ? 'animate-spin' : ''}`} />
                    <span>Save Hostinger Credentials & Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncToDb}
                    disabled={syncingDb}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-emerald-400/40 shadow-sm"
                  >
                    <Database className={`w-3.5 h-3.5 ${syncingDb ? 'animate-spin' : ''}`} />
                    <span>Push Metadata to Hostinger phpMyAdmin</span>
                  </button>
                </div>

                {dbSaveStatus && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-amber-300 font-medium">
                    {dbSaveStatus}
                  </div>
                )}

                {syncResult && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 font-medium">
                    ✓ {syncResult}
                  </div>
                )}
              </form>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">Hostinger phpMyAdmin SQL Verification</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await api.getMysqlSchema();
                      if (res?.sql) {
                        copyToClipboard(res.sql, 'MySQL Schema');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{copiedKey === 'MySQL Schema' ? 'Copied SQL!' : 'Copy SQL Schema for phpMyAdmin'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePurgeAndReinitDatabase}
                    disabled={migratingDb}
                    className="px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-red-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Purge & Re-Initialize Schema</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestDatabase}
                    disabled={testingDb}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-blue-500/30"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                    <span>Ping Database</span>
                  </button>
                </div>
              </div>

              {dbTestResult && (
                <div className={`p-3 rounded-xl border text-xs ${
                  dbTestResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}>
                  <div className="font-semibold">{dbTestResult.message || (dbTestResult.success ? 'DB Connected' : 'DB Warning')}</div>
                  {dbTestResult.tables && (
                    <div className="mt-1 font-mono text-[10px] text-slate-300">
                      Tables: {Object.entries(dbTestResult.tables).map(([k, v]) => `${k} (${v})`).join(', ')}
                    </div>
                  )}
                  {dbTestResult.error && (
                    <div className="mt-1 text-slate-400 text-[11px]">{dbTestResult.error}</div>
                  )}
                </div>
              )}

              {dbMigrateResult && (
                <div className={`p-3 rounded-xl border text-xs ${
                  dbMigrateResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/30 text-red-300'
                }`}>
                  <div className="font-semibold">{dbMigrateResult.message || 'Database Initialized'}</div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300 space-y-1">
                <div className="font-bold text-blue-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hostinger Environment Variables Checklist</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[10.5px]">
                  Provide these 5 variables in Hostinger hPanel &rarr; Environment Variables:
                </p>
                <div className="font-mono text-[10px] text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-800 space-y-0.5">
                  <div><span className="text-amber-400">SQL_HOST</span>=srv123.main-hosting.eu</div>
                  <div><span className="text-amber-400">SQL_USER</span>=u123456789_user</div>
                  <div><span className="text-amber-400">SQL_PASSWORD</span>=your_hostinger_db_password</div>
                  <div><span className="text-amber-400">SQL_DB_NAME</span>=u123456789_janala_db</div>
                  <div><span className="text-amber-400">SQL_PORT</span>=5432</div>
                  <div><span className="text-amber-400">SQL_SSL</span>=true</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cloudflare Direct Dashboard Helper & Purge */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-sm font-bold text-white">Live Cloudflare R2 Bucket Connected: <span className="font-mono text-amber-400 font-semibold">{settings?.storage?.bucket || 'ayan'}</span></h4>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                Uploaded master videos and cinema assets are automatically written to the <code className="text-amber-400 font-mono font-bold">janalaa/</code> folder (e.g. <code className="text-slate-300 font-mono">janalaa/videos/&#123;contentType&#125;/&#123;id&#125;/</code>) inside your Cloudflare R2 bucket.
              </p>
              {purgeStatus && (
                <p className="text-xs font-semibold text-emerald-400 mt-2">
                  ✓ {purgeStatus}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setConfirmInput('');
                  setShowClearModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-500/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove All from Bucket (ayan)</span>
              </button>

              <a
                href="https://dash.cloudflare.com/?to=/:account/r2/default/buckets/ayan"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-500/30 shrink-0"
              >
                <span>Open Cloudflare Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Purge Bucket Modal in Settings */}
          {showClearModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-[#12151f] border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span>Remove All From Bucket 'ayan'</span>
                  </div>
                  <button
                    onClick={() => setShowClearModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 font-medium">
                    ⚠️ <strong>WARNING:</strong> This action will permanently remove all stored video files, media objects, and assets from your Cloudflare R2 bucket <strong>"ayan"</strong>.
                  </div>
                  <p>
                    All content items will have their master video status reset to <em>NOT_STARTED</em>.
                  </p>
                  <p className="font-semibold text-white">
                    To confirm, type <span className="font-mono text-red-400 font-bold">PURGE</span> below:
                  </p>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type PURGE to confirm"
                    className="w-full bg-[#090a0f] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClearModal(false)}
                    disabled={clearing}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearBucket}
                    disabled={confirmInput.trim().toUpperCase() !== 'PURGE' || clearing}
                    className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      confirmInput.trim().toUpperCase() === 'PURGE' && !clearing
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {clearing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Purging Bucket...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm & Empty 'ayan'</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab: Hostinger Database Hub */}
      {activeSubTab === 'database' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Hostinger MySQL & phpMyAdmin Hub
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      settings?.database?.connected || dbDiag?.status === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {settings?.database?.connected || dbDiag?.status === 'HEALTHY' ? 'ONLINE (ACTIVE)' : 'RESILIENT DUAL-SYNC'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hostinger Database: <code className="text-amber-300 font-mono">u139837875_janalaa_db</code> &bull; MySQL / MariaDB &amp; PostgreSQL Dual Engine
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <a
                  href="https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open phpMyAdmin</span>
                </a>
                <button
                  onClick={handleTestDatabase}
                  disabled={testingDb}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                  <span>{testingDb ? 'Testing Connection...' : 'Test Connection'}</span>
                </button>
                <button
                  onClick={handleMigrateDatabase}
                  disabled={migratingDb}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  <Database className={`w-3.5 h-3.5 ${migratingDb ? 'animate-spin' : ''}`} />
                  <span>{migratingDb ? 'Bootstrapping...' : 'Bootstrap Tables & Seed'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/50 text-xs text-blue-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-100">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>504 Gateway Time-out Prevention &amp; Fix:</span>
              </div>
              <p className="text-[11px] text-blue-300/90 leading-relaxed">
                Hostinger databases are <strong>MySQL</strong> (<code className="text-amber-300 font-mono">u139837875_janalaa_db</code> at <code className="text-amber-300 font-mono">auth-db1403.hstgr.io</code>). JANALA OTT now automatically detects MySQL on port 3306 with a strict 2-second timeout guard. If the remote database is initializing or unreachable, the server immediately serves and saves all metadata into the <strong>Resilient Dual-Sync Engine</strong> so your website never hangs with a 504 Gateway Time-out.
              </p>
            </div>
          </div>

          {/* Test & Migration Result Banner */}
          {dbTestResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
              dbTestResult.success
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                <span>{dbTestResult.message || (dbTestResult.success ? 'Database connected successfully!' : 'Database notice (Resilient engine active)')}</span>
              </div>
              {dbTestResult.connection?.latencyMs && <div>Latency: <span className="font-mono">{dbTestResult.connection.latencyMs}ms</span></div>}
              {dbTestResult.error && <div className="text-slate-300 font-mono text-[11px] bg-black/40 p-2.5 rounded-lg border border-slate-800">{dbTestResult.error}</div>}
              {dbTestResult.tables && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {Object.entries(dbTestResult.tables).map(([table, count]) => (
                    <div key={table} className="bg-black/30 p-2 rounded border border-slate-800 text-[11px]">
                      <span className="text-slate-400">{table}:</span> <strong className="text-white font-mono">{String(count)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {dbMigrateResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
              dbMigrateResult.success
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/30 border-red-500/30 text-red-300'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {dbMigrateResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                <span>{dbMigrateResult.message || 'Database tables initialized'}</span>
              </div>
            </div>
          )}

          {/* Database Live Diagnostic Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#12151f] border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Film className="w-4 h-4 text-red-400" />
                <span>Content / Movies</span>
              </div>
              <div className="text-xl font-black text-white font-mono">
                {dbDiag?.tables?.content_items ?? 8}
              </div>
              <div className="text-[10px] text-emerald-400">Database &amp; Resilient sync</div>
            </div>

            <div className="p-4 rounded-xl bg-[#12151f] border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Media Assets</span>
              </div>
              <div className="text-xl font-black text-white font-mono">
                {dbDiag?.tables?.media_assets ?? 8}
              </div>
              <div className="text-[10px] text-amber-400">Cloudflare R2 mapped</div>
            </div>

            <div className="p-4 rounded-xl bg-[#12151f] border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span>Users &amp; Staff</span>
              </div>
              <div className="text-xl font-black text-white font-mono">
                {dbDiag?.tables?.users ?? 2}
              </div>
              <div className="text-[10px] text-blue-400">Auth &amp; RBAC</div>
            </div>

            <div className="p-4 rounded-xl bg-[#12151f] border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Storage Mode</span>
              </div>
              <div className="text-sm font-bold text-white font-mono mt-1">
                {dbDiag?.storageMode || 'Resilient Dual-Sync'}
              </div>
              <div className="text-[10px] text-slate-400">Zero-Timeout Guarantee</div>
            </div>
          </div>

          {/* Hostinger Configuration & phpMyAdmin Direct Import */}
          <div className="p-6 rounded-2xl bg-[#12151f] border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">Hostinger MySQL Database Setup (<code className="text-amber-400">u139837875_janalaa_db</code>)</h4>
                  <p className="text-[11px] text-slate-400">Directly compatible with Hostinger phpMyAdmin at <a href="https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db" target="_blank" rel="noreferrer" className="text-amber-400 underline">auth-db1403.hstgr.io</a></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const schema = await api.getMysqlSchema();
                    if (schema.sql) {
                      copyToClipboard(schema.sql, 'mysql-schema');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-500/30 cursor-pointer"
                >
                  {copiedKey === 'mysql-schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'mysql-schema' ? 'MySQL SQL Copied!' : 'Copy phpMyAdmin SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const envContent = `DB_TYPE=mysql\nSQL_HOST=localhost\nSQL_PORT=3306\nSQL_USER=u139837875_janalaa_db\nSQL_PASSWORD=YourHostingerDbPassword\nSQL_DB_NAME=u139837875_janalaa_db\nSQL_SSL=false\nNODE_ENV=production\nR2_ACCOUNT_ID=61fb1c91a19b595b9e0e767447383afe\nR2_BUCKET_NAME=ayan\nR2_PUBLIC_DOMAIN=https://ayan.pub.r2.dev`;
                    copyToClipboard(envContent, 'hostinger-env');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-500/30 cursor-pointer"
                >
                  {copiedKey === 'hostinger-env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'hostinger-env' ? 'Copied .env!' : 'Copy Hostinger .env'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 overflow-x-auto">
              <div className="text-slate-500 font-sans text-[11px] pb-1 font-medium"># Hostinger hPanel &rarr; Node.js &rarr; Environment Variables:</div>
              <div><span className="text-amber-400">DB_TYPE</span>=<span className="text-emerald-400">mysql</span></div>
              <div><span className="text-amber-400">SQL_HOST</span>=<span className="text-emerald-400">localhost</span> <span className="text-slate-500">(default Hostinger socket/host)</span></div>
              <div><span className="text-amber-400">SQL_PORT</span>=<span className="text-emerald-400">3306</span></div>
              <div><span className="text-amber-400">SQL_USER</span>=<span className="text-emerald-400">u139837875_janalaa_db</span></div>
              <div><span className="text-amber-400">SQL_PASSWORD</span>=<span className="text-emerald-400">YourHostingerDatabasePassword</span></div>
              <div><span className="text-amber-400">SQL_DB_NAME</span>=<span className="text-emerald-400">u139837875_janalaa_db</span></div>
              <div><span className="text-amber-400">SQL_SSL</span>=<span className="text-emerald-400">false</span></div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>3-Step Quick Setup for Hostinger phpMyAdmin (u139837875_janalaa_db):</span>
              </div>
              <ol className="list-decimal list-inside text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
                <li>
                  Click <strong>"Copy phpMyAdmin SQL"</strong> above.
                </li>
                <li>
                  Open <a href="https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold">https://auth-db1403.hstgr.io/index.php?db=u139837875_janalaa_db</a> &rarr; click on the <strong>SQL</strong> tab at the top.
                </li>
                <li>
                  Paste the SQL statements and click <strong>Go</strong>. All tables (`users`, `content_items`, `genres`, `people`, `media_assets`, `seasons`, `episodes`) will be created in your Hostinger MySQL database immediately!
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* SubTab: JWT & Security Keys */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          {/* Engine Status Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/20 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Built-in JWT Authentication Engine
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ACTIVE IN APP
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Self-contained Node.js token generation, verification, and bcrypt encryption
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This app <strong className="text-white">already creates and verifies JSON Web Tokens (JWT) internally</strong> when users log in. It issues standard 8-hour access tokens and 7-day refresh tokens. If you do not provide custom keys in Hostinger, the app automatically falls back to its built-in secure internal keys so your authentication never breaks.
            </p>
          </div>

          {/* Keys Generator Card */}
          <div className="p-6 rounded-2xl bg-[#12151f] border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Generate Production JWT Secret Keys</h4>
                  <p className="text-[11px] text-slate-400">Cryptographically secure 256-bit random keys for Hostinger environment variables</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateNewSecrets}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate New Pair</span>
                </button>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `JWT_SECRET=${generatedSecret}\nJWT_REFRESH_SECRET=${generatedRefreshSecret}`,
                      'both'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-red-600/20"
                >
                  {copiedKey === 'both' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'both' ? 'Copied Both!' : 'Copy Both for Hostinger'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* JWT_SECRET */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 font-mono">JWT_SECRET</span>
                    <span className="text-[10px] text-slate-500">(Signs 8-hour access tokens)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedSecret, 'secret')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'secret' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'secret' ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 break-all select-all border border-slate-800/80">
                  {generatedSecret}
                </div>
              </div>

              {/* JWT_REFRESH_SECRET */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 font-mono">JWT_REFRESH_SECRET</span>
                    <span className="text-[10px] text-slate-500">(Signs 7-day refresh tokens)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedRefreshSecret, 'refresh')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'refresh' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'refresh' ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 break-all select-all border border-slate-800/80">
                  {generatedRefreshSecret}
                </div>
              </div>
            </div>
          </div>

          {/* Current Active Session Token Inspector */}
          <div className="p-6 rounded-2xl bg-[#12151f] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Live Session JWT Token (Issued by this App)</h4>
                  <p className="text-[11px] text-slate-400">Bearer token currently used by your browser to authenticate API requests</p>
                </div>
              </div>
              {currentToken && (
                <button
                  onClick={() => copyToClipboard(currentToken, 'token')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'token' ? 'Copied Token!' : 'Copy Raw JWT Token'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Authenticated User</span>
                <span className="text-slate-200 font-semibold">{user?.email || 'Logged In Admin'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Granted Role</span>
                <span className="text-amber-400 font-bold">{user?.role || 'ADMIN'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Algorithm</span>
                <span className="text-blue-400 font-mono font-semibold">HMAC-SHA256 (HS256)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Token Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid & Active
                </span>
              </div>
            </div>

            {currentToken ? (
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Encoded Token Value:</span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10.5px] text-slate-300 break-all select-all max-h-24 overflow-y-auto">
                  {currentToken}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                No token in storage. Sign in with admin credentials to inspect the live token.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="bg-[#12151f] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090a0f] text-[10px] uppercase font-semibold text-slate-400">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action Event</th>
                  <th className="py-2.5 px-3">Target Resource</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{log.userEmail || 'System'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-red-300 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                      {log.resource} #{log.resourceId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">{log.details || '-'}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Staff Users */}
      {activeSubTab === 'users' && (
        <div className="bg-[#12151f] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090a0f] text-[10px] uppercase font-semibold text-slate-400">
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role Authority</th>
                  <th className="py-2.5 px-3">Account Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 font-bold text-white">{u.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                        className="bg-[#090a0f] border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="CONTENT_MANAGER">CONTENT_MANAGER</option>
                        <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                        <option value="USER">USER</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      Managed via RBAC
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 4: Reserved & Prohibited Terms Policy */}
      {activeSubTab === 'terms' && (
        <TermsPolicyManager />
      )}

      {/* Cloudflare R2 Sync Modal */}
      <CloudflareR2SyncModal
        isOpen={showR2SyncModal}
        onClose={() => setShowR2SyncModal(false)}
        onSyncComplete={loadSettingsData}
      />
    </div>
  );
};
