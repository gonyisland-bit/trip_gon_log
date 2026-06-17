import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit2, Loader2, Upload, Tag, MapPin } from 'lucide-react';
import { Trip } from '../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { compressImage } from '../utils/imageHelper';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { ImageEditOverlay } from './ImageEditOverlay';


interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | undefined;
  onSave: (tripId: number, updatedData: Partial<Trip>) => Promise<void>;
  isLoggedIn: boolean;
  existingTags: string[];
}

export function EditTripModal({
  isOpen,
  onClose,
  trip,
  onSave,
  isLoggedIn,
  existingTags,
}: EditTripModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [imgUrl, setImgUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && trip) {
      setTitle(trip.title);
      setDate(trip.date);
      setLocationStr(trip.locationStr);
      setLat(trip.lat);
      setLng(trip.lng);
      setImgUrl(trip.img);
      setTags(trip.tags || []);
      setTagInput('');
      setMembers(trip.members || []);
      setMemberInput('');
    }
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  const parseDateRange = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return { start: '', end: '' };
    const parts = dateStr.split('-').map(p => p.trim());
    if (parts.length < 2) return { start: '', end: '' };
    
    const formatToInputDate = (d: string, yearFallback?: string) => {
      let normalized = d.replace(/\./g, '-');
      if (normalized.length === 5 && yearFallback) {
        normalized = `${yearFallback}-${normalized}`;
      }
      return normalized;
    };

    const startRaw = parts[0];
    const startYear = startRaw.slice(0, 4);
    const start = formatToInputDate(startRaw);
    const end = formatToInputDate(parts[1], startYear);
    return { start, end };
  };

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    const { start, end } = parseDateRange(date);
    
    const newStart = type === 'start' ? val : start;
    const newEnd = type === 'end' ? val : end;
    
    const formatFromInputDate = (d: string) => d.replace(/-/g, '.');
    
    if (newStart && newEnd) {
      const formattedStart = formatFromInputDate(newStart);
      let formattedEnd = formatFromInputDate(newEnd);
      
      const startYear = newStart.slice(0, 4);
      const endYear = newEnd.slice(0, 4);
      if (startYear === endYear && formattedEnd.startsWith(startYear + '.')) {
        formattedEnd = formattedEnd.slice(5); // removes "YYYY."
      }
      
      setDate(`${formattedStart} - ${formattedEnd}`);
    }
  };

  const handleAddTag = (tagText: string) => {
    const cleanTag = tagText.trim().replace(/,/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags(prev => [...prev, cleanTag]);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleTagInputChange = (val: string) => {
    if (val.endsWith(',')) {
      handleAddTag(val);
    } else {
      setTagInput(val);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return;
    setSaving(true);
    try {
      await onSave(trip.id, {
        title,
        date,
        locationStr,
        lat: lat !== undefined ? lat : trip.lat,
        lng: lng !== undefined ? lng : trip.lng,
        img: imgUrl,
        tags,
        members,
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
      const compressedBlob = await compressImage(file, 3840, 3840, 0.92);
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

  const filteredSuggestions = tagInput.trim()
    ? existingTags.filter(
        tag =>
          tag.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(tag)
      )
    : [];

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
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={parseDateRange(date).start}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2 text-xs font-bold text-black dark:text-white outline-none flex-1 focus:border-red-600 dark:focus:border-red-400 transition-colors"
                required
              />
              <span className="text-xs font-bold text-black/40 dark:text-white/40">—</span>
              <input
                type="date"
                value={parseDateRange(date).end}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2 text-xs font-bold text-black dark:text-white outline-none flex-1 focus:border-red-600 dark:focus:border-red-400 transition-colors"
                required
              />
            </div>
          </div>

          {/* Location with Google Autocomplete */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Location Name
            </label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3 w-4 h-4 text-black/30 dark:text-white/30 z-10 pointer-events-none" />
              <PlaceAutocompleteInput
                value={locationStr}
                onChange={(val) => setLocationStr(val)}
                onSelectPlace={(name, coords) => {
                  setLocationStr(name);
                  if (coords) {
                    setLat(coords.lat);
                    setLng(coords.lng);
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-red-600 dark:focus:border-red-400 outline-none transition-colors rounded-none text-black dark:text-white"
                placeholder="Search destination city..."
              />
            </div>
          </div>

          {/* Tags Pill Input */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Tags (comma or enter to separate)
            </label>
            
            {/* Pill Display */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5 max-h-24 overflow-y-auto p-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                {tags.map(tag => (
                  <span 
                    key={tag} 
                    className="flex items-center gap-1.5 bg-white dark:bg-[#151515] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-black/15 dark:border-white/15 text-black dark:text-white shadow-xs"
                  >
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTag(tag)} 
                      className="text-black/45 dark:text-white/45 hover:text-red-500 transition-colors text-xs leading-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <input 
                type="text"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="e.g. Tokyo, 2026, Summer"
                className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2.5 text-xs font-bold text-black dark:text-white outline-none w-full focus:border-red-600 dark:focus:border-red-400 transition-colors"
              />
            </div>

            {/* Suggestions dropdown */}
            {filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-36 overflow-y-auto z-50 flex flex-col divide-y divide-black/5 dark:divide-white/5">
                {filteredSuggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddTag(suggestion)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors uppercase font-bold tracking-wider text-black dark:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Members (참석 인원) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Trip Members (참석 인원)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {members.length === 0 ? (
                <span className="text-[10px] text-black/30 dark:text-white/30 italic">설정된 인원이 없습니다.</span>
              ) : (
                members.map(m => (
                  <span 
                    key={m} 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold rounded-sm"
                  >
                    {m}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`정말 '${m}' 인원을 삭제하시겠습니까?`)) {
                          setMembers(prev => prev.filter(x => x !== m));
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="인원 삭제"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    const cleanName = memberInput.trim();
                    if (cleanName) {
                      if (members.includes(cleanName)) {
                        alert("이미 등록된 인원입니다.");
                      } else {
                        setMembers(prev => [...prev, cleanName]);
                        setMemberInput('');
                      }
                    }
                  }
                }}
                placeholder="참석자 이름 입력 후 Enter..."
                className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2 text-xs font-bold text-black dark:text-white outline-none flex-grow focus:border-red-600 dark:focus:border-red-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const cleanName = memberInput.trim();
                  if (cleanName) {
                    if (members.includes(cleanName)) {
                      alert("이미 등록된 인원입니다.");
                    } else {
                      setMembers(prev => [...prev, cleanName]);
                      setMemberInput('');
                    }
                  }
                }}
                className="px-3 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity shrink-0"
              >
                추가
              </button>
            </div>
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
             <div className="mt-2 border border-black/10 dark:border-white/10 aspect-[16/9] overflow-hidden bg-black/5 relative group flex items-center justify-center">
               {imgUrl ? (
                 <img src={imgUrl} alt="Cover Preview" className="w-full h-full object-cover" />
               ) : (
                 <div className="text-black/45 dark:text-white/45 text-[10px] font-bold uppercase tracking-widest text-center flex flex-col items-center justify-center p-4">
                   이미지를 드래그 앤 드롭하거나<br />위의 Upload 버튼을 눌러주세요
                 </div>
               )}
               <ImageEditOverlay
                 isEditMode={isLoggedIn}
                 onImageUploaded={(url) => setImgUrl(url)}
                 hasImage={!!imgUrl}
                 onImageRemoved={() => setImgUrl('')}
               />
             </div>
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
