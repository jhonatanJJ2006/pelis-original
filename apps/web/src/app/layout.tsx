import { Bodoni_Moda, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@pelis/auth/providers';
import { Toaster } from 'sonner';
import { AppProviders } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata = {
  title: 'Pelis — Cine y series en streaming',
  description: 'Disfruta películas y series con una experiencia de streaming premium',
  applicationName: 'Pelis',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent' as const,
    title: 'Pelis',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#131315',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        {/* Safari / iOS Add to Home Screen — Maison Noir */}
        <meta name="theme-color" content="#131315" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#131315" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pelis" />
        <meta name="application-name" content="Pelis" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.variable} ${bodoni.variable} font-sans`}>
        <Providers>
          <AppProviders>
            {children}
            <Toaster
              closeButton
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1C1B1D',
                  border: '1px solid #353437',
                  color: '#F2EEE6',
                },
              }}
            />
          </AppProviders>
        </Providers>
      </body>
    </html>
  );
}
