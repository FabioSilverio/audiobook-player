import { useRef, useState, useCallback, useEffect } from 'react';
import type { Chapter, PlayerState } from '../types';

export function useAudioPlayer(chapters: Chapter[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    volume: 1,
    currentChapter: null,
  });
  const progressSaveRef = useRef<((time: number) => void) | null>(null);

  const onProgressSave = useCallback((fn: (time: number) => void) => {
    progressSaveRef.current = fn;
  }, []);

  const findCurrentChapter = useCallback(
    (time: number): Chapter | null => {
      if (!chapters.length) return null;
      for (let i = chapters.length - 1; i >= 0; i--) {
        if (time >= chapters[i].start_time) return chapters[i];
      }
      return chapters[0] ?? null;
    },
    [chapters]
  );

  const initAudio = useCallback((url: string, startAt = 0) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }

    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      audio.currentTime = startAt;
      setState((s) => ({
        ...s,
        duration: audio.duration,
        currentTime: startAt,
        currentChapter: findCurrentChapter(startAt),
      }));
    });

    audio.addEventListener('timeupdate', () => {
      const t = audio.currentTime;
      setState((s) => ({
        ...s,
        currentTime: t,
        currentChapter: findCurrentChapter(t),
      }));
    });

    audio.addEventListener('ended', () => {
      setState((s) => ({ ...s, isPlaying: false }));
      progressSaveRef.current?.(audio.duration);
    });

    return audio;
  }, [findCurrentChapter]);

  // Auto-save progress every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        progressSaveRef.current?.(audioRef.current.currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const play = useCallback(() => {
    audioRef.current?.play();
    setState((s) => ({ ...s, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((s) => ({ ...s, isPlaying: false }));
    if (audioRef.current) {
      progressSaveRef.current?.(audioRef.current.currentTime);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (audioRef.current?.paused) {
      play();
    } else {
      pause();
    }
  }, [play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((s) => ({ ...s, currentTime: time }));
    }
  }, []);

  const skipForward = useCallback((seconds = 30) => {
    if (audioRef.current) {
      const t = Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration);
      audioRef.current.currentTime = t;
    }
  }, []);

  const skipBackward = useCallback((seconds = 15) => {
    if (audioRef.current) {
      const t = Math.max(audioRef.current.currentTime - seconds, 0);
      audioRef.current.currentTime = t;
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setState((s) => ({ ...s, playbackRate: rate }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setState((s) => ({ ...s, volume: vol }));
  }, []);

  const goToChapter = useCallback(
    (chapter: Chapter) => {
      seek(chapter.start_time);
      if (!state.isPlaying) play();
    },
    [seek, play, state.isPlaying]
  );

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
  }, []);

  return {
    state,
    initAudio,
    play,
    pause,
    togglePlay,
    seek,
    skipForward,
    skipBackward,
    setPlaybackRate,
    setVolume,
    goToChapter,
    cleanup,
    onProgressSave,
  };
}
