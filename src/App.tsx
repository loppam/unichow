import { Routes, Route, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmailVerification from "./pages/EmailVerification";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
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
import { AdminProvider } from "./contexts/AdminContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import RestaurantMenu from "./pages/RestaurantMenu";
import Explore from "./pages/Explore";
import CreateAdmin from "./pages/admin/CreateAdmin";
import { Toaster } from 'react-hot-toast';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminLayout from './components/AdminLayout';
import AdminOrders from './pages/admin/AdminOrders';
import UserManagement from './pages/admin/UserManagement';
import VerificationReview from './pages/admin/VerificationReview';
import PublicRestaurantMenu from './pages/PublicRestaurantMenu';
import { CartProvider } from './contexts/CartContext';
import UserOrders from './pages/UserOrders';
import RestaurantOrderView from './pages/RestaurantOrderView';
import RiderDashboard from "./pages/RiderDashboard";
import RiderOrders from "./pages/RiderOrders";
import RiderSettings from "./pages/RiderSettings";
import RiderEmailVerification from "./pages/RiderEmailVerification";
import RiderPending from "./pages/RiderPending";
import RiderVerificationReview from './pages/admin/RiderVerificationReview';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <ErrorBoundary>
        <AuthProvider>
          <AdminProvider>
            <NotificationProvider>
              <CartProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Welcome />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/restaurant/:id" element={<PublicRestaurantMenu />} />

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
                      <ProtectedRoute userType="restaurant" requireVerification={false}>
                        <RestaurantEmailVerification />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rider-verify-email"
                    element={
                      <ProtectedRoute userType="rider" requireVerification={false}>
                        <RiderEmailVerification />
                      </ProtectedRoute>
                    }
                  />

                  {/* User routes */}
                  <Route
                    path="/home"
                    element={
                      <ProtectedRoute userType="user">
                        <Home />
                      </ProtectedRoute>
                    }
                  />
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
                  <Route path="/orders" element={<UserOrders />} />

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
                      <ProtectedRoute userType="restaurant" requireVerification={true}>
                        <RestaurantPending />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/restaurant/orders/:orderId"
                    element={
                      <ProtectedRoute userType="restaurant">
                        <RestaurantOrderView />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rider routes */}
                  <Route
                    path="/rider-dashboard"
                    element={
                      <ProtectedRoute userType="rider">
                        <RiderDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rider-orders"
                    element={
                      <ProtectedRoute userType="rider">
                        <RiderOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rider-settings"
                    element={
                      <ProtectedRoute userType="rider">
                        <RiderSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rider-pending"
                    element={
                      <ProtectedRoute userType="rider" requireVerification={true}>
                        <RiderPending />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin routes */}
                  <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
                    <Route
                      index
                      element={
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="orders"
                      element={
                        <AdminRoute>
                          <AdminOrders />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="users"
                      element={
                        <AdminRoute requireSuperAdmin={true}>
                          <UserManagement />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <AdminRoute>
                          <AdminSettings />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="analytics"
                      element={
                        <AdminRoute>
                          <AdminAnalytics />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="users/create"
                      element={
                        <AdminRoute requireSuperAdmin={true}>
                          <CreateAdmin />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="verification"
                      element={
                        <AdminRoute>
                          <VerificationReview />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="rider-verification"
                      element={
                        <AdminRoute>
                          <RiderVerificationReview />
                        </AdminRoute>
                      }
                    />
                  </Route>
                </Routes>
              </CartProvider>
            </NotificationProvider>
          </AdminProvider>
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;
