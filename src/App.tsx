import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAdmin, RequireEmployee } from "./components/auth/Guards";
import { AdminLayout } from "./components/layout/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { PlanRadaPage } from "./pages/admin/PlanRadaPage";
import { RadneSkupinePage } from "./pages/admin/RadneSkupinePage";
import { RadniNaloziPage } from "./pages/admin/RadniNaloziPage";
import { ZadaciPage } from "./pages/admin/ZadaciPage";
import { ZaposleniciPage } from "./pages/admin/ZaposleniciPage";
import { EmployeeDayPage } from "./pages/zaposlenik/EmployeeDayPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/prijava" replace />} />
      <Route path="/prijava" element={<LoginPage />} />
      <Route
        path="/administrator"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<PlanRadaPage />} />
        <Route path="zaposlenici" element={<ZaposleniciPage />} />
        <Route path="radne-skupine" element={<RadneSkupinePage />} />
        <Route path="zadaci" element={<ZadaciPage />} />
        <Route path="radni-nalozi" element={<RadniNaloziPage />} />
      </Route>
      <Route
        path="/zaposlenik"
        element={
          <RequireEmployee>
            <EmployeeDayPage />
          </RequireEmployee>
        }
      />
      <Route path="*" element={<Navigate to="/prijava" replace />} />
    </Routes>
  );
}
