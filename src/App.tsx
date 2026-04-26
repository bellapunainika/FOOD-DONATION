import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AIChatWidget from './components/AIChatWidget';
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

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          {/* 
            NO background color here — let index.css body styles handle it globally.
            This prevents component-level bg from fighting the dark class on <html>.
          */}
          <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/donors" element={<DonorsListPage />} />
                <Route path="/organizations" element={<OrganizationsListPage />} />
                <Route path="/volunteers" element={<VolunteersListPage />} />

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
            <AIChatWidget />
            <Toaster position="top-right" />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
