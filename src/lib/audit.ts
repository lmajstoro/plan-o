import { newId } from "./gantt";
import type { AuditEntry, Database } from "../types";

export function pageName(pathname: string): string {
  if (pathname.startsWith("/pravila")) return "Pravila korištenja";
  if (pathname.startsWith("/postavi-lozinku")) return "Postavljanje lozinke";
  if (pathname.startsWith("/zaposlenik")) return "Tvoji sati";
  if (pathname.startsWith("/administrator/zaposlenici")) return "Zaposlenici";
  if (pathname.startsWith("/administrator/evidencija")) return "Evidencija radnji";
  if (pathname.startsWith("/administrator/uloge")) return "Uloge";
  if (pathname.startsWith("/administrator/radne-skupine")) return "Radne skupine";
  if (pathname.startsWith("/administrator/zadaci")) return "Zadaci";
  if (pathname.startsWith("/administrator/kontrola-kvalitete") || pathname.startsWith("/administrator/checkliste")) return "Kontrola kvalitete";
  if (pathname.startsWith("/administrator/radni-nalozi/predlosci") || pathname.startsWith("/administrator/predlosci")) return "Predlošci";
  if (/^\/administrator\/radni-nalozi\/[^/]+/.test(pathname)) return "Radni nalog";
  if (pathname.startsWith("/administrator/radni-nalozi")) return "Radni nalozi";
  if (pathname === "/administrator/tablet" || pathname.startsWith("/administrator/tablet/")) return "Plan rada";
  if (pathname.startsWith("/administrator")) return "Plan rada";
  return "Prijava";
}

export function pushAudit(db: Database, entry: Pick<AuditEntry, "account" | "email" | "action" | "target">): Database {
  const row: AuditEntry = { id: newId("aud"), at: new Date().toISOString(), ...entry };
  return { ...db, auditLog: [row, ...db.auditLog].slice(0, 400) };
}
