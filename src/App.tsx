import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/profile/ProfilePage';
import DonorsListPage from './pages/DonorsListPage';
import OrganizationsListPage from './pages/OrganizationsListPage';
import VolunteersListPage from './pages/VolunteersListPage';
import DeliveryVerifyPage from './pages/DeliveryVerifyPage';

// Routes where Navbar and chat widget should NOT appear
const BARE_ROUTES = ['/delivery-verify'];

function AppShell() {
  const location = useLocation();
  const isBare = BARE_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      {!isBare && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/donors" element={<DonorsListPage />} />
          <Route path="/organizations" element={<OrganizationsListPage />} />
          <Route path="/volunteers" element={<VolunteersListPage />} />
          {/* Public delivery tracking page — no auth, no navbar */}
          <Route path="/delivery-verify" element={<DeliveryVerifyPage />} />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          {/*
            NO background color here — let index.css body styles handle it globally.
            This prevents component-level bg from fighting the dark class on <html>.
          */}
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
