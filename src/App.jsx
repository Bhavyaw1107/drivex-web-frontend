import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { Toaster } from 'sonner';

function AuthCallbackHandler() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/login' || location.pathname === '/register') {
      const token = localStorage.getItem('token');
      if (token) {
        // Token exists but we're going to login/register - this shouldn't happen normally
        // But if it does, let the route guard handle it
      }
    }
  }, [location]);

  return null;
}

function App() {
  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <BrowserRouter>
        <AuthCallbackHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
