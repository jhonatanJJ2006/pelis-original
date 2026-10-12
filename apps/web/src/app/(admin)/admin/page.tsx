'use client';

import Link from 'next/link';
import { useQuery } from '@pelis/db/client';
import {
  Film,
  AlertTriangle,
  ImageOff,
  VideoOff,
  FileWarning,
  Monitor,
  Tv,
  Clapperboard,
  Radio,
  Users,
} from 'lucide-react';
import { api } from '@pelis/db/api';
import { AdminDashboardSkeleton } from '@pelis/ui/features/admin-dashboard-skeleton';

const statCards = [
  {
    key: 'total',
    label: 'Total películas',
    href: '/admin/movies',
    filter: 'all',
    icon: Film,
    color: 'text-cinema-accent-light',
    bg: 'bg-cinema-accent/15',
  },
  {
    key: 'missingVideo',
    label: 'Sin video',
    href: '/admin/movies?filter=missing_video',
    filter: 'missing_video',
    icon: VideoOff,
    color: 'text-cinema-muted',
    bg: 'bg-cinema-elevated',
  },
  {
    key: 'orphanIds',
    label: 'IDs huérfanos',
    href: '/admin/movies?filter=orphan_ids',
    filter: 'orphan_ids',
    icon: AlertTriangle,
    color: 'text-cinema-muted',
    bg: 'bg-cinema-elevated',
  },
  {
    key: 'missingImage',
    label: 'Sin imagen',
    href: '/admin/movies?filter=missing_image',
    filter: 'missing_image',
    icon: ImageOff,
    color: 'text-cinema-muted',
    bg: 'bg-cinema-elevated',
  },
  {
    key: 'missingImageTitled',
    label: 'Sin poster (con título)',
    href: '/admin/movies?filter=missing_image_titled',
    filter: 'missing_image_titled',
    icon: ImageOff,
    color: 'text-cinema-muted',
    bg: 'bg-cinema-elevated',
  },
  {
    key: 'missingBackdrop',
    label: 'Sin backdrop',
    href: '/admin/movies?filter=missing_backdrop',
    filter: 'missing_backdrop',
    icon: Monitor,
    color: 'text-cinema-muted',
    bg: 'bg-cinema-elevated',
  },
  {
    key: 'incomplete',
    label: 'Incompletas',
    href: '/admin/movies?filter=incomplete',
    filter: 'incomplete',
    icon: FileWarning,
    color: 'text-cinema-accent',
    bg: 'bg-cinema-accent/15',
  },
] as const;

export default function AdminDashboardPage() {
  const stats = useQuery<any>(api.adminMovies.adminStats, {});
  // Totales por sección con la paginación en servidor (limit 1: solo interesa total).
  const seriesTotal = useQuery<{ total: number }>(api.adminSeries.adminList, {
    offset: 0,
    limit: 1,
  });
  const animeTotal = useQuery<{ total: number }>(api.adminAnime.adminList, { offset: 0, limit: 1 });
  const usersTotal = useQuery<{ total: number }>(api.adminUsers.adminList, { offset: 0, limit: 1 });
  const tvTotal = useQuery<{ total: number }>(api.tv.adminList, {
    offset: 0,
    limit: 1,
    includeInactive: true,
  });
  const sections = [
    { label: 'Películas', value: stats?.total, href: '/admin/movies', icon: Film },
    { label: 'Series', value: seriesTotal?.total, href: '/admin/series', icon: Tv },
    { label: 'Anime', value: animeTotal?.total, href: '/admin/anime', icon: Clapperboard },
    { label: 'Canales TV', value: tvTotal?.total, href: '/admin/tv', icon: Radio },
    { label: 'Usuarios', value: usersTotal?.total, href: '/admin/users', icon: Users },
  ];

  if (stats === undefined) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <p className="text-label uppercase text-cinema-accent mb-1.5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cinema-accent" aria-hidden />
          Consola
        </p>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-cinema-chalk">
          Panel
        </h1>
        <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
          Resumen del catálogo y estado de curación
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-8">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.label}
              href={section.href}
              className="group rounded-[2px] border border-cinema-border/70 bg-cinema-surface p-5 hover:border-cinema-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between text-label uppercase text-cinema-ash">
                {section.label}
                <Icon className="w-4 h-4 text-cinema-accent" aria-hidden />
              </div>
              <p className="font-display text-4xl text-cinema-chalk mt-3 tabular-nums">
                {section.value ?? '-'}
              </p>
            </Link>
          );
        })}
      </div>

      <h2 className="font-display text-xl font-semibold text-cinema-chalk mb-3">
        Calidad del catálogo de películas
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key as keyof typeof stats];

          return (
            <Link
              key={card.key}
              href={card.href}
              className="group p-5 rounded-[2px] bg-cinema-surface border border-cinema-border hover:border-cinema-accent/40 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-cinema-muted">{card.label}</p>
                  <p className="text-3xl font-semibold text-cinema-chalk mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-[2px] ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-[2px] bg-cinema-surface border border-cinema-border">
        <h2 className="text-lg font-semibold text-cinema-chalk mb-2">Acciones rápidas</h2>
        <p className="text-sm text-cinema-muted mb-4">
          Gestiona el catálogo, corrige registros huérfanos y fusiona duplicados.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/movies/new" className="btn-primary inline-flex items-center gap-2">
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
