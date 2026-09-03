import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  discardLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onDiscard?: () => void;
  confirmVariant?: 'danger' | 'primary' | 'black';
}

export function ConfirmModal({
  isOpen,
  title = "UNSAVED CHANGES",
  message = "수정사항이 있는데 저장하시겠습니까?",
  confirmLabel = "YES (Y)",
  cancelLabel = "CANCEL (ESC)",
  discardLabel = "NO (N)",
  onConfirm,
  onCancel,
  onDiscard,
  confirmVariant = 'black',
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      } else if ((e.key === 'n' || e.key === 'N') && onDiscard) {
        e.preventDefault();
        e.stopPropagation();
        onDiscard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel, onDiscard]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-black dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest font-sans">
            {title}
          </h3>
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-black/75 dark:text-white/75 font-sans leading-relaxed break-keep font-medium">
          {message}
        </p>

        {/* Action Buttons: Clean 1-Row Grid with Short Labels */}
        <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-black/10 dark:border-white/10 font-sans text-xs font-black uppercase tracking-wider">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-2.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60 transition-colors cursor-pointer text-center whitespace-nowrap text-[11px]"
          >
            {cancelLabel}
          </button>
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="px-2 py-2.5 border border-red-600/30 text-red-600 dark:text-red-400 hover:bg-red-600/10 transition-colors cursor-pointer text-center whitespace-nowrap text-[11px]"
            >
              {discardLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-2 py-2.5 text-center transition-colors cursor-pointer shadow-sm whitespace-nowrap text-[11px] ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-85'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
