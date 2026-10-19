'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TV_KEYBOARD_MAX_TEXT } from '@pelis/db/tv-keyboard-code';
import {
  normalizePairingCode,
  isPairingCodeShape,
  formatPairingCode,
} from '@pelis/db/tv-pairing-code';

type Status = 'idle' | 'sending' | 'sent' | 'done' | 'expired' | 'error';

const STATUS_TEXT: Record<Status, string> = {
  idle: 'Lo que escribas aparece en la búsqueda de tu TV.',
  sending: 'Enviando…',
  sent: 'En tu TV.',
  done: 'Listo. Mira los resultados en tu TV.',
  expired: 'Este código venció. Vuelve a abrir Buscar en tu TV y escanea el nuevo código.',
  error: 'No se pudo enviar. Revisa tu conexión.',
};

function Keyboard() {
  const params = useSearchParams();
  const [code, setCode] = useState(() => normalizePairingCode(params.get('code') ?? ''));
  const [codeInput, setCodeInput] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const inFlight = useRef(false);
  const queued = useRef<{ text: string; done: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valid = isPairingCodeShape(code);

  const flush = useCallback(async () => {
    if (inFlight.current || !queued.current) return;
    const next = queued.current;
    queued.current = null;
    inFlight.current = true;
    setStatus('sending');
    try {
      const res = await fetch('/api/tv-keyboard/text', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, text: next.text, done: next.done }),
      });
      if (res.status === 404) setStatus('expired');
      else if (!res.ok) setStatus('error');
      else setStatus(next.done ? 'done' : 'sent');
    } catch {
      setStatus('error');
    } finally {
      inFlight.current = false;
      if (queued.current) void flush();
    }
  }, [code]);

  const send = useCallback(
    (value: string, done: boolean) => {
      queued.current = { text: value, done };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), done ? 0 : 150);
    },
    [flush]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  if (!valid) {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setCode(normalizePairingCode(codeInput));
        }}
      >
        <label className="text-sm text-[#C9C3B6]" htmlFor="code">
          Escribe el código que ves en la búsqueda de tu TV
        </label>
        <input
          id="code"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={8}
          className="rounded-xl border border-[#3A3630] bg-[#141418] px-4 py-4 text-center text-2xl tracking-[0.3em] text-[#F4F1EA] outline-none focus:border-[#C4A35A]"
          placeholder="ABC 123"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#C4A35A] px-4 py-4 text-lg font-semibold text-[#0B0B0D]"
        >
          Continuar
        </button>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        send(text, true);
      }}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-[#8E877A]">
        Código <span className="text-[#C4A35A]">{formatPairingCode(code)}</span>
      </p>
      <input
        aria-label="Qué quieres ver"
        value={text}
        onChange={(e) => {
          const value = e.target.value.slice(0, TV_KEYBOARD_MAX_TEXT);
          setText(value);
          send(value, false);
        }}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={TV_KEYBOARD_MAX_TEXT}
        disabled={status === 'expired'}
        className="rounded-xl border border-[#3A3630] bg-[#141418] px-4 py-5 text-2xl text-[#F4F1EA] outline-none placeholder:text-[#5E584E] focus:border-[#C4A35A]"
        placeholder="Película, serie, anime o canal"
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setText('');
            send('', false);
          }}
          disabled={status === 'expired'}
          className="rounded-xl border border-[#3A3630] px-4 py-4 text-base text-[#F4F1EA]"
        >
          Borrar
        </button>
        <button
          type="submit"
          disabled={status === 'expired'}
          className="flex-1 rounded-xl bg-[#C4A35A] px-4 py-4 text-lg font-semibold text-[#0B0B0D] disabled:opacity-50"
        >
          Buscar en la TV
        </button>
      </div>
      <p
        role="status"
        className={
          status === 'expired' || status === 'error'
            ? 'text-sm text-[#E58A7B]'
            : 'text-sm text-[#C9C3B6]'
        }
      >
        {STATUS_TEXT[status]}
      </p>
    </form>
  );
}

export default function TvTecladoPage() {
  return (
    <main className="min-h-dvh bg-[#0B0B0D] px-5 py-8 text-[#F4F1EA]">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#C4A35A]/60 bg-[#141418] font-serif text-lg text-[#C4A35A]">
            P
          </span>
          <span className="font-serif text-lg tracking-[0.3em] text-[#C4A35A]">PELIS</span>
        </header>
        <div>
          <h1 className="font-serif text-3xl">Escribe desde tu celular</h1>
          <p className="mt-2 text-sm text-[#C9C3B6]">Busca en tu TV sin usar el control remoto.</p>
        </div>
        <Suspense fallback={<p className="text-sm text-[#C9C3B6]">Cargando…</p>}>
          <Keyboard />
        </Suspense>
      </div>
    </main>
  );
}
