import React from 'react';
import { Check, Plus } from 'lucide-react';

// The one button for starting or confirming a trip, wherever it appears (spec 4.4).
// kind "new" opens the trip flow (Plus · "New trip"); kind "create" confirms it (Check · "Create trip").

interface NewTripButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  kind?: 'new' | 'create';
  size?: 'sm' | 'md' | 'lg';
  /** Full width */
  block?: boolean;
  /** Icon only below the sm breakpoint */
  compact?: boolean;
  label?: React.ReactNode;
  title?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export function NewTripButton({
  onClick, kind = 'new', size = 'md', block, compact, label, title, type = 'button', disabled, className = '',
}: NewTripButtonProps) {
  const Icon = kind === 'create' ? Check : Plus;
  const text = label ?? (kind === 'create' ? 'Create trip' : 'New trip');
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={typeof text === 'string' ? text : undefined}
      className={`btn btn-accent ${sizeClass} ${block ? 'w-full' : ''} ${compact ? (size === 'sm' ? 'max-sm:w-8' : 'max-sm:w-10') + ' max-sm:px-0' : ''} ${className}`}
    >
      <Icon className={size === 'lg' ? 'w-4 h-4 shrink-0' : 'w-3.5 h-3.5 shrink-0'} aria-hidden />
      <span className={`truncate ${compact ? 'max-sm:hidden' : ''}`}>{text}</span>
    </button>
  );
}

/** Keeps a trip-confirm button in view at the bottom of a scrolling panel (offset by the panel's p-4/p-5 so it sits on the edge) */
export function StickyTripAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky -bottom-4 sm:-bottom-5 z-10 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 bg-surface/95 dark:bg-surface-dark/95 border-t border-black/10 dark:border-white/10">
      {children}
    </div>
  );
}
