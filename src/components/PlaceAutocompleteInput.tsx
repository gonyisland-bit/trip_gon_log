import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface PlaceAutocompleteInputProps {
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
      const place = autocomplete.getPlace();
      if (place && place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const name = place.name || place.formatted_address || '';
        const address = place.formatted_address || name;
        onSelectPlace(name, { lat, lng }, address);
      }
    });

    return () => {
      if (google && google.maps && google.maps.event && listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [onSelectPlace]);

  useEffect(() => {
    if (inputRef.current && value !== undefined && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={className}
          placeholder={placeholder}
        />
        <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-35 text-black dark:text-white" />
      </div>
    </div>
  );
}
