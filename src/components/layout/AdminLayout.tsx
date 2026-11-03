import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ToktaMark } from "../brand/ToktaMark";
import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import { APP_VERSION } from "../../lib/accounts";
import { pageName, pushAudit } from "../../lib/audit";
import { useDeviceMode } from "../../lib/device";
import { TabletPlanPage } from "../../pages/admin/TabletPlanPage";
import {
  BadgeIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
  LayersIcon,
  ListChecksIcon,
  LogoutIcon,
  QualityIcon,
  TabletIcon,
  TagIcon,
  TemplateIcon,
  UsersIcon,
} from "../icons";

const COLLAPSED_KEY = "plano-sidebar-collapsed";

const overviewLinks = [
  { to: "/administrator", label: "Plan rada", icon: CalendarIcon, end: true },
];

const securityLinks = [
  { to: "/administrator/evidencija", label: "Evidencija", icon: ListChecksIcon, end: false },
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
  const { update } = useDb();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const device = useDeviceMode();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");

  function toggleCollapsed() {
    setCollapsed((current) => {
      localStorage.setItem(COLLAPSED_KEY, current ? "0" : "1");
      return !current;
    });
  }

  function handleLogout() {
    if (user) {
      update((current) => pushAudit(current, { account: user.name, email: user.email, action: "Odjava", target: pageName(pathname) }));
    }
    logout();
    navigate("/prijava");
  }

  if (device === "tablet") return <TabletPlanPage />;

  if (device === "tablet-portrait") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
    <nav className="flex flex-col gap-1 px-3">
      <SectionLabel label="Pregled" collapsed={collapsed} first />
      {overviewLinks.map((link) => (
        <NavItem key={link.to} {...link} collapsed={collapsed} />
      ))}
      <SectionLabel label="Šifarnici" collapsed={collapsed} />
      <WorkOrdersNav collapsed={collapsed} />
      {catalogLinks.map((link) => (
        <NavItem key={link.to} {...link} collapsed={collapsed} />
      ))}
      <SectionLabel label="Sigurnost" collapsed={collapsed} />
      {securityLinks.map((link) => (
        <NavItem key={link.to} {...link} collapsed={collapsed} />
      ))}
    </nav>
  );

  return (
    <>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <p className="max-w-sm text-center text-base font-medium text-slate-700">
          Administratorov pregled nije namijenjen za prikaz na mobitelu.
        </p>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          <LogoutIcon className="h-5 w-5" />
          Odjava
        </button>
      </div>
      <div className="hidden h-dvh overflow-hidden bg-slate-50 lg:flex">
        <aside
          className={`relative flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out ${
            collapsed ? "w-[68px]" : "w-60"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col overflow-x-hidden whitespace-nowrap">
            <Brand collapsed={collapsed} />
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{nav}</div>
            <SidebarFooter
              name={user?.name ?? ""}
              email={user?.email ?? ""}
              collapsed={collapsed}
              onLogout={handleLogout}
            />
          </div>
          <CollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}

function fade(collapsed: boolean) {
  return `transition-opacity duration-200 ${collapsed ? "opacity-0" : "opacity-100"}`;
}

function conceal(collapsed: boolean) {
  return collapsed ? "sr-only" : "";
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
    <div className={`flex items-center py-5 ${collapsed ? "justify-center px-2" : "gap-3 pl-3.5 pr-4"}`}>
      <ToktaMark className="h-8 w-auto shrink-0" />
      <div className={`flex min-w-0 items-center gap-3 ${conceal(collapsed)}`}>
        <div className="h-6 w-px shrink-0 bg-slate-300" />
        <div className="text-lg font-extrabold leading-none tracking-wide text-tokta-900">TOKTA</div>
      </div>
    </div>
  );
}

function SectionLabel({ label, collapsed, first = false }: { label: string; collapsed: boolean; first?: boolean }) {
  return (
    <div className={`relative px-3 pb-1 ${first ? "pt-4" : "pt-5"}`}>
      <p className={`text-sm font-semibold uppercase tracking-wide text-slate-400 ${conceal(collapsed)}`}>{label}</p>
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
        `flex items-center rounded-lg px-3 text-base font-medium ${collapsed ? "justify-center" : "gap-3"} ${nested ? "py-2" : "py-2.5"} ${
          isActive || activeExtra ? "bg-tokta-50 text-tokta-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className={conceal(collapsed)}>{label}</span>
    </NavLink>
  );
}

function SidebarFooter({
  name,
  email,
  collapsed,
  onLogout,
}: {
  name: string;
  email: string;
  collapsed: boolean;
  onLogout: () => void;
}) {
  const buttonClass = `flex w-full items-center rounded-lg px-3 py-2.5 text-base text-slate-600 hover:bg-slate-50 ${
    collapsed ? "justify-center" : "gap-3"
  }`;
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="space-y-2 border-t border-slate-100 p-3">
      <div className={`flex items-center py-1 ${collapsed ? "justify-center" : "gap-3 pl-1"}`} title={collapsed ? `${name}\n${email}` : undefined}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
          {initials}
        </div>
        <div className={`min-w-0 ${conceal(collapsed)}`}>
          <div className="truncate text-sm font-medium text-slate-800">{name}</div>
          <div className="truncate text-sm text-slate-500">{email}</div>
        </div>
      </div>
      <p className={`px-3 text-xs text-slate-400 ${conceal(collapsed)}`}>Inačica {APP_VERSION}</p>
      <button type="button" className={buttonClass} title={collapsed ? "Odjava" : undefined} onClick={onLogout}>
        <LogoutIcon className="h-5 w-5 shrink-0" />
        <span className={conceal(collapsed)}>Odjava</span>
      </button>
    </div>
  );
}
