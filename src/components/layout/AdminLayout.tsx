import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import { useDeviceMode } from "../../lib/device";
import { TabletPlanPage } from "../../pages/admin/TabletPlanPage";
import {
  BadgeIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
  LayersIcon,
  LogoutIcon,
  ResetIcon,
  TabletIcon,
  TagIcon,
  TemplateIcon,
  UsersIcon,
} from "../icons";

const COLLAPSED_KEY = "plano-sidebar-collapsed";

const overviewLinks = [
  { to: "/administrator", label: "Plan rada", icon: CalendarIcon, end: true },
  { to: "/administrator/tablet-pregled", label: "Tablet prikaz", icon: TabletIcon, end: false },
];

const catalogLinks = [
  { to: "/administrator/zadaci", label: "Zadaci", icon: ClipboardIcon, end: false },
  { to: "/administrator/zaposlenici", label: "Zaposlenici", icon: UsersIcon, end: false },
  { to: "/administrator/uloge", label: "Uloge", icon: BadgeIcon, end: false },
  { to: "/administrator/radne-skupine", label: "Radne skupine", icon: TagIcon, end: false },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { reset } = useDb();
  const navigate = useNavigate();
  const device = useDeviceMode();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");

  function toggleCollapsed() {
    setCollapsed((current) => {
      localStorage.setItem(COLLAPSED_KEY, current ? "0" : "1");
      return !current;
    });
  }

  function handleLogout() {
    logout();
    navigate("/prijava");
  }

  if (device === "tablet") return <TabletPlanPage />;

  if (device === "tablet-portrait") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-6">
        <TabletIcon className="h-14 w-14 text-slate-400" />
        <p className="max-w-sm text-center text-lg font-medium text-slate-700">
          Okreni tablet u položeni način za rad na planu.
        </p>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          <LogoutIcon className="h-5 w-5" />
          Odjava
        </button>
      </div>
    );
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      <SectionLabel label="Pregled" collapsed={collapsed} first />
      {overviewLinks.map((link) => (
        <NavItem key={link.to} {...link} collapsed={collapsed} />
      ))}
      <SectionLabel label="Šifarnici" collapsed={collapsed} />
      <WorkOrdersNav collapsed={collapsed} />
      {catalogLinks.map((link) => (
        <NavItem key={link.to} {...link} collapsed={collapsed} />
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
        <aside
          className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${
            collapsed ? "w-[72px]" : "w-60"
          }`}
        >
          <Brand collapsed={collapsed} onToggle={toggleCollapsed} />
          {nav}
          <SidebarFooter
            name={user?.name ?? ""}
            email={user?.email ?? ""}
            collapsed={collapsed}
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

function Brand({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const toggleLabel = collapsed ? "Proširi izbornik" : "Sklopi izbornik";
  return (
    <div className={`relative flex items-center gap-3 py-5 ${collapsed ? "justify-center" : "px-5"}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-base font-bold text-white">P</div>
      {collapsed ? null : (
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-tight text-slate-900">Plan-O</div>
          <div className="truncate text-sm text-slate-500">Čileri i dizalice topline</div>
        </div>
      )}
      <button
        type="button"
        className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-800"
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={onToggle}
      >
        {collapsed ? <ChevronRightIcon className="h-3.5 w-3.5" /> : <ChevronLeftIcon className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function SectionLabel({ label, collapsed, first = false }: { label: string; collapsed: boolean; first?: boolean }) {
  if (collapsed) return <div className={`mx-2 border-t border-slate-100 ${first ? "mb-1" : "my-2"}`} />;
  return (
    <p className={`px-3 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-400 ${first ? "pt-4" : "pt-5"}`}>{label}</p>
  );
}

function WorkOrdersNav({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <>
        <NavItem to="/administrator/radni-nalozi" label="Radni nalozi" icon={LayersIcon} end collapsed />
        <NavItem to="/administrator/radni-nalozi/predlosci" label="Predlošci" icon={TemplateIcon} end collapsed />
      </>
    );
  }
  return (
    <div>
      <NavItem to="/administrator/radni-nalozi" label="Radni nalozi" icon={LayersIcon} end collapsed={false} />
      <div className="ml-5 border-l border-slate-200 pl-1">
        <NavItem to="/administrator/radni-nalozi/predlosci" label="Predlošci" icon={TemplateIcon} end nested collapsed={false} />
      </div>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  nested = false,
  collapsed,
}: {
  to: string;
  label: string;
  icon: typeof CalendarIcon;
  end: boolean;
  nested?: boolean;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-lg text-base font-medium ${
          collapsed ? "justify-center py-2.5" : `gap-3 px-3 ${nested ? "py-2" : "py-2.5"}`
        } ${isActive ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {collapsed ? null : label}
    </NavLink>
  );
}

function SidebarFooter({
  name,
  email,
  collapsed,
  onReset,
  onLogout,
}: {
  name: string;
  email: string;
  collapsed: boolean;
  onReset: () => void;
  onLogout: () => void;
}) {
  const buttonClass = `flex w-full items-center rounded-lg py-2.5 text-base text-slate-600 hover:bg-slate-50 ${
    collapsed ? "justify-center" : "gap-2 px-3"
  }`;
  return (
    <div className="mt-auto space-y-2 border-t border-slate-100 p-3">
      {collapsed ? (
        <div
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
          title={`${name}\n${email}`}
        >
          {name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </div>
      ) : (
        <div className="px-2 py-1">
          <div className="text-base font-medium text-slate-800">{name}</div>
          <div className="truncate text-sm text-slate-500">{email}</div>
        </div>
      )}
      <button
        type="button"
        className={buttonClass}
        title={collapsed ? "Vrati demo podatke" : undefined}
        aria-label="Vrati demo podatke"
        onClick={onReset}
      >
        <ResetIcon className="h-5 w-5 shrink-0" />
        {collapsed ? null : "Vrati demo podatke"}
      </button>
      <button type="button" className={buttonClass} title={collapsed ? "Odjava" : undefined} aria-label="Odjava" onClick={onLogout}>
        <LogoutIcon className="h-5 w-5 shrink-0" />
        {collapsed ? null : "Odjava"}
      </button>
    </div>
  );
}

