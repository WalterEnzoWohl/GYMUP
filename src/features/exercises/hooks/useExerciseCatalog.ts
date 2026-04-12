import { useEffect, useState } from 'react';
import { loadExerciseCatalog } from '@/features/exercises/lib/exerciseCatalog';
import type { ExerciseCatalogSummary } from '@/features/exercises/types';

export function useExerciseCatalog() {
  const [catalog, setCatalog] = useState<ExerciseCatalogSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadExerciseCatalog()
      .then((entries) => {
        if (cancelled) {
          return;
        }

        setCatalog(entries);
        setError(null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setCatalog([]);
        setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar el catálogo.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    catalog,
    error,
    isLoading,
  };
}
