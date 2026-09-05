import { describe, expect, it } from 'vitest';
import {
  PLAYER_GESTURE_DEAD_ZONE_PX,
  PLAYER_GESTURE_HUD_BAR_CLASS,
  PLAYER_GESTURE_HUD_FILL_CLASS,
  PLAYER_GESTURE_HUD_FRAME_CLASS,
  PLAYER_GESTURE_HUD_PILL_CLASS,
  applyVerticalDrag,
  classifySurfaceDrag,
  gesturePercent,
} from './player-gestures';
import { BRIGHTNESS_DEFAULT, BRIGHTNESS_MAX, BRIGHTNESS_MIN } from './player-chrome';

describe('classifySurfaceDrag', () => {
  it('ignores tiny movement inside the dead zone', () => {
    expect(classifySurfaceDrag(0, PLAYER_GESTURE_DEAD_ZONE_PX - 1, 20, 400)).toBeNull();
  });

  it('ignores horizontal flicks', () => {
    expect(classifySurfaceDrag(40, 18, 20, 400)).toBeNull();
  });

  it('maps left half to brightness and right half to volume', () => {
    expect(classifySurfaceDrag(0, 20, 40, 400)).toBe('brightness');
    expect(classifySurfaceDrag(0, 20, 300, 400)).toBe('volume');
  });
});

describe('applyVerticalDrag', () => {
  it('raises brightness when dragging up', () => {
    const next = applyVerticalDrag('brightness', BRIGHTNESS_DEFAULT, -110);
    expect(next).toBeGreaterThan(BRIGHTNESS_DEFAULT);
    expect(next).toBeLessThanOrEqual(BRIGHTNESS_MAX);
  });

  it('lowers volume when dragging down and clamps', () => {
    expect(applyVerticalDrag('volume', 0.2, 400)).toBe(0);
    expect(applyVerticalDrag('volume', 0.5, -400)).toBe(1);
  });
});

describe('gesturePercent', () => {
  it('maps brightness and volume onto 0–100', () => {
    expect(gesturePercent('brightness', BRIGHTNESS_MIN)).toBe(0);
    expect(gesturePercent('brightness', BRIGHTNESS_MAX)).toBe(100);
    expect(gesturePercent('volume', 0.5)).toBe(50);
  });
});

describe('PlayerGestureHud layout', () => {
  it('sits at the top center as a horizontal pill, not a vertical meter', () => {
    expect(PLAYER_GESTURE_HUD_FRAME_CLASS).toContain('left-1/2');
    expect(PLAYER_GESTURE_HUD_FRAME_CLASS).toContain('-translate-x-1/2');
    expect(PLAYER_GESTURE_HUD_FRAME_CLASS).toContain('top-[max(1rem,env(safe-area-inset-top,0px))]');
    expect(PLAYER_GESTURE_HUD_FRAME_CLASS).not.toContain('top-[28%]');
    expect(PLAYER_GESTURE_HUD_PILL_CLASS).toContain('flex items-center');
    expect(PLAYER_GESTURE_HUD_PILL_CLASS).toContain('bg-cinema-bg/85');
    expect(PLAYER_GESTURE_HUD_PILL_CLASS).not.toContain('flex-col');
    expect(PLAYER_GESTURE_HUD_BAR_CLASS).toContain('h-1.5');
    expect(PLAYER_GESTURE_HUD_BAR_CLASS).toContain('w-28');
    expect(PLAYER_GESTURE_HUD_BAR_CLASS).not.toContain('h-24');
    expect(PLAYER_GESTURE_HUD_FILL_CLASS).toContain('left-0');
    expect(PLAYER_GESTURE_HUD_FILL_CLASS).toContain('bg-cinema-accent');
    expect(PLAYER_GESTURE_HUD_FILL_CLASS).not.toContain('bottom-0');
  });
});

