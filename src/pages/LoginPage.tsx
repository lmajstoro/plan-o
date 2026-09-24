import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEMO_ACCOUNTS } from "../data/seed";

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  if (user?.role === "admin") return <Navigate to="/administrator" replace />;
  if (user?.role === "zaposlenik") return <Navigate to="/zaposlenik" replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = login(email, password);
    if (!ok) setError("Pogrešan e-mail ili lozinka.");
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
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Lozinka</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="btn-primary w-full">
            Prijava
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="mb-2 font-semibold text-slate-700">Demo korisnici</p>
          <p>
            Administrator: <span className="font-medium">{DEMO_ACCOUNTS[0].email}</span>
          </p>
          <p>
            Zaposlenik: <span className="font-medium">{DEMO_ACCOUNTS[1].email}</span>
          </p>
          <p className="mt-1">Lozinka za oba: <span className="font-medium">demo123</span></p>
        </div>
      </div>
    </div>
  );
}
