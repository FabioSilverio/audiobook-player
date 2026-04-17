import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw, RotateCw,
  Bookmark, BookmarkPlus, ChevronLeft, Volume2, VolumeX,
  List, Gauge, Trash2, ImagePlus,
} from 'lucide-react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { updateProgress, updateBookmarks } from '../lib/db';
import { getFileLocally, getLocalFileUrl, getCoverLocally, saveFileLocally } from '../lib/storage';
import CoverPicker from './CoverPicker';
import type { Audiobook, Bookmark as BookmarkType } from '../types';

function formatTime(s: number): string {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

interface PlayerProps {
  audiobook: Audiobook;
  onBack: () => void;
  onBookmarksChange: (bookmarks: BookmarkType[]) => void;
}

export default function Player({ audiobook, onBack, onBookmarksChange }: PlayerProps) {
  const player = useAudioPlayer(audiobook.chapters);
  const [showChapters, setShowChapters] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>(audiobook.bookmarks ?? []);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

  const progressPercent = useMemo(() => {
    if (!player.state.duration) return 0;
    return (player.state.currentTime / player.state.duration) * 100;
  }, [player.state.currentTime, player.state.duration]);

  const [fileError, setFileError] = useState(false);

  // Load cover image
  useEffect(() => {
    getCoverLocally(audiobook.id).then((blob) => {
      if (blob) setCoverUrl(URL.createObjectURL(blob));
    });
    return () => {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, [audiobook.id]);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadAudio() {
      const file = await getFileLocally(audiobook.file_path);
      if (!file) {
        setFileError(true);
        return;
      }
      objectUrl = getLocalFileUrl(file);
      player.initAudio(objectUrl, audiobook.current_position);
    }

    loadAudio();

    player.onProgressSave(async (time: number) => {
      try {
        await updateProgress(audiobook.id, time);
      } catch (e) {
        console.error('Failed to save progress:', e);
      }
    });

    return () => {
      player.cleanup();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audiobook.id]);

  async function addBookmark() {
    const newBm: BookmarkType = {
      id: `bm-${Date.now()}`,
      label: `Marcador ${formatTime(player.state.currentTime)}`,
      position: player.state.currentTime,
      created_at: new Date().toISOString(),
    };
    const updated = [...bookmarks, newBm].sort((a, b) => a.position - b.position);
    setBookmarks(updated);
    onBookmarksChange(updated);
    await updateBookmarks(audiobook.id, updated);
  }

  async function removeBookmark(id: string) {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    onBookmarksChange(updated);
    await updateBookmarks(audiobook.id, updated);
  }

  const reuploadRef = useRef<HTMLInputElement>(null);
  const [reuploadingFile, setReuploadingFile] = useState(false);

  async function handleReupload(file: File) {
    setReuploadingFile(true);
    try {
      await saveFileLocally(audiobook.file_path, file);
      setFileError(false);
      // Reload the audio
      const url = getLocalFileUrl(file);
      player.initAudio(url, audiobook.current_position);
    } catch (e) {
      console.error('Re-upload error:', e);
      alert('Erro ao salvar arquivo.');
    } finally {
      setReuploadingFile(false);
    }
  }

  if (fileError) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-5xl">📁</div>
        <h2 className="text-xl font-bold">Arquivo não encontrado</h2>
        <p className="text-gray-400 text-center max-w-sm">
          O audiobook "<strong>{audiobook.title}</strong>" não está disponível neste dispositivo.
          Envie o arquivo novamente para continuar de onde parou. Seu progresso e marcadores estão salvos.
        </p>
        <p className="text-brand-300 text-sm font-medium">
          Progresso: {formatTime(audiobook.current_position)} / {formatTime(audiobook.duration)}
        </p>
        <input
          ref={reuploadRef}
          type="file"
          accept="audio/*,*/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReupload(file);
          }}
        />
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => reuploadRef.current?.click()}
            disabled={reuploadingFile}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {reuploadingFile ? 'Salvando...' : 'Enviar arquivo'}
          </button>
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-gray-800/50">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-800 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{audiobook.title}</h1>
          <p className="text-gray-400 text-sm truncate">{audiobook.author}</p>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        {/* Cover / Icon */}
        <div
          className="w-52 h-52 rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-brand-500/20 relative group cursor-pointer overflow-hidden"
          onClick={() => setShowCoverPicker(true)}
        >
          {coverUrl ? (
            <img src={coverUrl} alt={audiobook.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-600/30 to-brand-800/30 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-2">🎧</div>
                {player.state.currentChapter && (
                  <p className="text-brand-300 text-xs font-medium px-3 truncate max-w-[180px]">
                    {player.state.currentChapter.title}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-center">
              <ImagePlus className="w-6 h-6 mx-auto mb-1" />
              <span className="text-xs">Alterar capa</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full mb-2">
          <div className="relative w-full group">
            {/* Bookmark markers on progress bar */}
            <div className="absolute inset-0 pointer-events-none z-10" style={{ height: '4px', top: '10px' }}>
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="absolute w-1.5 h-3 bg-yellow-400 rounded-full -translate-y-1/2 top-1/2"
                  style={{ left: `${(bm.position / (player.state.duration || 1)) * 100}%` }}
                  title={bm.label}
                />
              ))}
              {/* Chapter markers */}
              {audiobook.chapters.map((ch) => (
                <div
                  key={ch.id}
                  className="absolute w-0.5 h-2.5 bg-brand-400/60 rounded-full -translate-y-1/2 top-1/2"
                  style={{ left: `${(ch.start_time / (player.state.duration || 1)) * 100}%` }}
                  title={ch.title}
                />
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={player.state.duration || 0}
              value={player.state.currentTime}
              step={0.1}
              onChange={(e) => player.seek(parseFloat(e.target.value))}
              className="w-full relative z-20"
              style={{
                background: `linear-gradient(to right, #5c7cfa ${progressPercent}%, #374151 ${progressPercent}%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(player.state.currentTime)}</span>
            <span>-{formatTime((player.state.duration || 0) - player.state.currentTime)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => player.skipBackward(15)}
            className="p-3 hover:bg-gray-800 rounded-xl transition-colors"
            title="Voltar 15s"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => player.skipBackward(30)}
            className="p-3 hover:bg-gray-800 rounded-xl transition-colors"
            title="Voltar 30s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={player.togglePlay}
            className="p-5 bg-brand-600 hover:bg-brand-500 rounded-2xl transition-colors shadow-lg shadow-brand-600/30"
          >
            {player.state.isPlaying ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => player.skipForward(30)}
            className="p-3 hover:bg-gray-800 rounded-xl transition-colors"
            title="Avançar 30s"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={() => player.skipForward(60)}
            className="p-3 hover:bg-gray-800 rounded-xl transition-colors"
            title="Avançar 60s"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={() => setShowSpeed(!showSpeed)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              showSpeed ? 'bg-brand-600/20 text-brand-300' : 'hover:bg-gray-800 text-gray-400'
            }`}
          >
            <Gauge className="w-4 h-4" />
            {player.state.playbackRate}x
          </button>

          <button
            onClick={addBookmark}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm hover:bg-gray-800 text-gray-400 transition-colors"
            title="Adicionar marcador"
          >
            <BookmarkPlus className="w-4 h-4" />
            Marcar
          </button>

          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              showBookmarks ? 'bg-brand-600/20 text-brand-300' : 'hover:bg-gray-800 text-gray-400'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            {bookmarks.length}
          </button>

          {audiobook.chapters.length > 0 && (
            <button
              onClick={() => setShowChapters(!showChapters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                showChapters ? 'bg-brand-600/20 text-brand-300' : 'hover:bg-gray-800 text-gray-400'
              }`}
            >
              <List className="w-4 h-4" />
              Capítulos
            </button>
          )}

          {/* Volume */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => player.setVolume(player.state.volume === 0 ? 1 : 0)}
              className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
            >
              {player.state.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={player.state.volume}
              onChange={(e) => player.setVolume(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>
        </div>

        {/* Speed selector */}
        {showSpeed && (
          <div className="flex flex-wrap gap-2 mt-4 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => { player.setPlaybackRate(s); setShowSpeed(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  player.state.playbackRate === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}

        {/* Chapters panel */}
        {showChapters && audiobook.chapters.length > 0 && (
          <div className="w-full mt-4 max-h-64 overflow-y-auto bg-gray-800/50 rounded-xl border border-gray-700/50">
            {audiobook.chapters.map((ch, i) => {
              const isActive = player.state.currentChapter?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => player.goToChapter(ch)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-200'
                      : 'hover:bg-gray-700/50 text-gray-300'
                  } ${i > 0 ? 'border-t border-gray-700/30' : ''}`}
                >
                  <span className="text-xs text-gray-500 w-6">{i + 1}</span>
                  <span className="flex-1 truncate text-sm">{ch.title}</span>
                  <span className="text-xs text-gray-500">{formatTime(ch.start_time)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bookmarks panel */}
        {showBookmarks && (
          <div className="w-full mt-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            {bookmarks.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                Nenhum marcador. Clique em "Marcar" para adicionar.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {bookmarks.map((bm, i) => (
                  <div
                    key={bm.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors ${
                      i > 0 ? 'border-t border-gray-700/30' : ''
                    }`}
                  >
                    <Bookmark className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <button
                      onClick={() => player.seek(bm.position)}
                      className="flex-1 text-left text-sm text-gray-300 hover:text-white truncate"
                    >
                      {bm.label}
                    </button>
                    <span className="text-xs text-gray-500">{formatTime(bm.position)}</span>
                    <button
                      onClick={() => removeBookmark(bm.id)}
                      className="p-1 hover:bg-red-600/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cover Picker Modal */}
      {showCoverPicker && (
        <CoverPicker
          bookId={audiobook.id}
          bookTitle={audiobook.title}
          onCoverSet={(url) => {
            setCoverUrl(url);
            setShowCoverPicker(false);
          }}
          onClose={() => setShowCoverPicker(false)}
        />
      )}
    </div>
  );
}
