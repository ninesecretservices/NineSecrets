import { useState } from 'react';
import { Outlet, NavLink, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, LogOut, Store,
  Building2, Shirt, PenTool, Palette, Layers, Ruler, Scaling, Tag, Image, Settings, FileSpreadsheet,
  PanelLeftClose, PanelLeftOpen, FileText,
} from 'lucide-react';
import useStore from '../store/useStore';

const NAV_SECTIONS = [
  {
    title: null,
    links: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Shop',
    links: [
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { to: '/admin/coupons', label: 'Coupons', icon: Tag },
      { to: '/admin/stock-import', label: 'Stock Import', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Website',
    links: [
      { to: '/admin/homepage', label: 'Homepage', icon: Image, superadminOnly: true },
      { to: '/admin/store-settings', label: 'Store Settings', icon: Settings, superadminOnly: true },
    ],
  },
  {
    title: 'Product Options',
    links: [
      { to: '/admin/departments', label: 'Departments', icon: Building2 },
      { to: '/admin/items', label: 'Categories', icon: Shirt },
      { to: '/admin/colours', label: 'Colours', icon: Palette },
      { to: '/admin/sizes', label: 'Sizes', icon: Ruler },
      { to: '/admin/fits', label: 'Fits', icon: Scaling },
      { to: '/admin/fabrics', label: 'Fabrics', icon: Layers },
      { to: '/admin/designs', label: 'Designs', icon: PenTool },
      { to: '/admin/description-templates', label: 'Description Templates', icon: FileText },
    ],
  },
  {
    title: 'Team',
    links: [{ to: '/admin/users', label: 'Staff Accounts', icon: Users, superadminOnly: true }],
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

  // Guard: must be logged in as admin/superadmin
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'superadmin') return <Navigate to="/" replace />;

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
            <div>
              <h2 className="text-base font-bold uppercase tracking-[0.12em] text-cream">Nine Secrets</h2>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-cream/50">Admin Panel</p>
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
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && !collapsed && (
                <div className="px-4 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/40">
                  {section.title}
                </div>
              )}
              {section.title && collapsed && <div className="my-3 h-px bg-white/10" />}
              {section.links
                .filter((l) => !l.superadminOnly || user.role === 'superadmin')
                .map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={linkClass} title={collapsed ? label : undefined}>
                    <Icon size={collapsed ? 18 : 16} strokeWidth={1.5} className="flex-shrink-0" />
                    {!collapsed && label}
                  </NavLink>
                ))}
            </div>
          ))}
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
    </div>
  );
}
