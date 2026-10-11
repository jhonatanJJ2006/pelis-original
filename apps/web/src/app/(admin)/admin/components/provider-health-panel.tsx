'use client';

import { useAction } from '@pelis/db/client';
import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { Button, Spinner } from '@pelis/ui/components';
import { cn } from '@pelis/ui/utils';

interface ProviderHealth {
  id: string;
  name: string;
  kind: 'embed' | 'hls';
  ok: boolean;
  responseMs: number | null;
  error?: string;
}

export function ProviderHealthPanel() {
  const checkHealth = useAction(api.anime.checkProvidersHealth);
  const [results, setResults] = useState<ProviderHealth[] | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const data = (await checkHealth({})) as ProviderHealth[];
      setResults(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al verificar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  const okCount = results?.filter((r) => r.ok).length ?? 0;
  const embedOk = results?.filter((r) => r.kind === 'embed' && r.ok).length ?? 0;

  return (
    <div className="mb-6 p-4 rounded-lg border border-cinema-border bg-cinema-surface">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-medium text-cinema-chalk">Estado de proveedores</h2>
          <p className="text-xs text-cinema-muted mt-0.5">
            {results
              ? `${okCount}/${results.length} operativos · ${embedOk} reproductor(es) integrado(s)`
              : 'Comprobando...'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={runCheck} disabled={loading}>
          {loading ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          Actualizar
        </Button>
      </div>

      {results && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {results.map((r) => (
            <div
              key={r.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
                r.ok
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/5 text-red-300'
              )}
            >
              {r.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {r.name}
                  <span className="ml-1.5 text-[10px] opacity-60 font-normal">
                    {r.kind === 'embed' ? 'integrado' : 'scraper'}
                  </span>
                </p>
                <p className="text-[10px] opacity-70 truncate">
                  {r.ok ? `${r.responseMs ?? '—'}ms` : (r.error ?? 'Error')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
