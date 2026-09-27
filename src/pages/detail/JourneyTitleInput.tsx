import React, { useRef, useEffect } from 'react';

export interface JourneyTitleInputProps {
  initialTitle: string;
  onUpdateTitle: (title: string) => void;
}

export function JourneyTitleInput({ initialTitle, onUpdateTitle }: JourneyTitleInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  const lastTypedValRef = useRef(initialTitle || '');
  const blurTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isFocusedRef.current && inputRef.current) {
      if (lastTypedValRef.current && lastTypedValRef.current !== initialTitle && lastTypedValRef.current.trim() !== '') {
        commitTitle(lastTypedValRef.current);
        return;
      }
      inputRef.current.value = initialTitle || '';
      lastTypedValRef.current = initialTitle || '';
    }
  }, [initialTitle]);

  const commitTitle = (valOverride?: string) => {
    const rawVal = valOverride !== undefined ? valOverride : (inputRef.current ? inputRef.current.value : lastTypedValRef.current);
    const finalVal = (lastTypedValRef.current && lastTypedValRef.current.length >= rawVal.length)
      ? lastTypedValRef.current
      : rawVal;
    if (inputRef.current) inputRef.current.value = finalVal;
    onUpdateTitle(finalVal);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    lastTypedValRef.current = e.target.value;
  };

  const handleCompositionUpdate = (e: React.CompositionEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value;
    if (val) lastTypedValRef.current = val;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value;
    lastTypedValRef.current = val;
    commitTitle(val);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const capturedVal = e.target.value;
    if (capturedVal && capturedVal.length >= (lastTypedValRef.current?.length || 0)) {
      lastTypedValRef.current = capturedVal;
    }
    const domVal = inputRef.current ? inputRef.current.value : capturedVal;
    const fallbackVal = lastTypedValRef.current;
    const bestVal = (fallbackVal && fallbackVal.length >= domVal.length) ? fallbackVal : domVal;
    commitTitle(bestVal);

    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      isFocusedRef.current = false;
    }, 50);
  };

  // Ensure title commit when window loses focus (e.g. clicking outside browser window, Chrome split view tab switch)
  useEffect(() => {
    const handleCommitOnFocusLoss = () => {
      if ((isFocusedRef.current || document.activeElement === inputRef.current) && inputRef.current) {
        const domVal = inputRef.current.value || '';
        const fallbackVal = lastTypedValRef.current || '';
        const bestVal = (fallbackVal && fallbackVal.length >= domVal.length) ? fallbackVal : domVal;
        commitTitle(bestVal);
      }
    };
    window.addEventListener('blur', handleCommitOnFocusLoss);
    document.addEventListener('visibilitychange', handleCommitOnFocusLoss);
    window.addEventListener('pagehide', handleCommitOnFocusLoss);
    return () => {
      window.removeEventListener('blur', handleCommitOnFocusLoss);
      document.removeEventListener('visibilitychange', handleCommitOnFocusLoss);
      window.removeEventListener('pagehide', handleCommitOnFocusLoss);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitTitle();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={initialTitle || ''}
      onFocus={() => { 
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        isFocusedRef.current = true; 
      }}
      onChange={handleInput}
      onCompositionUpdate={handleCompositionUpdate}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="text-base sm:text-lg md:text-xl font-extrabold uppercase bg-black/5 dark:bg-white/10 border border-black/15 dark:border-white/15 px-2.5 py-1 outline-none w-full text-black dark:text-white rounded font-satoshi"
      placeholder="JOURNEY TITLE"
    />
  );
}
