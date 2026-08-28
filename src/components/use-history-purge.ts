"use client";

import { useCallback, useRef, useState } from "react";
import {
  runHistoryPurge,
  type HistoryPurgeTick,
} from "@/lib/history-purge";

export function useHistoryPurge(url: string, onCleared: () => void) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [tick, setTick] = useState<HistoryPurgeTick | null>(null);
  const [error, setError] = useState<string | null>(null);
  const purgingRef = useRef(false);
  const onClearedRef = useRef(onCleared);
  onClearedRef.current = onCleared;

  const start = useCallback(
    async (total: number) => {
      setConfirmOpen(false);
      setPurging(true);
      purgingRef.current = true;
      setError(null);
      setTick({ deleted: 0, remaining: total, total });
      try {
        await runHistoryPurge({
          url,
          total,
          onProgress: setTick,
        });
        onClearedRef.current();
        setTick(null);
        setPurging(false);
        purgingRef.current = false;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo borrar el historial.",
        );
      }
    },
    [url],
  );

  const retry = useCallback(() => {
    const leftover = tick?.remaining ?? 0;
    void start(leftover > 0 ? leftover : 1);
  }, [start, tick]);

  return {
    confirmOpen,
    setConfirmOpen,
    purging,
    purgingRef,
    tick,
    error,
    start,
    retry,
  };
}
