import Link from 'next/link';
import { Film } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-cinema-bg cinema-grain">
      <header className="py-6 px-4">
        <div className="container mx-auto">
          <Link href="/" className="flex items-center gap-2.5 w-fit group">
            <div className="w-10 h-10 bg-cinema-accent rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Film className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl tracking-widest text-white uppercase">
              Pelis
            </span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        {children}
      </main>
      <footer className="py-6 text-center text-zinc-600 text-sm">
        © {new Date().getFullYear()} Pelis. Todos los derechos reservados.
      </footer>
    </div>
  );
}
