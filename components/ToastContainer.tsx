import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast: React.FC<{ message: string; type: 'success' | 'warning' | 'info' | 'error'; onDismiss: () => void; }> = ({ message, type, onDismiss }) => {
  const icons = {
    success: <CheckCircle className="text-green-400" />,
    warning: <AlertTriangle className="text-yellow-400" />,
    info: <Info className="text-blue-400" />,
    error: <Info className="text-red-400" />,
  };

  return (
    <div className="glass-panel rounded-lg shadow-2xl p-4 flex items-start gap-4 animate-fadeInSlideUp">
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="text-sm text-gray-200 flex-grow">{message}</p>
      <button onClick={onDismiss} className="text-gray-500 hover:text-white flex-shrink-0">
        <X size={18} />
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-20 right-6 z-[100] space-y-4">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

export default ToastContainer;
