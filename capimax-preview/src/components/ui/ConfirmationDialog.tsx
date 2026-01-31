import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { Button } from './Button';

export type ConfirmationType = 'warning' | 'danger' | 'info' | 'success';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  isLoading?: boolean;
  details?: {
    label: string;
    value: string | number;
  }[];
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    confirmButtonClass: 'bg-amber-600 hover:bg-amber-700',
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    confirmButtonClass: 'bg-red-600 hover:bg-red-700',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    confirmButtonClass: 'bg-blue-600 hover:bg-blue-700',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700',
  },
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false,
  details,
}) => {
  const config = typeConfig[type];
  const Icon = config.icon;

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={!isLoading ? onClose : undefined}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                {/* Close button */}
                {!isLoading && (
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-lg
                             text-slate-400 hover:text-slate-600
                             dark:text-slate-500 dark:hover:text-slate-300
                             hover:bg-slate-100 dark:hover:bg-slate-700
                             transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${config.iconBg}`}>
                    <Icon className={`w-8 h-8 ${config.iconColor}`} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-center text-slate-900 dark:text-white">
                  {title}
                </h3>
              </div>

              {/* Content */}
              <div className="px-6 pb-4">
                {/* Message */}
                <div className="text-center text-slate-600 dark:text-slate-300 mb-4">
                  {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                {/* Details */}
                {details && details.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-2">
                    {details.map((detail, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-slate-500 dark:text-slate-400">
                          {detail.label}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {detail.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {cancelText}
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isLoading}
                  loading={isLoading}
                  className={`flex-1 text-white ${config.confirmButtonClass}`}
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Hook for easy confirmation dialog usage
export const useConfirmation = () => {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    props: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    props: { title: '', message: '' },
    resolve: null,
  });

  const confirm = React.useCallback(
    (props: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>) => {
      return new Promise<boolean>((resolve) => {
        setState({
          isOpen: true,
          props,
          resolve,
        });
      });
    },
    []
  );

  const handleClose = React.useCallback(() => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const ConfirmDialog = React.useCallback(
    () => (
      <ConfirmationDialog
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        {...state.props}
      />
    ),
    [state.isOpen, state.props, handleClose, handleConfirm]
  );

  return { confirm, ConfirmDialog };
};

export default ConfirmationDialog;
