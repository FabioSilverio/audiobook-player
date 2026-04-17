import { useState, useRef } from 'react';
import { Search, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import {
  searchCovers, downloadCoverFromUrl, saveCoverLocally,
  type CoverSearchResult,
} from '../lib/storage';

interface CoverPickerProps {
  bookId: string;
  bookTitle: string;
  onCoverSet: (blobUrl: string) => void;
  onClose: () => void;
}

export default function CoverPicker({ bookId, bookTitle, onCoverSet, onClose }: CoverPickerProps) {
  const [tab, setTab] = useState<'search' | 'upload'>('search');
  const [query, setQuery] = useState(bookTitle);
  const [results, setResults] = useState<CoverSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const covers = await searchCovers(query);
      setResults(covers);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  }

  async function selectCover(cover: CoverSearchResult, index: number) {
    setSaving(index);
    try {
      const blob = await downloadCoverFromUrl(cover.coverUrl);
      await saveCoverLocally(bookId, blob);
      const url = URL.createObjectURL(blob);
      onCoverSet(url);
    } catch (e) {
      console.error('Failed to download cover:', e);
      alert('Erro ao baixar capa.');
    } finally {
      setSaving(null);
    }
  }

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem (PNG, JPG, WEBP).');
      return;
    }
    try {
      await saveCoverLocally(bookId, file);
      const url = URL.createObjectURL(file);
      onCoverSet(url);
    } catch (e) {
      console.error('Failed to save cover:', e);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="font-bold text-lg">Escolher capa</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setTab('search')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'search' ? 'text-brand-300 border-b-2 border-brand-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Search className="w-4 h-4 inline mr-1.5" />
            Buscar online
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'upload' ? 'text-brand-300 border-b-2 border-brand-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-1.5" />
            Upload local
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'search' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Título do livro..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>
              </div>

              {results.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {results.map((cover, i) => (
                    <button
                      key={cover.coverId}
                      onClick={() => selectCover(cover, i)}
                      disabled={saving !== null}
                      className="group relative rounded-xl overflow-hidden border border-gray-700/50 hover:border-brand-500/50 transition-all aspect-[2/3] bg-gray-800"
                    >
                      <img
                        src={cover.coverUrl}
                        alt={cover.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {saving === i && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs truncate font-medium">{cover.title}</p>
                        <p className="text-xs text-gray-400 truncate">{cover.author}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : !searching ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  Busque pelo título do livro para encontrar capas.
                </p>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl p-8 text-center cursor-pointer transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Clique para selecionar uma imagem</p>
                <p className="text-gray-600 text-xs mt-1">PNG, JPG, WEBP</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
