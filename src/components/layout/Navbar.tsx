import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Upload,
  LogOut,
  Shield,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { UserRole } from '../../types/index.ts';
import { JaanalaLogo } from '../common/JaanalaLogo.tsx';

interface NavbarProps {
  onOpenUploader: () => void;
  activeTab: string;
  onOpenSettings?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUploader,
  activeTab,
  onOpenSettings,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: UserRole) => {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-serif font-bold bg-[#8B181E]/30 text-[#F5D77F] border border-[#D4AF37]/40 shadow-sm">
        <Shield className="w-3 h-3 text-[#D4AF37]" />
        ADMINISTRATOR
      </span>
    );
  };

  return (
    <header className="h-16 border-b border-[#381A20]/50 bg-[#0E090B]/45 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between shadow-lg">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3 sm:gap-5">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-[#F5D77F] hover:bg-[#1E1116] border border-[#521319]/60 transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <JaanalaLogo size="sm" variant="horizontal" showTagline={false} showBengali={true} />
      </div>

      {/* Right actions: Upload button, Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real Direct Video Upload CTA */}
        <button
          onClick={onOpenUploader}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#8B181E] via-[#A82027] to-[#7B1113] hover:from-[#9E1B22] hover:to-[#8B181E] text-white text-xs font-semibold shadow-md shadow-[#8B181E]/40 border border-[#D4AF37]/40 transition-all cursor-pointer group shrink-0"
        >
          <Upload className="w-3.5 h-3.5 text-[#F5D77F] group-hover:scale-110 transition-transform" />
          <span className="font-serif tracking-wide hidden xs:inline sm:inline">Upload Master</span>
          <span className="font-serif tracking-wide xs:hidden sm:hidden">Upload</span>
        </button>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-[#381A20]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1C1216] border border-[#8B181E] flex items-center justify-center text-xs font-serif font-bold text-[#F5D77F] shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || 'J'
              )}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-serif font-semibold text-[#F5EBE1] leading-tight flex items-center gap-1.5">
                {user?.name}
              </div>
              <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
            </div>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Settings & Infrastructure (JWT & R2)"
              className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-[#8B181E]/40 text-[#F5D77F] border border-[#D4AF37]/50'
                  : 'text-[#A89886] hover:text-[#E5C365] hover:bg-[#1E1116]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden xl:inline text-xs font-serif">Settings</span>
            </button>
          )}

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-[#A89886] hover:text-[#E5C365] hover:bg-[#1E1116] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
