import Link from 'next/link';
import { Film, Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-dark-300 border-t border-slate-800/50 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-purple-500 bg-clip-text text-transparent">
                Pelis
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tu plataforma de streaming favorita. Disfruta de las mejores pel&iacute;culas en cualquier momento y lugar.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-200">Navegaci&oacute;n</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/movies" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Pel&iacute;culas
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Favoritos
                </Link>
              </li>
              <li>
                <Link href="/history" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Historial
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-200">Cuenta</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/auth/login" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Iniciar sesi&oacute;n
                </Link>
              </li>
              <li>
                <Link href="/subscribe" className="text-slate-400 hover:text-yellow-400 text-sm transition-colors">
                  Suscripci&oacute;n
                </Link>
              </li>
              <li>
                <span className="text-slate-500 text-sm cursor-not-allowed">T&eacute;rminos de uso</span>
              </li>
              <li>
                <span className="text-slate-500 text-sm cursor-not-allowed">Privacidad</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-200">S&iacute;guenos</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-xl bg-dark-200 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary-400 hover:border-primary-500/50 transition-all" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-dark-200 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary-400 hover:border-primary-500/50 transition-all" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-dark-200 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary-400 hover:border-primary-500/50 transition-all" aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Pelis. Todos los derechos reservados.
          </p>
          <p className="text-slate-600 text-xs">
            Hecho con &hearts; para los amantes del cine
          </p>
        </div>
      </div>
    </footer>
  );
}
