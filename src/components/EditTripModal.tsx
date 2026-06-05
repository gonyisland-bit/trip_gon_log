import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit2, Loader2, Upload } from 'lucide-react';
import { Trip } from '../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { compressImage } from '../utils/imageHelper';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | undefined;
  onSave: (tripId: number, updatedData: Partial<Trip>) => Promise<void>;
  isLoggedIn: boolean;
}

export function EditTripModal({
  isOpen,
  onClose,
  trip,
  onSave,
  isLoggedIn,
}: EditTripModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && trip) {
      setTitle(trip.title);
      setDate(trip.date);
      setLocationStr(trip.locationStr);
      setImgUrl(trip.img);
    }
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return;
    setSaving(true);
    try {
      await onSave(trip.id, {
        title,
        date,
        locationStr,
        img: imgUrl,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('여정 정보 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const storagePath = `users/public/covers/${Date.now()}_${file.name}`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, compressedBlob);
      const downloadUrl = await getDownloadURL(imageRef);
      setImgUrl(downloadUrl);
    } catch (error) {
      console.error("Cover image upload failed:", error);
      alert("커버 이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#F9F8F6] dark:bg-[#161616] border border-black/20 dark:border-white/20 w-full max-w-md relative transition-colors duration-300 shadow-2xl rounded-none flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <Edit2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">
              Edit Journey Cover Info
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black/60 dark:text-white/60"
            aria-label="Close edit modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Journey Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2.5 text-xs font-bold text-black dark:text-white outline-none w-full focus:border-red-600 dark:focus:border-red-400 transition-colors"
              placeholder="e.g. TOKYO, JAPAN"
              required
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Journey Dates
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2.5 text-xs font-bold text-black dark:text-white outline-none w-full focus:border-red-600 dark:focus:border-red-400 transition-colors"
              placeholder="e.g. 2026.09.10 - 09.15"
              required
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Location Name
            </label>
            <input
              type="text"
              value={locationStr}
              onChange={(e) => setLocationStr(e.target.value)}
              className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2.5 text-xs font-bold text-black dark:text-white outline-none w-full focus:border-red-600 dark:focus:border-red-400 transition-colors"
              placeholder="e.g. Tokyo, Japan"
              required
            />
          </div>

          {/* Cover Image */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Cover Image (URL or Upload)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2.5 text-xs font-medium text-black dark:text-white outline-none flex-grow focus:border-red-600 dark:focus:border-red-400 transition-colors"
                placeholder="Image URL"
                required
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                Upload
              </button>
            </div>
            
            {/* Image Preview */}
            {imgUrl && (
              <div className="mt-2 border border-black/10 dark:border-white/10 aspect-[16/9] overflow-hidden bg-black/5">
                <img src={imgUrl} alt="Cover Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10 mt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all text-black/60 dark:text-white/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
