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
  }, []); // Mantido como useCallback

  // --- Função Central de Carregamento de Perfil ---
  const fetchUserProfile = useCallback(async (session: Session | null) => {
    setProfileError(false);
    if (session?.user) {
      try {
        // Se o seu 'supabaseService.getUserProfile' retorna o tipo 'User' que inclui 'id_agencia'
        const userProfile = await supabaseService.getUserProfile(session.user.id); 
        
        if (userProfile) {
          // Aqui garantimos que o objeto 'userProfile' que vai para o estado
          // é o perfil limpo do banco de dados, assumindo que já está
          // livre de referências circulares.
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
  }, []); // Dependência vazia, pois ele usa ref e funções externas

  useEffect(() => {
    // Definimos loading como true fora do listener para garantir que o estado inicial é de carregamento
    setLoading(true); 

    const authListener = authService.onAuthStateChanged((event, session) => {
      // Priorize o evento PASSWORD_RECOVERY
      if (event === "PASSWORD_RECOVERY") {
        console.log("Evento de recuperação de senha detectado. Entrando em modo de recuperação.");
        setIsRecoveringPassword(true);
        setLoading(false); 
        return; 
      }

      // Se estivermos em modo de recuperação, ignore outros eventos para evitar conflitos.
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
      // O Supabase retorna uma função de unsubscribe, deve ser chamada diretamente
      authListener(); 
      supabase.removeChannel(userSubscriptionListener);
    };
  }, [fetchUserProfile]); // Adicione fetchUserProfile como dependência (é um useCallback)
  
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

// --- A CORREÇÃO ESTÁ AQUI: Usando "function" em vez de "const = () =>" ---
// Isso resolve o erro 'Unexpected token export'.
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

