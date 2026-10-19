'use client';

import { useAction } from '@pelis/db/client';
import { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@pelis/db/api';
import { Button, Input, Spinner } from '@pelis/ui/components';

interface AnilistResult {
  anilistId: number;
  title: string;
  alternativeTitle?: string;
  image: string;
  year: number;
  episodes: number;
  status: string;
}

interface AnilistSearchModalProps {
  onClose: () => void;
  onImported: () => void;
}

export function AnilistSearchModal({ onClose, onImported }: AnilistSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnilistResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);

  const searchAnilist = useAction(api.anime.searchAnilist);
  const importFromAnilist = useAction(api.anime.importFromAnilist);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = (await searchAnilist({ query: query.trim() })) as AnilistResult[];
      setResults(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error en búsqueda AniList');
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (anilistId: number) => {
    setImportingId(anilistId);
    try {
      const result = (await importFromAnilist({ anilistId })) as { id: string; created: boolean };
      toast.success(result.created ? 'Anime importado' : 'Anime ya existía en el catálogo');
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-[2px] border border-cinema-border bg-cinema-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-cinema-chalk tracking-wide">
            Buscar en AniList
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X className="w-5 h-5 text-cinema-muted hover:text-cinema-chalk" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título del anime..."
            iconLeft={<Search className="w-4 h-4" />}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? <Spinner className="w-4 h-4" /> : 'Buscar'}
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto space-y-2">
          {results.map((item) => (
            <div
              key={item.anilistId}
              className="flex items-center gap-3 p-2 rounded-[2px] bg-cinema-surface border border-cinema-border"
            >
              <img src={item.image} alt="" className="w-10 h-14 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-cinema-chalk truncate">{item.title}</p>
                <p className="text-xs text-cinema-muted">
                  {item.year} · {item.episodes} ep.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleImport(item.anilistId)}
                disabled={importingId === item.anilistId}
              >
                {importingId === item.anilistId ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Importar
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
