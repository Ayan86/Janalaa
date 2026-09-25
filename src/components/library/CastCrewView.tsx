import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Person, Genre } from '../../types/index.ts';
import { Users, Plus, Film, Tag, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const CastCrewView: React.FC = () => {
  const { isAdmin, isContentManager } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeTab, setActiveTab] = useState<'people' | 'genres'>('people');
  const [loading, setLoading] = useState(true);

  // New Person modal state
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('ACTOR');
  const [photoUrl, setPhotoUrl] = useState('');
  const [biography, setBiography] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [p, g] = await Promise.all([api.getPeople(), api.getGenres()]);
      setPeople(p || []);
      setGenres(g || []);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPerson({ name, role, photoUrl, biography });
      setName('');
      setBiography('');
      setPhotoUrl('');
      setShowPersonModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to create person:', err);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Talent Roster & Catalog Taxonomies</h1>
          <p className="text-xs text-slate-400 mt-1">
            Actors, directors, producers, cinematographers and genres associated with OTT content
          </p>
        </div>

        {(isAdmin || isContentManager) && (
          <button
            onClick={() => setShowPersonModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Talent Member</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('people')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'people'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Cast & Crew ({people.length})
        </button>
        <button
          onClick={() => setActiveTab('genres')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'genres'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Genres & Taxonomies ({genres.length})
        </button>
      </div>

      {/* People Grid */}
      {activeTab === 'people' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {people.map((person) => (
            <div
              key={person.id}
              className="p-4 rounded-2xl bg-[#12151f] border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-3.5"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                    {person.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{person.name}</h4>
                <span className="inline-block text-[10px] font-semibold text-red-400 px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/40 mt-1">
                  {person.role}
                </span>
                <p className="text-[11px] text-slate-400 truncate mt-1">{person.biography || 'Notable contributor'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Genres Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {genres.map((g) => (
            <div key={g.id} className="p-4 rounded-2xl bg-[#12151f] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">{g.name}</h4>
                <span className="text-[10px] text-slate-500 font-mono">/{g.slug}</span>
              </div>
              <p className="text-[11px] text-slate-400">{g.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      {showPersonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12151f] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Add Cast or Crew Member</h3>
            <form onSubmit={handleCreatePerson} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Primary Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="ACTOR">Actor / Actress</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="PRODUCER">Producer</option>
                  <option value="WRITER">Writer / Screenplay</option>
                  <option value="CINEMATOGRAPHER">Cinematographer</option>
                  <option value="MUSIC_DIRECTOR">Music Director</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Photo URL</label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Short Biography</label>
                <textarea
                  rows={2}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  className="w-full bg-[#090a0f] border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPersonModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
