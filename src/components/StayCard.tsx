import React from 'react';
import { Bed, Trash2 } from 'lucide-react';
import { StayItem } from '../types';
import { ImageEditOverlay } from './ImageEditOverlay';

interface StayCardProps {
  stay: StayItem;
  isEditMode: boolean;
  onUpdate: (id: number, field: keyof StayItem, val: string) => void;
  onDelete: (id: number) => void;
  isActive?: boolean;
  onClick?: () => void;
}

export function StayCard({
  stay,
  isEditMode,
  onUpdate,
  onDelete,
  isActive,
  onClick,
}: StayCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`border mb-6 font-sans text-black dark:text-white relative shadow-sm transition-all duration-300 cursor-pointer ${
        isActive 
          ? 'border-red-600 dark:border-red-400 ring-1 ring-red-600/30 bg-red-500/[0.01] dark:bg-red-400/[0.01]' 
          : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a]'
      }`}
    >
      {/* Image & Booking Status Pill Tag */}
      <div className="relative aspect-[21/9] w-full overflow-hidden border-b border-black/10 dark:border-white/10 bg-black/5 group">
        <img 
          src={stay.img || "https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop"} 
          alt={stay.title} 
          className="w-full h-full object-cover" 
        />
        
        <ImageEditOverlay
          isEditMode={isEditMode}
          onImageUploaded={(url) => onUpdate(stay.id, 'img', url)}
        />

        {/* Booking tag overlay */}
        <div className="absolute top-4 left-4 bg-white/95 dark:bg-black/95 text-black dark:text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5 shadow-md border border-black/10 z-10">
          <Bed className="w-3.5 h-3.5 text-black dark:text-white" />
          {isEditMode ? (
            <input
              type="text"
              value={stay.status}
              onChange={(e) => onUpdate(stay.id, 'status', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none font-bold text-[9px] md:text-[10px] text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-36 uppercase text-center"
              placeholder="STATUS"
            />
          ) : (
            <span>{stay.status}</span>
          )}
        </div>
      </div>
      
      {/* Content area */}
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-start mb-2 gap-4">
          <div className="flex-grow min-w-0">
            {isEditMode ? (
              <input
                type="text"
                value={stay.title}
                onChange={(e) => onUpdate(stay.id, 'title', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none font-black text-lg md:text-xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full uppercase"
                placeholder="STAY TITLE"
              />
            ) : (
              <h3 className="text-lg md:text-xl font-black tracking-tight leading-snug uppercase truncate">
                {stay.title}
              </h3>
            )}
            
            {isEditMode ? (
              <input
                type="text"
                value={stay.dateRange}
                onChange={(e) => onUpdate(stay.id, 'dateRange', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-xs md:text-sm text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full mt-1"
                placeholder="YYYY.MM.DD - YYYY.MM.DD (0 Nights)"
              />
            ) : (
              <span className="text-xs md:text-sm text-black/50 dark:text-white/50 mt-1 block font-medium">
                {stay.dateRange}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">CONF. NO</span>
            {isEditMode ? (
              <input
                type="text"
                value={stay.confNo}
                onChange={(e) => onUpdate(stay.id, 'confNo', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-28 text-right uppercase"
                placeholder="HTL-0000"
              />
            ) : (
              <span className="text-xs md:text-sm font-bold tracking-wider block">
                {stay.confNo}
              </span>
            )}
          </div>
        </div>
        
        {/* Address */}
        <div className="pl-3 border-l-2 border-black/20 dark:border-white/20 my-4 text-xs md:text-sm text-black/70 dark:text-white/70 leading-normal">
          {isEditMode ? (
            <input
              type="text"
              value={stay.address}
              onChange={(e) => onUpdate(stay.id, 'address', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-xs md:text-sm text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full"
              placeholder="Accommodation Address"
            />
          ) : (
            <span className="block">{stay.address}</span>
          )}
        </div>
        
        {/* Memo Box */}
        <div className="bg-[#EAE8E3]/35 dark:bg-white/5 p-3 md:p-4 text-xs md:text-sm border border-black/5 dark:border-white/5">
          <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-1">MEMO</span>
          {isEditMode ? (
            <textarea
              value={stay.memo}
              onChange={(e) => onUpdate(stay.id, 'memo', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#EAE8E3] dark:bg-white/10 p-1.5 outline-none text-xs md:text-sm text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full resize-none h-16"
              placeholder="Enter details, room info, etc..."
            />
          ) : (
            <p className="text-black/80 dark:text-white/80 leading-relaxed whitespace-pre-wrap">
              {stay.memo}
            </p>
          )}
        </div>
      </div>
      
      {/* Delete button in edit mode */}
      {isEditMode && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(stay.id); }}
          className="absolute bottom-2 right-2 p-1 text-red-500 hover:text-red-700 transition-colors z-10"
          title="Delete Stay"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
