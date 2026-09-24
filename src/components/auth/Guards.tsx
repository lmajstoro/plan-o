import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { ReactNode } from "react";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/prijava" replace />;
  if (user.role !== "admin") return <Navigate to="/zaposlenik" replace />;
  return children;
}

export function RequireEmployee({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/prijava" replace />;
  if (user.role !== "zaposlenik") return <Navigate to="/administrator" replace />;
  return children;
}
