import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DB_KEY, loadDatabase, resetDatabase, saveDatabase, SEED_VERSION } from "../storage/db";
import type { Database } from "../types";

export const AUTOSAVE_MS = 15_000;
const SAVING_FEEDBACK_MS = 600;

type DbContextValue = {
  db: Database;
  update: (updater: (current: Database) => Database) => void;
  reset: () => void;
  /** Writes pending changes now instead of waiting for the autosave. */
  save: () => void;
  /** When the oldest unsaved change was made; null when everything is saved. */
  dirtySince: number | null;
  lastSavedAt: number | null;
  saving: boolean;
};

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase());
  const [appliedSeed, setAppliedSeed] = useState(SEED_VERSION);
  const [dirtySince, setDirtySince] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dbRef = useRef(db);
  const dirtyRef = useRef(false);
  dbRef.current = db;
  dirtyRef.current = dirtySince !== null;

  if (appliedSeed !== SEED_VERSION) {
    setAppliedSeed(SEED_VERSION);
    setDb(resetDatabase());
  }

  const save = useCallback(() => {
    saveDatabase(dbRef.current);
    dirtyRef.current = false;
    setDirtySince(null);
    setLastSavedAt(Date.now());
    setSaving(true);
    window.setTimeout(() => setSaving(false), SAVING_FEEDBACK_MS);
  }, []);

  useEffect(() => {
    if (dirtySince === null) return;
    const timer = window.setTimeout(save, Math.max(0, dirtySince + AUTOSAVE_MS - Date.now()));
    return () => window.clearTimeout(timer);
  }, [dirtySince, save]);

  useEffect(() => {
    const flush = () => {
      if (dirtyRef.current) saveDatabase(dbRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === DB_KEY && !dirtyRef.current) setDb(loadDatabase());
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<DbContextValue>(
    () => ({
      db,
      update: (updater) => {
        setDb((current) => updater(current));
        setDirtySince((current) => current ?? Date.now());
      },
      reset: () => {
        setDb(resetDatabase());
        setDirtySince(null);
      },
      save,
      dirtySince,
      lastSavedAt,
      saving,
    }),
    [db, save, dirtySince, lastSavedAt, saving],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb mora biti unutar DbProvider");
  return ctx;
}
