import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import { pageName, pushAudit } from "../../lib/audit";
import type { AuditEntry, Database } from "../../types";

function when(iso: string) {
  return new Date(iso).toLocaleString("hr-HR", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function accountEmail(row: AuditEntry, db: Database): string {
  if (row.email) return row.email;
  if (row.account.includes("@")) return row.account;
  const people = [
    ...db.administrators.map((person) => ({ name: person.name, email: person.email, kind: "Administrator" })),
    ...db.employees.map((person) => ({ name: person.name, email: person.email, kind: "Zaposlenik" })),
  ].filter((person) => person.name === row.account);
  if (people.length === 1) return people[0].email;
  const byKind = people.filter((person) => person.kind === row.target);
  if (byKind.length === 1) return byKind[0].email;
  if (row.target.includes("@")) return row.target;
  return "";
}

export function EvidencijaPage() {
  const { user } = useAuth();
  const { db, update } = useDb();

  function exportLog() {
    const header = "Vrijeme;Račun;E-mail;Radnja;Stranica";
    const lines = db.auditLog.map((row) => [when(row.at), row.account, accountEmail(row, db), row.action, row.target].join(";"));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tokta-evidencija.csv";
    link.click();
    URL.revokeObjectURL(url);
    update((current) =>
      pushAudit(current, {
        account: user?.name ?? "Administrator",
        email: user?.email ?? "",
        action: "Izvoz evidencije",
        target: pageName("/administrator/evidencija"),
      }),
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Evidencija radnji</h1>
          <p className="mt-1 text-sm text-slate-500">Zapisi se ne uređuju. U mockupu ostaju na ovom uređaju.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={exportLog} disabled={db.auditLog.length === 0}>
          Izvezi
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Vrijeme</th>
              <th className="px-4 py-3 font-medium">Račun</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Radnja</th>
              <th className="px-4 py-3 font-medium">Stranica</th>
            </tr>
          </thead>
          <tbody>
            {db.auditLog.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-slate-500">Još nema zapisa.</td>
              </tr>
            ) : (
              db.auditLog.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{when(row.at)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.account}</td>
                  <td className="px-4 py-3 text-slate-700">{accountEmail(row, db)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.action}</td>
                  <td className="px-4 py-3 text-slate-600">{row.target}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
