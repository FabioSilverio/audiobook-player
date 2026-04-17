import { useState, useRef, useCallback } from 'react';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscribedWindow {
  windowStart: number;
  windowEnd: number;
  segments: TranscriptSegment[];
}

const WINDOW_SIZE = 30; // seconds per transcription chunk
const LOOKAHEAD = 2;    // windows to pre-transcribe ahead

export function useTranscription(apiKey: string | null) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcribedWindows = useRef<Set<number>>(new Set());
  const inFlight = useRef<Set<number>>(new Set());
  const audioFile = useRef<File | null>(null);

  const reset = useCallback(() => {
    setSegments([]);
    setError(null);
    transcribedWindows.current.clear();
    inFlight.current.clear();
    audioFile.current = null;
  }, []);

  const setFile = useCallback((file: File) => {
    audioFile.current = file;
    transcribedWindows.current.clear();
    inFlight.current.clear();
    setSegments([]);
    setError(null);
  }, []);

  async function extractAudioChunk(file: File, startSec: number, endSec: number): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const startSample = Math.floor(startSec * audioBuffer.sampleRate);
    const endSample = Math.min(Math.floor(endSec * audioBuffer.sampleRate), audioBuffer.length);
    const frameCount = endSample - startSample;

    if (frameCount <= 0) throw new Error('Empty chunk');

    const chunkBuffer = audioCtx.createBuffer(1, frameCount, audioBuffer.sampleRate);
    const sourceData = audioBuffer.getChannelData(0);
    const destData = chunkBuffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      destData[i] = sourceData[startSample + i];
    }

    // Encode to WAV
    const wavBlob = audioBufferToWav(chunkBuffer);
    await audioCtx.close();
    return wavBlob;
  }

  async function transcribeChunk(windowIndex: number): Promise<void> {
    if (!apiKey || !audioFile.current) return;
    if (transcribedWindows.current.has(windowIndex)) return;
    if (inFlight.current.has(windowIndex)) return;

    inFlight.current.add(windowIndex);

    const startSec = windowIndex * WINDOW_SIZE;
    const endSec = startSec + WINDOW_SIZE;

    try {
      const chunk = await extractAudioChunk(audioFile.current, startSec, endSec);

      const formData = new FormData();
      formData.append('file', chunk, 'chunk.wav');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const windowSegments: TranscriptSegment[] = (data.segments ?? []).map((s: any) => ({
        start: startSec + s.start,
        end: startSec + s.end,
        text: s.text.trim(),
      }));

      transcribedWindows.current.add(windowIndex);
      setSegments((prev) => {
        const merged = [...prev, ...windowSegments];
        merged.sort((a, b) => a.start - b.start);
        // Deduplicate
        return merged.filter((seg, i) =>
          i === 0 || seg.start !== merged[i - 1].start
        );
      });
    } catch (e: any) {
      console.error('Transcription error:', e);
      setError(e.message ?? 'Erro na transcrição');
    } finally {
      inFlight.current.delete(windowIndex);
    }
  }

  // Call this on every currentTime update from the player
  const onTimeUpdate = useCallback((currentTime: number) => {
    if (!apiKey || !audioFile.current) return;

    const currentWindow = Math.floor(currentTime / WINDOW_SIZE);
    const windowsToLoad = [];
    for (let i = currentWindow; i <= currentWindow + LOOKAHEAD; i++) {
      if (!transcribedWindows.current.has(i) && !inFlight.current.has(i)) {
        windowsToLoad.push(i);
      }
    }

    if (windowsToLoad.length > 0) {
      setTranscribing(true);
      Promise.all(windowsToLoad.map((w) => transcribeChunk(w))).finally(() => {
        setTranscribing(false);
      });
    }
  }, [apiKey]);

  // Get current segment at a given time
  function getCurrentSegment(currentTime: number): TranscriptSegment | null {
    return segments.find((s) => currentTime >= s.start && currentTime < s.end) ?? null;
  }

  // Get segments within a time window
  function getSegmentsInRange(from: number, to: number): TranscriptSegment[] {
    return segments.filter((s) => s.end > from && s.start < to);
  }

  return {
    segments,
    transcribing,
    error,
    setFile,
    reset,
    onTimeUpdate,
    getCurrentSegment,
    getSegmentsInRange,
  };
}

// WAV encoder
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * 2;
  const bufferArray = new ArrayBuffer(44 + dataLength);
  const view = new DataView(bufferArray);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
