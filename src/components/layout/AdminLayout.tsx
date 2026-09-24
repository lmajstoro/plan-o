import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import {
  CalendarIcon,
  ClipboardIcon,
  LayersIcon,
  LogoutIcon,
  ResetIcon,
  TagIcon,
  UsersIcon,
} from "../icons";

const links = [
  { to: "/administrator", label: "Plan rada", icon: CalendarIcon, end: true },
  { to: "/administrator/radni-nalozi", label: "Radni nalozi", icon: LayersIcon, end: false },
  { to: "/administrator/zaposlenici", label: "Zaposlenici", icon: UsersIcon, end: false },
  { to: "/administrator/radne-skupine", label: "Radne skupine", icon: TagIcon, end: false },
  { to: "/administrator/zadaci", label: "Zadaci", icon: ClipboardIcon, end: false },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { reset } = useDb();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/prijava");
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      <p className="px-3 pb-1 pt-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Pregled</p>
      {links.slice(0, 1).map((link) => (
        <NavItem key={link.to} {...link} />
      ))}
      <p className="px-3 pb-1 pt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">Šifarnici</p>
      {links.slice(1).map((link) => (
        <NavItem key={link.to} {...link} />
      ))}
    </nav>
  );

  return (
    <>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-6 lg:hidden">
        <p className="max-w-sm text-center text-base font-medium text-slate-700">
          Administratorov pregled nije namijenjen za prikaz na mobitelu.
        </p>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          <LogoutIcon className="h-5 w-5" />
          Odjava
        </button>
      </div>
      <div className="hidden min-h-screen bg-slate-50 lg:flex">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
          <Brand />
          {nav}
          <SidebarFooter
            name={user?.name ?? ""}
            email={user?.email ?? ""}
            onReset={reset}
            onLogout={handleLogout}
          />
        </aside>
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-base font-bold text-white">P</div>
      <div>
        <div className="text-lg font-semibold leading-tight text-slate-900">Plan-O</div>
        <div className="text-sm text-slate-500">Čileri i dizalice topline</div>
      </div>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof CalendarIcon;
  end: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium ${
          isActive ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}

function SidebarFooter({
  name,
  email,
  onReset,
  onLogout,
}: {
  name: string;
  email: string;
  onReset: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="mt-auto space-y-2 border-t border-slate-100 p-3">
      <div className="px-2 py-1">
        <div className="text-base font-medium text-slate-800">{name}</div>
        <div className="truncate text-sm text-slate-500">{email}</div>
      </div>
      <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base text-slate-600 hover:bg-slate-50" onClick={onReset}>
        <ResetIcon className="h-5 w-5" />
        Vrati demo podatke
      </button>
      <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base text-slate-600 hover:bg-slate-50" onClick={onLogout}>
        <LogoutIcon className="h-5 w-5" />
        Odjava
      </button>
    </div>
  );
}
