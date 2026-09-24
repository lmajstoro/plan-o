import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

export function LoginPage() {
  const { user, login } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);

  if (user?.role === "admin") return <Navigate to="/administrator" replace />;
  if (user?.role === "zaposlenik") return <Navigate to="/zaposlenik" replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!role) return;
    login(role);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 font-bold text-white">P</div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Plan-O</h1>
            <p className="text-sm text-slate-500">Planiranje montaže i servisa čilera i dizalica topline</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <RoleButton
              label="Administrator"
              selected={role === "admin"}
              onClick={() => setRole("admin")}
            />
            <RoleButton
              label="Zaposlenik"
              selected={role === "zaposlenik"}
              onClick={() => setRole("zaposlenik")}
            />
          </div>
          <button type="submit" className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40" disabled={!role}>
            Prijava
          </button>
        </form>
      </div>
    </div>
  );
}

function RoleButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
        selected
          ? "border-blue-700 bg-blue-700 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
