import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmailVerification from "./pages/EmailVerification";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Restaurant from "./pages/Restaurant";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Profile from "./pages/Profile";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import RestaurantOrders from "./pages/RestaurantOrders";
import RestaurantSettings from "./pages/RestaurantSettings";
import RestaurantPending from "./pages/RestaurantPending";
import RestaurantEmailVerification from "./pages/RestaurantEmailVerification";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRestaurants from "./pages/AdminRestaurants";
import { AdminProvider } from "./contexts/AdminContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import VerificationReview from "./pages/admin/VerificationReview";
import RestaurantMenu from "./pages/RestaurantMenu";
import Explore from "./pages/Explore";
import CreateAdmin from "./pages/admin/CreateAdmin";
import UserManagement from "./pages/admin/UserManagement";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminProvider>
          <NotificationProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Email verification routes */}
              <Route
                path="/verify-email"
                element={
                  <ProtectedRoute userType="user" requireVerification={false}>
                    <EmailVerification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/restaurant-verify-email"
                element={
                  <ProtectedRoute
                    userType="restaurant"
                    requireVerification={false}
                  >
                    <RestaurantEmailVerification />
                  </ProtectedRoute>
                }
              />

              {/* Customer routes */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute userType="user">
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route path="/explore" element={<Explore />} />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute userType="user">
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute userType="user">
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Restaurant routes */}
              <Route
                path="/restaurant-dashboard"
                element={
                  <ProtectedRoute userType="restaurant">
                    <RestaurantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/restaurant-orders"
                element={
                  <ProtectedRoute userType="restaurant">
                    <RestaurantOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/restaurant-menu"
                element={
                  <ProtectedRoute userType="restaurant">
                    <RestaurantMenu />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/restaurant-settings"
                element={
                  <ProtectedRoute userType="restaurant">
                    <RestaurantSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/restaurant-pending"
                element={
                  <ProtectedRoute
                    userType="restaurant"
                    requireVerification={true}
                  >
                    <RestaurantPending />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/restaurants"
                element={
                  <AdminRoute>
                    <AdminRestaurants />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute userType="admin" requireVerification={false}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/verifications"
                element={
                  <ProtectedRoute userType="admin" requireVerification={false}>
                    <VerificationReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/create"
                element={
                  <AdminRoute requireSuperAdmin={true}>
                    <CreateAdmin />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute requireSuperAdmin={true}>
                    <UserManagement />
                  </AdminRoute>
                }
              />
            </Routes>
          </NotificationProvider>
        </AdminProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
