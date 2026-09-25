import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { ContentListView } from './components/content/ContentListView.tsx';
import { MovieEditorModal } from './components/content/MovieEditorModal.tsx';
import { VideoUploaderModal } from './components/upload/VideoUploaderModal.tsx';
import { SeriesManagerView } from './components/content/SeriesManagerView.tsx';
import { MediaAssetsView } from './components/media/MediaAssetsView.tsx';
import { CastCrewView } from './components/library/CastCrewView.tsx';
import { FinanceView } from './components/finance/FinanceView.tsx';
import { UnifiedAdminPanelView } from './components/admin/UnifiedAdminPanelView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { VideoPlayerModal } from './components/media/VideoPlayerModal.tsx';
import { ContentItem } from './types/index.ts';
import { JaanalaLogo } from './components/common/JaanalaLogo.tsx';
import { JanalaaWallpaper } from './components/common/JanalaaWallpaper.tsx';
import janalaaThemeImg from './assets/Janalaa_Theme.png';
import {
  Film,
  Tv,
  Upload,
  DollarSign,
  Menu,
} from 'lucide-react';

function AdminPortal() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('content-movies');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'content' | 'upload' | 'finance' | 'monetization'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Modals state
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [uploaderTargetContent, setUploaderTargetContent] = useState<ContentItem | null>(null);

  const [isMovieEditorOpen, setIsMovieEditorOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<ContentItem | null>(null);

  const [playingMovie, setPlayingMovie] = useState<ContentItem | null>(null);
  const [contentRefreshTrigger, setContentRefreshTrigger] = useState<number>(0);

  const handleContentRefresh = () => {
    setContentRefreshTrigger((prev) => prev + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jaanala:content-updated'));
    }
  };

  if (loading) {
    return (
      <JanalaaWallpaper
        variant="login"
        overlayOpacity={15}
        className="min-h-screen flex flex-col items-center justify-center relative p-6"
      >
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative p-8 sm:p-10 rounded-3xl bg-[#140D10]/90 border border-[#521319]/80 shadow-2xl backdrop-blur-xl flex flex-col items-center">
            <div className="absolute inset-0 rounded-3xl border-2 border-[#D4AF37]/40 animate-pulse pointer-events-none" />
            <JaanalaLogo size="xl" variant="vertical" showTagline={true} showBengali={true} />
          </div>

          <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#1C1216]/90 border border-[#8B181E]/80 shadow-xl backdrop-blur-md">
            <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-xs text-[#F5D77F] font-serif font-semibold tracking-wider">
              Initializing JANALAA (জানালা) OTT Central Console...
            </span>
          </div>
        </div>
      </JanalaaWallpaper>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const handleOpenUploader = (content?: ContentItem | null) => {
    setUploaderTargetContent(content || null);
    setIsUploaderOpen(true);
  };

  const handleOpenMovieEditor = (movie?: ContentItem | null) => {
    setEditingMovie(movie || null);
    setIsMovieEditorOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B080A]/20 text-[#F5EBE1] flex flex-col font-sans selection:bg-[#8B181E] selection:text-[#F5D77F] relative overflow-x-hidden">
      {/* Global Fixed Heritage Kolkata Cinema Wallpaper Layer */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src={janalaaThemeImg}
          alt="Jaanala Heritage Cinema Wallpaper"
          className="w-full h-full object-cover object-center opacity-100 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B080A]/25 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Top Bar */}
      <Navbar
        onOpenUploader={() => handleOpenUploader(null)}
        activeTab={activeTab}
        onOpenSettings={() => {
          setActiveTab('settings');
          setMobileMenuOpen(false);
        }}
        isMobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-row overflow-hidden relative z-10">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setMobileMenuOpen(false);
            if (tab === 'upload') {
              setActiveTab('admin-panel');
              setAdminSubTab('upload');
            } else if (tab === 'finance') {
              setActiveTab('admin-panel');
              setAdminSubTab('finance');
            } else if (tab === 'content') {
              setActiveTab('admin-panel');
              setAdminSubTab('content');
            } else {
              setActiveTab(tab);
            }
          }}
          onOpenUploader={() => handleOpenUploader(null)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto min-w-0 bg-transparent pb-20 lg:pb-0">
          <JanalaaWallpaper variant="subtle" overlayOpacity={30} className="min-h-full">
            {activeTab === 'admin-panel' && (
            <UnifiedAdminPanelView
              initialSubTab={adminSubTab}
              onOpenMovieEditor={(movie) => handleOpenMovieEditor(movie)}
              onOpenVideoUploader={(movie) => handleOpenUploader(movie)}
              onPlayMovie={(movie) => setPlayingMovie(movie)}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              onSelectContent={(movie) => handleOpenMovieEditor(movie)}
              onPlayMovie={(movie) => setPlayingMovie(movie)}
              onOpenUploader={() => handleOpenUploader(null)}
              onNavigateTab={(tab) => {
                if (tab === 'upload' || tab === 'finance' || tab === 'content') {
                  setActiveTab('admin-panel');
                  setAdminSubTab(tab as any);
                } else {
                  setActiveTab(tab);
                }
              }}
            />
          )}

          {(activeTab === 'content' || activeTab === 'content-movies') && (
            <ContentListView
              initialTypeFilter="MOVIE"
              refreshTrigger={contentRefreshTrigger}
              onOpenMovieEditor={(movie) => handleOpenMovieEditor(movie)}
              onOpenVideoUploader={(movie) => handleOpenUploader(movie)}
            />
          )}

          {activeTab === 'content-documentary' && (
            <ContentListView
              initialTypeFilter="DOCUMENTARY"
              refreshTrigger={contentRefreshTrigger}
              onOpenMovieEditor={(movie) => handleOpenMovieEditor(movie)}
              onOpenVideoUploader={(movie) => handleOpenUploader(movie)}
            />
          )}

          {activeTab === 'content-shortfilm' && (
            <ContentListView
              initialTypeFilter="SHORT_FILM"
              refreshTrigger={contentRefreshTrigger}
              onOpenMovieEditor={(movie) => handleOpenMovieEditor(movie)}
              onOpenVideoUploader={(movie) => handleOpenUploader(movie)}
            />
          )}

          {activeTab === 'content-tvseries' && (
            <ContentListView
              initialTypeFilter="TV_SERIES"
              refreshTrigger={contentRefreshTrigger}
              onOpenMovieEditor={(movie) => handleOpenMovieEditor(movie)}
              onOpenVideoUploader={(movie) => handleOpenUploader(movie)}
            />
          )}

          {activeTab === 'series' && (
            <SeriesManagerView
              onOpenVideoUploader={(content) => handleOpenUploader(content)}
              onPlayMovie={(movie) => setPlayingMovie(movie)}
            />
          )}

          {activeTab === 'media' && <MediaAssetsView />}

          {activeTab === 'library' && <CastCrewView />}

          {activeTab === 'finance' && <FinanceView />}

          {activeTab === 'audit' && <SettingsView />}

          {activeTab === 'settings' && <SettingsView />}
          </JanalaaWallpaper>
        </main>
      </div>

      {/* Global Cloudflare R2 Multipart Video Uploader Modal */}
      <VideoUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        preselectedContent={uploaderTargetContent}
        onPreviewVideo={(movie) => setPlayingMovie(movie)}
        onUploadSuccess={() => {
          handleContentRefresh();
        }}
      />

      {/* Movie & Content Metadata Editor Modal */}
      <MovieEditorModal
        isOpen={isMovieEditorOpen}
        onClose={() => {
          setIsMovieEditorOpen(false);
          setEditingMovie(null);
        }}
        initialData={editingMovie}
        onOpenVideoUploader={(movie) => handleOpenUploader(movie)}
        onSaved={() => {
          handleContentRefresh();
        }}
      />

      {/* Global Cloudflare R2 Video Playback Player Modal */}
      <div className="relative z-[100]">
        <VideoPlayerModal
          movie={playingMovie}
          isOpen={!!playingMovie}
          onClose={() => setPlayingMovie(null)}
          onOpenUploader={(movie) => handleOpenUploader(movie)}
        />
      </div>

      {/* Mobile Bottom Navigation Bar (Phone & small tablet view) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E090B]/95 border-t border-[#381A20] backdrop-blur-md px-2 py-1 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => {
            setActiveTab('content-movies');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'content-movies' || activeTab === 'content'
              ? 'text-[#F5D77F]'
              : 'text-[#A89886] hover:text-[#F3EBE1]'
          }`}
        >
          <Film className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-serif">Movies</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('series');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'series'
              ? 'text-[#F5D77F]'
              : 'text-[#A89886] hover:text-[#F3EBE1]'
          }`}
        >
          <Tv className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-serif">Series</span>
        </button>

        {/* Big Center Upload Action */}
        <button
          onClick={() => {
            handleOpenUploader(null);
            setMobileMenuOpen(false);
          }}
          className="flex flex-col items-center justify-center -mt-4 bg-gradient-to-tr from-[#8B181E] to-[#A82027] text-white p-2.5 rounded-full border-2 border-[#D4AF37]/50 shadow-lg shadow-[#8B181E]/60 min-w-[48px] min-h-[48px] active:scale-95 transition-transform cursor-pointer"
          title="Upload Video"
        >
          <Upload className="w-5 h-5 text-[#F5D77F]" />
        </button>

        <button
          onClick={() => {
            setActiveTab('finance');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'finance'
              ? 'text-[#F5D77F]'
              : 'text-[#A89886] hover:text-[#F3EBE1]'
          }`}
        >
          <DollarSign className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-serif">Finance</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] min-h-[44px] transition-colors cursor-pointer ${
            mobileMenuOpen
              ? 'text-[#F5D77F]'
              : 'text-[#A89886] hover:text-[#F3EBE1]'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-serif">Menu</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminPortal />
    </AuthProvider>
  );
}
