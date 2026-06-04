import React from 'react';
import { Train, Trash2 } from 'lucide-react';
import { TransitItem } from '../types';

interface TransitCardProps {
  transit: TransitItem;
  isEditMode: boolean;
  onUpdate: (id: number, field: keyof TransitItem, val: string) => void;
  onDelete: (id: number) => void;
}

export const TransitCard: React.FC<TransitCardProps> = ({
  transit,
  isEditMode,
  onUpdate,
  onDelete,
}) => {
  const textEditableClass = isEditMode 
    ? 'outline-dashed outline-1 outline-red-500/40 hover:bg-black/5 dark:hover:bg-white/5 cursor-text transition-all rounded px-1' 
    : '';

  const handleBlur = (field: keyof TransitItem, e: React.FocusEvent<HTMLSpanElement>) => {
    onUpdate(transit.id, field, e.currentTarget.innerText.trim());
  };

  return (
    <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a] mb-6 font-sans text-black dark:text-white relative shadow-sm">
      {/* Header bar with grey background */}
      <div className="bg-[#EAE8E3]/50 dark:bg-white/10 px-4 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center text-[10px] md:text-xs font-bold tracking-widest text-black/60 dark:text-white/60">
        <div className="flex items-center gap-2">
          <Train className="w-3.5 h-3.5" />
          <span 
            contentEditable={isEditMode} 
            suppressContentEditableWarning 
            onBlur={(e) => handleBlur('ticketType', e)}
            className={`uppercase ${textEditableClass}`}
          >
            {transit.ticketType}
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
      <div className="p-4 md:p-6 flex flex-row items-center justify-between">
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
        
        {/* Right Side: Seat & Booking Ref Box (with full thin border) */}
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
};
