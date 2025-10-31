import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode, 
  useRef, 
  useCallback 
} from 'react';

// Certifique-se de que os paths 'authService', 'firestoreService' e 'supabaseClient'
// estão corretos no seu projeto.
import { authService } from '../services/authService';
import { supabaseService } from '../services/firestoreService';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient'; // Variável 'supabase'

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
    // Definimos loading como true para o ciclo inicial
    setLoading(true); 

    let userSubscriptionListener: ReturnType<typeof supabase.channel> | null = null;
    let authListener: () => void = () => {};

    // --- Inscrição no Listener de Autenticação (Sempre necessário) ---
    if (authService) {
      authListener = authService.onAuthStateChanged((event, session) => {
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
    } else {
        console.error("AuthService não está disponível.");
        setLoading(false);
    }

    // --- A CORREÇÃO CRÍTICA ESTÁ AQUI: Verifica se 'supabase' existe antes de usá-lo ---
    // Isso resolve o "Cannot read properties of undefined (reading 'auth')"
    if (supabase) {
        // Listener de Mudanças no Banco de Dados (Postgres Changes)
        userSubscriptionListener = supabase
          .channel('public:subscriptions')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'subscriptions' },
            async () => {
              // Aqui também verificamos se a sessão está pronta antes de buscar
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                  console.log('Mudança na assinatura detectada, buscando perfil novamente...');
                  fetchUserProfile(session); 
              }
            }
          )
          .subscribe();
    } else {
        console.error("Supabase client não está disponível para subscriptions.");
    }


    // --- Função de Cleanup ---
    return () => {
      // Unsubscribe do listener de Auth
      authListener(); 
      
      // Unsubscribe seguro do canal, caso ele tenha sido criado
      if (userSubscriptionListener && supabase) {
        supabase.removeChannel(userSubscriptionListener);
      }
    };
  }, [fetchUserProfile]); // fetchUserProfile é a única dependência

  // Resto das funções e retorno...
  const refreshUser = async (): Promise<boolean> => {
    if (!supabase) return false;
    
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
