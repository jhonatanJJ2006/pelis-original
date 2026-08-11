'use client';

import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Search, Shield, ShieldOff, Crown, Mail, Check, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/convex';
import { Button, Input } from '@pelis/ui/components';
import { AdminTableSkeleton } from '@pelis/ui/features/admin-table-skeleton';
import { cn } from '@pelis/ui/utils';

interface UserRow {
  _id: string;
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: number;
  lastLoginAt?: number;
  subscription: {
    _id: string;
    startDate: number;
    endDate: number;
    status: 'active' | 'cancelled' | 'expired';
    plan: { _id: string; name: string; price: number } | null;
  } | null;
}

function formatDate(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'user' | 'admin'>('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const users = useQuery(api.adminUsers.adminList, {
    search: search || undefined,
    role: roleFilter || undefined,
    limit: 500,
  }) as UserRow[] | undefined;

  const setRole = useMutation(api.adminUsers.adminSetRole);

  const tabs: { value: '' | 'user' | 'admin'; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'user', label: 'Usuarios' },
    { value: 'admin', label: 'Admins' },
  ];

  const handleToggleRole = async (user: UserRow) => {
    const next = user.role === 'admin' ? 'user' : 'admin';
    if (
      !confirm(
        next === 'admin'
          ? `¿Promover a ${user.email} como administrador?`
          : `¿Quitar permisos de admin a ${user.email}?`
      )
    ) {
      return;
    }
    setBusyId(user._id);
    try {
      await setRole({ userId: user._id as any, role: next });
      toast.success(next === 'admin' ? 'Usuario promovido a admin' : 'Permisos revocados');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar rol');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white uppercase">
          Usuarios
        </h1>
        <p className="text-cinema-muted mt-1 sm:mt-2 text-sm sm:text-base">
          {users ? `${users.length} cuentas` : 'Cargando...'}
        </p>
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setRoleFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs sm:text-sm transition-colors border whitespace-nowrap shrink-0',
                roleFilter === tab.value
                  ? 'bg-cinema-violet/20 text-white border-cinema-violet/40'
                  : 'text-cinema-muted border-cinema-border hover:text-white hover:border-cinema-silver/30'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 sm:mb-6 w-full max-w-md">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email o nombre..."
          iconLeft={<Search className="w-4 h-4" />}
          clearable
          onClear={() => setSearch('')}
        />
      </div>

      {users === undefined ? (
        <AdminTableSkeleton />
      ) : users.length === 0 ? (
        <div className="text-center py-24 text-cinema-muted">
          No hay usuarios con ese filtro.
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <article key={u._id} className="rounded-2xl border border-cinema-border bg-cinema-surface p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cinema-accent to-cinema-violet flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm text-white truncate">{u.name}</h3>
                    <p className="text-xs text-cinema-muted truncate">{u.email}</p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'inline-flex items-center text-[10px] px-2 py-0.5 rounded-full',
                          u.role === 'admin'
                            ? 'bg-cinema-gold/20 text-cinema-gold'
                            : 'bg-cinema-elevated text-cinema-muted'
                        )}
                      >
                        {u.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          <Check className="w-3 h-3" /> Verificado
                        </span>
                      ) : null}
                      {u.subscription && u.subscription.status === 'active' && u.subscription.endDate > Date.now() && u.subscription.plan ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cinema-violet/20 text-cinema-violet-light">
                          <Crown className="w-3 h-3" /> {u.subscription.plan.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-cinema-border/60 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === u._id}
                    onClick={() => handleToggleRole(u)}
                  >
                    {u.role === 'admin' ? (
                      <>
                        <ShieldOff className="w-4 h-4" /> Quitar admin
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 text-cinema-gold" /> Hacer admin
                      </>
                    )}
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-2xl border border-cinema-border bg-cinema-surface">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-cinema-border text-left text-cinema-muted">
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Verificado</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Vence</th>
                  <th className="px-4 py-3 font-medium">Último login</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const activePlan =
                    u.subscription && u.subscription.status === 'active' && u.subscription.endDate > Date.now();
                  return (
                    <tr key={u._id} className="border-b border-cinema-border/60 hover:bg-cinema-elevated/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white truncate max-w-[240px]">{u.name}</p>
                        <p className="text-xs text-cinema-ash mt-0.5 truncate max-w-[240px]">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center text-[10px] px-2 py-0.5 rounded-full',
                            u.role === 'admin'
                              ? 'bg-cinema-gold/20 text-cinema-gold'
                              : 'bg-cinema-elevated text-cinema-muted'
                          )}
                        >
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-cinema-muted">
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <Mail className="w-4 h-4 text-cinema-ash" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-cinema-muted">
                        {u.subscription?.plan ? (
                          <span className="inline-flex items-center gap-1 text-cinema-violet-light">
                            <Crown className="w-3.5 h-3.5" />
                            {u.subscription.plan.name}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-cinema-muted">
                        {activePlan ? formatDate(u.subscription?.endDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-cinema-muted">{formatDate(u.lastLoginAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === u._id}
                          onClick={() => handleToggleRole(u)}
                        >
                          {u.role === 'admin' ? (
                            <>
                              <ShieldOff className="w-4 h-4" />
                              <span className="ml-1 hidden lg:inline">Quitar admin</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 text-cinema-gold" />
                              <span className="ml-1 hidden lg:inline">Hacer admin</span>
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}