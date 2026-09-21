import { useState } from 'react';
import { Outlet, NavLink, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, LogOut, Store,
  Building2, Shirt, PenTool, Palette, Layers, Ruler, Scaling, Tag, Image, Settings, FileSpreadsheet,
  PanelLeftClose, PanelLeftOpen, FileText, History, RotateCcw, UserRound, BarChart3, Upload,
} from 'lucide-react';
import useStore from '../store/useStore';
import Toaster from './Toaster';

// Staff roles that can reach the admin panel at all. 'fulfillment' and 'catalog'
// are scoped-down staff roles (see backend/schema/User.js) — every nav link below
// carries a `roles` allow-list; a link with no `roles` is visible to all four.
export const ADMIN_ROLES = ['superadmin', 'admin', 'fulfillment', 'catalog'];
const CATALOG_ROLES = ['superadmin', 'admin', 'catalog'];
const FULFILLMENT_ROLES = ['superadmin', 'admin', 'fulfillment'];

const NAV_SECTIONS = [
  {
    title: null,
    links: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Shop',
    links: [
      { to: '/admin/products', label: 'Products', icon: Package, roles: CATALOG_ROLES },
      { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, roles: FULFILLMENT_ROLES },
      { to: '/admin/returns', label: 'Returns & Exchanges', icon: RotateCcw, roles: FULFILLMENT_ROLES },
      { to: '/admin/coupons', label: 'Coupons', icon: Tag, roles: ['superadmin', 'admin'] },
      { to: '/admin/stock-import', label: 'Stock Import', icon: FileSpreadsheet, roles: CATALOG_ROLES },
      { to: '/admin/product-import', label: 'Product Import', icon: Upload, roles: CATALOG_ROLES },
      { to: '/admin/customers', label: 'Customers', icon: UserRound, roles: ['superadmin', 'admin'] },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['superadmin', 'admin'] },
    ],
  },
  {
    title: 'Website',
    links: [
      { to: '/admin/homepage', label: 'Homepage', icon: Image, roles: ['superadmin'] },
      { to: '/admin/store-settings', label: 'Store Settings', icon: Settings, roles: ['superadmin'] },
    ],
  },
  {
    title: 'Product Options',
    links: [
      { to: '/admin/departments', label: 'Departments', icon: Building2, roles: CATALOG_ROLES },
      { to: '/admin/items', label: 'Categories', icon: Shirt, roles: CATALOG_ROLES },
      { to: '/admin/colours', label: 'Colours', icon: Palette, roles: CATALOG_ROLES },
      { to: '/admin/sizes', label: 'Sizes', icon: Ruler, roles: CATALOG_ROLES },
      { to: '/admin/fits', label: 'Fits', icon: Scaling, roles: CATALOG_ROLES },
      { to: '/admin/fabrics', label: 'Fabrics', icon: Layers, roles: CATALOG_ROLES },
      { to: '/admin/designs', label: 'Designs', icon: PenTool, roles: CATALOG_ROLES },
      { to: '/admin/description-templates', label: 'Description Templates', icon: FileText, roles: CATALOG_ROLES },
    ],
  },
  {
    title: 'Team',
    links: [
      { to: '/admin/users', label: 'Staff Accounts', icon: Users, roles: ['superadmin'] },
      { to: '/admin/audit-log', label: 'Activity Log', icon: History, roles: ['superadmin'] },
    ],
  },
];

const ALL_LINKS = NAV_SECTIONS.flatMap((s) => s.links);

export default function AdminLayout() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adminSidebar') === 'collapsed');

  const currentPage =
    ALL_LINKS.find((l) => l.to === location.pathname) ||
    ALL_LINKS.find((l) => l.to !== '/admin' && location.pathname.startsWith(l.to));

  // Guard: must be logged in as staff
  if (!user) return <Navigate to="/login" replace />;
  if (!ADMIN_ROLES.includes(user.role)) return <Navigate to="/" replace />;

  // Guard: a scoped role (fulfillment/catalog) hitting a page outside its
  // section by direct URL — not just a hidden nav link — bounces to the
  // dashboard, which every staff role can see.
  if (currentPage?.roles && !currentPage.roles.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  const toggleSidebar = () => {
    setCollapsed((c) => {
      localStorage.setItem('adminSidebar', c ? 'open' : 'collapsed');
      return !c;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `mb-1 flex items-center rounded-lg text-[13px] font-medium transition-colors ${
      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2'
    } ${isActive ? 'bg-cream text-ink' : 'text-cream/80 hover:bg-white/10'}`;

  return (
    // h-screen + overflow-hidden: sidebar and content scroll independently.
    <div className="flex h-screen overflow-hidden bg-cream font-body text-ink">
      {/* Sidebar */}
      <aside
        className={`flex flex-shrink-0 flex-col bg-ink text-cream transition-[width] duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}
      >
        <div className={`flex items-center border-b border-white/10 ${collapsed ? 'justify-center p-4' : 'justify-between p-6'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <img src="/logo-icon.png" alt="" className="h-8 w-8 flex-shrink-0" />
              <div>
                <h2 className="text-base font-bold uppercase tracking-[0.12em] text-cream">Nine Secrets</h2>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-cream/50">Admin Panel</p>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1.5 text-cream/70 transition-colors hover:bg-white/10 hover:text-cream"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Sidebar scrolls on its own (scrollbar hidden — it's short) */}
        <nav className={`no-scrollbar flex-grow overflow-y-auto py-6 ${collapsed ? 'px-2.5' : 'px-4'}`}>
          {NAV_SECTIONS.map((section, si) => {
            const visibleLinks = section.links.filter((l) => !l.roles || l.roles.includes(user.role));
            if (visibleLinks.length === 0) return null;
            return (
            <div key={si}>
              {section.title && !collapsed && (
                <div className="px-4 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/40">
                  {section.title}
                </div>
              )}
              {section.title && collapsed && <div className="my-3 h-px bg-white/10" />}
              {visibleLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={linkClass} title={collapsed ? label : undefined}>
                  <Icon size={collapsed ? 18 : 16} strokeWidth={1.5} className="flex-shrink-0" />
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
            );
          })}
        </nav>

        <div className={`space-y-2 border-t border-white/10 ${collapsed ? 'p-2.5' : 'p-4'}`}>
          <Link
            to="/"
            className={`flex items-center rounded-lg text-[13px] font-medium text-cream/80 transition-colors hover:bg-white/10 ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2'
            }`}
            title={collapsed ? 'View Storefront' : undefined}
          >
            <Store size={collapsed ? 18 : 16} strokeWidth={1.5} className="flex-shrink-0" />
            {!collapsed && 'View Storefront'}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center rounded-lg bg-blush/20 text-[13px] font-medium text-blush transition-colors hover:bg-blush/30 ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2'
            }`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={collapsed ? 18 : 16} strokeWidth={1.5} className="flex-shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content Area — its own scroll container */}
      <main className="flex min-w-0 flex-grow flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-beige bg-white px-8">
          <p className="text-sm text-mauve">
            Admin{currentPage && <span className="text-ink"> / <span className="font-semibold">{currentPage.label}</span></span>}
          </p>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight text-ink">{user.name}</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-mauve">{user.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blush font-bold text-ink">
              {(user.name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
