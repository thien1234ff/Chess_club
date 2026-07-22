import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import SandboxBanner from './components/common/SandboxBanner';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Community from './pages/Community';
import Coaches from './pages/Coaches';
import Tournaments from './pages/Tournaments';
import Clubs from './pages/Clubs';
import Learn from './pages/Learn';
import Rankings from './pages/Rankings';
import Messaging from './pages/Messaging';
import AdminDashboard from './pages/AdminDashboard';
import ProfileSetup from './pages/ProfileSetup';

// Guard component to redirect users who haven't completed setup
const ProfileSetupGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (currentUser?.needsSetup && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-charcoal text-ivory font-sans">
            {/* Developer Banner for sandbox sandboxing indicator */}
            <SandboxBanner />
            
            {/* Header Navbar */}
            <Navbar />

            {/* Main view container */}
            <main className="flex-grow">
              <ProfileSetupGuard>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile-setup" element={<ProfileSetup />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/coaches" element={<Coaches />} />
                  <Route path="/coaches/:id" element={<Coaches />} />
                  <Route path="/tournaments" element={<Tournaments />} />
                  <Route path="/tournaments/:id" element={<Tournaments />} />
                  <Route path="/clubs" element={<Clubs />} />
                  <Route path="/clubs/:id" element={<Clubs />} />
                  <Route path="/learn" element={<Learn />} />
                  <Route path="/rankings" element={<Rankings />} />
                  
                  {/* Protected Chat threads */}
                  <Route 
                    path="/messages" 
                    element={
                      <ProtectedRoute>
                        <Messaging />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Protected Admin control dashboard */}
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'moderator']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                </Routes>
              </ProfileSetupGuard>
            </main>

            {/* Layout Footer */}
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
