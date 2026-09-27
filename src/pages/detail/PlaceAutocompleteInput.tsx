import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

// Autocomplete Input component using google.maps.places.Autocomplete widget
export interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectPlace: (placeName: string, coords: { lat: number; lng: number } | null, address: string) => void;
  className?: string;
  placeholder?: string;
  onBlur?: () => void;
}

export function PlaceAutocompleteInput({
  value,
  onChange,
  onSelectPlace,
  className,
  placeholder,
  onBlur
}: PlaceAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const isFocusedRef = useRef(false);
  const hasSelectedRef = useRef(false);
  const lastTypedValRef = useRef(value || '');

  useEffect(() => {
    if (!isFocusedRef.current && inputRef.current) {
      inputRef.current.value = value || '';
      lastTypedValRef.current = value || '';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const val = inputRef.current ? inputRef.current.value : (e.target as HTMLInputElement).value;
      onChange(val);
      (e.target as HTMLInputElement).blur();
    }
  };

  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  useEffect(() => {
    const google = (window as any).google;
    if (!google || !google.maps || !google.maps.places || !inputRef.current) {
      return;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address']
    });
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      try {
        const place = autocomplete.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const name = place.name || place.formatted_address || '';
          const address = place.formatted_address || name;
          hasSelectedRef.current = true; // Mark selection in progress to prevent blur race condition
          lastTypedValRef.current = address;
          if (inputRef.current) {
            inputRef.current.value = address;
          }
          onSelectPlaceRef.current(name, { lat, lng }, address);
        }
      } catch (err) {
        console.error("Autocomplete select failed:", err);
      }
    });

    return () => {
      if (google && google.maps && google.maps.event && listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, []);

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  // Ensure IME composition commit when window loses focus (e.g. clicking outside browser window, Chrome split view tab switch)
  useEffect(() => {
    const handleCommitOnFocusLoss = () => {
      if ((isFocusedRef.current || document.activeElement === inputRef.current) && inputRef.current) {
        const domVal = inputRef.current.value || '';
        const fallbackVal = lastTypedValRef.current || '';
        const finalVal = fallbackVal.length >= domVal.length ? fallbackVal : domVal;
        if (!hasSelectedRef.current && finalVal) {
          onChange(finalVal);
        }
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
  }, [onChange]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const capturedVal = e.target.value;
    if (capturedVal && capturedVal.length >= (lastTypedValRef.current?.length || 0)) {
      lastTypedValRef.current = capturedVal;
    }
    // Delay the blur action slightly to allow the place_changed listener to run first
    setTimeout(() => {
      isFocusedRef.current = false;
      const domVal = inputRef.current ? inputRef.current.value : '';
      const fallbackVal = lastTypedValRef.current;
      const finalVal = (fallbackVal && fallbackVal.length >= domVal.length) ? fallbackVal : domVal;
      if (hasSelectedRef.current) {
        hasSelectedRef.current = false; // Reset the flag
        if (onBlur) onBlur();
      } else {
        onChange(finalVal);
        if (onBlur) onBlur();
      }
    }, 150);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          defaultValue={value || ''}
          onFocus={handleFocus}
          onChange={(e) => {
            lastTypedValRef.current = e.target.value;
          }}
          onCompositionUpdate={(e) => {
            const val = (e.target as HTMLInputElement).value;
            if (val) lastTypedValRef.current = val;
          }}
          onCompositionEnd={(e) => {
            const val = (e.target as HTMLInputElement).value;
            lastTypedValRef.current = val;
            onChange(val);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={className}
          placeholder={placeholder}
        />
        <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-35" />
      </div>
    </div>
  );
}
