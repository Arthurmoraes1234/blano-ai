import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabaseService } from '../services/firestoreService';
import { Project, Invoice, Expense, Agency, Invitation, Notification } from '../types';
import { useToast } from './ToastContext';
import { DataContextType } from '../types';


const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, agencyId } = useAuth();
  const { addToast } = useToast();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  const toastedNotificationIds = useRef(new Set<number>());
  const notificationsRef = useRef<Notification[]>([]);
  const notifyingProjectsRef = useRef(new Set<number>());

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const handleNewNotifications = useCallback((newNotifs: Notification[]) => {
      const newUntoastedNotifications = newNotifs.filter(
        n => !n.lido && !toastedNotificationIds.current.has(n.id)
      );

      if (newUntoastedNotifications.length > 0) {
        const sortedNew = newUntoastedNotifications.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestNew = sortedNew[0];
        
        addToast(latestNew.message, latestNew.type);
        toastedNotificationIds.current.add(latestNew.id);
      }
      setNotifications(newNotifs);
  }, [addToast]);

  const generateSystemNotifications = useCallback((currentProjects: Project[]) => {
      if (!agencyId) return;
      
      const currentNotifications = notificationsRef.current;
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      currentProjects.forEach(project => {
          if (project.data_entrega && new Date(project.data_entrega) <= twoDaysFromNow && new Date(project.data_entrega) > new Date()) {
              const hasExistingDbNotif = currentNotifications.some(n => n.link === `/projects/${project.id}` && n.message.includes('vence em breve'));
              const isAlreadyNotifying = notifyingProjectsRef.current.has(project.id);

              if (!hasExistingDbNotif && !isAlreadyNotifying) {
                  notifyingProjectsRef.current.add(project.id);
                  supabaseService.addNotification({
                      idAgencia: agencyId,
                      message: `⏰ O prazo para o projeto ${project.nome} vence em breve.`,
                      type: 'warning',
                      link: `/projects/${project.id}`,
                      lido: false,
                  });
              }
          }
      });
  }, [agencyId]);

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const loadData = async () => {
      setLoading(true);
      setAgency(null);
      setProjects([]);
      setInvoices([]);
      setExpenses([]);
      setInvitations([]);
      setNotifications([]);
      toastedNotificationIds.current.clear();
      notifyingProjectsRef.current.clear();
      
      if (agencyId) {
        unsubscribes.push(supabaseService.listenToAgency(agencyId, setAgency));
        unsubscribes.push(supabaseService.listenToProjects(agencyId, (newProjects) => {
          setProjects(newProjects);
          generateSystemNotifications(newProjects);
        }));
        unsubscribes.push(supabaseService.listenToNotifications(agencyId, handleNewNotifications));
        if (user?.role === 'owner') {
          unsubscribes.push(supabaseService.listenToInvoices(agencyId, setInvoices));
          unsubscribes.push(supabaseService.listenToExpenses(agencyId, setExpenses));
        }
        setLoading(false);
      } else if (user?.role === 'designer' && user.email) {
        setLoading(true);
        try {
          const unsubscribe = supabaseService.listenToInvitationsForDesigner(user.email, setInvitations);
          unsubscribes.push(unsubscribe);
        } catch (error) {
          console.error("Failed to set up invitations listener:", error);
          addToast("Erro ao carregar convites.", "error");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [agencyId, user, generateSystemNotifications, handleNewNotifications, addToast]);
  
  // --- CENTRALIZED DATA MUTATION FUNCTIONS ---
  const addInvoice = async (data: Omit<Invoice, 'id' | 'id_agencia' | 'created_at'>) => {
    if (!agencyId) return;
    try {
      const newInvoice = await supabaseService.addInvoice(agencyId, data);
      setInvoices(prev => [...prev, newInvoice as Invoice].sort((a,b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
    } catch (error) {
      addToast('Falha ao adicionar fatura.', 'error');
      console.error(error);
      throw error;
    }
  };

  const updateInvoice = async (invoiceId: number, data: Partial<Invoice>) => {
    if (!agencyId) return;
    try {
      const updatedInvoice = await supabaseService.updateInvoice(agencyId, invoiceId, data);
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
    } catch (error) {
      addToast('Falha ao atualizar fatura.', 'error');
      console.error(error);
      throw error;
    }
  };

  const deleteInvoice = async (invoiceId: number) => {
    if (!agencyId) return;
    try {
      await supabaseService.deleteInvoice(agencyId, invoiceId);
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    } catch (error) {
      addToast('Falha ao deletar fatura.', 'error');
      console.error(error);
      throw error;
    }
  };

  const addExpense = async (data: Omit<Expense, 'id' | 'id_agencia' | 'created_at'>) => {
    if (!agencyId) return;
    try {
      const newExpense = await supabaseService.addExpense(agencyId, data);
      setExpenses(prev => [...prev, newExpense as Expense].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      addToast('Falha ao adicionar despesa.', 'error');
      console.error(error);
      throw error;
    }
  };

  const updateExpense = async (expenseId: number, data: Partial<Expense>) => {
    if (!agencyId) return;
    try {
      const updatedExpense = await supabaseService.updateExpense(agencyId, expenseId, data);
      setExpenses(prev => prev.map(exp => exp.id === expenseId ? updatedExpense : exp));
    } catch (error) {
      addToast('Falha ao atualizar despesa.', 'error');
      console.error(error);
      throw error;
    }
  };
  
  const deleteExpense = async (expenseId: number) => {
    if (!agencyId) return;
    try {
      await supabaseService.deleteExpense(agencyId, expenseId);
      setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    } catch (error) {
      addToast('Falha ao deletar despesa.', 'error');
      console.error(error);
      throw error;
    }
  };
  
  const updateProject = async (projectId: number, data: Partial<Project>): Promise<void> => {
      if (!agencyId) return;
      try {
          const updatedProject = await supabaseService.updateProject(agencyId, projectId, data);
          setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
      } catch (error) {
          addToast('Falha ao atualizar projeto.', 'error');
          console.error(error);
          throw error;
      }
  };

  const deleteProject = async (projectId: number): Promise<void> => {
      if (!agencyId) return;
      try {
          await supabaseService.deleteProject(agencyId, projectId);
          setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (error) {
          addToast('Falha ao deletar projeto.', 'error');
          console.error(error);
          throw error;
      }
  };
  // --- END: DATA MUTATION FUNCTIONS ---

  const markAllNotificationsAsRead = async () => {
    if (!agencyId) return;
    const currentlyUnread = notifications.filter(n => !n.lido);
    if (currentlyUnread.length === 0) return;
    const originalNotifications = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, lido: true })));
    try {
      await supabaseService.markAllNotificationsAsRead(agencyId);
    } catch (error) {
      addToast('Falha ao marcar notificações como lidas.', 'error');
      console.error(error);
      setNotifications(originalNotifications);
    }
  };

  const clearReadNotifications = async () => {
    if (!agencyId) return;
    const readNotifications = notifications.filter(n => n.lido);
    if (readNotifications.length === 0) {
        addToast('Não há notificações lidas para limpar.', 'info');
        return;
    }
    if (window.confirm('Tem certeza que deseja limpar todas as notificações lidas?')) {
        const originalNotifications = notifications;
        setNotifications(prev => prev.filter(n => !n.lido));
        try {
            await supabaseService.clearReadNotifications(agencyId);
            addToast('Notificações lidas foram removidas.', 'success');
        } catch (error) {
            addToast('Falha ao limpar notificações.', 'error');
            console.error(error);
            setNotifications(originalNotifications);
        }
    }
  };

  const value: DataContextType = { 
    agency, projects, invoices, expenses, invitations, notifications, loading,
    markAllNotificationsAsRead, clearReadNotifications,
    addInvoice, updateInvoice, deleteInvoice, addExpense, updateExpense, deleteExpense,
    updateProject, deleteProject
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};