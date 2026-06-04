import React from 'react';
import { Bed, Trash2 } from 'lucide-react';
import { StayItem } from '../types';

interface StayCardProps {
  stay: StayItem;
  isEditMode: boolean;
  onUpdate: (id: number, field: keyof StayItem, val: string) => void;
  onDelete: (id: number) => void;
}

export const StayCard: React.FC<StayCardProps> = ({
  stay,
  isEditMode,
  onUpdate,
  onDelete,
}) => {
  const textEditableClass = isEditMode 
    ? 'outline-dashed outline-1 outline-red-500/40 hover:bg-black/5 dark:hover:bg-white/5 cursor-text transition-all rounded px-1' 
    : '';

  const handleBlur = (field: keyof StayItem, e: React.FocusEvent<HTMLSpanElement>) => {
    onUpdate(stay.id, field, e.currentTarget.innerText.trim());
  };

  return (
    <div className="border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a] mb-6 font-sans text-black dark:text-white relative shadow-sm">
      {/* Image & Booking Status Pill Tag */}
      <div className="relative aspect-[21/9] w-full overflow-hidden border-b border-black/10 dark:border-white/10 bg-black/5">
        <img 
          src={stay.img || "https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop"} 
          alt={stay.title} 
          className="w-full h-full object-cover" 
        />
        {/* Booking tag overlay */}
        <div className="absolute top-4 left-4 bg-white/95 dark:bg-black/95 text-black dark:text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5 shadow-md border border-black/10">
          <Bed className="w-3.5 h-3.5 text-black dark:text-white" />
          <span 
            contentEditable={isEditMode} 
            suppressContentEditableWarning 
            onBlur={(e) => handleBlur('status', e)}
            className={textEditableClass}
          >
            {stay.status}
          </span>
        </div>
      </div>
      
      {/* Content area */}
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-start mb-2 gap-4">
          <div>
            <h3 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('title', e)}
              className={`text-lg md:text-xl font-black tracking-tight leading-snug uppercase ${textEditableClass}`}
            >
              {stay.title}
            </h3>
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('dateRange', e)}
              className={`text-xs md:text-sm text-black/50 dark:text-white/50 mt-1 block font-medium ${textEditableClass}`}
            >
              {stay.dateRange}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">CONF. NO</span>
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('confNo', e)}
              className={`text-xs md:text-sm font-bold tracking-wider block ${textEditableClass}`}
            >
              {stay.confNo}
            </span>
          </div>
        </div>
        
        {/* Vertical line Address */}
        <div className="pl-3 border-l-2 border-black/20 dark:border-white/20 my-4 text-xs md:text-sm text-black/70 dark:text-white/70 leading-normal">
          <span 
            contentEditable={isEditMode} 
            suppressContentEditableWarning 
            onBlur={(e) => handleBlur('address', e)}
            className={`block ${textEditableClass}`}
          >
            {stay.address}
          </span>
        </div>
        
        {/* Light grey Memo Box */}
        <div className="bg-[#EAE8E3]/35 dark:bg-white/5 p-3 md:p-4 text-xs md:text-sm border border-black/5 dark:border-white/5">
          <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-1">MEMO</span>
          <p 
            contentEditable={isEditMode} 
            suppressContentEditableWarning 
            onBlur={(e) => handleBlur('memo', e)}
            className={`text-black/80 dark:text-white/80 leading-relaxed ${textEditableClass}`}
          >
            {stay.memo}
          </p>
        </div>
        
        {/* Optional Image Url editable field (only shown in Edit Mode for vibe coding utility) */}
        {isEditMode && (
          <div className="mt-4 pt-3 border-t border-dashed border-black/10 dark:border-white/10 text-[9px]">
            <span className="text-red-500 font-bold block mb-1">IMAGE URL (Edit Mode Only):</span>
            <span 
              contentEditable 
              suppressContentEditableWarning 
              onBlur={(e) => handleBlur('img', e)}
              className="text-black/50 dark:text-white/50 break-all select-all outline-dotted outline-1 outline-red-500/20 px-1 block"
            >
              {stay.img}
            </span>
          </div>
        )}
      </div>
      
      {/* Delete button in edit mode */}
      {isEditMode && (
        <button 
          onClick={() => onDelete(stay.id)}
          className="absolute bottom-2 right-2 p-1 text-red-500 hover:text-red-700 transition-colors"
          title="Delete Stay"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
