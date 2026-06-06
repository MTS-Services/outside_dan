import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import About from './pages/About';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import MyOrdersPanel from './pages/MyOrdersPanel';
import Impressum from './pages/Impressum';
import Datenschutz from './pages/Datenschutz';

import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminOrders from './pages/admin/AdminOrders';
import AdminMenu from './pages/admin/AdminMenu';
import AdminHomeCategories from './pages/admin/AdminHomeCategories';
import AdminGallery from './pages/admin/AdminGallery';
import AdminSubadmins from './pages/admin/AdminSubadmins';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminCustomerDetail from './pages/admin/AdminCustomerDetail';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProfile from './pages/admin/AdminProfile';
import AdminDeliveryZones from './pages/admin/AdminDeliveryZones';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminLegalPages from './pages/admin/AdminLegalPages';
import AdminR2O from './pages/admin/AdminR2O';
import AGB from './pages/AGB';

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:id" element={<OrderTracking />} />
        <Route path="/about" element={<About />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
        <Route path="/agb" element={<AGB />} />

        {/* Customer dashboard */}
        <Route path="/account" element={<Profile />}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="profile" element={null} />
          <Route path="orders" element={<MyOrdersPanel />} />
          <Route path="notifications" element={null} />
        </Route>
      </Route>

      {/* Admin (unified login at /login; AdminLayout itself enforces role) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="home-categories" element={<AdminHomeCategories />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="subadmins" element={<AdminSubadmins />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="customers/:id" element={<AdminCustomerDetail />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="delivery-zones" element={<AdminDeliveryZones />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="legal-pages" element={<AdminLegalPages />} />
        <Route path="r2o" element={<AdminR2O />} />
      </Route>
      {/* Legacy /admin/login alias → unified /login */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
