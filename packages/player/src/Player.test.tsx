import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Player } from './Player';

beforeAll(() => {
  // jsdom no implementa la reproducción de media.
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
});

describe('<Player />', () => {
  it('renders an accessible region and assigns direct files to the video', () => {
    render(<Player src="/movie.mp4" title="Foo" />);
    const region = screen.getByRole('region', { name: 'Reproductor: Foo' });
    const video = region.querySelector('video');
    expect(video?.getAttribute('src')).toBe('/movie.mp4');
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeTruthy();
  });

  it('shows the subtitles button only when captions exist', () => {
    const { rerender } = render(<Player src="/movie.mp4" />);
    expect(screen.queryByRole('button', { name: 'Subtítulos' })).toBeNull();
    rerender(
      <Player
        src="/movie.mp4"
        captions={[{ id: 'es', label: 'Español', language: 'es', src: '/es.vtt' }]}
      />
    );
    const button = screen.getByRole('button', { name: 'Subtítulos' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('opens settings and lists playback speeds', () => {
    render(<Player src="/movie.mp4" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));
    expect(screen.getByRole('group', { name: 'Ajustes del reproductor' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '1×' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('does not hijack Enter on focused buttons', () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    render(<Player src="/movie.mp4" />);
    const settings = screen.getByRole('button', { name: 'Ajustes' });
    fireEvent.keyDown(settings, { key: 'Enter', code: 'Enter' });
    expect(play).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId('pelis-player'), { key: 'Enter', code: 'Enter' });
    expect(play).toHaveBeenCalledOnce();
  });
});
