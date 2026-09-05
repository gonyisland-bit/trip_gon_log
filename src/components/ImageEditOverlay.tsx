import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, ClipboardPaste } from 'lucide-react';
import { uploadFileToR2 } from '../utils/storageHelper';
import { auth } from '../firebase';
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

  const handlePasteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.split('/')[1] || 'png';
            const file = new File([blob], `pasted_${Date.now()}.${ext}`, { type: imageType });
            await uploadFile(file);
            return;
          }
        }
      }
      alert("클립보드에 복사된 이미지가 없습니다. 이미지를 복사한 후 다시 시도해 주세요.");
    } catch (err) {
      console.warn("Clipboard read error:", err);
      alert("클립보드 이미지를 붙여넣으려면 키보드 단축키 Ctrl+V를 사용해주세요.");
    }
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
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `users/public/images/${Date.now()}_${safeName}`;
      const downloadUrl = await uploadFileToR2(compressedBlob, storagePath);
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
            title="사진 선택 / 파일 업로드"
          >
            <ImagePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePasteClick}
            className="p-1 bg-white/20 hover:bg-red-600 text-white rounded transition-colors shadow-sm"
            title="클립보드 사진 붙여넣기 (Ctrl+V)"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>
          {hasImage && onImageRemoved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImageRemoved();
              }}
              className="p-1 bg-white/20 hover:bg-red-600 text-white rounded transition-colors shadow-sm cursor-pointer"
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
