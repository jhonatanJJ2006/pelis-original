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
    accent: 'text-cinema-gold',
    bg: 'bg-cinema-gold/15',
  },
  {
    href: '/link-tv',
    label: 'Vincular televisor',
    description: 'Aprueba el código QR de tu Android TV',
    icon: Tv,
    accent: 'text-cinema-violet',
    bg: 'bg-cinema-violet/15',
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
    <div className="page-shell max-w-3xl mx-auto">
      <ScrollReveal className="mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {user.image ? (
            <RemoteImage
              src={user.image}
              alt=""
              width={80}
              height={80}
              className="w-20 h-20 rounded-full ring-2 ring-cinema-accent/50 object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cinema-accent to-cinema-gold flex items-center justify-center ring-2 ring-cinema-accent/40">
              <User className="w-9 h-9 text-white" aria-hidden />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-cinema-accent text-sm font-medium uppercase tracking-widest mb-1">
              Cuenta
            </p>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight text-cinema-chalk truncate">
              {user.name}
            </h1>
            <p className="flex items-center gap-2 text-cinema-muted text-sm mt-2">
              <Mail className="w-4 h-4 shrink-0" aria-hidden />
              <span className="truncate">{user.email}</span>
            </p>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal className="mb-8">
        <div
          className={cn(
            'rounded-2xl border p-5 sm:p-6',
            hasActivePlan
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-cinema-border bg-cinema-surface'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                  hasActivePlan
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-cinema-gold/15 text-cinema-gold'
                )}
              >
                <Crown className="w-5 h-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-white font-semibold">
                  {hasActivePlan
                    ? `Plan ${currentPlan?.name ?? 'activo'}`
                    : 'Sin suscripción activa'}
                </h2>
                <p className="text-cinema-muted text-sm mt-0.5">
                  {hasActivePlan ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3.5 h-3.5" aria-hidden />
                      Activa hasta {new Date(user.planExpiresAt!).toLocaleDateString('es-ES')}
                    </span>
                  ) : (
                    'Elige un plan para desbloquear todo el catálogo'
                  )}
                </p>
              </div>
            </div>

            <Link href="/subscribe">
              <Button
                variant={hasActivePlan ? 'secondary' : 'primary'}
                className="w-full sm:w-auto inline-flex items-center gap-2"
              >
                {hasActivePlan ? (
                  <>
                    <Settings className="w-4 h-4" aria-hidden />
                    Gestionar
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
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <h2 className="font-display text-sm tracking-widest text-cinema-muted uppercase mb-3 px-1">
          Tu biblioteca
        </h2>
        <ul className="space-y-2">
          {accountLinks.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex items-center gap-4 rounded-2xl border border-cinema-border bg-cinema-surface p-4 sm:p-5 transition-colors hover:border-cinema-accent/40 hover:bg-cinema-elevated/40"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    item.bg,
                    item.accent
                  )}
                >
                  <item.icon className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold group-hover:text-cinema-accent-light transition-colors">
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
      </ScrollReveal>

      {user.role === 'admin' && (
        <ScrollReveal className="mt-8">
          <h2 className="font-display text-sm tracking-widest text-cinema-muted uppercase mb-3 px-1">
            Administración
          </h2>
          <Link
            href="/admin"
            className="group flex items-center gap-4 rounded-2xl border border-cinema-violet/30 bg-cinema-violet/10 p-4 sm:p-5 transition-colors hover:border-cinema-violet/50 hover:bg-cinema-violet/15"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-cinema-violet/20 text-cinema-violet-light">
              <Shield className="w-5 h-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold group-hover:text-cinema-accent-light transition-colors">
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

      <ScrollReveal className="mt-10">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-cinema-border bg-cinema-surface px-4 py-3.5 text-cinema-silver hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" aria-hidden />
          Cerrar sesión
        </button>
      </ScrollReveal>
    </div>
  );
}
