import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Escribe desde tu celular · Pelis',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0B0D',
};

export default function TvTecladoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
