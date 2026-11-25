import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AudioProvider, useAudio } from './AudioContext';
import type { Track } from '@/types/audio';

const tracks: Track[] = [
  {
    id: 'one',
    title: 'Primera pista',
    artist: 'Artista',
    artworkUrl: '/one.jpg',
    audioUrl: '/one.mp3',
    category: 'music',
    duration: 120,
  },
  {
    id: 'two',
    title: 'Segunda pista',
    artist: 'Artista',
    artworkUrl: '/two.jpg',
    audioUrl: '/two.mp3',
    category: 'podcast',
    duration: 240,
  },
];

function wrapper({ children }: { children: ReactNode }) {
  return <AudioProvider queue={tracks}>{children}</AudioProvider>;
}

describe('AudioProvider', () => {
  it('loads a track and exposes queue controls', async () => {
    const { result } = renderHook(() => useAudio(), { wrapper });

    await act(async () => {
      await result.current.playTrack(tracks[0]);
    });
    await waitFor(() => expect(result.current.currentTrack).toEqual(tracks[0]));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.audioElement?.src).toContain('/one.mp3');

    act(() => result.current.addToQueue(tracks[1]));
    expect(result.current.queue).toHaveLength(3);

    act(() => result.current.removeFromQueue('two'));
    expect(result.current.queue).toHaveLength(1);
  });

  it('clamps volume, schedules tracks, and controls fullscreen state', async () => {
    const { result } = renderHook(() => useAudio(), { wrapper });

    await act(async () => {
      result.current.setVolumeLevel(2);
    });
    expect(result.current.volume).toBe(1);

    await act(async () => {
      result.current.setVolumeLevel(-1);
    });
    expect(result.current.volume).toBe(0);

    act(() => result.current.scheduleNext('two'));
    expect(result.current.scheduledNextId).toBe('two');

    act(() => result.current.openFullScreen());
    expect(result.current.isFullScreenOpen).toBe(true);
    act(() => result.current.closeFullScreen());
    expect(result.current.isFullScreenOpen).toBe(false);
  });

  it('throws when the hook is used outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useAudio())).toThrow('useAudio debe usarse dentro de un AudioProvider');
    consoleError.mockRestore();
  });
});