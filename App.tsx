import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';

import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardLayout from './components/Layout';
import ProjectsPage from './pages/dashboard/ProjectsPage';
import ProjectDetailPage from './pages/dashboard/ProjectDetailPage';
import CrmPage from './pages/dashboard/CrmPage';
import FinancePage from './pages/dashboard/FinancePage';
import ImageGeneratorPage from './pages/dashboard/ImageGeneratorPage';
import AccountPage from './pages/dashboard/AccountPage';
import PendingInvitationsPage from './pages/PendingInvitationsPage';
import ClientPortalPage from './pages/ClientPortalPage';
import Spinner from './components/Spinner';
import AnalysisDashboardPage from './pages/dashboard/AnalysisDashboardPage';
import NotificationsPage from './pages/dashboard/NotificationsPage';
import ProfileSetupErrorPage from './pages/ProfileSetupErrorPage';
import ActivatePlanPage from './pages/ActivatePlanPage';
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage';

// Componente para redirecionar o usuário para a página inicial correta após o login
const HomeRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'designer') {
    return <Navigate to="/projects" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading, agencyId, profileError } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900"><Spinner /></div>;
  }
  if (profileError) {
    return <ProfileSetupErrorPage />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // **LÓGICA DE REDIRECIONAMENTO PARA ATIVAÇÃO DE PLANO**
  // CORREÇÃO CRÍTICA: Verifica se a assinatura existe E se o status é 'active' ou 'trialing'.
  // Isso impede que novos usuários (com subscription=null ou subscription com campos nulos) ou
  // usuários com planos cancelados acessem o dashboard.
  const hasActiveSubscription = user.subscription && (user.subscription.status === 'active' || user.subscription.status === 'trialing');
  const isOwnerWithoutSubscription = user.role === 'owner' && !hasActiveSubscription;
  const isActivating = location.pathname === '/activate-plan' || location.pathname === '/subscription-success';
  
  if (isOwnerWithoutSubscription && !isActivating) {
    return <Navigate to="/activate-plan" replace />;
  }
  
  const isDesignerWaiting = user.role === 'designer' && !agencyId;
  const isUserWithAgency = (user.role === 'designer' && agencyId) || user.role === 'owner';

  if (isDesignerWaiting && location.pathname !== '/pending-invitations') {
    return <Navigate to="/pending-invitations" replace />;
  }

  if (isUserWithAgency && location.pathname === '/pending-invitations') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Se um dono com assinatura ATIVA tentar acessar a página de ativação, redireciona para o dashboard
  if (user.role === 'owner' && hasActiveSubscription && isActivating) {
    return <Navigate to="/dashboard" replace />;
  }


  return children;
};

// Rota protegida para garantir que apenas o 'owner' acesse
const OwnerRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user } = useAuth();
    if (user?.role !== 'owner') {
        return <Navigate to="/projects" replace />;
    }
    return children;
}

const AppRoutes: React.FC = () => {
    const { user, loading, isRecoveringPassword } = useAuth();

    // The recovery state takes absolute priority over everything else to prevent conflicts.
    if (isRecoveringPassword) {
        // Render only the reset password page, accessible at any path while in recovery mode.
        // This ensures no other routing logic can interfere.
        return (
            <Routes>
                <Route path="*" element={<ResetPasswordPage />} />
            </Routes>
        );
    }

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900"><Spinner /></div>;
    }
    
    const loggedIn = !!user;

    return (
        <Routes>
            <Route path="/login" element={loggedIn ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/signup" element={loggedIn ? <Navigate to="/" /> : <SignUpPage />} />
            <Route path="/forgot-password" element={loggedIn ? <Navigate to="/" /> : <ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/portal/:agencyId/:projectId" element={<ClientPortalPage />} />
            
            {/* A rota de ativação precisa estar fora do redirect infinito e ser protegida */}
            <Route path="/activate-plan" element={
                <ProtectedRoute>
                    <ActivatePlanPage />
                </ProtectedRoute>
            } />
            
            {/* Nova rota para a página de sucesso da assinatura */}
            <Route path="/subscription-success" element={
                <ProtectedRoute>
                    <SubscriptionSuccessPage />
                </ProtectedRoute>
            } />

            <Route path="/pending-invitations" element={
                <ProtectedRoute>
                    <PendingInvitationsPage />
                </ProtectedRoute>
            } />

            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<HomeRedirect />} />
                <Route path="dashboard" element={<OwnerRoute><AnalysisDashboardPage /></OwnerRoute>} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="crm" element={<CrmPage />} />
                <Route path="image-generator" element={<ImageGeneratorPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="finance" element={<OwnerRoute><FinancePage /></OwnerRoute>} />
                <Route path="account" element={<OwnerRoute><AccountPage /></OwnerRoute>} /> 
            </Route>
            
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DataProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </DataProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;