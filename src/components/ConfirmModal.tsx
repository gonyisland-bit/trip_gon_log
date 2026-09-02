import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title = "CONFIRM DELETION",
  message = "정말 이 항목을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.",
  confirmLabel = "YES [Y]",
  cancelLabel = "NO [N]",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
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
        <p className="text-xs sm:text-sm text-black/70 dark:text-white/70 font-sans leading-relaxed break-keep">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10 font-sans text-xs font-black uppercase tracking-wider">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
