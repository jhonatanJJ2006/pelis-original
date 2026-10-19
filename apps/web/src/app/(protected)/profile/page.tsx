'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@pelis/db/client';
import {
  User,
  Heart,
  History,
  Tv,
  Crown,
  LogOut,
  ChevronRight,
  Mail,
  Check,
  Settings,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { useUser } from '@pelis/auth/hooks';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { ProfilePageSkeleton } from '@pelis/ui/features/profile-page-skeleton';
import { EmptyState } from '@pelis/ui/features/empty-state';
import { Button } from '@pelis/ui/components';
import { RemoteImage } from '@/components/remote-image';
import { cn } from '@pelis/ui/utils';

interface Plan {
  _id: string;
  name: string;
  price: number;
}

const accountLinks = [
  {
    href: '/favorites',
    label: 'Favoritos',
    description: 'Películas y series que guardaste',
    icon: Heart,
    accent: 'text-cinema-accent',
    bg: 'bg-cinema-accent/15',
  },
  {
    href: '/history',
    label: 'Historial',
    description: 'Continúa donde lo dejaste',
    icon: History,
    accent: 'text-cinema-teal',
    bg: 'bg-cinema-teal/15',
  },
  {
    href: '/subscribe',
    label: 'Suscripción',
    description: 'Planes, pagos y mejoras',
    icon: Crown,
    accent: 'text-cinema-accent',
    bg: 'bg-cinema-accent/15',
  },
  {
    href: '/link-tv',
    label: 'Vincular televisor',
    description: 'Aprueba el código QR de tu Android TV',
    icon: Tv,
    accent: 'text-cinema-accent',
    bg: 'bg-cinema-accent/15',
  },
];

export default function ProfilePage() {
  const { user, logout, isLoading } = useUser();
  const router = useRouter();
  const plans = (useQuery(api.subscriptions.list, {}) as Plan[] | undefined) ?? [];

  const hasActivePlan = !!(user?.planExpiresAt && user.planExpiresAt > Date.now());
  const currentPlan = plans.find((p) => p._id === user?.planId);

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada correctamente');
    router.push('/login');
  };

  if (isLoading) {
    return <ProfilePageSkeleton />;
  }

  if (!user) {
    return (
      <EmptyState
        icon={User}
        title="Mi perfil"
        description="Inicia sesión para ver tus favoritos, historial y suscripción."
        actionLabel="Iniciar sesión"
        actionHref="/login"
      />
    );
  }

  return (
    <div className="page-shell max-w-6xl mx-auto space-y-6">
      <ScrollReveal>
        <section className="relative overflow-hidden border border-cinema-border/70 bg-gradient-to-br from-cinema-surface via-cinema-surface to-cinema-accent/10 p-6 md:p-8 rounded-[2px]">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {user.image ? (
              <RemoteImage
                src={user.image}
                alt=""
                width={96}
                height={96}
                className="w-20 h-20 md:w-24 md:h-24 rounded-[4px] ring-2 ring-cinema-accent/60 object-cover"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-[4px] bg-cinema-elevated flex items-center justify-center ring-2 ring-cinema-accent/60">
                <User className="w-9 h-9 text-cinema-accent" aria-hidden />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl md:text-4xl tracking-tight text-cinema-chalk truncate">
                  {user.name}
                </h1>
                {hasActivePlan && (
                  <span className="rounded-full border border-cinema-accent/40 bg-cinema-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cinema-accent">
                    Miembro activo
                  </span>
                )}
              </div>
              <p className="flex items-center gap-2 text-cinema-muted text-sm mt-2">
                <Mail className="w-4 h-4 shrink-0" aria-hidden />
                <span className="truncate">{user.email}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/link-tv"
                className="inline-flex items-center gap-2 bg-cinema-accent px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-cinema-bg hover:bg-cinema-accent-light transition-colors rounded-[2px]"
              >
                <Tv className="w-4 h-4" aria-hidden />
                Vincular TV
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <div className="grid gap-6 lg:grid-cols-5">
        <ScrollReveal className="lg:col-span-3">
          <section className="h-full border border-cinema-border/70 bg-cinema-surface p-6 md:p-8 rounded-[2px] flex flex-col">
            <p className="text-label uppercase text-cinema-accent mb-1">Suscripción</p>
            <h2 className="font-display text-2xl text-cinema-chalk mb-6">
              Membresía y plan actual
            </h2>
            <div
              className={cn(
                'border p-5 rounded-[2px]',
                hasActivePlan
                  ? 'border-cinema-accent/30 bg-cinema-bg/60'
                  : 'border-cinema-border bg-cinema-bg/40'
              )}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-cinema-silver mb-1">
                {hasActivePlan ? 'Plan activo' : 'Sin plan'}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-2xl text-cinema-accent">
                  {hasActivePlan ? (currentPlan?.name ?? 'Plan activo') : 'Sin suscripción activa'}
                </h3>
                {hasActivePlan ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cinema-success/40 bg-cinema-success/10 px-3 py-1 text-xs text-cinema-success">
                    <Check className="w-3.5 h-3.5" aria-hidden />
                    Activo hasta {new Date(user.planExpiresAt!).toLocaleDateString('es-ES')}
                  </span>
                ) : (
                  <span className="text-sm text-cinema-muted">
                    Elige un plan para desbloquear todo el catálogo
                  </span>
                )}
              </div>
            </div>
            <div className="mt-auto pt-6">
              <Link href="/subscribe">
                <Button
                  variant={hasActivePlan ? 'secondary' : 'primary'}
                  className="w-full sm:w-auto inline-flex items-center gap-2"
                >
                  {hasActivePlan ? (
                    <>
                      <Settings className="w-4 h-4" aria-hidden />
                      Gestionar plan
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" aria-hidden />
                      Ver planes
                    </>
                  )}
                </Button>
              </Link>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal className="lg:col-span-2">
          <section className="h-full border border-cinema-border/70 bg-cinema-surface p-6 md:p-8 rounded-[2px]">
            <p className="text-label uppercase text-cinema-accent mb-1">Tu biblioteca</p>
            <h2 className="font-display text-2xl text-cinema-chalk mb-6">Accesos</h2>
            <ul className="space-y-2">
              {accountLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-4 rounded-[2px] border border-cinema-border bg-cinema-bg/50 p-3 sm:p-4 transition-colors hover:border-cinema-accent/40 hover:bg-cinema-elevated/40"
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                        item.bg,
                        item.accent
                      )}
                    >
                      <item.icon className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-cinema-chalk font-semibold group-hover:text-cinema-accent-light transition-colors">
                        {item.label}
                      </p>
                      <p className="text-cinema-muted text-sm">{item.description}</p>
                    </div>
                    <ChevronRight
                      className="w-5 h-5 text-cinema-ash group-hover:text-cinema-silver shrink-0 transition-colors"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </ScrollReveal>
      </div>

      {user.role === 'admin' && (
        <ScrollReveal>
          <h2 className="font-display text-sm tracking-widest text-cinema-muted mb-3 px-1">
            Administración
          </h2>
          <Link
            href="/admin"
            className="group flex items-center gap-4 rounded-lg border border-cinema-accent/30 bg-cinema-accent/10 p-4 sm:p-5 transition-colors hover:border-cinema-accent/50 hover:bg-cinema-accent/15"
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-cinema-accent/20 text-cinema-accent-light">
              <Shield className="w-5 h-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-cinema-chalk font-semibold group-hover:text-cinema-accent-light transition-colors">
                Panel de admin
              </p>
              <p className="text-cinema-muted text-sm">Gestionar películas y catálogo</p>
            </div>
            <ChevronRight
              className="w-5 h-5 text-cinema-ash group-hover:text-cinema-silver shrink-0 transition-colors"
              aria-hidden
            />
          </Link>
        </ScrollReveal>
      )}

      <ScrollReveal>
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-5 border border-cinema-border/70 bg-cinema-surface p-6 md:p-8 rounded-[2px]">
          <div>
            <p className="text-label uppercase text-cinema-danger-light mb-1 inline-flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" aria-hidden />
              Seguridad de la cuenta
            </p>
            <h2 className="font-display text-xl text-cinema-chalk">Sesión</h2>
            <p className="text-sm text-cinema-muted mt-1">
              Cierra la sesión en este dispositivo cuando termines.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 bg-cinema-danger px-5 py-3 text-sm font-semibold tracking-[0.12em] text-cinema-chalk hover:bg-cinema-danger-light transition-colors rounded-[2px]"
          >
            <LogOut className="w-4 h-4" aria-hidden />
            Cerrar sesión
          </button>
        </section>
      </ScrollReveal>
    </div>
  );
}
