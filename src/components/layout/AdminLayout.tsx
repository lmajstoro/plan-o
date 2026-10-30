import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  QualityIcon,
  ResetIcon,
  TabletIcon,
  TagIcon,
  TemplateIcon,
  UsersIcon,
} from "../icons";

const COLLAPSED_KEY = "plano-sidebar-collapsed";

const overviewLinks = [
  { to: "/administrator", label: "Plan rada", icon: CalendarIcon, end: true },
];

const catalogLinks = [
  { to: "/administrator/zadaci", label: "Zadaci", icon: ClipboardIcon, end: false },
  { to: "/administrator/zaposlenici", label: "Zaposlenici", icon: UsersIcon, end: false },
  { to: "/administrator/uloge", label: "Uloge", icon: BadgeIcon, end: false },
  { to: "/administrator/radne-skupine", label: "Radne skupine", icon: TagIcon, end: false },
  { to: "/administrator/kontrola-kvalitete", label: "Kontrola kvalitete", icon: QualityIcon, end: false },
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
          className={`relative flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out ${
            collapsed ? "w-[68px]" : "w-60"
          }`}
        >
          <div className="flex flex-1 flex-col overflow-hidden whitespace-nowrap">
            <Brand collapsed={collapsed} />
            {nav}
            <SidebarFooter
              name={user?.name ?? ""}
              email={user?.email ?? ""}
              collapsed={collapsed}
              onReset={reset}
              onLogout={handleLogout}
            />
          </div>
          <CollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        </aside>
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </>
  );
}

function fade(collapsed: boolean) {
  return `transition-opacity duration-200 ${collapsed ? "opacity-0" : "opacity-100"}`;
}

function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const label = collapsed ? "Proširi izbornik" : "Sklopi izbornik";
  return (
    <button
      type="button"
      className="absolute -right-3 top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-800"
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      {collapsed ? <ChevronRightIcon className="h-3.5 w-3.5" /> : <ChevronLeftIcon className="h-3.5 w-3.5" />}
    </button>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 py-5 pl-3.5 pr-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-base font-bold text-white">P</div>
      <div className={`min-w-0 ${fade(collapsed)}`}>
        <div className="text-lg font-semibold leading-tight text-slate-900">Plan-O</div>
        <div className="truncate text-sm text-slate-500">Čileri i dizalice topline</div>
      </div>
    </div>
  );
}

function SectionLabel({ label, collapsed, first = false }: { label: string; collapsed: boolean; first?: boolean }) {
  return (
    <div className={`relative px-3 pb-1 ${first ? "pt-4" : "pt-5"}`}>
      <p className={`text-sm font-semibold uppercase tracking-wide text-slate-400 ${fade(collapsed)}`}>{label}</p>
      <div className={`absolute inset-x-2 bottom-3 border-t border-slate-200 ${fade(!collapsed)}`} />
    </div>
  );
}

function WorkOrdersNav({ collapsed }: { collapsed: boolean }) {
  const { pathname } = useLocation();
  const orderOpen = pathname.startsWith("/administrator/radni-nalozi/") && !pathname.startsWith("/administrator/radni-nalozi/predlosci");
  return (
    <div>
      <NavItem to="/administrator/radni-nalozi" label="Radni nalozi" icon={LayersIcon} end activeExtra={orderOpen} collapsed={collapsed} />
      <div
        className={`border-l transition-[margin,padding,border-color] duration-200 ${
          collapsed ? "ml-0 border-transparent pl-0" : "ml-5 border-slate-200 pl-1"
        }`}
      >
        <NavItem to="/administrator/radni-nalozi/predlosci" label="Predlošci" icon={TemplateIcon} end nested collapsed={collapsed} />
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
  activeExtra = false,
}: {
  to: string;
  label: string;
  icon: typeof CalendarIcon;
  end: boolean;
  nested?: boolean;
  collapsed: boolean;
  activeExtra?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 text-base font-medium ${nested ? "py-2" : "py-2.5"} ${
          isActive || activeExtra ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className={fade(collapsed)}>{label}</span>
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
  const buttonClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base text-slate-600 hover:bg-slate-50";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="mt-auto space-y-2 border-t border-slate-100 p-3">
      <div className="flex items-center gap-3 py-1 pl-1" title={collapsed ? `${name}\n${email}` : undefined}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
          {initials}
        </div>
        <div className={`min-w-0 ${fade(collapsed)}`}>
          <div className="truncate text-sm font-medium text-slate-800">{name}</div>
          <div className="truncate text-sm text-slate-500">{email}</div>
        </div>
      </div>
      <button type="button" className={buttonClass} title={collapsed ? "Vrati demo podatke" : undefined} onClick={onReset}>
        <ResetIcon className="h-5 w-5 shrink-0" />
        <span className={fade(collapsed)}>Vrati demo podatke</span>
      </button>
      <button type="button" className={buttonClass} title={collapsed ? "Odjava" : undefined} onClick={onLogout}>
        <LogoutIcon className="h-5 w-5 shrink-0" />
        <span className={fade(collapsed)}>Odjava</span>
      </button>
    </div>
  );
}
