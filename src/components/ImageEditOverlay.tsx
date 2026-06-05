import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { compressImage } from '../utils/imageHelper';

interface ImageEditOverlayProps {
  isEditMode: boolean;
  onImageUploaded: (url: string) => void;
}

export function ImageEditOverlay({ isEditMode, onImageUploaded }: ImageEditOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!isEditMode) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
      alert("이미지를 업로드하려면 로그인이 필요합니다.");
      return;
    }

    setUploading(true);
    try {
      // Compress the image before uploading
      const compressedBlob = await compressImage(file);
      
      // Store in users/public for public visibility and ease of rules management
      const storagePath = `users/public/images/${Date.now()}_${file.name}`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, compressedBlob);
      const downloadUrl = await getDownloadURL(imageRef);
      onImageUploaded(downloadUrl);
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div 
      onClick={handleOverlayClick}
      className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer text-white"
    >
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <span className="bg-red-600 text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 shadow-lg rounded-none">
        {uploading ? (
          <>
            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> Uploading...
          </>
        ) : (
          <>
            <ImagePlus className="w-3 h-3 sm:w-4 sm:h-4" /> Change Image
          </>
        )}
      </span>
    </div>
  );
}
