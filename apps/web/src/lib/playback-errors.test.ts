import { describe, expect, it } from 'vitest';
import { playbackErrorFromStatus } from './playback-errors';

describe('playbackErrorFromStatus', () => {
  it('distinguishes session, plan, missing file, disk and network', () => {
    expect(playbackErrorFromStatus(401).kind).toBe('unauthenticated');
    expect(playbackErrorFromStatus(401).message).toMatch(/Inicia sesión/);
    expect(playbackErrorFromStatus(403).kind).toBe('no_plan');
    expect(playbackErrorFromStatus(403).message).toMatch(/plan activo/);
    expect(playbackErrorFromStatus(404, 'video_missing').message).toMatch(
      /no está disponible en el servidor/
    );
    expect(playbackErrorFromStatus(503, 'disk_unavailable').kind).toBe('disk');
    expect(playbackErrorFromStatus(500).kind).toBe('network');
    expect(playbackErrorFromStatus(500).retryable).toBe(true);
    expect(playbackErrorFromStatus(403).retryable).toBe(false);
  });

  it('trusts the server code over a generic status', () => {
    expect(playbackErrorFromStatus(403, 'no_plan').kind).toBe('no_plan');
    expect(playbackErrorFromStatus(401, 'unauthenticated').kind).toBe('unauthenticated');
  });
});
