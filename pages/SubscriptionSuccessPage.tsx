import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const SubscriptionSuccessPage: React.FC = () => {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const verificationAttempted = useRef(false);

  useEffect(() => {
    // Se a assinatura já estiver ativa no perfil do usuário, o trabalho está feito. Redireciona.
    if (user?.subscription) {
      setVerificationStatus('success');
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000); // Dá um momento para o usuário ver a mensagem de sucesso.
      return () => clearTimeout(timer);
    }

    // Espera até que a autenticação inicial seja concluída.
    if (authLoading) {
      return;
    }

    // Se a verificação ainda não foi tentada, inicie o processo.
    if (!verificationAttempted.current) {
      verificationAttempted.current = true;

      const verifySession = async () => {
        const params = new URLSearchParams(location.search);
        const sessionId = params.get('session_id');

        if (!sessionId) {
          setErrorMessage('ID da sessão de checkout não encontrado. Por favor, refaça o processo.');
          setVerificationStatus('error');
          return;
        }

        try {
          // 1. Invoca a função de backend para validar a sessão e atualizar o banco de dados.
          await supabase.functions.invoke('verify-stripe-session', {
            body: { sessionId },
          });

          // 2. SOLUÇÃO: Após a confirmação do backend, força ativamente a atualização do estado do usuário no frontend.
          // Isso busca os novos dados da assinatura e aciona o redirecionamento neste mesmo useEffect.
          await refreshUser();
          
        } catch (e) {
          console.error("Verification failed:", e);
          setErrorMessage((e as Error).message || 'Ocorreu um erro desconhecido durante a verificação.');
          setVerificationStatus('error');
        }
      };

      verifySession();
    }
    
  }, [user, authLoading, navigate, location.search, refreshUser]);

  const renderContent = () => {
    switch (verificationStatus) {
      case 'verifying':
        return (
          <>
            <h1 className="text-3xl font-bold mb-4">Verificando sua assinatura...</h1>
            <div className="glass-panel p-8 rounded-lg">
              <p className="text-gray-300 mb-6">
                Estamos confirmando os detalhes do seu plano com segurança. Isso levará apenas um instante.
              </p>
              <div className="flex justify-center items-center gap-4">
                <Spinner />
                <p className="text-gray-400">Ativando sua conta...</p>
              </div>
            </div>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle size={64} className="mx-auto text-green-500 mb-6 animate-fadeIn" />
            <h1 className="text-3xl font-bold mb-4">Assinatura Ativada!</h1>
            <div className="glass-panel p-8 rounded-lg">
              <p className="text-gray-300 mb-6">
                Tudo pronto! Seu plano foi ativado e sua área de trabalho está sendo preparada.
              </p>
              <div className="flex justify-center items-center gap-4">
                <Spinner />
                <p className="text-gray-400">Redirecionando para o dashboard...</p>
              </div>
            </div>
          </>
        );
      case 'error':
        return (
          <>
            <AlertTriangle size={64} className="mx-auto text-red-500 mb-6 animate-fadeIn" />
            <h1 className="text-3xl font-bold mb-4">Ocorreu um Erro</h1>
            <div className="glass-panel p-8 rounded-lg">
              <p className="text-gray-300 mb-6">
                Não foi possível ativar sua assinatura. Por favor, tente novamente ou contate o suporte.
              </p>
              <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-md">{errorMessage}</p>
            </div>
          </>
        );
    }
  };


  return (
    <div className="min-h-screen text-white bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center mb-6">
                <img src="https://i.imgur.com/lUKdBj5.png" alt="Blano AI Logo" className="h-12 w-auto" />
            </div>
            {renderContent()}
        </div>
    </div>
  );
};

export default SubscriptionSuccessPage;