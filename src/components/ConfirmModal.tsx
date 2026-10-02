import React, { useEffect, useState, useRef } from 'react';
import { Art } from '../art/Art';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Info, X } from 'lucide-react';

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
  confirmLabel = "Save (Y)",
  cancelLabel = "Skip (Esc)",
  discardLabel = "Discard (N)",
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
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const clearTimers = () => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleImmediateClose = (action: () => void) => {
    clearTimers();
    setIsFadingOut(false);
    action();
  };

  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      setIsFadingOut(false);
      return;
    }

    // Immediately focus confirm button so Enter/Space/Escape hit directly
    const focusTimer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 10);

    if (autoDismiss) {
      const fadeDuration = 300;
      const startFadeAfter = Math.max(200, autoDismissDuration - fadeDuration);

      fadeTimerRef.current = setTimeout(() => {
        setIsFadingOut(true);
      }, startFadeAfter);

      closeTimerRef.current = setTimeout(() => {
        handleImmediateClose(onCancel);
      }, autoDismissDuration);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape ALWAYS closes modal immediately
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleImmediateClose(onCancel);
        return;
      }

      // Enter or Space immediately confirms and closes singleButton / autoDismiss / any modal
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleImmediateClose(onConfirm);
        return;
      }

      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.key === 'y' || e.key === 'Y' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleImmediateClose(onConfirm);
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (onDiscard) {
          handleImmediateClose(onDiscard);
        } else {
          handleImmediateClose(onCancel);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      clearTimers();
    };
  }, [isOpen, onConfirm, onCancel, onDiscard, autoDismiss, autoDismissDuration, singleButton]);

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

  return createPortal(
    <div 
      className={`fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={() => handleImmediateClose(onCancel)}
    >
      <div 
        className={`relative w-full max-w-sm bg-surface dark:bg-surface-dark rounded-card shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-black dark:text-white transition-transform duration-300 ${
          isFadingOut ? 'scale-95' : 'scale-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right close X button */}
        <button
          type="button"
          onClick={() => handleImmediateClose(onCancel)}
          className="tap-target absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer"
          title="닫기 (ESC)"
        >
          <X className="w-4 h-4" />
        </button>

        {iconType === 'check' && singleButton && <Art id="done-check" className="h-24 w-auto self-center" />}

        {/* Header: Swiss Minimal Black/White Icon & Clean Uppercase Title */}
        <div className="flex items-center gap-2 pr-6 text-black dark:text-white">
          {renderIcon()}
          <h3 className="text-xs sm:text-sm font-mono font-extrabold uppercase tracking-widest">
            {title}
          </h3>
        </div>

        {/* Message: Single-line English Question / Notification */}
        <p className="text-xs sm:text-sm text-black/80 dark:text-white/80 font-sans leading-relaxed break-keep font-medium whitespace-pre-line">
          {message}
        </p>

        {/* Action Buttons: Clean 1-Row Grid with Short Labels */}
        <div className={`grid ${gridColsClass} gap-2 pt-1`}>
          {!singleButton && (
            <button
              type="button"
              onClick={() => handleImmediateClose(onCancel)}
              className="btn btn-secondary px-2"
            >
              {cancelLabel}
            </button>
          )}

          {onDiscard && !singleButton && (
            <button
              type="button"
              onClick={() => handleImmediateClose(onDiscard)}
              className="btn btn-secondary px-2"
            >
              {discardLabel}
            </button>
          )}

          <button
            ref={confirmButtonRef}
            type="button"
            onClick={() => handleImmediateClose(onConfirm)}
            className={`btn px-2 ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
