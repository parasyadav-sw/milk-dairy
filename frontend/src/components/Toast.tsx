import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      styles: 'bg-forest-50 text-forest-800 border-forest-200',
      icon: <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />,
    },
    error: {
      styles: 'bg-red-50 text-error border-red-200',
      icon: <XCircle className="w-5 h-5 text-error shrink-0" />,
    },
    info: {
      styles: 'bg-primary-50 text-primary-800 border-primary-200',
      icon: <AlertCircle className="w-5 h-5 text-primary-600 shrink-0" />,
    }
  };

  const { styles, icon } = config[type];

  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-soft-lg animate-slide-up max-w-sm ${styles}`}>
      {icon}
      <span className="text-body font-medium flex-1">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
