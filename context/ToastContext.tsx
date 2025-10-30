import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ToastType = 'success' | 'warning' | 'info' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Tornando removeToast estável com useCallback e sem dependências
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Tornando addToast estável, removendo a dependência do idCounter e usando
  // uma função estável para remover o toast após o timeout.
  const addToast = useCallback((message: string, type: ToastType) => {
    // Gera um ID único sem depender de estado, garantindo estabilidade
    const newId = Date.now() + Math.random();
    const newToast = { id: newId, message, type };
    
    setToasts(prev => [newToast, ...prev]);

    setTimeout(() => {
      removeToast(newId);
    }, 5000);
  }, [removeToast]); // Agora depende apenas de removeToast, que é estável.

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
