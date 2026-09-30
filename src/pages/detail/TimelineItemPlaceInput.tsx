import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Star } from 'lucide-react';

export interface TimelineItemPlaceInputProps {
  itemId: number;
  initialValue: string;
  onUpdatePlace: (id: number, val: string) => void;
  frequentPlaces: any[];
  onSelectFrequent: (item: any, fp: any) => void;
  toggleFrequentPlace: (item: any) => void;
  isFrequent: (place: string) => boolean;
  item: any;
}

export function TimelineItemPlaceInput({
  itemId,
  initialValue,
  onUpdatePlace,
  frequentPlaces,
  onSelectFrequent,
  toggleFrequentPlace,
  isFrequent,
  item,
}: TimelineItemPlaceInputProps) {
  const [filterVal, setFilterVal] = useState(initialValue || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  const lastTypedValRef = useRef(initialValue || '');
  const blurTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isFocusedRef.current && inputRef.current) {
      if (lastTypedValRef.current && lastTypedValRef.current !== initialValue && lastTypedValRef.current.trim() !== '') {
        commitValue(lastTypedValRef.current);
        return;
      }
      inputRef.current.value = initialValue || '';
      lastTypedValRef.current = initialValue || '';
      setFilterVal(initialValue || '');
    }
  }, [initialValue]);

  const commitValue = (valOverride?: string) => {
    const rawVal = valOverride !== undefined ? valOverride : (inputRef.current ? inputRef.current.value : filterVal);
    const finalVal = (lastTypedValRef.current && lastTypedValRef.current.length >= rawVal.length)
      ? lastTypedValRef.current
      : rawVal;
    if (inputRef.current) inputRef.current.value = finalVal;
    setFilterVal(finalVal);
    onUpdatePlace(itemId, finalVal);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    lastTypedValRef.current = val;
    setFilterVal(val);
  };

  const handleCompositionUpdate = (e: React.CompositionEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value;
    if (val) {
      lastTypedValRef.current = val;
      setFilterVal(val);
    }
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value;
    lastTypedValRef.current = val;
    setFilterVal(val);
    commitValue(val);
  };

  const handleFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    isFocusedRef.current = true;
    setShowDropdown(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const capturedVal = e.target.value;
    if (capturedVal && capturedVal.length >= (lastTypedValRef.current?.length || 0)) {
      lastTypedValRef.current = capturedVal;
    }
    const domVal = inputRef.current ? inputRef.current.value : capturedVal;
    const fallbackVal = lastTypedValRef.current;
    const finalVal = (fallbackVal && fallbackVal.length >= domVal.length) ? fallbackVal : domVal;
    commitValue(finalVal);

    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      isFocusedRef.current = false;
      setShowDropdown(false);
    }, 150);
  };

  // Ensure place value commit when window loses focus (e.g. clicking outside browser window, Chrome split view tab switch)
  useEffect(() => {
    const handleCommitOnFocusLoss = () => {
      if ((isFocusedRef.current || document.activeElement === inputRef.current) && inputRef.current) {
        const domVal = inputRef.current.value || '';
        const fallbackVal = lastTypedValRef.current || '';
        const finalVal = (fallbackVal && fallbackVal.length >= domVal.length) ? fallbackVal : domVal;
        commitValue(finalVal);
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
  }, [itemId, filterVal]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleSelect = (fp: any) => {
    if (inputRef.current) {
      inputRef.current.value = fp.place;
    }
    lastTypedValRef.current = fp.place;
    setFilterVal(fp.place);
    commitValue(fp.place);
    onSelectFrequent(item, fp);
    setShowDropdown(false);
  };

  const filteredFrequent = frequentPlaces.filter(fp =>
    fp.place.toLowerCase().includes((filterVal || '').toLowerCase())
  );

  return (
    <div className="w-full relative">
      <div className="flex items-center gap-1.5 w-full relative">
        <input
          ref={inputRef}
          id={`title-input-${itemId}`}
          type="text"
          defaultValue={initialValue || ''}
          onChange={handleInput}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-surface dark:bg-surface-dark h-9 px-3.5 outline-none font-bold text-sm md:text-base text-black dark:text-white rounded-full border border-black/15 dark:border-white/15 focus:border-black/40 dark:focus:border-white/40 w-full select-text"
          placeholder="일정 이름"
        />
        <button 
          type="button"
          onClick={() => toggleFrequentPlace(item)}
          className="tap-target p-1 hover:text-amber-500 text-black/60 dark:text-white/60 transition-colors shrink-0"
          title={isFrequent(inputRef.current?.value || filterVal) ? "자주 가는 장소 등록 해제" : "자주 가는 장소로 등록"}
        >
          <Star className={`w-3.5 h-3.5 ${isFrequent(inputRef.current?.value || filterVal) ? 'fill-amber-400 text-amber-500' : ''}`} />
        </button>
      </div>

      {/* Frequent Places Auto-complete Dropdown */}
      {showDropdown && filteredFrequent.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 shadow-xl z-50 max-h-40 overflow-y-auto rounded-thumb py-1" onClick={(e) => e.stopPropagation()}>
          <div className="px-2 py-1 text-micro font-bold text-black/60 dark:text-white/60 border-b border-black/5 dark:border-white/5 uppercase tracking-widest">
            자주 사용하는 장소
          </div>
          {filteredFrequent.map((fp, idx) => (
            <div 
              key={idx}
              onMouseDown={() => handleSelect(fp)}
              className="px-2.5 py-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left border-b border-black/5 dark:border-white/5 last:border-b-0 text-xs font-bold text-black dark:text-white"
            >
              <div className="font-bold flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-red-500" />
                {fp.place}
              </div>
              {fp.location && <div className="text-meta text-black/60 dark:text-white/60 truncate pl-4.5">{fp.location}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
