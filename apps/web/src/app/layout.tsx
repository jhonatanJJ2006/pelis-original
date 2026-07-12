import { Bebas_Neue, Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from '@pelis/auth/providers';
import { Toaster } from 'sonner';
import { ConvexClientProvider } from './providers';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${outfit.variable} ${bebasNeue.variable} font-sans`}>
        <Providers>
          <ConvexClientProvider>
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
          </ConvexClientProvider>
        </Providers>
      </body>
    </html>
  );
}
