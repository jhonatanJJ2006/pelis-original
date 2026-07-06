import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@pelis/auth/providers';
import { Toaster } from 'sonner';
import { ConvexClientProvider } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Pelis - Tu plataforma de streaming',
  description: 'Disfruta de las mejores películas y series',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>
        <Providers>
          <ConvexClientProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1a1d26',
                  border: '#334155',
                  color: '#fff',
                },
              }}
            />
          </ConvexClientProvider>
        </Providers>
      </body>
    </html>
  );
}
