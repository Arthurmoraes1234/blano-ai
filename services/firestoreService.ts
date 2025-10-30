import { supabase } from './supabaseClient';
import { User, Agency, Project, Invoice, Expense, Invitation, Notification } from '../types';

const getUserProfile = async (uid: string): Promise<User | null> => {
    // Chama a nova função SQL (RPC) para buscar usuário e assinatura de uma só vez.
    const { data, error } = await supabase.rpc('get_user_profile_with_subscription', {
        p_user_id: uid
    });

    if (error) {
        console.error('Error fetching user profile via RPC:', error);
        return null;
    }
    
    // O RPC retorna um único objeto JSON, que já é o perfil de usuário combinado.
    return data as User | null;
};

const createAgency = async (agencyData: { ownerId: string, name: string }): Promise<number> => {
    const { data, error } = await supabase
        .from('agencies')
        .insert({
            ownerId: agencyData.ownerId,
            name: agencyData.name,
            brandName: agencyData.name,
            brandLogo: '',
            team: [],
        })
        .select('id')
        .single();
    if (error) throw error;
    return data.id;
};

const updateAgency = async (agencyId: number, data: Partial<Agency>): Promise<Agency> => {
    const { data: updatedAgency, error } = await supabase
        .from('agencies')
        .update(data)
        .eq('id', agencyId)
        .select()
        .single();
    if (error) throw error;
    return updatedAgency as Agency;
};

const listenToRealtimeChanges = <T>(
    table: string,
    filterField: string,
    filterValue: any,
    callback: (data: T[]) => void,
    orderBy?: { column: string, ascending: boolean }
): (() => void) => {
    const fetchData = async () => {
        let query = supabase.from(table).select('*').eq(filterField, filterValue);
        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending });
        }
        const { data, error } = await query;
        if (error) {
            console.error(`Error fetching from ${table}:`, error);
        } else {
            callback(data as T[]);
        }
    };
    
    fetchData(); // Initial fetch
    
    const channel = supabase.channel(`public:${table}:${filterField}=${filterValue}`);
    const subscription = channel
        .on('postgres_changes', { event: '*', schema: 'public', table, filter: `${filterField}=eq.${filterValue}` }, fetchData)
        .subscribe();
        
    return () => {
        supabase.removeChannel(channel);
    };
};

const listenToAgency = (agencyId: number, callback: (agency: Agency | null) => void): () => void => {
    const fetchData = async () => {
        const { data, error } = await supabase.from('agencies').select('*').eq('id', agencyId).single();
        if (error) {
            console.error(error);
            callback(null);
        } else {
            callback(data as Agency);
        }
    };

    fetchData(); // Initial fetch

    const channel = supabase.channel(`public:agencies:id=eq.${agencyId}`);
    const subscription = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agencies', filter: `id=eq.${agencyId}` }, fetchData)
        .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    };
};


const listenToProjects = (agencyId: number, callback: (projects: Project[]) => void) => {
    return listenToRealtimeChanges<Project>('projects', 'id_agencia', agencyId, callback, { column: 'created_at', ascending: false });
};
const listenToInvoices = (agencyId: number, callback: (invoices: Invoice[]) => void) => {
    return listenToRealtimeChanges<Invoice>('invoices', 'id_agencia', agencyId, callback, { column: 'data_vencimento', ascending: true });
};
const listenToExpenses = (agencyId: number, callback: (expenses: Expense[]) => void) => {
    return listenToRealtimeChanges<Expense>('expenses', 'id_agencia', agencyId, callback, { column: 'date', ascending: false });
};
const listenToNotifications = (agencyId: number, callback: (notifications: Notification[]) => void) => {
    return listenToRealtimeChanges<Notification>('notifications', 'idAgencia', agencyId, callback, { column: 'created_at', ascending: false });
};
const listenToInvitationsForDesigner = (email: string, callback: (invitations: Invitation[]) => void) => {
    return listenToRealtimeChanges<Invitation>('invitations', 'emailDesigner', email, callback);
};

const addProject = async (agencyId: number, projectData: Omit<Project, 'id' | 'id_agencia' | 'created_at'>): Promise<Project> => {
    const { data, error } = await supabase
        .from('projects')
        .insert({ ...projectData, id_agencia: agencyId })
        .select()
        .single();
    if (error) throw error;
    return data as Project;
};
const updateProject = async (agencyId: number, projectId: number, data: Partial<Project>): Promise<Project> => {
    const { data: updatedProject, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id_agencia', agencyId)
        .eq('id', projectId)
        .select()
        .single();
    if (error) throw error;
    return updatedProject as Project;
};
const deleteProject = async (agencyId: number, projectId: number): Promise<void> => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id_agencia', agencyId)
        .eq('id', projectId);
    if (error) throw error;
};

const addInvoice = async (agencyId: number, data: Omit<Invoice, 'id' | 'id_agencia' | 'created_at'>): Promise<Invoice> => {
    const { data: newInvoice, error } = await supabase.from('invoices').insert({ ...data, id_agencia: agencyId }).select().single();
    if (error) throw error;
    return newInvoice as Invoice;
};

const updateInvoice = async (agencyId: number, invoiceId: number, data: Partial<Invoice>): Promise<Invoice> => {
    const { data: updatedInvoice, error } = await supabase.from('invoices').update(data).eq('id_agencia', agencyId).eq('id', invoiceId).select().single();
    if (error) throw error;
    return updatedInvoice as Invoice;
};

const deleteInvoice = async (agencyId: number, invoiceId: number): Promise<void> => {
    const { error } = await supabase.from('invoices').delete().eq('id_agencia', agencyId).eq('id', invoiceId);
    if (error) throw error;
};

const addExpense = async (agencyId: number, data: Omit<Expense, 'id' | 'id_agencia' | 'created_at'>): Promise<Expense> => {
    const { data: newExpense, error } = await supabase.from('expenses').insert({ ...data, id_agencia: agencyId }).select().single();
    if (error) throw error;
    return newExpense as Expense;
};

const updateExpense = async (agencyId: number, expenseId: number, data: Partial<Expense>): Promise<Expense> => {
    const { data: updatedExpense, error } = await supabase.from('expenses').update(data).eq('id_agencia', agencyId).eq('id', expenseId).select().single();
    if (error) throw error;
    return updatedExpense as Expense;
};

const deleteExpense = async (agencyId: number, expenseId: number): Promise<void> => {
    const { error } = await supabase.from('expenses').delete().eq('id_agencia', agencyId).eq('id', expenseId);
    if (error) throw error;
};

const addNotification = async (notification: Omit<Notification, 'id' | 'created_at'>): Promise<void> => {
    const { error } = await supabase.from('notifications').insert(notification);
    if (error) {
        console.error("Failed to add notification:", error);
    }
};

const markAllNotificationsAsRead = async (agencyId: number): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ lido: true }).eq('idAgencia', agencyId).eq('lido', false);
    if (error) throw error;
};

const clearReadNotifications = async (agencyId: number): Promise<void> => {
    const { error } = await supabase.from('notifications').delete().eq('idAgencia', agencyId).eq('lido', true);
    if (error) throw error;
};

const incrementProjectCount = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found for project count increment.");

    // 1. Fetch the current user profile to get the current count.
    const { data: userProfile, error: fetchError } = await supabase
        .from('users')
        .select('monthly_project_count')
        .eq('uid', user.id)
        .single();

    if (fetchError) {
        console.error("Error fetching user for project count increment:", fetchError);
        throw new Error("Could not fetch user profile to update project count.");
    }

    // 2. Calculate the new count.
    const currentCount = userProfile?.monthly_project_count || 0;
    const newCount = currentCount + 1;

    // 3. Update the user profile with the new count.
    const { error: updateError } = await supabase
        .from('users')
        .update({ monthly_project_count: newCount })
        .eq('uid', user.id);

    if (updateError) {
        console.error("Error updating project count:", updateError);
        throw new Error("Failed to update project count.");
    }
};

const inviteDesigner = async (agencyId: number, agencyName: string, email: string): Promise<void> => {
    const { error } = await supabase.from('invitations').insert({
        id_agencia: agencyId,
        nome_agencia: agencyName,
        emailDesigner: email
    });
    if (error) throw error;
};

const removeDesignerFromAgency = async (email: string): Promise<void> => {
    const { error } = await supabase.rpc('remove_designer_from_agency', {
      designer_email_to_remove: email.trim()
    });
  
    if (error) {
      // O erro da função RPC já contém uma mensagem amigável para o usuário.
      throw new Error(error.message);
    }
};


const acceptInvitation = async (invitation: Invitation): Promise<void> => {
    // A chamada agora invoca a nova Edge Function, que é mais segura e robusta.
    // O token de autenticação do usuário é passado automaticamente nos headers pelo client do Supabase.
    const { error } = await supabase.functions.invoke('accept-invitation', {
        body: { invitationId: invitation.id }
    });
    
    if (error) {
        // A função de invoke pode retornar um erro complexo. Tentamos extrair a mensagem mais útil.
        let errorMessage = error.message;
        // @ts-ignore
        if (error.context && error.context.error && error.context.error.message) {
             // @ts-ignore
            errorMessage = error.context.error.message;
        }
        throw new Error(errorMessage);
    }
};

export const supabaseService = {
    getUserProfile,
    createAgency,
    updateAgency,
    listenToAgency,
    listenToProjects,
    listenToInvoices,
    listenToExpenses,
    listenToNotifications,
    listenToInvitationsForDesigner,
    addProject,
    updateProject,
    deleteProject,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addExpense,
    updateExpense,
    deleteExpense,
    addNotification,
    markAllNotificationsAsRead,
    clearReadNotifications,
    incrementProjectCount,
    inviteDesigner,
    removeDesignerFromAgency,
    acceptInvitation
};