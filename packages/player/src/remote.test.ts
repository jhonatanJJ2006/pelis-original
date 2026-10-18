import { describe, expect, it, vi } from 'vitest';
import {
  applyRemoteAction,
  attachRemote,
  resolveRemoteAction,
  type RemoteKeyEvent,
} from './remote';

function key(overrides: Partial<RemoteKeyEvent> = {}): RemoteKeyEvent {
  return {
    key: '',
    code: '',
    defaultPrevented: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target: null,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

const button = { tagName: 'BUTTON' } as unknown as EventTarget;

describe('resolveRemoteAction', () => {
  it('maps D-pad, Enter and letter shortcuts', () => {
    expect(resolveRemoteAction(key({ key: 'ArrowRight' }))).toBe('seek-forward');
    expect(resolveRemoteAction(key({ key: 'ArrowLeft' }))).toBe('seek-back');
    expect(resolveRemoteAction(key({ key: 'Enter' }))).toBe('toggle-play');
    expect(resolveRemoteAction(key({ key: 'm', code: 'KeyM' }))).toBe('toggle-mute');
    expect(resolveRemoteAction(key({ key: 'f', code: 'KeyF' }))).toBe('toggle-fullscreen');
  });

  it('distinguishes MediaPlay / MediaPause from MediaPlayPause', () => {
    expect(resolveRemoteAction(key({ key: 'MediaPlay' }))).toBe('play');
    expect(resolveRemoteAction(key({ key: 'MediaPause' }))).toBe('pause');
    expect(resolveRemoteAction(key({ key: 'MediaPlayPause' }))).toBe('toggle-play');
  });

  it('leaves Tab, modifiers and focused controls alone', () => {
    expect(resolveRemoteAction(key({ key: 'Tab', code: 'Tab' }))).toBeNull();
    expect(resolveRemoteAction(key({ key: 'f', code: 'KeyF', ctrlKey: true }))).toBeNull();
    expect(resolveRemoteAction(key({ key: 'Enter', target: button }))).toBeNull();
    expect(resolveRemoteAction(key({ key: 'ArrowUp', target: button }))).toBeNull();
    expect(resolveRemoteAction(key({ key: 'MediaPlayPause', target: button }))).toBe('toggle-play');
  });
});

describe('attachRemote', () => {
  it('dispatches actions, prevents default and detaches', () => {
    let listener: ((e: Event) => void) | undefined;
    const target = {
      addEventListener: vi.fn((_type: string, cb: (e: Event) => void) => (listener = cb)),
      removeEventListener: vi.fn(),
    };
    const handler = vi.fn();
    const remote = attachRemote(target as unknown as EventTarget, handler);

    const ev = key({ key: ' ' });
    listener?.(ev as unknown as Event);
    expect(handler).toHaveBeenCalledWith('toggle-play');
    expect(ev.preventDefault).toHaveBeenCalled();

    const ignored = key({ key: 'Tab' });
    listener?.(ignored as unknown as Event);
    expect(ignored.preventDefault).not.toHaveBeenCalled();

    remote.destroy();
    expect(target.removeEventListener).toHaveBeenCalledWith('keydown', listener);
  });
});

describe('applyRemoteAction', () => {
  function video(overrides: Record<string, unknown> = {}) {
    return {
      paused: true,
      currentTime: 50,
      duration: 100,
      volume: 0.5,
      muted: false,
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      ...overrides,
    } as unknown as HTMLVideoElement;
  }

  it('clamps seeking to [0, duration]', () => {
    const v = video({ currentTime: 95 });
    applyRemoteAction('seek-forward', v, { seekStep: 10 });
    expect(v.currentTime).toBe(100);
    v.currentTime = 4;
    applyRemoteAction('seek-back', v, { seekStep: 10 });
    expect(v.currentTime).toBe(0);
  });

  it('seeks forward on streams with unknown duration', () => {
    const v = video({ duration: Number.NaN });
    applyRemoteAction('seek-forward', v);
    expect(v.currentTime).toBe(60);
  });

  it('toggles play and clamps volume, unmuting on volume up', () => {
    const v = video({ volume: 0.95, muted: true });
    applyRemoteAction('toggle-play', v);
    expect(v.play).toHaveBeenCalled();
    applyRemoteAction('volume-up', v);
    expect(v.volume).toBe(1);
    expect(v.muted).toBe(false);
    applyRemoteAction('pause', v);
    expect(v.pause).toHaveBeenCalled();
  });
});
