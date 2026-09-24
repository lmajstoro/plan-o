import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { loadDatabase, resetDatabase, saveDatabase, SEED_VERSION } from "../storage/db";
import type { Database } from "../types";

type DbContextValue = {
  db: Database;
  update: (updater: (current: Database) => Database) => void;
  reset: () => void;
};

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase());
  const [appliedSeed, setAppliedSeed] = useState(SEED_VERSION);

  if (appliedSeed !== SEED_VERSION) {
    setAppliedSeed(SEED_VERSION);
    setDb(resetDatabase());
  }

  const value = useMemo<DbContextValue>(
    () => ({
      db,
      update: (updater) => {
        setDb((current) => {
          const next = updater(current);
          saveDatabase(next);
          return next;
        });
      },
      reset: () => {
        const next = resetDatabase();
        setDb(next);
      },
    }),
    [db],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb mora biti unutar DbProvider");
  return ctx;
}
