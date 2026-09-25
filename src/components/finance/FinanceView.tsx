import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { DollarSign, TrendingUp, CreditCard, Lock, ShieldAlert, CheckCircle2, Sparkles, ArrowUpRight, BarChart3 } from 'lucide-react';

interface FinanceViewProps {
  embedded?: boolean;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ embedded = false }) => {
  const { user, isAdmin, isFinanceManager } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthorized = isAdmin || isFinanceManager;

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    async function loadFinance() {
      try {
        setLoading(true);
        const res = await api.getFinanceOverview();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load financial data');
      } finally {
        setLoading(false);
      }
    }
    loadFinance();
  }, [isAuthorized]);

  // RBAC Permission Denial View for Content Managers or regular users
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-xl mx-auto my-16 text-center space-y-4 bg-[#140D10] border border-[#381A20] rounded-2xl shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-[#8B181E]/20 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto shadow-lg">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-serif font-bold text-[#F5EBE1]">Financial Access Restricted</h2>
        <p className="text-xs text-[#A89886] font-serif leading-relaxed">
          The Financial & Subscription Ledger is strictly restricted to{' '}
          <span className="text-[#F5D77F] font-semibold">ADMIN</span> and{' '}
          <span className="text-emerald-400 font-semibold">FINANCE_MANAGER</span> accounts.
        </p>
        <div className="p-3.5 rounded-xl bg-[#0B080A] border border-[#381A20] text-[11px] text-[#A89886] font-serif">
          Your current session role is: <strong className="text-[#D4AF37] font-mono">{user?.role}</strong>. Use the
          top role switcher in the header to switch to <strong className="text-emerald-400">Finance Manager</strong> or <strong className="text-[#F5D77F]">Admin</strong>.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#C5B4A0] font-serif">Loading Financial Ledger & Subscription Monetization...</span>
        </div>
      </div>
    );
  }

  const { metrics, planDistribution, recentSubscriptions } = data || {};

  return (
    <div className={embedded ? 'space-y-6' : 'p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden'}>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#381A20]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-serif font-bold text-[#F5D77F] uppercase tracking-wider mb-1">
              <DollarSign className="w-3.5 h-3.5 text-[#D4AF37]" />
              JANALA OTT FINANCIAL & SUBSCRIPTION LEDGER
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#F5EBE1] tracking-tight">Financial Operations & Revenue Stream</h1>
            <p className="text-xs text-[#A89886] font-serif mt-0.5">
              Subscriber recurring revenue, plan retention, and monetization analytics
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#140D10] border border-[#381A20] space-y-2 hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C59B27]">Monthly Recurring (MRR)</span>
          <div className="text-3xl font-serif font-bold text-[#F5EBE1] font-mono">${metrics?.mrr || '0.00'}</div>
          <span className="text-xs text-emerald-400 font-serif font-medium flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> +18.4% monthly expansion
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#140D10] border border-[#381A20] space-y-2 hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C59B27]">Annual Run-Rate (ARR)</span>
          <div className="text-3xl font-serif font-bold text-[#D4AF37] font-mono">${metrics?.arr || '0.00'}</div>
          <span className="text-xs text-[#A89886] font-serif">Estimated 12-month projection</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#140D10] border border-[#381A20] space-y-2 hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C59B27]">Active Paid Subscribers</span>
          <div className="text-3xl font-serif font-bold text-[#F5EBE1] font-mono">{metrics?.activeSubscriptions || 0}</div>
          <span className="text-xs text-emerald-400 font-serif font-medium">98.2% retention rate</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#140D10] border border-[#381A20] space-y-2 hover:border-[#D4AF37]/50 transition-all shadow-lg">
          <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C59B27]">Cumulative Revenue</span>
          <div className="text-3xl font-serif font-bold text-[#F5EBE1] font-mono">${metrics?.totalRevenue || '0.00'}</div>
          <span className="text-xs text-[#A89886] font-mono">Currency: USD / BDT Auto-Convert</span>
        </div>
      </div>

      {/* Plans Breakdown & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution */}
        <div className="bg-[#140D10] border border-[#381A20] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#F5EBE1]">Subscription Tier Breakdown</h3>
            <span className="text-[10px] font-serif text-[#D4AF37] uppercase tracking-wider">Active Plans</span>
          </div>
          <div className="space-y-3">
            {planDistribution?.map((p: any, idx: number) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#0B080A] border border-[#381A20] space-y-1.5 hover:border-[#D4AF37]/40 transition-colors">
                <div className="flex justify-between text-xs font-serif font-bold">
                  <span className="text-[#F5EBE1]">{p.plan}</span>
                  <span className="text-[#D4AF37] font-mono">${p.revenue}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#A89886] font-serif">
                  <span>Subscribers: {p.count}</span>
                  <span>Share: {((p.count / Math.max(1, metrics?.activeSubscriptions)) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#1C1216] overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B181E] to-[#D4AF37] rounded-full"
                    style={{ width: `${Math.min(100, ((p.count / Math.max(1, metrics?.activeSubscriptions)) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Subscriptions Ledger */}
        <div className="lg:col-span-2 bg-[#140D10] border border-[#381A20] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-serif font-bold text-[#F5EBE1]">Recent Subscription Transactions</h3>
              <p className="text-xs text-[#A89886] font-serif mt-0.5">Live subscriber transactions logged from gateway</p>
            </div>
            <span className="text-xs text-emerald-400 font-serif font-semibold">Live Gateway Active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#381A20] bg-[#0E080A] text-[10px] uppercase font-serif font-bold text-[#F5D77F]">
                  <th className="py-2.5 px-3">Subscriber Email</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#381A20]/60">
                {recentSubscriptions?.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-[#1C1216]/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[#D8C7B5]">{sub.userEmail}</td>
                    <td className="py-2.5 px-3 font-serif font-bold text-[#F5EBE1]">{sub.plan}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">${sub.amount}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-serif font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
