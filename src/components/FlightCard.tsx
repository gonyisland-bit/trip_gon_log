import React from 'react';
import { Plane, Trash2 } from 'lucide-react';
import { FlightItem } from '../types';

interface FlightCardProps {
  flight: FlightItem;
  isEditMode: boolean;
  onUpdate: (id: number, field: keyof FlightItem, val: string) => void;
  onDelete: (id: number) => void;
}

export function FlightCard({
  flight,
  isEditMode,
  onUpdate,
  onDelete,
}: FlightCardProps) {
  const textEditableClass = isEditMode 
    ? 'outline-dashed outline-1 outline-red-500/40 hover:bg-black/5 dark:hover:bg-white/5 cursor-text transition-all rounded px-1' 
    : '';

  const handleBlur = (field: keyof FlightItem, e: React.FocusEvent<HTMLSpanElement>) => {
    onUpdate(flight.id, field, e.currentTarget.innerText.trim());
  };

  return (
    <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a] mb-6 font-sans text-black dark:text-white relative shadow-sm">
      {/* Header bar with grey background */}
      <div className="bg-[#EAE8E3]/50 dark:bg-white/10 px-4 py-2 flex justify-between items-center text-[10px] md:text-xs font-bold tracking-widest text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10">
        <span 
          contentEditable={isEditMode} 
          suppressContentEditableWarning 
          onBlur={(e) => handleBlur('title', e)}
          className={`uppercase ${textEditableClass}`}
        >
          {flight.title}
        </span>
        <span 
          contentEditable={isEditMode} 
          suppressContentEditableWarning 
          onBlur={(e) => handleBlur('date', e)}
          className={textEditableClass}
        >
          {flight.date}
        </span>
      </div>
      
      {/* Card Body */}
      <div className="p-4 md:p-6 flex flex-row items-center">
        {/* Left Side: Route and Airport Codes */}
        <div className="flex-grow flex items-center justify-around pr-4">
          {/* Departure */}
          <div className="text-center">
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('fromCode', e)}
              className={`text-2xl md:text-4xl font-black tracking-tighter block leading-none ${textEditableClass}`}
            >
              {flight.fromCode}
            </span>
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('fromTerminal', e)}
              className={`text-[9px] md:text-[10px] text-black/50 dark:text-white/50 mt-1.5 uppercase font-bold block ${textEditableClass}`}
            >
              {flight.fromTerminal}
            </span>
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('fromTime', e)}
              className={`text-xs md:text-sm font-bold mt-2 block ${textEditableClass}`}
            >
              {flight.fromTime}
            </span>
          </div>
          
          {/* Connection Line & Flight Number */}
          <div className="flex flex-col items-center mx-2 shrink-0">
            <Plane className="w-4 h-4 text-black/40 dark:text-white/40 rotate-90" />
            <div className="h-[1px] w-12 md:w-24 bg-black/20 dark:bg-white/20 my-1 relative">
              <span 
                contentEditable={isEditMode} 
                suppressContentEditableWarning 
                onBlur={(e) => handleBlur('flightNo', e)}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#1a1a1a] px-2 text-[9px] md:text-[10px] font-bold text-black/60 dark:text-white/60 tracking-wider whitespace-nowrap ${textEditableClass}`}
              >
                {flight.flightNo}
              </span>
            </div>
            {/* Layover Info */}
            {(flight.layoverCode || isEditMode) && (
              <div className="text-[9px] md:text-[10px] font-bold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                {isEditMode ? (
                  <>
                    <span className="opacity-50">경유:</span>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdate(flight.id, 'layoverCode', e.currentTarget.innerText.trim())}
                      className={`uppercase min-w-[30px] inline-block text-center border-b border-dashed border-red-500/30 ${textEditableClass}`}
                    >
                      {flight.layoverCode || ''}
                    </span>
                    <span className="opacity-50 ml-1">시간:</span>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdate(flight.id, 'layoverTime', e.currentTarget.innerText.trim())}
                      className={`min-w-[40px] inline-block text-center border-b border-dashed border-red-500/30 ${textEditableClass}`}
                    >
                      {flight.layoverTime || ''}
                    </span>
                  </>
                ) : (
                  flight.layoverCode && (
                    <span>
                      경유: {flight.layoverCode} {flight.layoverTime ? `(${flight.layoverTime})` : ''}
                    </span>
                  )
                )}
              </div>
            )}
          </div>
          
          {/* Arrival */}
          <div className="text-center">
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('toCode', e)}
              className={`text-2xl md:text-4xl font-black tracking-tighter block leading-none ${textEditableClass}`}
            >
              {flight.toCode}
            </span>
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('toTerminal', e)}
              className={`text-[9px] md:text-[10px] text-black/50 dark:text-white/50 mt-1.5 uppercase font-bold block ${textEditableClass}`}
            >
              {flight.toTerminal}
            </span>
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('toTime', e)}
              className={`text-xs md:text-sm font-bold mt-2 block ${textEditableClass}`}
            >
              {flight.toTime}
            </span>
          </div>
        </div>
        
        {/* Vertical Dashed Divider */}
        <div className="border-l border-dashed border-black/20 dark:border-white/20 h-16 self-stretch"></div>
        
        {/* Right Side: Seat & PNR */}
        <div className="w-24 md:w-36 pl-4 flex flex-col justify-center shrink-0">
          <div className="mb-3">
            <span className="text-[9px] md:text-[10px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">SEAT</span>
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('seat', e)}
              className={`text-xs md:text-sm font-bold text-black/80 dark:text-white/80 block ${textEditableClass}`}
            >
              {flight.seat}
            </span>
          </div>
          <div>
            <span className="text-[9px] md:text-[10px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">PNR</span>
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('pnr', e)}
              className={`text-xs md:text-sm font-bold text-black/80 dark:text-white/80 tracking-wide block ${textEditableClass}`}
            >
              {flight.pnr}
            </span>
          </div>
        </div>
      </div>
      
      {/* Delete button in edit mode */}
      {isEditMode && (
        <button 
          onClick={() => onDelete(flight.id)}
          className="absolute bottom-2 right-2 p-1 text-red-500 hover:text-red-700 transition-colors"
          title="Delete Flight"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
