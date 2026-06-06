import React from 'react';
import { Train, Bus, Trash2, Image as ImageIcon, MapPin } from 'lucide-react';
import { TransitItem } from '../types';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { ImageEditOverlay } from './ImageEditOverlay';

interface TransitCardProps {
  transit: TransitItem;
  isEditMode: boolean;
  onUpdate: (id: number, field: keyof TransitItem, val: any) => void;
  onDelete: (id: number) => void;
  isActive?: boolean;
  onClick?: () => void;
}

export function TransitCard({
  transit,
  isEditMode,
  onUpdate,
  onDelete,
  isActive = false,
  onClick,
}: TransitCardProps) {
  const textEditableClass = isEditMode 
    ? 'outline-dashed outline-1 outline-red-500/40 hover:bg-black/5 dark:hover:bg-white/5 cursor-text transition-all rounded px-1' 
    : '';

  const handleBlur = (field: keyof TransitItem, e: React.FocusEvent<HTMLSpanElement>) => {
    onUpdate(transit.id, field, e.currentTarget.innerText.trim());
  };

  const handlePlaceLinkClick = (e: React.MouseEvent, placeName: string) => {
    e.stopPropagation();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile
      ? `comgooglemaps://?q=${encodeURIComponent(placeName)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
    
    if (isMobile) {
      // Try opening app first, fallback to browser
      window.location.href = url;
      setTimeout(() => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`, '_blank');
      }, 500);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div 
      onClick={!isEditMode ? onClick : undefined}
      className={`border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a] mb-6 font-sans text-black dark:text-white relative shadow-sm transition-all duration-300 ${
        !isEditMode ? 'cursor-pointer hover:shadow-md hover:border-black/20 dark:hover:border-white/20' : ''
      } ${isActive && !isEditMode ? 'ring-1 ring-red-500/50 dark:ring-red-400/50 shadow-md' : ''}`}
    >
      {/* Header bar with grey background */}
      <div className="bg-[#EAE8E3]/50 dark:bg-white/10 px-4 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center text-[10px] md:text-xs font-bold tracking-widest text-black/60 dark:text-white/60">
        <div className="flex items-center gap-2">
          {transit.transitType === 'bus' ? (
            <Bus className="w-3.5 h-3.5" />
          ) : (
            <Train className="w-3.5 h-3.5" />
          )}
          <span 
            contentEditable={isEditMode} 
            suppressContentEditableWarning 
            onBlur={(e) => handleBlur('ticketType', e)}
            className={`uppercase ${textEditableClass}`}
          >
            {transit.ticketType || (transit.transitType === 'bus' ? 'BUS TICKET' : 'TRAIN TICKET')}
          </span>
        </div>
        <span 
          contentEditable={isEditMode} 
          suppressContentEditableWarning 
          onBlur={(e) => handleBlur('date', e)}
          className={textEditableClass}
        >
          {transit.date}
        </span>
      </div>
      
      {/* Card Body */}
      <div className="p-4 md:p-6">
        <div className="flex flex-row items-center justify-between">
          <div className="flex-grow">
            <h3 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('title', e)}
              className={`text-lg md:text-xl font-black tracking-tight leading-snug uppercase ${textEditableClass}`}
            >
              {transit.title}
            </h3>
            <p 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('route', e)}
              className={`text-xs md:text-sm text-black/50 dark:text-white/50 mt-1 block ${textEditableClass}`}
            >
              {transit.route}
            </p>
            <div 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('time', e)}
              className={`text-2xl md:text-4xl font-black mt-4 tracking-tighter leading-none ${textEditableClass}`}
            >
              {transit.time}
            </div>
          </div>
          
          {/* Right Side: Seat & Booking Ref Box */}
          <div className="border border-black/10 dark:border-white/10 p-3 md:p-4 text-left w-28 md:w-36 shrink-0 bg-white/30 dark:bg-black/10">
            <div className="mb-3">
              <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">SEAT</span>
              <span 
                contentEditable={isEditMode} 
                suppressContentEditableWarning 
                onBlur={(e) => handleBlur('seat', e)}
                className={`text-xs md:text-sm font-bold text-black/80 dark:text-white/80 block ${textEditableClass}`}
              >
                {transit.seat}
              </span>
            </div>
            <div>
              <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">BOOKING REF</span>
              <span 
                contentEditable={isEditMode} 
                suppressContentEditableWarning 
                onBlur={(e) => handleBlur('bookingRef', e)}
                className={`text-xs md:text-sm font-bold text-black/80 dark:text-white/80 tracking-wider block ${textEditableClass}`}
              >
                {transit.bookingRef}
              </span>
            </div>
          </div>
        </div>

        {/* Edit mode: Transit Type, Autocompletes, Boarding Image */}
        {isEditMode && (
          <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10 space-y-4">
            {/* Transit Type Selector */}
            <div>
              <label className="text-[9px] text-black/40 dark:text-white/40 uppercase font-black tracking-widest block mb-2">Transit Type (교통 종류)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(transit.id, 'transitType', 'train');
                    onUpdate(transit.id, 'ticketType', 'TRAIN TICKET');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                    transit.transitType !== 'bus'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Train className="w-3.5 h-3.5" /> Train
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(transit.id, 'transitType', 'bus');
                    onUpdate(transit.id, 'ticketType', 'BUS TICKET');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                    transit.transitType === 'bus'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Bus className="w-3.5 h-3.5" /> Bus
                </button>
              </div>
            </div>

            {/* Departure Autocomplete */}
            <div>
              <label className="text-[9px] text-black/40 dark:text-white/40 uppercase font-black tracking-widest block mb-1">Departure Place (출발 장소)</label>
              <PlaceAutocompleteInput
                value={transit.departPlace || ''}
                onChange={(val) => {
                  onUpdate(transit.id, 'departPlace', val);
                  const newRoute = `${val} → ${transit.arrivePlace || ''}`;
                  onUpdate(transit.id, 'route', newRoute);
                }}
                onSelectPlace={(name, coords) => {
                  onUpdate(transit.id, 'departPlace', name);
                  const newRoute = `${name} → ${transit.arrivePlace || ''}`;
                  onUpdate(transit.id, 'route', newRoute);
                  if (coords) {
                    onUpdate(transit.id, 'departLat', coords.lat);
                    onUpdate(transit.id, 'departLng', coords.lng);
                  }
                }}
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none py-1 text-xs md:text-sm text-black dark:text-white"
                placeholder="Search departure terminal/station..."
              />
            </div>

            {/* Arrival Autocomplete */}
            <div>
              <label className="text-[9px] text-black/40 dark:text-white/40 uppercase font-black tracking-widest block mb-1">Arrival Place (도착 장소)</label>
              <PlaceAutocompleteInput
                value={transit.arrivePlace || ''}
                onChange={(val) => {
                  onUpdate(transit.id, 'arrivePlace', val);
                  const newRoute = `${transit.departPlace || ''} → ${val}`;
                  onUpdate(transit.id, 'route', newRoute);
                }}
                onSelectPlace={(name, coords) => {
                  onUpdate(transit.id, 'arrivePlace', name);
                  const newRoute = `${transit.departPlace || ''} → ${name}`;
                  onUpdate(transit.id, 'route', newRoute);
                  if (coords) {
                    onUpdate(transit.id, 'arriveLat', coords.lat);
                    onUpdate(transit.id, 'arriveLng', coords.lng);
                  }
                }}
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none py-1 text-xs md:text-sm text-black dark:text-white"
                placeholder="Search arrival terminal/station..."
              />
            </div>

            {/* Boarding Autocomplete */}
            <div>
              <label className="text-[9px] text-black/40 dark:text-white/40 uppercase font-black tracking-widest block mb-1">Boarding Place (타는 곳/플랫폼)</label>
              <PlaceAutocompleteInput
                value={transit.boardingPlace || ''}
                onChange={(val) => onUpdate(transit.id, 'boardingPlace', val)}
                onSelectPlace={(name, coords) => {
                  onUpdate(transit.id, 'boardingPlace', name);
                  if (coords) {
                    onUpdate(transit.id, 'boardingLat', coords.lat);
                    onUpdate(transit.id, 'boardingLng', coords.lng);
                  }
                }}
                className="w-full bg-transparent border-b border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none py-1 text-xs md:text-sm text-black dark:text-white"
                placeholder="Search boarding location..."
              />
            </div>

            {/* Boarding Image */}
            <div>
              <label className="text-[9px] text-black/40 dark:text-white/40 uppercase font-black tracking-widest block mb-1">Boarding Place Photo (타는 곳 참고 사진)</label>
              <div className="relative w-full h-40 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 overflow-hidden group flex items-center justify-center">
                {transit.boardingImg ? (
                  <img src={transit.boardingImg} className="w-full h-full object-cover" alt="Boarding reference" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-black/30 dark:text-white/30">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">No Photo Added</span>
                  </div>
                )}
                <ImageEditOverlay
                  isEditMode={isEditMode}
                  onImageUploaded={(url) => onUpdate(transit.id, 'boardingImg', url)}
                />
              </div>
            </div>
          </div>
        )}

        {/* View mode details (Shown if expanded) */}
        {!isEditMode && isActive && (
          <div className="mt-4 pt-4 border-t border-black/15 dark:border-white/15 space-y-3 text-xs md:text-sm animate-in slide-in-from-top duration-200">
            {transit.departPlace && (
              <div 
                onClick={(e) => handlePlaceLinkClick(e, transit.departPlace!)}
                className="flex items-center gap-2 text-black/80 dark:text-white/80 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-black/50 dark:text-white/50" />
                <span className="font-bold shrink-0 text-[10px] tracking-widest uppercase opacity-60">DEPART:</span>
                <span className="underline decoration-dotted cursor-pointer">{transit.departPlace}</span>
              </div>
            )}
            {transit.arrivePlace && (
              <div 
                onClick={(e) => handlePlaceLinkClick(e, transit.arrivePlace!)}
                className="flex items-center gap-2 text-black/80 dark:text-white/80 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-black/50 dark:text-white/50" />
                <span className="font-bold shrink-0 text-[10px] tracking-widest uppercase opacity-60">ARRIVE:</span>
                <span className="underline decoration-dotted cursor-pointer">{transit.arrivePlace}</span>
              </div>
            )}
            {transit.boardingPlace && (
              <div 
                onClick={(e) => handlePlaceLinkClick(e, transit.boardingPlace!)}
                className="flex items-center gap-2 text-black/80 dark:text-white/80 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-red-500 dark:text-red-400" />
                <span className="font-bold shrink-0 text-[10px] tracking-widest uppercase opacity-60">BOARDING AT:</span>
                <span className="underline decoration-dotted cursor-pointer">{transit.boardingPlace}</span>
              </div>
            )}
            {transit.boardingImg && (
              <div className="mt-2">
                <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-1">Boarding Place Reference Photo</span>
                <img 
                  src={transit.boardingImg} 
                  alt="Boarding point reference" 
                  className="w-full max-h-48 object-cover border border-black/10 dark:border-white/10"
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Delete button in edit mode */}
      {isEditMode && (
        <button 
          onClick={() => onDelete(transit.id)}
          className="absolute bottom-2 right-2 p-1 text-red-500 hover:text-red-700 transition-colors"
          title="Delete Transit"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
