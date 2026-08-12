'use client';

import Link from 'next/link';
import { useQuery } from '@pelis/db/client';
import { Film, AlertTriangle, ImageOff, VideoOff, FileWarning, Monitor } from 'lucide-react';
import { api } from '@pelis/db/api';
import { AdminDashboardSkeleton } from '@pelis/ui/features/admin-dashboard-skeleton';

const statCards = [
  {
    key: 'total',
    label: 'Total películas',
    href: '/admin/movies',
    filter: 'all',
    icon: Film,
    color: 'text-cinema-violet-light',
    bg: 'bg-cinema-violet/15',
  },
  {
    key: 'orphanIds',
    label: 'IDs huérfanos',
    href: '/admin/movies?filter=orphan_ids',
    filter: 'orphan_ids',
    icon: AlertTriangle,
    color: 'text-amber-300',
    bg: 'bg-amber-500/15',
  },
  {
    key: 'missingImage',
    label: 'Sin imagen',
    href: '/admin/movies?filter=missing_image',
    filter: 'missing_image',
    icon: ImageOff,
    color: 'text-red-300',
    bg: 'bg-red-500/15',
  },
  {
    key: 'missingImageTitled',
    label: 'Sin poster (con título)',
    href: '/admin/movies?filter=missing_image_titled',
    filter: 'missing_image_titled',
    icon: ImageOff,
    color: 'text-rose-300',
    bg: 'bg-rose-500/15',
  },
  {
    key: 'missingBackdrop',
    label: 'Sin backdrop',
    href: '/admin/movies?filter=missing_backdrop',
    filter: 'missing_backdrop',
    icon: Monitor,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/15',
  },
  {
    key: 'missingVideo',
    label: 'Sin video',
    href: '/admin/movies?filter=missing_video',
    filter: 'missing_video',
    icon: VideoOff,
    color: 'text-orange-300',
    bg: 'bg-orange-500/15',
  },
  {
    key: 'incomplete',
    label: 'Incompletas',
    href: '/admin/movies?filter=incomplete',
    filter: 'incomplete',
    icon: FileWarning,
    color: 'text-cinema-gold',
    bg: 'bg-cinema-gold/15',
  },
] as const;

export default function AdminDashboardPage() {
  const stats = useQuery<any>(api.adminMovies.adminStats, {});

  if (stats === undefined) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
          Dashboard
        </h1>
        <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
          Resumen del catálogo de películas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key as keyof typeof stats];

          return (
            <Link
              key={card.key}
              href={card.href}
              className="group p-5 rounded-2xl bg-cinema-surface border border-cinema-border hover:border-cinema-violet/40 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-cinema-muted">{card.label}</p>
                  <p className="text-3xl font-semibold text-white mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl bg-cinema-surface border border-cinema-border">
        <h2 className="text-lg font-semibold text-white mb-2">Acciones rápidas</h2>
        <p className="text-sm text-cinema-muted mb-4">
          Gestiona el catálogo, corrige registros huérfanos y fusiona duplicados.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/movies/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Film className="w-4 h-4" />
            Nueva película
          </Link>
          <Link
            href="/admin/movies?filter=orphan_ids"
            className="btn-secondary inline-flex items-center gap-2"
          >
            Revisar IDs huérfanos
          </Link>
        </div>
      </div>
    </div>
  );
}
