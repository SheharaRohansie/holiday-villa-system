import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import GuestDashboard from './pages/GuestDashboard';
import VillaDetails from './pages/VillaDetails';
import { useAuth } from './context/AuthContext';

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      <Routes>
        {/* Public routes with Navbar */}
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <HomePage />
            </>
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={
                user.role === 'ADMIN' ? '/admin/dashboard' :
                user.role === 'STAFF' ? '/staff/dashboard' :
                '/guest/dashboard'
              } replace />
            ) : (
              <>
                <Navbar />
                <LoginPage />
              </>
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/guest/dashboard" replace /> : (
              <>
                <Navbar />
                <RegisterPage />
              </>
            )
          }
        />

        {/* Villa Details — public */}
        <Route
          path="/villas/:id"
          element={
            <>
              <Navbar />
              <VillaDetails />
            </>
          }
        />

        {/* Protected dashboard routes (no top Navbar - sidebar handles nav) */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute roles={['STAFF']}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guest/dashboard"
          element={
            <ProtectedRoute roles={['GUEST']}>
              <GuestDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App;
