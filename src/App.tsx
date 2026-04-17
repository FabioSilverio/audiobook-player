import { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import Library from './components/Library';
import Player from './components/Player';
import type { Audiobook, Bookmark } from './types';

export default function App() {
  const { user, loading, signInWithGitHub, signInWithGoogle, signOut } = useAuth();
  const [currentBook, setCurrentBook] = useState<Audiobook | null>(null);

  const handleBookmarksChange = useCallback((bookmarks: Bookmark[]) => {
    setCurrentBook((prev) => prev ? { ...prev, bookmarks } : null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth onGitHub={signInWithGitHub} onGoogle={signInWithGoogle} />;
  }

  if (currentBook) {
    return (
      <Player
        audiobook={currentBook}
        onBack={() => setCurrentBook(null)}
        onBookmarksChange={handleBookmarksChange}
      />
    );
  }

  return (
    <Library
      userId={user.id}
      userName={user.user_metadata?.full_name || user.email || 'Usuário'}
      userAvatar={user.user_metadata?.avatar_url || null}
      onSelectBook={setCurrentBook}
      onSignOut={signOut}
    />
  );
}
