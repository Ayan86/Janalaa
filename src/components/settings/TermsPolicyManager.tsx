import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  Wand2,
  Tag,
  BookOpen,
  Filter,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  RESERVED_SLUGS_CATEGORIES,
  PROHIBITED_TERMS_CATEGORIES,
  validateSlug,
  validateTextCompliance,
  validateContentPayload,
  generateSafeSlug,
} from '../../lib/termsValidation.ts';

export const TermsPolicyManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeView, setActiveView] = useState<'reserved' | 'prohibited' | 'tester'>('reserved');

  // Interactive Tester states
  const [testTitle, setTestTitle] = useState('');
  const [testSlug, setTestSlug] = useState('');
  const [testShortDesc, setTestShortDesc] = useState('');
  const [testFullDesc, setTestFullDesc] = useState('');

  // Custom term creation state
  const [newTerm, setNewTerm] = useState('');
  const [newTermType, setNewTermType] = useState<'reserved' | 'prohibited'>('reserved');
  const [submittingCustom, setSubmittingCustom] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const data = await api.getTermsCatalog();
      setCatalog(data);
    } catch (err: any) {
      console.error('Failed to load terms catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleAddCustomTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim()) return;

    try {
      setSubmittingCustom(true);
      setActionFeedback(null);
      await api.addCustomTerm(newTerm.trim(), newTermType);
      setActionFeedback(`Added '${newTerm.trim()}' to custom ${newTermType} terms.`);
      setNewTerm('');
      await loadCatalog();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message || 'Failed to add custom term'}`);
    } finally {
      setSubmittingCustom(false);
    }
  };

  const handleRemoveCustomTerm = async (term: string, type: 'reserved' | 'prohibited') => {
    try {
      setActionFeedback(null);
      await api.removeCustomTerm(term, type);
      setActionFeedback(`Removed '${term}' from custom ${type} terms.`);
      await loadCatalog();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message || 'Failed to remove custom term'}`);
    }
  };

  // Test computations
  const testSlugResult = testSlug ? validateSlug(testSlug) : null;
  const testTitleResult = testTitle ? validateTextCompliance(testTitle, 'Title') : null;
  const testShortDescResult = testShortDesc ? validateTextCompliance(testShortDesc, 'Logline') : null;
  const testFullDescResult = testFullDesc ? validateTextCompliance(testFullDesc, 'Synopsis') : null;

  const testOverallResult = validateContentPayload({
    title: testTitle || undefined,
    slug: testSlug || undefined,
    shortDescription: testShortDesc || undefined,
    fullDescription: testFullDesc || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/30 via-[#12151f] to-[#12151f] border border-red-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Content Compliance & Terms Enforcement Policy</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enforces system URL isolation for reserved platform keywords and broadcast content compliance for prohibited terms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCatalog}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Policy</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveView('reserved')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeView === 'reserved'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reserved Routing Slugs ({catalog?.reserved?.totalCount || '...'})
          </button>

          <button
            onClick={() => setActiveView('prohibited')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeView === 'prohibited'
                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Prohibited Compliance Terms ({catalog?.prohibited?.totalCount || '...'})
          </button>

          <button
            onClick={() => setActiveView('tester')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeView === 'tester'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Interactive Compliance Tester
          </button>
        </div>

        {actionFeedback && (
          <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
            {actionFeedback}
          </span>
        )}
      </div>

      {/* VIEW 1: Reserved Slugs Catalog */}
      {activeView === 'reserved' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#0d1017] border border-slate-800/80 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Reserved Routing Keywords:</strong> These identifiers are permanently reserved for platform infrastructure, authentication, API routes, admin portals, and legal routing. OTT content titles or genres attempting to use these as slugs will be blocked and provided with an automated safe suffix (e.g., <code className="text-amber-300">admin-film</code>).
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reserved terms (e.g., admin, api, billing, watch)..."
              className="w-full bg-[#12151f] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(RESERVED_SLUGS_CATEGORIES).map(([catKey, items]) => {
              const filtered = items.filter((item) =>
                item.toLowerCase().includes(searchTerm.toLowerCase().trim())
              );
              if (searchTerm && filtered.length === 0) return null;

              return (
                <div key={catKey} className="p-4 rounded-xl bg-[#12151f] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 capitalize flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <span>{catKey} Category</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {filtered.length} terms
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {filtered.map((slug) => (
                      <span
                        key={slug}
                        className="px-2 py-0.5 rounded-md bg-[#090a0f] border border-slate-800 font-mono text-[11px] text-amber-300/90 hover:border-amber-500/40 transition-colors"
                      >
                        {slug}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Reserved Slugs */}
          {catalog?.reserved?.custom && catalog.reserved.custom.length > 0 && (
            <div className="p-4 rounded-xl bg-[#12151f] border border-amber-900/40 space-y-3">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Custom Platform Reserved Slugs (Admin Defined)</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {catalog.reserved.custom.map((term: string) => (
                  <div
                    key={term}
                    className="px-2.5 py-1 rounded-lg bg-[#090a0f] border border-amber-800/60 font-mono text-xs text-amber-200 flex items-center gap-2"
                  >
                    <span>{term}</span>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveCustomTerm(term, 'reserved')}
                        className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove custom term"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add custom term form for Admins */}
          {isAdmin && (
            <form onSubmit={handleAddCustomTerm} className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Register custom reserved keyword (e.g. partner-portal)..."
                className="flex-1 bg-[#12151f] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
              />
              <button
                type="submit"
                disabled={submittingCustom || !newTerm.trim()}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Reserved Keyword</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* VIEW 2: Prohibited Terms Catalog */}
      {activeView === 'prohibited' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#0d1017] border border-slate-800/80 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Prohibited Content Terms:</strong> Terms associated with profanity, piracy distribution, adult materials, hate speech, or financial scams are strictly blocked from content titles, slugs, and loglines to ensure compliance with global broadcast and advertising standards.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prohibited terms list..."
              className="w-full bg-[#12151f] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500/50"
            />
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PROHIBITED_TERMS_CATEGORIES).map(([catKey, items]) => {
              const filtered = items.filter((item) =>
                item.toLowerCase().includes(searchTerm.toLowerCase().trim())
              );
              if (searchTerm && filtered.length === 0) return null;

              return (
                <div key={catKey} className="p-4 rounded-xl bg-[#12151f] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 capitalize flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      <span>{catKey} Category</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {filtered.length} terms
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {filtered.map((term) => (
                      <span
                        key={term}
                        className="px-2 py-0.5 rounded-md bg-[#090a0f] border border-slate-800 font-mono text-[11px] text-red-300/80 hover:border-red-500/40 transition-colors"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Prohibited Terms */}
          {catalog?.prohibited?.custom && catalog.prohibited.custom.length > 0 && (
            <div className="p-4 rounded-xl bg-[#12151f] border border-red-900/40 space-y-3">
              <h4 className="text-xs font-bold text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>Custom Blacklisted Terms (Admin Defined)</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {catalog.prohibited.custom.map((term: string) => (
                  <div
                    key={term}
                    className="px-2.5 py-1 rounded-lg bg-[#090a0f] border border-red-800/60 font-mono text-xs text-red-200 flex items-center gap-2"
                  >
                    <span>{term}</span>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveCustomTerm(term, 'prohibited')}
                        className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove custom term"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add custom prohibited term form for Admins */}
          {isAdmin && (
            <form onSubmit={handleAddCustomTerm} className="p-4 rounded-xl bg-[#0b0d14] border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newTerm}
                onChange={(e) => {
                  setNewTerm(e.target.value);
                  setNewTermType('prohibited');
                }}
                placeholder="Register new prohibited term..."
                className="flex-1 bg-[#12151f] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500/50"
              />
              <button
                type="submit"
                disabled={submittingCustom || !newTerm.trim()}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Prohibited Term</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* VIEW 3: Interactive Compliance Tester */}
      {activeView === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs Column */}
          <div className="p-5 rounded-2xl bg-[#12151f] border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Simulate Content Submission</span>
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Title to Test
              </label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => {
                  setTestTitle(e.target.value);
                  if (!testSlug) setTestSlug(generateSafeSlug(e.target.value));
                }}
                placeholder="e.g. Admin Movie"
                className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Slug to Test
                </label>
                {testTitle && (
                  <button
                    type="button"
                    onClick={() => setTestSlug(generateSafeSlug(testTitle))}
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Auto Safe Slug</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={testSlug}
                onChange={(e) => setTestSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="e.g. admin or watch"
                className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Short Logline to Test
              </label>
              <input
                type="text"
                value={testShortDesc}
                onChange={(e) => setTestShortDesc(e.target.value)}
                placeholder="e.g. Watch free cracked torrent download here..."
                className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Full Synopsis to Test
              </label>
              <textarea
                rows={3}
                value={testFullDesc}
                onChange={(e) => setTestFullDesc(e.target.value)}
                placeholder="Detailed film synopsis text..."
                className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Results Column */}
          <div className="p-5 rounded-2xl bg-[#0e1017] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Compliance Evaluation
              </h4>
              <span
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                  testOverallResult.valid
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}
              >
                {testOverallResult.valid ? 'COMPLIANT' : 'VIOLATION DETECTED'}
              </span>
            </div>

            {/* Slug Result */}
            <div className="p-3.5 rounded-xl bg-[#12151f] border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Slug Check:</span>
                {testSlugResult ? (
                  testSlugResult.valid ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                    </span>
                  ) : testSlugResult.isReserved ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Reserved Keyword
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Blocked
                    </span>
                  )
                ) : (
                  <span className="text-slate-500 text-[11px]">No slug provided</span>
                )}
              </div>

              {testSlugResult && !testSlugResult.valid && (
                <div className="text-[11px] text-red-300 space-y-1">
                  {testSlugResult.errors.map((e, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span className="text-red-400">•</span>
                      <span>{e}</span>
                    </div>
                  ))}
                  {testSlugResult.suggestions.length > 0 && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Safe Alternative:</span>
                      <button
                        onClick={() => setTestSlug(testSlugResult.suggestions[0])}
                        className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-mono text-[10px] transition-colors"
                      >
                        {testSlugResult.suggestions[0]}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title Result */}
            <div className="p-3.5 rounded-xl bg-[#12151f] border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Title Compliance:</span>
                {testTitleResult ? (
                  testTitleResult.valid ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Prohibited Terms Found
                    </span>
                  )
                ) : (
                  <span className="text-slate-500 text-[11px]">Empty</span>
                )}
              </div>
              {testTitleResult && !testTitleResult.valid && (
                <p className="text-[11px] text-red-300">{testTitleResult.error}</p>
              )}
            </div>

            {/* Short Desc Result */}
            <div className="p-3.5 rounded-xl bg-[#12151f] border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Logline Compliance:</span>
                {testShortDescResult ? (
                  testShortDescResult.valid ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Prohibited
                    </span>
                  )
                ) : (
                  <span className="text-slate-500 text-[11px]">Empty</span>
                )}
              </div>
              {testShortDescResult && !testShortDescResult.valid && (
                <p className="text-[11px] text-red-300">{testShortDescResult.error}</p>
              )}
            </div>

            {/* Full Desc Result */}
            <div className="p-3.5 rounded-xl bg-[#12151f] border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Synopsis Compliance:</span>
                {testFullDescResult ? (
                  testFullDescResult.valid ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Prohibited
                    </span>
                  )
                ) : (
                  <span className="text-slate-500 text-[11px]">Empty</span>
                )}
              </div>
              {testFullDescResult && !testFullDescResult.valid && (
                <p className="text-[11px] text-red-300">{testFullDescResult.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
