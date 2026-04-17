import { useState, useRef } from 'react';
import { Upload as UploadIcon, Loader2 } from 'lucide-react';
import * as mm from 'music-metadata-browser';
import { generateFileKey, createAudiobook } from '../lib/db';
import { saveFileLocally } from '../lib/storage';
import type { Chapter } from '../types';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadProps {
  userId: string;
  onUploadComplete: () => void;
}

export default function UploadArea({ userId, onUploadComplete }: UploadProps) {
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['mp3', 'm4b', 'm4a', 'aac', 'ogg', 'opus'].includes(ext ?? '')) {
      alert('Formato não suportado. Use MP3, M4B, M4A, AAC, OGG ou OPUS.');
      return;
    }

    setUploading(true);
    setProgressPct(0);
    try {
      setStatusText('Lendo metadados...');
      setProgressPct(5);
      const metadata = await mm.parseBlob(file);

      const title = metadata.common.title || file.name.replace(/\.[^.]+$/, '');
      const author = metadata.common.artist || metadata.common.albumartist || 'Autor Desconhecido';
      const duration = metadata.format.duration || 0;

      // Extract chapters from metadata
      const chapters: Chapter[] = [];

      // Parse chapter data from native tags
      const chapterTag = Object.values(metadata.native || {}).flat().filter(
        (t: any) => t.id?.toLowerCase().includes('chap') || t.id === 'CHAP'
      );

      if (chapterTag.length > 0) {
        chapterTag.forEach((ch: any, i: number) => {
          chapters.push({
            id: `ch-${i}`,
            title: ch.value?.subFrames?.TIT2?.text || ch.value?.title || `Capítulo ${i + 1}`,
            start_time: (ch.value?.startTime ?? ch.value?.start ?? 0) / 1000,
            end_time: (ch.value?.endTime ?? ch.value?.end ?? 0) / 1000,
          });
        });
      }

      setStatusText(`Salvando arquivo localmente (${formatSize(file.size)})...`);
      setProgressPct(15);

      const fileKey = generateFileKey(userId, file.name);

      // Save to IndexedDB - simulate progress for large files
      const startTime = Date.now();
      const savePromise = saveFileLocally(fileKey, file);

      // Progress animation while saving
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const estimatedPct = Math.min(15 + (elapsed / 100) * 0.5, 85);
        setProgressPct(estimatedPct);
      }, 100);

      await savePromise;
      clearInterval(progressInterval);
      setProgressPct(90);

      setStatusText('Salvando metadados na nuvem...');
      await createAudiobook({
        user_id: userId,
        title,
        author,
        file_name: file.name,
        file_path: fileKey,
        cover_url: null,
        duration,
        current_position: 0,
        chapters,
        bookmarks: [],
      });

      setProgressPct(100);
      setStatusText('Concluído!');
      await new Promise((r) => setTimeout(r, 500));
      onUploadComplete();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Erro no upload: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setUploading(false);
      setProgressPct(0);
      setStatusText('');
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        dragOver
          ? 'border-brand-400 bg-brand-500/10'
          : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
      }`}
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && !uploading) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,*/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-4 w-full max-w-xs mx-auto">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <div className="w-full">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{statusText}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center">
            <UploadIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-gray-300 font-medium">Arraste um audiobook ou clique para selecionar</p>
            <p className="text-gray-500 text-sm mt-1">MP3, M4B, M4A, AAC, OGG, OPUS — sem limite de tamanho</p>
          </div>
        </div>
      )}
    </div>
  );
}
