import { useState, useEffect } from 'react';
import {
  Headphones, LogOut, Play, Trash2, Clock, BookOpen, Search,
} from 'lucide-react';
import { getAudiobooks, deleteAudiobook } from '../lib/db';
import UploadArea from './Upload';
import type { Audiobook } from '../types';

function formatDuration(s: number): string {
  if (!s) return '0min';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function progressPercent(book: Audiobook): number {
  if (!book.duration) return 0;
  return Math.min((book.current_position / book.duration) * 100, 100);
}

interface LibraryProps {
  userId: string;
  userName: string;
  userAvatar: string | null;
  onSelectBook: (book: Audiobook) => void;
  onSignOut: () => void;
}

export default function Library({
  userId, userName, userAvatar, onSelectBook, onSignOut,
}: LibraryProps) {
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadBooks() {
    setLoading(true);
    try {
      const data = await getAudiobooks(userId);
      setBooks(data);
    } catch (err) {
      console.error('Error loading books:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, [userId]);

  async function handleDelete(book: Audiobook) {
    if (!confirm(`Remover "${book.title}"? O arquivo será deletado.`)) return;
    setDeleting(book.id);
    try {
      await deleteAudiobook(book.id, book.file_path);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch (err) {
      console.error('Error deleting:', err);
    } finally {
      setDeleting(null);
    }
  }

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  const inProgress = filtered.filter((b) => b.current_position > 0 && progressPercent(b) < 99);
  const notStarted = filtered.filter((b) => b.current_position === 0);
  const completed = filtered.filter((b) => progressPercent(b) >= 99);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Headphones className="w-6 h-6 text-brand-400" />
          <h1 className="font-bold text-lg flex-1">Audiobook Player</h1>
          <div className="flex items-center gap-3">
            {userAvatar && (
              <img src={userAvatar} alt="" className="w-7 h-7 rounded-full" />
            )}
            <span className="text-sm text-gray-400 hidden sm:block">{userName}</span>
            <button
              onClick={onSignOut}
              className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Upload */}
        <UploadArea userId={userId} onUploadComplete={loadBooks} />

        {/* Search */}
        {books.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar audiobooks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500">Carregando biblioteca...</div>
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Sua biblioteca está vazia. Faça upload de um audiobook!</p>
          </div>
        ) : (
          <>
            {inProgress.length > 0 && (
              <Section title="Ouvindo agora" books={inProgress} onSelect={onSelectBook} onDelete={handleDelete} deleting={deleting} />
            )}
            {notStarted.length > 0 && (
              <Section title="Não iniciados" books={notStarted} onSelect={onSelectBook} onDelete={handleDelete} deleting={deleting} />
            )}
            {completed.length > 0 && (
              <Section title="Concluídos" books={completed} onSelect={onSelectBook} onDelete={handleDelete} deleting={deleting} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Section({
  title, books, onSelect, onDelete, deleting,
}: {
  title: string;
  books: Audiobook[];
  onSelect: (b: Audiobook) => void;
  onDelete: (b: Audiobook) => void;
  deleting: string | null;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="grid gap-3">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onSelect={() => onSelect(book)}
            onDelete={() => onDelete(book)}
            isDeleting={deleting === book.id}
          />
        ))}
      </div>
    </div>
  );
}

function BookCard({
  book, onSelect, onDelete, isDeleting,
}: {
  book: Audiobook;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const pct = progressPercent(book);
  return (
    <div className="bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/40 rounded-xl p-4 transition-all group">
      <div className="flex items-center gap-4">
        {/* Play button */}
        <button
          onClick={onSelect}
          className="w-12 h-12 bg-brand-600/20 hover:bg-brand-600/40 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
        >
          <Play className="w-5 h-5 text-brand-300 ml-0.5" />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <h3 className="font-semibold truncate">{book.title}</h3>
          <p className="text-gray-400 text-sm truncate">{book.author}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(book.duration)}
            </span>
            {book.chapters.length > 0 && (
              <span>{book.chapters.length} capítulos</span>
            )}
            {book.bookmarks.length > 0 && (
              <span>{book.bookmarks.length} marcadores</span>
            )}
          </div>
        </div>

        {/* Progress + delete */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {pct > 0 && (
            <div className="text-right">
              <div className="text-sm font-medium text-brand-300">{Math.round(pct)}%</div>
              <div className="w-16 h-1.5 bg-gray-700 rounded-full mt-1">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
