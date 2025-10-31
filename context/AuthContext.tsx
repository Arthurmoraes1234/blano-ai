// --- MOCK CRÍTICO PARA AMBIENTE VITE/BROWSER: RESOLVE 'process is not defined' ---
// Esta verificação garante que a variável global 'process' exista no navegador,
// necessária por algumas dependências do Supabase.
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: { NODE_ENV: 'production' } };
}
// ---------------------------------------------------------------------------------

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode, 
  useRef, 
  useCallback 
} from 'react';

import { authService } from '../services/authService';
import { supabaseService } from '../services/firestoreService';
import { User } from '../types';
// Importação direta do tipo Session (FINALMENTE CORRETA: resolve o erro "is not a constructor")
import { Session } from '@supabase/supabase-js'; 
import { supabase } from '../services/supabaseClient';

// --- Definição de Tipos ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  agencyId: number | null;
  profileError: boolean;
  refreshUser: () => Promise<boolean>;
  setIsSigningUp: (isSigningUp: boolean) => void;
  isRecoveringPassword: boolean;
  exitRecoveryMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<number | null>(null);
  const [profileError, setProfileError] = useState(false);
  const isSigningUpRef = useRef(false);
  
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  // Use uma ref para prevenir closures obsoletas no listener
  const recoveryRef = useRef(isRecoveringPassword);
  useEffect(() => {
    recoveryRef.current = isRecoveringPassword;
  }, [isRecoveringPassword]);

  const setIsSigningUp = useCallback((status: boolean) => {
    isSigningUpRef.current = status;
  }, []); 

  // --- Função Central de Carregamento de Perfil ---
  const fetchUserProfile = useCallback(async (session: Session | null) => {
    setProfileError(false);
    if (session?.user) {
      try {
        const userProfile = await supabaseService.getUserProfile(session.user.id); 
        
        if (userProfile) {
          setUser(userProfile);
          setAgencyId(userProfile.id_agencia);
        } else {
            if (isSigningUpRef.current) {
             console.warn('Listener de autenticação disparou durante o cadastro, perfil ainda não disponível. Aguardando polling...');
            } else {
              console.error("Usuário autenticado, mas o perfil não foi encontrado no banco de dados.");
              setProfileError(true);
              setUser(null);
              setAgencyId(null);
            }
        }
      } catch (error) {
        console.error("Erro ao buscar o perfil do usuário:", error);
        setProfileError(true);
        setUser(null);
        setAgencyId(null);
      }
    } else {
      setUser(null);
      setAgencyId(null);
    }
    setLoading(false);
  }, []); 

  useEffect(() => {
    setLoading(true); 

    const authListener = authService.onAuthStateChanged((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Evento de recuperação de senha detectado. Entrando em modo de recuperação.");
        setIsRecoveringPassword(true);
        setLoading(false); 
        return; 
      }

      if (recoveryRef.current) {
        return;
      }
      
      fetchUserProfile(session);
    });

    // Listener de Mudanças no Banco de Dados (Postgres Changes)
    const userSubscriptionListener = supabase
      .channel('public:subscriptions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
              console.log('Mudança na assinatura detectada, buscando perfil novamente...');
              fetchUserProfile(session); 
          }
        }
      )
      .subscribe();


    return () => {
      authListener(); 
      supabase.removeChannel(userSubscriptionListener);
    };
  }, [fetchUserProfile]); 
  
  const refreshUser = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        try {
          const userProfile = await supabaseService.getUserProfile(session.user.id);
          if (userProfile) {
            setProfileError(false);
            setUser(userProfile);
            setAgencyId(userProfile.id_agencia);
            return true;
          }
        } catch (error) {
          console.error("Erro ao atualizar o perfil do usuário manualmente:", error);
        }
    }
    return false;
  };
  
  const exitRecoveryMode = () => {
      setIsRecoveringPassword(false);
  };

  const value = { 
    user, 
    loading, 
    agencyId, 
    profileError, 
    refreshUser, 
    setIsSigningUp, 
    isRecoveringPassword, 
    exitRecoveryMode 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Formato de exportação robusto (V2) ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
