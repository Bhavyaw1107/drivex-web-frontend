import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { UploadProvider } from './context/UploadContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import UploadProgress from './components/UploadProgress';
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { setClerkToken, setClerkTokenGetter } from './lib/api';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-cyan-400 animate-pulse" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isSignedIn } = useAuth();

  return isSignedIn ? children : <Navigate to="/login" replace />;
}

function RootRedirect() {
  const { isSignedIn } = useAuth();

  return <Navigate to={isSignedIn ? "/dashboard" : "/login"} replace />;
}

function App() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      setAuthReady(false);
      return;
    }

    if (!isSignedIn) {
      setClerkToken(null);
      setClerkTokenGetter(null);
      setAuthReady(true);
      return;
    }

    setAuthReady(false);
    setClerkTokenGetter(async () => {
      try {
        return await getToken();
      } catch (error) {
        return null;
      }
    });

    const syncToken = async () => {
      try {
        const token = await getToken();
        setClerkToken(token ?? null);
      } catch (error) {
        console.error("Failed to get Clerk token", error);
        setClerkToken(null);
      } finally {
        setAuthReady(true);
      }
    };

    syncToken();
  }, [getToken, isLoaded, isSignedIn]);
  if (!isLoaded || (isSignedIn && !authReady)) return <LoadingSpinner />;

  return (
    <ErrorBoundary>
      <UploadProvider>
        <Toaster position="top-center" richColors closeButton />

        {/* ❌ NO BrowserRouter HERE */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>

        <UploadProgress />
      </UploadProvider>
    </ErrorBoundary>
  );
}

export default App;
