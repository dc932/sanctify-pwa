import '@testing-library/jest-dom/vitest';

class MockAudio {
  src = '';
  preload = '';
  playbackRate = 1;
  volume = 1;
  currentTime = 0;
  duration = 0;
  paused = true;
  private listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const callbacks = this.listeners.get(type) ?? new Set<EventListener>();
    callbacks.add(listener);
    this.listeners.set(type, callbacks);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  setAttribute(_name: string, _value: string): void {}

  load(): void {}

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

Object.defineProperty(globalThis, 'Audio', {
  configurable: true,
  writable: true,
  value: MockAudio,
});

Object.defineProperty(globalThis.navigator, 'mediaSession', {
  configurable: true,
  value: { metadata: null },
});

Object.defineProperty(globalThis, 'MediaMetadata', {
  configurable: true,
  writable: true,
  value: class {
    constructor(public readonly data: unknown) {}
  },
});
