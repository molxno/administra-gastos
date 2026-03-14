import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useFinancialStore } from './store/useFinancialStore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSupabaseSync } from './lib/useSupabaseSync';
import { Layout } from './components/layout/Layout';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Dashboard } from './pages/Dashboard';
import { Budget } from './pages/Budget';
import { Debts } from './pages/Debts';
import { Goals } from './pages/Goals';
import { BiweeklyPlan } from './pages/BiweeklyPlan';
import { EmergencyFund } from './pages/EmergencyFund';
import { Transactions } from './pages/Transactions';
import { Insights } from './pages/Insights';
import { Settings } from './pages/Settings';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { AuthCallback } from './pages/auth/AuthCallback';
import { ResetPassword } from './pages/auth/ResetPassword';
import { AppLoader } from './components/shared/AppLoader';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastContainer } from './components/shared/ToastContainer';

function AppRoutes() {
  const { onboardingCompleted } = useFinancialStore();

  if (!onboardingCompleted) {
    return <OnboardingWizard />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/presupuesto" element={<Budget />} />
        <Route path="/deudas" element={<Debts />} />
        <Route path="/metas" element={<Goals />} />
        <Route path="/quincenal" element={<BiweeklyPlan />} />
        <Route path="/emergencia" element={<EmergencyFund />} />
        <Route path="/transacciones" element={<Transactions />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/configuracion" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function AuthenticatedApp() {
  const { cloudLoading } = useSupabaseSync();

  if (cloudLoading) {
    return <AppLoader message="Sincronizando tu informaci&oacute;n..." />;
  }

  return <AppRoutes />;
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoader />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/auth/*" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<AuthenticatedApp />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <ToastContainer />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
