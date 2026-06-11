import React from 'react';
import { Train, Bus, Car, Trash2, Image as ImageIcon, MapPin } from 'lucide-react';
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
  onFocusPlace?: (type: 'depart' | 'arrive' | 'boarding') => void;
}

// Time conversion helpers
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function minutesToTimeStr(minutes: number): string {
  const positiveMin = Math.max(0, Math.min(1439, minutes));
  let hours = Math.floor(positiveMin / 60);
  const mins = positiveMin % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minsStr = String(mins).padStart(2, '0');
  return `${hours}:${minsStr} ${ampm}`;
}

function timeStrTo24h(timeStr: string): string {
  if (!timeStr) return '00:00';
  const minutes = parseTimeToMinutes(timeStr);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function time24hTo12h(val24h: string): string {
  if (!val24h) return '12:00 AM';
  const parts = val24h.split(':');
  const h24 = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return minutesToTimeStr(h24 * 60 + m);
}

export function TransitCard({
  transit,
  isEditMode,
  onUpdate,
  onDelete,
  isActive = false,
  onClick,
  onFocusPlace,
}: TransitCardProps) {
  const handlePlaceLinkClick = (e: React.MouseEvent, placeName: string) => {
    e.stopPropagation();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile
      ? `comgooglemaps://?q=${encodeURIComponent(placeName)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
    
    if (isMobile) {
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
      {/* Header bar */}
      <div className="bg-[#EAE8E3]/50 dark:bg-white/10 px-4 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center text-[10px] md:text-xs font-bold tracking-widest text-black/60 dark:text-white/60 gap-4">
        <div className="flex items-center gap-2">
          {(() => {
            const typeUpper = (transit.ticketType || '').toUpperCase();
            if (typeUpper.includes('BUS')) return <Bus className="w-3.5 h-3.5 animate-in fade-in duration-300" />;
            if (typeUpper.includes('TAXI') || typeUpper.includes('CAR')) return <Car className="w-3.5 h-3.5 animate-in fade-in duration-300" />;
            return <Train className="w-3.5 h-3.5 animate-in fade-in duration-300" />;
          })()}
          {isEditMode ? (
            <select
              value={transit.ticketType || 'TRAIN TICKET'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate(transit.id, 'ticketType', val);
                const typeUpper = val.toUpperCase();
                if (typeUpper.includes('BUS')) {
                  onUpdate(transit.id, 'transitType', 'bus');
                } else if (typeUpper.includes('TAXI') || typeUpper.includes('CAR')) {
                  onUpdate(transit.id, 'transitType', 'taxi');
                } else {
                  onUpdate(transit.id, 'transitType', 'train');
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm uppercase w-32 cursor-pointer"
            >
              <option value="TRAIN TICKET">TRAIN TICKET</option>
              <option value="BUS TICKET">BUS TICKET</option>
              <option value="TAXI TICKET">TAXI TICKET</option>
            </select>
          ) : (
            <span className="uppercase">{transit.ticketType || 'TRAIN TICKET'}</span>
          )}
        </div>
        {isEditMode ? (
          <input
            type="date"
            value={transit.date ? transit.date.replace(/\./g, '-') : ''}
            onChange={(e) => onUpdate(transit.id, 'date', e.target.value.replace(/-/g, '.'))}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-36 text-right"
          />
        ) : (
          <span>{transit.date}</span>
        )}
      </div>
      
      {/* Card Body */}
      <div className="p-4 md:p-6">
        <div className="flex flex-row items-center justify-between">
          <div className="flex-grow min-w-0 pr-4">
            {isEditMode ? (
              <input
                type="text"
                value={transit.title}
                onChange={(e) => onUpdate(transit.id, 'title', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none font-black text-lg md:text-xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full uppercase"
                placeholder="TRANSIT TITLE"
              />
            ) : (
              <h3 className="text-lg md:text-xl font-black tracking-tight leading-snug uppercase truncate">
                {transit.title}
              </h3>
            )}
            {isEditMode ? (
              <input
                type="text"
                value={transit.route}
                onChange={(e) => onUpdate(transit.id, 'route', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-xs md:text-sm text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full mt-1.5"
                placeholder="Route (e.g. City A → City B)"
              />
            ) : (
              <p className="text-xs md:text-sm text-black/50 dark:text-white/50 mt-1 block">
                {transit.route}
              </p>
            )}
            {isEditMode ? (
              <input
                type="time"
                value={timeStrTo24h(transit.time)}
                onChange={(e) => onUpdate(transit.id, 'time', time24hTo12h(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none font-bold text-2xl md:text-3xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full max-w-[144px] min-w-0 mt-3 text-center"
              />
            ) : (
              <div className="text-2xl md:text-4xl font-black mt-4 tracking-tighter leading-none">
                {transit.time}
              </div>
            )}
          </div>
          
          {/* Right Side: Seat & Booking Ref Box */}
          <div className="border border-black/10 dark:border-white/10 p-3 md:p-4 text-left w-28 md:w-36 shrink-0 bg-white/30 dark:bg-black/10">
            <div className="mb-3">
              <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">SEAT</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={transit.seat}
                  onChange={(e) => onUpdate(transit.id, 'seat', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full"
                  placeholder="Car 0, 00A"
                />
              ) : (
                <span className="text-xs md:text-sm font-bold text-black/80 dark:text-white/80 block">
                  {transit.seat}
                </span>
              )}
            </div>
            <div>
              <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">BOOKING REF</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={transit.bookingRef}
                  onChange={(e) => onUpdate(transit.id, 'bookingRef', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full uppercase"
                  placeholder="TRN-000"
                />
              ) : (
                <span className="text-xs md:text-sm font-bold text-black/80 dark:text-white/80 tracking-wider block">
                  {transit.bookingRef}
                </span>
              )}
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
                    transit.transitType === 'train' || (!transit.transitType || (transit.transitType !== 'bus' && transit.transitType !== 'taxi'))
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
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(transit.id, 'transitType', 'taxi');
                    onUpdate(transit.id, 'ticketType', 'TAXI TICKET');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                    transit.transitType === 'taxi'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> Taxi
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
                onClick={(e) => { e.stopPropagation(); onFocusPlace?.('depart'); }}
                className="flex items-center gap-2 text-black/80 dark:text-white/80 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer group/row"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-black/50 dark:text-white/50 group-hover/row:text-red-500" />
                <span className="font-bold shrink-0 text-[10px] tracking-widest uppercase opacity-60">DEPART:</span>
                <span 
                  onClick={(e) => { e.stopPropagation(); handlePlaceLinkClick(e, transit.departPlace!); }}
                  className="underline decoration-dotted cursor-pointer ml-1 hover:text-red-600 dark:hover:text-red-300"
                >
                  {transit.departPlace}
                </span>
              </div>
            )}
            {transit.arrivePlace && (
              <div 
                onClick={(e) => { e.stopPropagation(); onFocusPlace?.('arrive'); }}
                className="flex items-center gap-2 text-black/80 dark:text-white/80 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer group/row"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-black/50 dark:text-white/50 group-hover/row:text-red-500" />
                <span className="font-bold shrink-0 text-[10px] tracking-widest uppercase opacity-60">ARRIVE:</span>
                <span 
                  onClick={(e) => { e.stopPropagation(); handlePlaceLinkClick(e, transit.arrivePlace!); }}
                  className="underline decoration-dotted cursor-pointer ml-1 hover:text-red-600 dark:hover:text-red-300"
                >
                  {transit.arrivePlace}
                </span>
              </div>
            )}
            {transit.boardingPlace && (
              <div 
                onClick={(e) => { e.stopPropagation(); onFocusPlace?.('boarding'); }}
                className="flex items-center gap-2 text-black/80 dark:text-white/80 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer group/row"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-red-500 dark:text-red-400 group-hover/row:text-red-600" />
                <span className="font-bold shrink-0 text-[10px] tracking-widest uppercase opacity-60">BOARDING AT:</span>
                <span 
                  onClick={(e) => { e.stopPropagation(); handlePlaceLinkClick(e, transit.boardingPlace!); }}
                  className="underline decoration-dotted cursor-pointer ml-1 hover:text-red-600 dark:hover:text-red-300"
                >
                  {transit.boardingPlace}
                </span>
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
          onClick={(e) => { e.stopPropagation(); onDelete(transit.id); }}
          className="absolute bottom-2 right-2 p-1 text-red-500 hover:text-red-700 transition-colors z-10"
          title="Delete Transit"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
