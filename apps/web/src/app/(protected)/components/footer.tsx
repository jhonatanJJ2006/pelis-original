import Link from 'next/link';
import { Film, Github, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-dark-300 border-t border-slate-800 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Pelis</span>
            </Link>
            <p className="text-slate-400 text-sm">
              Tu plataforma de streaming favorita.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-200">Navegación</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/movies" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Películas
                </Link>
              </li>
              <li>
                <Link href="/subscribe" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Suscripción
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-200">Legal</h4>
            <ul className="space-y-2">
              <li>
                <span className="text-slate-400 text-sm cursor-not-allowed">Términos de uso</span>
              </li>
              <li>
                <span className="text-slate-400 text-sm cursor-not-allowed">Privacidad</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-200">Síguenos</h4>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors" aria-label="GitHub">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} Pelis. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
