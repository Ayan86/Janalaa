import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Film,
  UploadCloud,
  Tv,
  Users2,
  DollarSign,
  FileText,
  Settings,
  Lock,
  Clapperboard,
  HardDrive,
  Video,
  MonitorPlay,
  X,
} from 'lucide-react';
import { JaanalaLogo } from '../common/JaanalaLogo.tsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUploader: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenUploader,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, isAdmin, isContentManager, isFinanceManager } = useAuth();

  const navItems = [
    {
      id: 'content-movies',
      label: 'Movies',
      icon: Film,
      allowed: true,
      category: 'CINEMA CATALOG',
      bengali: 'চলচ্চিত্র',
    },
    {
      id: 'series',
      label: 'Web Series',
      icon: Tv,
      allowed: true,
      category: 'CINEMA CATALOG',
      bengali: 'ওয়েব সিরিজ',
    },
    {
      id: 'content-documentary',
      label: 'Documentaries',
      icon: Video,
      allowed: true,
      category: 'CINEMA CATALOG',
      bengali: 'তথ্যচিত্র',
    },
    {
      id: 'content-shortfilm',
      label: 'Short Films',
      icon: Clapperboard,
      allowed: true,
      category: 'CINEMA CATALOG',
      bengali: 'স্বল্পদৈর্ঘ্য',
    },
    {
      id: 'content-tvseries',
      label: 'TV Series',
      icon: MonitorPlay,
      allowed: true,
      category: 'CINEMA CATALOG',
      bengali: 'টিভি সিরিজ',
    },
    {
      id: 'finance',
      label: 'Finance & Subscriptions',
      icon: DollarSign,
      allowed: isAdmin || isFinanceManager,
      restrictedFor: isContentManager ? 'Locked for Content Manager' : null,
      category: 'BUSINESS & SUBSCRIBERS',
      badge: isFinanceManager ? 'Active' : undefined,
    },
    {
      id: 'upload',
      label: 'Cloudflare R2 Uploader',
      icon: UploadCloud,
      allowed: isAdmin || isContentManager,
      category: 'PRODUCTION VAULT',
      badge: 'R2 Direct',
    },
    {
      id: 'media',
      label: 'Master Asset Repository',
      icon: HardDrive,
      allowed: true,
      category: 'PRODUCTION VAULT',
    },
    {
      id: 'library',
      label: 'Cast, Directors & Crew',
      icon: Users2,
      allowed: true,
      category: 'PRODUCTION VAULT',
      bengali: 'শিল্পী ও কলাকুশলী',
    },
    {
      id: 'audit',
      label: 'Studio Audit & Logs',
      icon: FileText,
      allowed: true,
      category: 'HERITAGE ENGINE',
    },
    {
      id: 'settings',
      label: 'Settings & Infrastructure',
      icon: Settings,
      allowed: true,
      category: 'HERITAGE ENGINE',
      badge: 'JWT & R2',
    },
  ];

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-[#0F0A0C]/45 backdrop-blur-md">
      {/* Mobile Drawer Header */}
      <div className="lg:hidden p-4 border-b border-[#381A20] flex items-center justify-between bg-[#140D10]">
        <JaanalaLogo size="sm" variant="horizontal" showTagline={false} showBengali={true} />
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-[#F5D77F] hover:bg-[#1E1116] border border-[#521319]/60 cursor-pointer"
            aria-label="Close Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-3.5 flex-1 space-y-5 overflow-y-auto">
        {/* Navigation Sections */}
        {['CINEMA CATALOG', 'PRODUCTION VAULT', 'BUSINESS & SUBSCRIBERS', 'HERITAGE ENGINE'].map((cat) => {
          const items = navItems.filter((item) => item.category === cat);
          if (items.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              <span className="text-[10px] sm:text-[11px] font-sans font-extrabold uppercase tracking-[0.2em] text-[#F8E088] px-3 block mb-2 opacity-90 drop-shadow-sm">
                {cat}
              </span>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDenied = !item.allowed;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!isDenied) {
                        setActiveTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }
                    }}
                    disabled={isDenied}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-sans font-semibold transition-all group min-h-[44px] relative ${
                      isActive
                        ? 'bg-gradient-to-r from-[#8B181E] via-[#A82027]/80 to-[#5E0D12]/60 text-white border border-[#F8E088]/60 shadow-lg shadow-[#8B181E]/40 font-bold'
                        : isDenied
                        ? 'opacity-40 cursor-not-allowed text-slate-500'
                        : 'text-[#E2D7CD] hover:text-white hover:bg-[#1C1216]/80 hover:border-[#8B181E]/40 border border-transparent cursor-pointer'
                    }`}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#F8E088] shadow-[0_0_8px_#F8E088]" />
                    )}

                    <div className="flex items-center gap-3 min-w-0 pl-1">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#F8E088] drop-shadow-[0_0_6px_rgba(248,224,136,0.6)]'
                            : 'text-[#E2D7CD]/70 group-hover:text-[#F8E088]'
                        }`}
                      />
                      <div className="flex flex-col text-left truncate">
                        <span className={`font-sans tracking-tight truncate ${isActive ? 'text-white font-bold drop-shadow-ott' : ''}`}>
                          {item.label}
                        </span>
                        {item.bengali && (
                          <span className={`text-[11px] font-bengali leading-none truncate mt-0.5 ${isActive ? 'text-[#F8E088] font-bold glow-gold' : 'text-[#E2D7CD]/60 group-hover:text-[#F8E088]'}`}>
                            {item.bengali}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#8B181E] text-[#F8E088] border border-[#F8E088]/40 shrink-0 ml-1.5 shadow-sm">
                        {item.badge}
                      </span>
                    )}

                    {isDenied && (
                      <span title={item.restrictedFor || 'Restricted'} className="shrink-0 ml-1">
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Cloudflare R2 & Cloud SQL live card in sidebar footer */}
      <div className="p-3.5 border-t border-[#381A20] bg-[#0A0709] text-xs">
        <div className="p-3 rounded-xl bg-[#140D10]/80 border border-[#381A20] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-sans font-bold text-white">
            <span>STORAGE BACKEND</span>
            <span className="text-[#F8E088] font-mono">Cloudflare R2</span>
          </div>
          <div className="text-[11px] text-[#E2D7CD] leading-snug font-sans">
            High-bitrate cinema masters stream directly via R2 edge network.
          </div>
          <div className="pt-1.5 flex items-center justify-between border-t border-[#381A20] text-[10px] text-[#E2D7CD]/80 font-sans">
            <span>Metadata: Cloud SQL</span>
            <span className="text-emerald-400 font-bold font-sans">Active</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0F0A0C]/45 backdrop-blur-md border-r border-[#381A20]/50 flex-col shrink-0 min-h-[calc(100vh-4rem)] shadow-xl">
        {renderNavContent()}
      </aside>

      {/* Mobile Backdrop & Slide-out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer */}
          <aside className="relative w-4/5 max-w-xs bg-[#0F0A0C] border-r border-[#381A20] flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
};
