import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import { sameEmail } from "../../lib/accounts";

function Kick() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return null;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { db } = useDb();
  if (!user) return <Navigate to="/prijava" replace />;
  if (user.role !== "admin") return <Navigate to="/zaposlenik" replace />;
  const admin = db.administrators.find((row) => sameEmail(row.email, user.email));
  if (!admin || admin.locked) return <Kick />;
  if (!admin.rulesAcceptedAt) return <Navigate to="/pravila" replace />;
  return children;
}

export function RequireEmployee({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { db } = useDb();
  if (!user) return <Navigate to="/prijava" replace />;
  if (user.role !== "zaposlenik") return <Navigate to="/administrator" replace />;
  const employee = db.employees.find((row) => sameEmail(row.email, user.email));
  if (!employee || !employee.active || !employee.passwordSet || employee.locked) return <Kick />;
  if (!employee.rulesAcceptedAt) return <Navigate to="/pravila" replace />;
  return children;
}
