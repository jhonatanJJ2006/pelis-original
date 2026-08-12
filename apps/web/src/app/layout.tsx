import { Bebas_Neue, Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from '@pelis/auth/providers';
import { Toaster } from 'sonner';
import { AppProviders } from './providers';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-body',
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata = {
  title: 'Pelis — Cine y series en streaming',
  description: 'Disfruta películas y series con una experiencia de streaming premium',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/icon-192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#0a0e1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta name="theme-color" content="#0a0e1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="application-name" content="Pelis" />
      </head>
      <body className={`${outfit.variable} ${bebasNeue.variable} font-sans`}>
        <Providers>
          <AppProviders>
            {children}
            <Toaster
              closeButton
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1B1838',
                  border: '1px solid #3D3566',
                  color: '#FFFFFF',
                },
              }}
            />
          </AppProviders>
        </Providers>
      </body>
    </html>
  );
}
