// src/AppRoutes.tsx
import React, { useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { DemoModeProvider } from './contexts/DemoModeContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NotesPage from './pages/NotesPage';
import NoteDetailPage from './pages/NoteDetailPage';
import ConceptsPage from './pages/ConceptsPage';
import ReviewPage from './pages/ReviewPage';
import ReviewHistoryPage from './pages/ReviewHistoryPage';
import ViewSessionPage from './pages/ViewSessionPage';
import FlashcardsPage from './pages/FlashcardsPage';
import HelpSupportPage from './pages/HelpSupportPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ToastContainer from './components/ToastContainer';
import { useStore } from './store';

const AuthStateSynchronizer = () => {
  const { user } = useAuth();
  const { zustandUser, setUser } = useStore(state => ({
    zustandUser: state.user,
    setUser: state.setUser
  }));

  useEffect(() => {
    if (user?.id !== zustandUser?.id) {
      setUser(user);
    }
  }, [user, zustandUser, setUser]);

  return null;
};

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const {
    user: zustandUser,
    loadNotes: storeLoadNotes,
    resetStore: storeResetStore,
    theme
  } = useStore();

  const { signOut } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const loadNotes = useCallback(() => {
    storeLoadNotes(1, 12, {});
  }, [storeLoadNotes]);

  const resetStore = useCallback(() => {
    storeResetStore();
  }, [storeResetStore]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      useStore.getState().resetStore();
      addToast('Logged out successfully', 'success');
      navigate('/login');
    } catch (error) {
      addToast('Failed to logout', 'error');
    }
  }, [signOut, addToast, navigate]);

  useEffect(() => {
    if (zustandUser) {
      loadNotes();
    } else {
      storeResetStore();
    }
  }, [zustandUser, loadNotes, resetStore]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        <Route path="/" element={
          <PrivateRoute>
            <Layout onLogout={handleLogout} />
          </PrivateRoute>
        }>
          <Route index element={<HomePage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/:id" element={<NoteDetailPage />} />
          <Route path="concepts" element={<ConceptsPage />} />
          <Route path="flashcards" element={<FlashcardsPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="history" element={<ReviewHistoryPage />} />
          <Route path="session/:sessionId" element={<ViewSessionPage />} />
          <Route path="help" element={<HelpSupportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthStateSynchronizer />
      <ToastProvider>
        <NotificationProvider>
          <DemoModeProvider>
            <AppRoutes />
          </DemoModeProvider>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;