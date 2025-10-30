import { supabase } from './supabaseClient';
import { supabaseService } from './firestoreService';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface SignUpParams {
    name: string;
    email: string;
    password: string;
    role: 'owner' | 'designer';
    agencyName?: string;
}

// SOLUÇÃO DEFINITIVA: Abordagem explícita e sem gatilho (triggerless).
// A lógica foi movida do backend (gatilho SQL) para o frontend.
// Isso nos dá controle total sobre o fluxo, elimina a condição de corrida
// e fornece mensagens de erro claras se houver uma incompatibilidade de esquema no banco.
const signUp = async ({ name, email, password, role, agencyName }: SignUpParams) => {
    
    // Etapa 1: Criar o usuário de autenticação.
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name, // Passando o nome para os metadados do usuário auth, pode ser útil.
            }
        }
    });

    if (authError) {
        if (authError.message.includes("User already registered")) {
            throw new Error("Este email já está cadastrado. Por favor, faça login.");
        }
        throw authError;
    }
    
    if (!authData.user) {
        throw new Error("Não foi possível criar o usuário de autenticação.");
    }
    
    const user = authData.user;

    // Etapa 2: Criar o perfil do usuário na tabela 'users' e, se necessário, a agência.
    try {
        if (role === 'owner') {
            if (!agencyName) {
                throw new Error("O nome da agência é obrigatório para o perfil 'dono'.");
            }
            // Cria a agência primeiro para obter o ID
            const agencyId = await supabaseService.createAgency({ ownerId: user.id, name: agencyName });
            
            // Agora cria o perfil do usuário com o ID da agência
            const { error: profileError } = await supabase.from('users').insert({
                uid: user.id,
                email: user.email,
                name,
                role: 'owner', // CORREÇÃO: Define explicitamente o perfil para 'owner'
                id_agencia: agencyId,
            });

            if (profileError) throw profileError;

        } else if (role === 'designer') { // CORREÇÃO: Usa 'else if' para ser explícito
            // Cria apenas o perfil do usuário, sem agência.
            const { error: profileError } = await supabase.from('users').insert({
                uid: user.id,
                email: user.email,
                name,
                role: 'designer', // CORREÇÃO: Define explicitamente o perfil para 'designer'
                id_agencia: null,
            });

            if (profileError) throw profileError;
        } else {
             // CORREÇÃO: Adiciona um erro de fallback para qualquer caso inesperado.
             throw new Error(`Tentativa de cadastro com perfil inválido: '${role}'.`);
        }
    } catch (dbError) {
        // Se a criação do perfil/agência falhar, idealmente deveríamos deletar o usuário de autenticação
        // para evitar um estado inconsistente. Isso requer privilégios de admin e é mais seguro
        // em uma Edge Function. Por agora, vamos relançar o erro. O app já tem uma página de erro para esse caso.
        console.error("Erro de banco de dados durante o cadastro:", dbError);
        throw new Error(`Seu usuário foi criado, mas houve um erro ao configurar seu perfil. Detalhes: ${(dbError as Error).message}`);
    }

    return authData;
};

const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        if (error.message.includes("Invalid login credentials")) {
            throw new Error("Email ou senha inválidos.");
        }
        throw error;
    }
};

const logout = () => supabase.auth.signOut();

const onAuthStateChanged = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
    
    return () => {
        listener?.subscription.unsubscribe();
    };
};

const resetPasswordForEmail = async (email: string) => {
    // CORREÇÃO FINAL: A URL de redirecionamento DEVE ser a URL base da aplicação, sem nenhum hash.
    // O Supabase irá então anexar seu próprio fragmento (#access_token=...) corretamente.
    // Isso conserta o bug da "URL quebrada" com dois hashes, que era a causa raiz de todos os problemas.
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
    });

    if (error) {
        // Não lançamos o erro para o usuário para não revelar se um e-mail existe ou não.
        // A mensagem de "se o e-mail existir..." é mais segura.
        console.error("Password reset request error:", error.message);
    }
};

const updatePassword = async (newPassword: string) => {
    // O cliente Supabase mantém a sessão de recuperação internamente após processar o hash da URL.
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        console.error("Update password error:", error);
        if (error.message.includes("should be different from the old password")) {
             throw new Error("A nova senha deve ser diferente da antiga.");
        }
        if (error.message.includes("token is expired")) {
             throw new Error("O link de redefinição de senha expirou. Por favor, solicite um novo.");
        }
        if (error.message.includes("Password should be at least 6 characters")) {
            throw new Error("A senha deve ter no mínimo 6 caracteres.");
        }
        throw new Error("Não foi possível redefinir a senha. Tente novamente.");
    }
};


export const authService = {
    signUp,
    login,
    logout,
    onAuthStateChanged,
    resetPasswordForEmail,
    updatePassword,
};