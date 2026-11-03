import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ToktaLockup } from "../components/brand/ToktaMark";
import { emailProblem, FieldError, inputClass, useFieldErrors } from "../components/ui/field";
import { useDb } from "../context/DbContext";
import { LOCK_AFTER, MOCK_ADMIN_EMAIL, MOCK_EMPLOYEE_EMAIL, MOCK_MFA_CODE, MOCK_PASSWORD, sameEmail } from "../lib/accounts";
import { pageName, pushAudit } from "../lib/audit";
import type { Administrator, Employee } from "../types";

const GENERIC_ERROR = "E-mail ili lozinka nisu točni.";

export function LoginPage() {
  const { user, login } = useAuth();
  const { db, update } = useDb();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingAdmin, setPendingAdmin] = useState<Administrator | null>(null);
  const [error, setError] = useState("");
  const fields = useFieldErrors();

  if (user?.role === "admin") return <Navigate to="/administrator" replace />;
  if (user?.role === "zaposlenik") return <Navigate to="/zaposlenik" replace />;

  function noteFailure(account: string, target: string) {
    update((current) => pushAudit(current, { account, email: account.includes("@") ? account : "", action: "Neuspješna prijava", target }));
  }

  function lockMessage(kind: "admin" | "zaposlenik") {
    return kind === "admin"
      ? "Račun je zaključan. Javi se kreatorima aplikacije."
      : "Račun je zaključan. Javi se administratoru.";
  }

  function bumpEmployee(employee: Employee) {
    const failedLogins = employee.failedLogins + 1;
    const locked = failedLogins >= LOCK_AFTER;
    update((current) => {
      const next = {
        ...current,
        employees: current.employees.map((row) => (row.id === employee.id ? { ...row, failedLogins, locked } : row)),
      };
      return pushAudit(next, {
        account: employee.name,
        email: employee.email,
        action: locked ? "Zaključavanje računa" : "Neuspješna prijava",
        target: pageName("/prijava"),
      });
    });
    setError(locked ? lockMessage("zaposlenik") : GENERIC_ERROR);
  }

  function bumpAdmin(admin: Administrator) {
    const failedLogins = admin.failedLogins + 1;
    const locked = failedLogins >= LOCK_AFTER;
    update((current) => {
      const next = {
        ...current,
        administrators: current.administrators.map((row) => (row.id === admin.id ? { ...row, failedLogins, locked } : row)),
      };
      return pushAudit(next, {
        account: admin.name,
        email: admin.email,
        action: locked ? "Zaključavanje računa" : "Neuspješna prijava",
        target: pageName("/prijava"),
      });
    });
    setPendingAdmin(null);
    setCode("");
    setError(locked ? lockMessage("admin") : GENERIC_ERROR);
  }

  function enter(role: "admin" | "zaposlenik", name: string, accountEmail: string, id: string) {
    const at = new Date().toISOString();
    update((current) => {
      const next =
        role === "admin"
          ? {
              ...current,
              administrators: current.administrators.map((row) =>
                row.id === id ? { ...row, failedLogins: 0, lastLoginAt: at } : row,
              ),
            }
          : {
              ...current,
              employees: current.employees.map((row) =>
                row.id === id ? { ...row, failedLogins: 0, lastLoginAt: at } : row,
              ),
            };
      return pushAudit(next, {
        account: name,
        email: accountEmail,
        action: "Prijava",
        target: pageName("/prijava"),
      });
    });
    login({ email: accountEmail, role, name });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const mail = email.trim();
    if (pendingAdmin) {
      if (!code.trim()) {
        fields.reject({ code: "Upiši šifru drugog faktora." });
        setError("");
        return;
      }
      fields.clear();
      const admin = db.administrators.find((row) => row.id === pendingAdmin.id) ?? pendingAdmin;
      if (admin.locked) {
        setError(lockMessage("admin"));
        setPendingAdmin(null);
        return;
      }
      if (code.trim() !== MOCK_MFA_CODE) {
        bumpAdmin(admin);
        return;
      }
      enter("admin", admin.name, admin.email, admin.id);
      return;
    }

    const nextErrors: Record<string, string> = {};
    const mailProblem = emailProblem(mail);
    if (mailProblem) nextErrors.email = mailProblem;
    if (!password) nextErrors.password = "Upiši lozinku.";
    if (fields.reject(nextErrors)) {
      setError("");
      return;
    }

    const admin = db.administrators.find((row) => sameEmail(row.email, mail));
    const employee = db.employees.find((row) => sameEmail(row.email, mail));

    if (admin) {
      if (admin.locked) {
        setError(lockMessage("admin"));
        return;
      }
      if (admin.password !== password) {
        bumpAdmin(admin);
        return;
      }
      setPendingAdmin(admin);
      setError("");
      return;
    }

    if (!employee || !employee.active || !employee.passwordSet) {
      noteFailure(mail || "Nepoznat račun", "Prijava");
      setError(GENERIC_ERROR);
      return;
    }
    if (employee.locked) {
      setError(lockMessage("zaposlenik"));
      return;
    }
    if (employee.password !== password) {
      bumpEmployee(employee);
      return;
    }
    enter("zaposlenik", employee.name, employee.email, employee.id);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <ToktaLockup size="lg" heading />
        </div>

        <form noValidate onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            E-mail
            <input
              type="email"
              className={inputClass(Boolean(fields.errors.email), "mt-1")}
              autoComplete="username"
              value={email}
              disabled={Boolean(pendingAdmin)}
              onChange={(event) => {
                fields.clear("email");
                setEmail(event.target.value);
              }}
            />
            <FieldError message={fields.errors.email} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Lozinka
            <input
              type="password"
              className={inputClass(Boolean(fields.errors.password), "mt-1")}
              autoComplete="current-password"
              value={password}
              disabled={Boolean(pendingAdmin)}
              onChange={(event) => {
                fields.clear("password");
                setPassword(event.target.value);
              }}
            />
            <FieldError message={fields.errors.password} />
          </label>
          {pendingAdmin ? (
            <label className="block text-sm font-medium text-slate-700">
              Drugi faktor
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                className={inputClass(Boolean(fields.errors.code), "mt-1 tracking-widest")}
                value={code}
                onChange={(event) => {
                  fields.clear("code");
                  setCode(event.target.value);
                }}
              />
              <FieldError message={fields.errors.code} />
              <span className="mt-1 block text-xs font-normal text-slate-500">Jednokratna šifra iz aplikacije za autentifikaciju.</span>
            </label>
          ) : null}
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button type="submit" className="btn-primary w-full">
            {pendingAdmin ? "Potvrdi" : "Prijava"}
          </button>
          {pendingAdmin ? (
            <button
              type="button"
              className="w-full text-sm font-medium text-slate-500"
              onClick={() => {
                setPendingAdmin(null);
                setCode("");
                setError("");
                fields.clear();
              }}
            >
              Natrag
            </button>
          ) : null}
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          <p className="font-medium text-slate-600">Mockup računi</p>
          <p>Administrator: {MOCK_ADMIN_EMAIL}</p>
          <p>Zaposlenik: {MOCK_EMPLOYEE_EMAIL}</p>
          <p>Lozinka: {MOCK_PASSWORD}</p>
          <p>Drugi faktor administratora: {MOCK_MFA_CODE}</p>
        </div>
      </div>
    </div>
  );
}
