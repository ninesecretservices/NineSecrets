import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Collection from './pages/Collection';
import Login from './pages/Login';
import Checkout from './pages/Checkout';
import StorefrontLayout from './components/StorefrontLayout';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Wishlist from './pages/Wishlist';
import OrderSuccess from './pages/OrderSuccess';
import Account from './pages/Account';
import { FitGuide, About, Contact, Policies, NotFound } from './pages/StaticPages';
import { PrivacyPolicy, ReturnPolicy, ShippingPolicy, TermsOfService } from './pages/LegalPages';
import Cart from './pages/Cart';

// Admin is a separate app-within-the-app that only staff ever load — splitting
// it out of the main bundle means a shopper never downloads the admin panel's
// JS (bulk-import's xlsx dependency, every management page) just to browse
// the storefront.
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Products = lazy(() => import('./pages/admin/Products'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const Returns = lazy(() => import('./pages/admin/Returns'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Coupons = lazy(() => import('./pages/admin/Coupons'));
const Homepage = lazy(() => import('./pages/admin/Homepage'));
const StoreSettings = lazy(() => import('./pages/admin/StoreSettings'));
const StockImport = lazy(() => import('./pages/admin/StockImport'));
const ProductImport = lazy(() => import('./pages/admin/ProductImport'));
const Users = lazy(() => import('./pages/admin/Users'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));

// MasterDataViews exports several small named components from one file —
// each still gets its own lazy() so routing picks only the one it needs, but
// they share a single chunk since they come from the same module.
const lazyNamed = (name) => lazy(() => import('./pages/admin/MasterDataViews').then((m) => ({ default: m[name] })));
const Departments = lazyNamed('Departments');
const Items = lazyNamed('Items');
const Designs = lazyNamed('Designs');
const Fabrics = lazyNamed('Fabrics');
const Fits = lazyNamed('Fits');
const Sizes = lazyNamed('Sizes');
const Colours = lazyNamed('Colours');
const DescriptionTemplates = lazyNamed('DescriptionTemplates');

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-mauve">
      Loading admin…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Storefront Routes */}
        <Route path="/" element={<StorefrontLayout />}>
          <Route index element={<Home />} />
          <Route path="collection" element={<Collection />} />
          <Route path="bestsellers" element={<Collection />} />
          <Route path="product/:slug" element={<ProductDetail />} />
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="account" element={<Account />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-success/:orderNumber" element={<OrderSuccess />} />
          <Route path="cart" element={<Cart />} />
          <Route path="blog" element={<Navigate to="/" replace />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="return-policy" element={<ReturnPolicy />} />
          <Route path="shipping-policy" element={<ShippingPolicy />} />
          <Route path="terms-of-service" element={<TermsOfService />} />
          <Route path="fit-guide" element={<FitGuide />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="policies" element={<Policies />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin Routes (guarded inside AdminLayout) — lazy-loaded as a group */}
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="returns" element={<Returns />} />
          <Route path="customers" element={<Customers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="homepage" element={<Homepage />} />
          <Route path="store-settings" element={<StoreSettings />} />
          <Route path="stock-import" element={<StockImport />} />
          <Route path="product-import" element={<ProductImport />} />
          <Route path="users" element={<Users />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="departments" element={<Departments />} />
          <Route path="items" element={<Items />} />
          <Route path="designs" element={<Designs />} />
          <Route path="description-templates" element={<DescriptionTemplates />} />
          <Route path="colours" element={<Colours />} />
          <Route path="fabrics" element={<Fabrics />} />
          <Route path="fits" element={<Fits />} />
          <Route path="sizes" element={<Sizes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
