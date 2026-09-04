import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Info } from 'lucide-react';

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
  iconType?: 'alert' | 'check' | 'info';
  autoDismiss?: boolean;
  autoDismissDuration?: number;
  singleButton?: boolean;
}

export function ConfirmModal({
  isOpen,
  title = "UNSAVED CHANGES",
  message = "Are you sure?",
  confirmLabel = "SAVE (Y)",
  cancelLabel = "SKIP (ESC)",
  discardLabel = "DISCARD (N)",
  onConfirm,
  onCancel,
  onDiscard,
  confirmVariant = 'black',
  iconType = 'alert',
  autoDismiss = false,
  autoDismissDuration = 2000,
  singleButton = false,
}: ConfirmModalProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsFadingOut(false);
      return;
    }

    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    if (autoDismiss) {
      const fadeDuration = 300;
      const startFadeAfter = Math.max(200, autoDismissDuration - fadeDuration);

      fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, startFadeAfter);

      closeTimer = setTimeout(() => {
        onCancel();
      }, autoDismissDuration);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'y' || e.key === 'Y' || e.key === 's' || e.key === 'S' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      } else if ((e.key === 'n' || e.key === 'N' || e.key === 'd' || e.key === 'D') && onDiscard) {
        e.preventDefault();
        e.stopPropagation();
        onDiscard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [isOpen, onConfirm, onCancel, onDiscard, autoDismiss, autoDismissDuration]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (iconType === 'check') {
      return <Check className="w-4 h-4 shrink-0 text-black dark:text-white" />;
    }
    if (iconType === 'info') {
      return <Info className="w-4 h-4 shrink-0 text-black dark:text-white" />;
    }
    return <AlertTriangle className="w-4 h-4 shrink-0 text-black dark:text-white" />;
  };

  const gridColsClass = singleButton 
    ? 'grid-cols-1' 
    : onDiscard 
      ? 'grid-cols-3' 
      : 'grid-cols-2';

  return (
    <div 
      className={`fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={onCancel}
    >
      <div 
        className={`w-full max-w-sm bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-black dark:text-white transition-transform duration-300 ${
          isFadingOut ? 'scale-95' : 'scale-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Swiss Minimal Black/White Icon & Clean Uppercase Title */}
        <div className="flex items-center gap-2 text-black dark:text-white">
          {renderIcon()}
          <h3 className="text-xs sm:text-sm font-mono font-black uppercase tracking-widest">
            {title}
          </h3>
        </div>

        {/* Message: Single-line English Question / Notification */}
        <p className="text-xs sm:text-sm text-black/80 dark:text-white/80 font-sans leading-relaxed break-keep font-medium">
          {message}
        </p>

        {/* Action Buttons: Clean 1-Row Grid with Short Labels */}
        <div className={`grid ${gridColsClass} gap-1.5 pt-3 border-t border-black/10 dark:border-white/10 font-sans text-xs font-black uppercase tracking-wider`}>
          {!singleButton && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-2.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60 transition-colors cursor-pointer text-center whitespace-nowrap text-[11px]"
            >
              {cancelLabel}
            </button>
          )}

          {onDiscard && !singleButton && (
            <button
              type="button"
              onClick={onDiscard}
              className="px-2 py-2.5 border border-black/25 dark:border-white/25 text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-center whitespace-nowrap text-[11px]"
            >
              {discardLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`px-2 py-2.5 text-center transition-colors cursor-pointer shadow-sm whitespace-nowrap text-[11px] ${
              confirmVariant === 'danger'
                ? 'bg-black text-white dark:bg-white dark:text-black hover:opacity-85'
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
