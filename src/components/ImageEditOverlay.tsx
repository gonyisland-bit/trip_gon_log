import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { compressImage } from '../utils/imageHelper';
import { extractGpsFromImage } from '../utils/exifHelper';

interface ImageEditOverlayProps {
  isEditMode: boolean;
  onImageUploaded: (url: string, gps?: { lat: number; lng: number } | null) => void;
  hasImage?: boolean;
  onImageRemoved?: () => void;
}

export function ImageEditOverlay({ 
  isEditMode, 
  onImageUploaded, 
  hasImage, 
  onImageRemoved 
}: ImageEditOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  if (!isEditMode) return null;

  const handleChangeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    const user = auth.currentUser;
    if (!user) {
      alert("이미지를 업로드하려면 로그인이 필요합니다.");
      return;
    }

    setUploading(true);
    try {
      // Extract GPS data from EXIF before compressing
      const gps = await extractGpsFromImage(file);

      // Compress the image before uploading
      const compressedBlob = await compressImage(file);
      
      // Store in users/public for public visibility and ease of rules management
      const storagePath = `users/public/images/${Date.now()}_${file.name}`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, compressedBlob);
      const downloadUrl = await getDownloadURL(imageRef);
      onImageUploaded(downloadUrl, gps);
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        await uploadFile(file);
      } else {
        alert("이미지 파일만 업로드할 수 있습니다.");
      }
    }
  };

  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-1.5 z-30 transition-all cursor-default
        ${uploading || isDragActive ? 'opacity-100 bg-black/70' : 'opacity-0 group-hover:opacity-100'}
        ${isDragActive ? 'border border-dashed border-red-600 bg-black/70' : ''}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      {uploading ? (
        <span className="p-1 bg-white/20 text-white rounded">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </span>
      ) : (
        <>
          <button
            onClick={handleChangeClick}
            className="p-1 bg-white/20 hover:bg-red-600 text-white rounded transition-colors shadow-sm"
            title="사진 변경"
          >
            <ImagePlus className="w-3.5 h-3.5" />
          </button>
          {hasImage && onImageRemoved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("일정 사진을 삭제하시겠습니까?")) {
                  onImageRemoved();
                }
              }}
              className="p-1 bg-white/20 hover:bg-red-600 text-white rounded transition-colors shadow-sm"
              title="사진 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
