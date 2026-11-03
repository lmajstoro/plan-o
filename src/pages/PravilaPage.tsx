import { Navigate, useNavigate } from "react-router-dom";
import { FrigoLockup } from "../components/brand/FrigoMark";
import { useAuth } from "../context/AuthContext";
import { useDb } from "../context/DbContext";
import { sameEmail } from "../lib/accounts";
import { pageName, pushAudit } from "../lib/audit";

const RULES = [
  "Koristi samo vlastiti račun.",
  "Na dijeljenom uređaju se odjavi kad završiš.",
  "Lozinku ne dijeli ni s kim.",
  "Ako posumnjaš na incident, javi se administratoru.",
];

export function PravilaPage() {
  const { user } = useAuth();
  const { db, update } = useDb();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/prijava" replace />;

  const admin = user.role === "admin" ? db.administrators.find((row) => sameEmail(row.email, user.email)) : undefined;
  const employee = user.role === "zaposlenik" ? db.employees.find((row) => sameEmail(row.email, user.email)) : undefined;
  const accepted = Boolean(admin?.rulesAcceptedAt || employee?.rulesAcceptedAt);
  if (accepted) return <Navigate to={user.role === "admin" ? "/administrator" : "/zaposlenik"} replace />;

  function accept() {
    if (!user) return;
    const at = new Date().toISOString();
    update((current) => {
      const next =
        user.role === "admin"
          ? {
              ...current,
              administrators: current.administrators.map((row) =>
                sameEmail(row.email, user.email) ? { ...row, rulesAcceptedAt: at } : row,
              ),
            }
          : {
              ...current,
              employees: current.employees.map((row) =>
                sameEmail(row.email, user.email) ? { ...row, rulesAcceptedAt: at } : row,
              ),
            };
      return pushAudit(next, { account: user.name, email: user.email, action: "Potvrda pravila", target: pageName("/pravila") });
    });
    navigate(user.role === "admin" ? "/administrator" : "/zaposlenik", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-5">
          <FrigoLockup subtitle={false} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Pravila korištenja</h1>
        <p className="mt-2 text-sm text-slate-600">Prije ulaska potvrdi kratka pravila. Tekst će biti definiran naknadno.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-800">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <button type="button" className="btn-primary mt-6 w-full" onClick={accept}>
          Prihvaćam
        </button>
      </div>
    </div>
  );
}
