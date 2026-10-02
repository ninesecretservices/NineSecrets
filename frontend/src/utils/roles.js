// Kept separate from AdminLayout.jsx on purpose: the storefront (header icon,
// login redirect) only needs this one list, not the admin panel's component
// code. Importing it from AdminLayout.jsx would pull that whole module into
// the main bundle and defeat lazy-loading it.
export const ADMIN_ROLES = ['superadmin', 'admin', 'fulfillment', 'catalog'];
