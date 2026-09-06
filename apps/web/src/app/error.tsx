'use client';

import { ErrorState } from '@pelis/ui/features/empty-state';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-shell min-h-[50vh] flex items-center justify-center">
      <ErrorState
        title="Algo salió mal"
        description="No pudimos mostrar esta página. Inténtalo de nuevo."
        onRetry={reset}
      />
    </div>
  );
}
