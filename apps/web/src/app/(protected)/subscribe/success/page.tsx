'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Film, Loader2 } from 'lucide-react';
import { ScrollReveal } from '@pelis/ui/features/scroll-reveal';
import { Button, Spinner } from '@pelis/ui/components';
import { useAppStore } from '@pelis/auth/store';

type MeUser = {
  _id: string;
  name: string;
  email: string;
  role?: 'USER' | 'ADMIN';
  emailVerified?: boolean;
  planId?: string;
  planExpiresAt?: number;
};

async function fetchMe(): Promise<MeUser | null> {
  try {
    const res = await fetch('/api/function/users.me', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as MeUser | null;
    if (!json || typeof json !== 'object' || !json._id) return null;
    return json;
  } catch {
    return null;
  }
}

async function fulfillCheckout(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/stripe/fulfill', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { activated?: boolean };
    return json.activated === true;
  } catch {
    return false;
  }
}

function stripSessionIdFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('session_id')) return;
  url.searchParams.delete('session_id');
  window.history.replaceState({}, '', url.toString());
}

function SubscribeSuccessContent() {
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('session_id');
  const sessionIdRef = useRef(sessionIdFromUrl);
  if (sessionIdFromUrl) sessionIdRef.current = sessionIdFromUrl;

  const setUser = useAppStore((s) => s.setUser);
  const [activating, setActivating] = useState(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const applyMe = async () => {
      const me = await fetchMe();
      if (cancelled || !me) return false;
      const ok = !!(me.planExpiresAt && me.planExpiresAt > Date.now());
      if (!ok) return false;
      const prev = useAppStore.getState().user;
      setUser({
        _id: me._id,
        name: me.name,
        email: me.email,
        role: me.role === 'ADMIN' ? 'admin' : 'user',
        planId: me.planId,
        planExpiresAt: me.planExpiresAt,
        image: prev?.image,
      });
      setActive(true);
      setActivating(false);
      stripSessionIdFromUrl();
      return true;
    };

    const tick = async () => {
      const sessionId = sessionIdRef.current;
      if (sessionId && attempts < 3) {
        const activated = await fulfillCheckout(sessionId);
        if (cancelled) return;
        if (activated) {
          if (await applyMe()) return;
          setActive(true);
          setActivating(false);
          stripSessionIdFromUrl();
          return;
        }
      }
      if (await applyMe()) return;
      attempts += 1;
      if (attempts >= maxAttempts) {
        setActivating(false);
        return;
      }
      window.setTimeout(tick, 1500);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  return (
    <ScrollReveal className="text-center max-w-lg mx-auto">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center">
          {activating ? (
            <Loader2 className="w-8 h-8 text-cinema-chalk animate-spin" />
          ) : (
            <CheckCircle className="w-8 h-8 text-cinema-chalk" />
          )}
        </div>
      </div>

      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-cinema-chalk mb-4">
        {activating
          ? 'Activando suscripción…'
          : active
            ? '¡Suscripción activada!'
            : 'Pago recibido'}
      </h1>
      <p className="text-cinema-muted text-lg mb-8">
        {activating
          ? 'Estamos confirmando el pago con Stripe. Suele tardar unos segundos.'
          : active
            ? 'Ya puedes disfrutar de todo el contenido premium sin límites.'
            : 'El cobro se registró. Si el plan aún no aparece, espera un momento o recarga el perfil.'}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link href="/">
          <Button className="flex items-center gap-2">
            <Film className="w-4 h-4" />
            Ir al inicio
          </Button>
        </Link>
        <Link
          href="/movies"
          className="text-cinema-silver hover:text-cinema-chalk transition-colors text-sm font-medium"
        >
          Explorar películas
        </Link>
        <Link
          href="/profile"
          className="text-cinema-silver hover:text-cinema-chalk transition-colors text-sm font-medium"
        >
          Ver perfil
        </Link>
      </div>
    </ScrollReveal>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <div className="page-shell min-h-[80vh] flex items-center justify-center">
      <Suspense
        fallback={
          <div className="flex justify-center py-12" role="status" aria-label="Cargando">
            <Spinner size="lg" />
          </div>
        }
      >
        <SubscribeSuccessContent />
      </Suspense>
    </div>
  );
}
