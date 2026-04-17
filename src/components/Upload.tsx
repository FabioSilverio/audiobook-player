import { useState, useRef } from 'react';
import { Upload as UploadIcon, Loader2, Music } from 'lucide-react';
import * as mm from 'music-metadata-browser';
import { uploadAudioFile, createAudiobook, getFileUrl } from '../lib/db';
import type { Chapter } from '../types';

interface UploadProps {
  userId: string;
  onUploadComplete: () => void;
}

export default function UploadArea({ userId, onUploadComplete }: UploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
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
    try {
      setProgress('Lendo metadados...');
      const metadata = await mm.parseBlob(file);

      const title = metadata.common.title || file.name.replace(/\.[^.]+$/, '');
      const author = metadata.common.artist || metadata.common.albumartist || 'Autor Desconhecido';
      const duration = metadata.format.duration || 0;

      // Extract chapters from metadata
      const chapters: Chapter[] = [];
      const nativeChapters = metadata.native?.['iTunes']
        ?.filter((t: any) => t.id === 'chpl' || t.id === '----')
        ?? [];

      // Try to get chapters from common chapter tags
      if (metadata.common.track?.no && metadata.format.duration) {
        // M4B chapters are sometimes in the native metadata
      }

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

      setProgress('Fazendo upload do arquivo...');
      const filePath = await uploadAudioFile(userId, file);

      // Extract cover art URL
      let coverUrl: string | null = null;
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const pic = metadata.common.picture[0];
        const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
        // We'll skip cover upload for now to keep it simple, could upload to storage
        coverUrl = null;
      }

      setProgress('Salvando audiobook...');
      await createAudiobook({
        user_id: userId,
        title,
        author,
        file_name: file.name,
        file_path: filePath,
        cover_url: coverUrl,
        duration,
        current_position: 0,
        chapters,
        bookmarks: [],
      });

      setProgress('');
      onUploadComplete();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Erro no upload: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        dragOver
          ? 'border-brand-400 bg-brand-500/10'
          : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.m4b,.m4a,.aac,.ogg,.opus"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
          <p className="text-gray-300 font-medium">{progress}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center">
            <UploadIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-gray-300 font-medium">Arraste um audiobook ou clique para selecionar</p>
            <p className="text-gray-500 text-sm mt-1">MP3, M4B, M4A, AAC, OGG, OPUS</p>
          </div>
        </div>
      )}
    </div>
  );
}
