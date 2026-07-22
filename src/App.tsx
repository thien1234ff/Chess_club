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

// Dynamic browser tab title manager for Vietnamese localization
const TitleManager: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'Trang chủ',
      '/auth': 'Đăng nhập & Đăng ký',
      '/profile-setup': 'Thiết lập hồ sơ',
      '/community': 'Cộng đồng',
      '/coaches': 'Huấn luyện viên',
      '/tournaments': 'Giải đấu Swiss',
      '/clubs': 'Câu lạc bộ',
      '/learn': 'Học tập & Giải đố',
      '/rankings': 'Bảng xếp hạng Elo',
      '/messages': 'Hộp thư Tin nhắn',
      '/admin': 'Bảng quản trị Admin'
    };

    const path = location.pathname;
    let title = 'Hệ sinh thái cờ vua';

    if (routeTitles[path]) {
      title = routeTitles[path];
    } else if (path.startsWith('/profile/')) {
      title = 'Hồ sơ kì thủ';
    } else if (path.startsWith('/coaches/')) {
      title = 'Chi tiết Huấn luyện viên';
    } else if (path.startsWith('/tournaments/')) {
      title = 'Chi tiết Giải đấu';
    } else if (path.startsWith('/clubs/')) {
      title = 'Chi tiết Câu lạc bộ';
    }

    document.title = `ChessHub - ${title}`;
  }, [location]);

  return null;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <TitleManager />
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
