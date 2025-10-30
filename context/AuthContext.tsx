import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { authService } from '../services/authService';
import { supabaseService } from '../services/firestoreService';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

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

  // Use a ref to prevent stale closures in the listener
  const recoveryRef = useRef(isRecoveringPassword);
  useEffect(() => {
    recoveryRef.current = isRecoveringPassword;
  }, [isRecoveringPassword]);


  const setIsSigningUp = (status: boolean) => {
    isSigningUpRef.current = status;
  };


  useEffect(() => {
    setLoading(true);

    const fetchUserProfile = async (session: Session | null) => {
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
    };

    const authListener = authService.onAuthStateChanged((event, session) => {
      // Prioritize PASSWORD_RECOVERY event to enter recovery mode.
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery event detected. Setting recovery mode.");
        setIsRecoveringPassword(true);
        setLoading(false); // Ensure app is not stuck loading
        return; // Halt further execution for this event
      }

      // If we are in recovery mode, ignore all other auth events to prevent conflicts.
      if (recoveryRef.current) {
        return;
      }
      
      fetchUserProfile(session);
    });

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
  }, []);
  
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

  const value = { user, loading, agencyId, profileError, refreshUser, setIsSigningUp, isRecoveringPassword, exitRecoveryMode };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};