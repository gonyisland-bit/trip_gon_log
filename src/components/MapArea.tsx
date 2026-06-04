import React from 'react';
import { ExternalLink, MapPin, Map } from 'lucide-react';
import { Trip, TimelineItem } from '../types';

interface MapAreaProps {
  trip: Trip;
  isEditMode: boolean;
  mapPoints: TimelineItem[];
  expandedItemId: number | null;
  handleItemToggle: (id: number) => void;
  selectedDate: string;
}

export const MapArea: React.FC<MapAreaProps> = ({
  trip,
  isEditMode,
  mapPoints,
  expandedItemId,
  handleItemToggle,
  selectedDate,
}) => {
  return (
    <div 
      className="flex-grow relative bg-[#EAE8E3] dark:bg-[#1A1A1A] overflow-hidden transition-colors duration-300 cursor-pointer group/map"
      onClick={() => { if(!isEditMode) window.open(`https://maps.google.com/?q=${trip.locationStr}`, '_blank') }}
    >
      <img 
        src={trip.mapImg} 
        alt="Dynamic Map Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-30 grayscale contrast-125 mix-blend-multiply dark:mix-blend-screen pointer-events-none transition-all duration-700 group-hover/map:scale-105 group-hover/map:opacity-80"
      />
      <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] pointer-events-none"></div>

      {!isEditMode && (
        <div className="absolute inset-0 bg-black/0 group-hover/map:bg-black/5 dark:group-hover/map:bg-white/5 transition-colors z-0 flex items-center justify-center pointer-events-none">
          <div className="opacity-0 group-hover/map:opacity-100 bg-black text-white dark:bg-white dark:text-black px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all transform translate-y-4 group-hover/map:translate-y-0 duration-300 shadow-xl">
             <ExternalLink className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Open</span> {trip.locationStr}
          </div>
        </div>
      )}
      
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-colors" preserveAspectRatio="none">
        {mapPoints.map((p, index) => {
          if (index === 0) return null;
          const prevPoint = mapPoints[index - 1];
          if (prevPoint.x === undefined || prevPoint.y === undefined || p.x === undefined || p.y === undefined) return null;
          return (
            <line 
              key={`line-${p.id}`} 
              x1={`${prevPoint.x}%`} 
              y1={`${prevPoint.y}%`} 
              x2={`${p.x}%`} 
              y2={`${p.y}%`} 
              className="stroke-black/50 dark:stroke-white/50 stroke-[1.5px]" 
              strokeDasharray="4 4" 
            />
          );
        })}
      </svg>

      {mapPoints.map((pin) => {
        const isActive = expandedItemId === pin.id;
        if (pin.x === undefined || pin.y === undefined) return null;
        return (
          <div 
            key={`pin-${pin.id}`} 
            className={`absolute z-20 flex flex-col items-center group cursor-pointer transition-all duration-300 ${isActive ? 'z-30' : ''}`} 
            style={{ top: `${pin.y}%`, left: `${pin.x}%`, transform: 'translate(-50%, -50%)' }}
            onClick={(e) => { e.stopPropagation(); handleItemToggle(pin.id); }}
          >
            <div className={`rounded-full border-2 border-[#F9F8F6] dark:border-[#111111] shadow-md transition-all duration-300 flex items-center justify-center
              ${isActive ? 'w-4 h-4 md:w-5 md:h-5 bg-red-600 border-white ring-4 ring-red-500/30' : 'w-3 h-3 md:w-3.5 md:h-3.5 bg-black dark:bg-white'}
            `}>
              {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
            </div>
            <div className={`mt-1 text-[9px] md:text-[10px] uppercase font-bold bg-white/90 dark:bg-black/90 px-1.5 py-0.5 rounded shadow-sm transition-opacity pointer-events-none whitespace-nowrap
              ${isActive ? 'opacity-100 text-red-600 dark:text-red-400' : 'opacity-0 group-hover:opacity-100 text-black dark:text-white'}
            `}>{pin.place}</div>
          </div>
        );
      })}
      
      <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 flex justify-between z-20 pointer-events-none">
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur border border-black/20 dark:border-white/20 px-2 py-1.5 md:px-3 md:py-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors pointer-events-auto">
          <MapPin className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">{trip.locationStr} : </span> {selectedDate === 'ALL' ? 'Overall Routes' : 'Daily Route'}
        </div>
      </div>
    </div>
  );
};
