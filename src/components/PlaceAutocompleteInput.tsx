import React, { useRef, useEffect, useState } from 'react';
import { Search } from 'lucide-react';

interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectPlace: (placeName: string, coords: { lat: number; lng: number } | null, address: string, countryName?: string) => void;
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
      fields: ['geometry', 'name', 'formatted_address', 'address_components']
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
          // Extract country name from address_components for accuracy
          let countryName: string | undefined;
          if (place.address_components) {
            const countryComp = (place.address_components as any[]).find(
              (comp: any) => comp.types && comp.types.includes('country')
            );
            if (countryComp) countryName = countryComp.long_name;
          }
          hasSelectedRef.current = true;
          lastTypedValRef.current = address;
          if (inputRef.current) {
            inputRef.current.value = address;
          }
          onSelectPlaceRef.current(name, { lat, lng }, address, countryName);
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const capturedVal = e.target.value;
    if (capturedVal) lastTypedValRef.current = capturedVal;
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
        <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-35 text-black dark:text-white" />
      </div>
    </div>
  );
}
