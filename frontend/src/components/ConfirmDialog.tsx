import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2, ArrowRightLeft, Info, CheckCircle2 } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CONFIG: Record<ConfirmVariant, { iconBg: string; iconColor: string; btnClass: string; defaultIcon: React.ReactNode }> = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    btnClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/40',
    defaultIcon: <Trash2 className="w-6 h-6" />,
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    btnClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/40',
    defaultIcon: <AlertTriangle className="w-6 h-6" />,
  },
  info: {
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-700',
    btnClass: 'bg-primary-700 hover:bg-primary-800 focus:ring-primary-500/40',
    defaultIcon: <Info className="w-6 h-6" />,
  },
  success: {
    iconBg: 'bg-forest-100',
    iconColor: 'text-forest-700',
    btnClass: 'bg-forest-700 hover:bg-forest-800 focus:ring-forest-500/40',
    defaultIcon: <CheckCircle2 className="w-6 h-6" />,
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
}) => {
  const config = VARIANT_CONFIG[variant];

  return (
    <Modal open={open} onClose={onClose} size="sm" showClose={false}>
      <div className="px-6 pt-6 pb-4 md:px-8 md:pt-8 md:pb-5 text-center">
        <div className={`w-12 h-12 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <span className={config.iconColor}>{icon || config.defaultIcon}</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-body-sm text-muted leading-relaxed">{message}</p>
      </div>
      <div className="px-6 pb-6 md:px-8 md:pb-8 flex items-center justify-center gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-5 py-2.5 text-body-sm font-medium text-warm-600 hover:bg-warm-100 rounded-xl transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-5 py-2.5 text-body-sm font-medium text-white rounded-xl shadow-soft transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.btnClass}`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
