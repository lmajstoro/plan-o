import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FrigoLockup } from "../components/brand/FrigoMark";
import { FieldError, inputClass, useFieldErrors, type FieldErrors } from "../components/ui/field";
import { useDb } from "../context/DbContext";
import { linkExpired, PASSWORD_MIN } from "../lib/accounts";
import { pageName, pushAudit } from "../lib/audit";

export function PostaviLozinkuPage() {
  const { token } = useParams();
  const { db, update } = useDb();
  const employee = db.employees.find((row) => row.resetToken && row.resetToken === token);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const fields = useFieldErrors();
  const [done, setDone] = useState(false);
  const welcome = Boolean(employee && !employee.passwordSet && employee.welcomed && !employee.rulesAcceptedAt);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!employee || !employee.resetTokenExpires || linkExpired(employee.resetTokenExpires)) {
      setError("Poveznica više ne vrijedi. Zamoli administratora da pošalje novu.");
      return;
    }
    const nextErrors: FieldErrors = {};
    if (!password) nextErrors.password = "Upiši novu lozinku.";
    else if (password.length < PASSWORD_MIN) nextErrors.password = `Lozinka mora imati najmanje ${PASSWORD_MIN} znakova.`;
    else if (employee.password && password === employee.password) nextErrors.password = "Nova lozinka ne smije biti ista kao prethodna.";
    if (!repeat) nextErrors.repeat = "Ponovi lozinku.";
    else if (password && password !== repeat) nextErrors.repeat = "Lozinke se ne podudaraju.";
    if (fields.reject(nextErrors)) return;
    setError("");
    update((current) => {
      const next = {
        ...current,
        employees: current.employees.map((row) =>
          row.id === employee.id
            ? {
                ...row,
                password,
                passwordSet: true,
                locked: false,
                failedLogins: 0,
                resetToken: undefined,
                resetTokenExpires: undefined,
              }
            : row,
        ),
      };
      return pushAudit(next, { account: employee.name, email: employee.email, action: "Postavljanje lozinke", target: pageName("/postavi-lozinku") });
    });
    setDone(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-5">
          <FrigoLockup subtitle={false} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Postavljanje lozinke</h1>
        {welcome ? (
          <p className="mt-2 text-sm text-slate-600">Uz ovu poveznicu stigle su i upute za rad. Tekst uputa bit će definiran naknadno.</p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Poveznica vrijedi 24 sata i može se iskoristiti jednom.</p>
        )}
        {done ? (
          <p className="mt-4 text-sm text-slate-700">
            Lozinka je postavljena. <Link className="font-medium text-frigo-700" to="/prijava">Prijavi se</Link>.
          </p>
        ) : !employee || !employee.resetTokenExpires || linkExpired(employee.resetTokenExpires) ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Poveznica više ne vrijedi. Zamoli administratora da pošalje novu.
          </p>
        ) : (
          <form noValidate onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Nova lozinka
              <input
                type="password"
                className={inputClass(Boolean(fields.errors.password), "mt-1")}
                value={password}
                onChange={(event) => {
                  fields.clear("password");
                  setPassword(event.target.value);
                }}
              />
              <FieldError message={fields.errors.password} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Ponovi lozinku
              <input
                type="password"
                className={inputClass(Boolean(fields.errors.repeat), "mt-1")}
                value={repeat}
                onChange={(event) => {
                  fields.clear("repeat");
                  setRepeat(event.target.value);
                }}
              />
              <FieldError message={fields.errors.repeat} />
            </label>
            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <button type="submit" className="btn-primary w-full">Spremi lozinku</button>
          </form>
        )}
      </div>
    </div>
  );
}
