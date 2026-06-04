import React from 'react';
import { ImagePlus } from 'lucide-react';

interface ImageEditOverlayProps {
  isEditMode: boolean;
}

export const ImageEditOverlay: React.FC<ImageEditOverlayProps> = ({ isEditMode }) => {
  if (!isEditMode) return null;
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer">
      <span className="bg-red-600 text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 shadow-lg">
        <ImagePlus className="w-3 h-3 sm:w-4 sm:h-4" /> Change Image
      </span>
    </div>
  );
};
