import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Collection from './pages/Collection';
import Login from './pages/Login';
import Checkout from './pages/Checkout';
import AdminLayout from './components/AdminLayout';
import StorefrontLayout from './components/StorefrontLayout';
import { Departments, Items, Designs, Fabrics, Fits, Sizes, Colours, DescriptionTemplates } from './pages/admin/MasterDataViews';
import Products from './pages/admin/Products';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import Users from './pages/admin/Users';
import Coupons from './pages/admin/Coupons';
import Homepage from './pages/admin/Homepage';
import StoreSettings from './pages/admin/StoreSettings';
import StockImport from './pages/admin/StockImport';
import ProductImport from './pages/admin/ProductImport';
import AuditLog from './pages/admin/AuditLog';
import Returns from './pages/admin/Returns';
import Customers from './pages/admin/Customers';
import Reports from './pages/admin/Reports';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Wishlist from './pages/Wishlist';
import OrderSuccess from './pages/OrderSuccess';
import Account from './pages/Account';
import { FitGuide, About, Policies, NotFound } from './pages/StaticPages';
import { PrivacyPolicy, ReturnPolicy, ShippingPolicy, TermsOfService, Blog } from './pages/LegalPages';
import Cart from './pages/Cart';

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
          <Route path="blog" element={<Blog />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="return-policy" element={<ReturnPolicy />} />
          <Route path="shipping-policy" element={<ShippingPolicy />} />
          <Route path="terms-of-service" element={<TermsOfService />} />
          <Route path="fit-guide" element={<FitGuide />} />
          <Route path="about" element={<About />} />
          <Route path="policies" element={<Policies />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin Routes (guarded inside AdminLayout) */}
        <Route path="/admin" element={<AdminLayout />}>
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
