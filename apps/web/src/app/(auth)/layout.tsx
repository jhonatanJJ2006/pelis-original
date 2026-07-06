import Link from 'next/link';
import { Film } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-dark-400">
      <header className="py-6 px-4">
        <div className="container mx-auto">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-500 bg-clip-text text-transparent">
              Pelis
            </span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        {children}
      </main>
      <footer className="py-6 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} Pelis. Todos los derechos reservados.
      </footer>
    </div>
  );
}
