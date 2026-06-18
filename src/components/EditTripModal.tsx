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

function extractCountry(address: string): string {
  if (!address) return '';
  const clean = address.trim().toLowerCase();
  
  const countries = [
    { name: 'JAPAN', keys: ['japan', '일본', 'nihon', 'nippon', '日本', 'jp'] },
    { name: 'SOUTH KOREA', keys: ['korea', '대한민국', '한국', 'south korea', 'kr', 'seoul'] },
    { name: 'VIETNAM', keys: ['vietnam', '베트남', 'việt nam', 'viet nam', 'vn'] },
    { name: 'TAIWAN', keys: ['taiwan', '대만', '타이완', 'tai wan', '台灣', '臺灣', 'tw'] },
    { name: 'THAILAND', keys: ['thailand', '태국', 'ประเทศไทย', 'thai', 'th'] },
    { name: 'SINGAPORE', keys: ['singapore', '싱가포르', '싱가폴', 'sg'] },
    { name: 'USA', keys: ['usa', '미국', 'united states', 'america', 'us'] },
    { name: 'FRANCE', keys: ['france', '프랑스', 'french', 'fr'] },
    { name: 'ITALY', keys: ['italy', '이탈리아', '이태리', 'italia', 'it'] },
    { name: 'UNITED KINGDOM', keys: ['uk', 'united kingdom', '영국', 'great britain', 'england', 'gb'] },
    { name: 'GERMANY', keys: ['germany', '독일', 'deutschland', 'de'] },
    { name: 'SPAIN', keys: ['spain', '스페인', 'españa', 'espana', 'es'] },
    { name: 'CHINA', keys: ['china', '중국', '中国', 'cn'] },
    { name: 'HONG KONG', keys: ['hong kong', '홍콩', 'hk'] },
    { name: 'MACAU', keys: ['macau', '마카오', 'mo'] },
    { name: 'PHILIPPINES', keys: ['philippines', '필리핀', 'ph'] },
    { name: 'MALAYSIA', keys: ['malaysia', '말레이시아', 'my'] },
    { name: 'INDONESIA', keys: ['indonesia', '인도네시아', '발리', 'bali', 'id'] },
    { name: 'AUSTRALIA', keys: ['australia', '호주', 'au'] },
    { name: 'NEW ZEALAND', keys: ['new zealand', '뉴질랜드', 'nz'] },
    { name: 'SWITZERLAND', keys: ['switzerland', '스위스', 'ch'] },
    { name: 'AUSTRIA', keys: ['austria', '오스트리아', 'at'] },
    { name: 'CZECHIA', keys: ['czechia', 'czech', '체코', 'cz'] },
    { name: 'HUNGARY', keys: ['hungary', '헝가리', 'hu'] }
  ];

  for (const c of countries) {
    for (const key of c.keys) {
      if (clean.includes(key)) {
        return c.name;
      }
    }
  }

  const parts = address.split(',');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim().toUpperCase();
    for (const c of countries) {
      for (const key of c.keys) {
        if (lastPart.toLowerCase() === key) {
          return c.name;
        }
      }
    }
    return lastPart;
  }
  
  return address.trim().toUpperCase();
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
  const [locations, setLocations] = useState<{ name: string; lat?: number; lng?: number; country?: string }[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [statusBadge, setStatusBadge] = useState<'NEW' | 'EDITING' | ''>('');
  const [isVideoDragActive, setIsVideoDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && trip) {
      setTitle(trip.title);
      setDate(trip.date);
      setLocationStr(trip.locationStr);
      setLat(trip.lat);
      setLng(trip.lng);
      if (trip.locations && Array.isArray(trip.locations)) {
        setLocations(trip.locations);
      } else {
        setLocations(trip.locationStr ? [{ name: trip.locationStr, lat: trip.lat, lng: trip.lng }] : []);
      }
      setLocationInput('');
      setVideoUrl(trip.videoUrl || '');
      setImgUrl(trip.img);
      setTags(trip.tags || []);
      setTagInput('');
      setMembers(trip.members || []);
      setMemberInput('');
      setStatusBadge(trip.statusBadge || '');
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

    const combinedLocationStr = locations.map(loc => loc.name).join(', ');
    const firstLat = locations[0]?.lat ?? lat ?? trip.lat;
    const firstLng = locations[0]?.lng ?? lng ?? trip.lng;

    try {
      await onSave(trip.id, {
        title,
        date,
        locationStr: combinedLocationStr,
        lat: firstLat,
        lng: firstLng,
        locations,
        videoUrl,
        img: imgUrl,
        tags,
        members,
        statusBadge,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('여정 정보 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const uploadVideoFile = async (file: File) => {
    if (file.size > 30 * 1024 * 1024) {
      alert("모바일 로딩 지연을 방지하기 위해, 30MB 이하의 동영상 파일만 업로드할 수 있습니다.");
      return;
    }

    setVideoUploading(true);
    try {
      const storagePath = `users/public/covers/${Date.now()}_${file.name}`;
      const videoRef = ref(storage, storagePath);
      await uploadBytes(videoRef, file);
      const downloadUrl = await getDownloadURL(videoRef);
      setVideoUrl(downloadUrl);
    } catch (error) {
      console.error("Cover video upload failed:", error);
      alert("커버 영상 업로드에 실패했습니다.");
    } finally {
      setVideoUploading(false);
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadVideoFile(file);
  };

  const handleVideoDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsVideoDragActive(true);
    } else if (e.type === "dragleave") {
      setIsVideoDragActive(false);
    }
  };

  const handleVideoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVideoDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        await uploadVideoFile(file);
      } else {
        alert("동영상 파일만 업로드할 수 있습니다.");
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file, 3840, 3840, 0.75);
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

          {/* Location Name (복수 장소 등록 및 수정) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Locations (방문 장소 복수 지정 가능)
            </label>

            {/* Location Pill Display */}
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5 max-h-24 overflow-y-auto p-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                {locations.map((loc, idx) => (
                  <span 
                    key={idx} 
                    className="flex items-center gap-1.5 bg-white dark:bg-[#151515] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-black/15 dark:border-white/15 text-black dark:text-white shadow-xs"
                  >
                    {loc.name}
                    <button 
                      type="button" 
                      onClick={() => setLocations(prev => prev.filter((_, i) => i !== idx))} 
                      className="text-black/45 dark:text-white/45 hover:text-red-500 transition-colors text-xs leading-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative flex items-center gap-2">
              <div className="relative flex-grow">
                <MapPin className="absolute left-3 w-4 h-4 text-black/30 dark:text-white/30 z-10 pointer-events-none top-1/2 -translate-y-1/2" />
                <PlaceAutocompleteInput
                  value={locationInput}
                  onChange={(val) => setLocationInput(val)}
                  onSelectPlace={(name, coords, address, countryName) => {
                    if (name.trim()) {
                      setLocations(prev => {
                        if (prev.some(loc => loc.name === name.trim())) return prev;
                        // Prefer API-provided country name (English, from address_components)
                        const resolvedCountry = countryName
                          ? extractCountry(countryName) || countryName.toUpperCase()
                          : extractCountry(address);
                        return [...prev, { name: name.trim(), lat: coords?.lat, lng: coords?.lng, country: resolvedCountry }];
                      });
                      setLocationInput('');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-bold bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-red-600 dark:focus:border-red-400 outline-none transition-colors rounded-none text-black dark:text-white"
                  placeholder="도시 검색..."
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const clean = locationInput.trim();
                  if (clean) {
                    setLocations(prev => {
                      if (prev.some(loc => loc.name === clean)) return prev;
                      return [...prev, { name: clean }];
                    });
                    setLocationInput('');
                  }
                }}
                className="px-3 py-2.5 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-85 transition-opacity shrink-0"
              >
                추가
              </button>
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
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                Upload
              </button>
            </div>
            
             {/* Image Preview (Zoom-in 라이트박스 기능 제거) */}
             <div className="mt-2 border border-black/10 dark:border-white/10 aspect-[16/9] overflow-hidden bg-black/5 relative group flex items-center justify-center">
               {imgUrl ? (
                 <div className="relative w-full h-full">
                   <img src={imgUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                 </div>
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

          {/* Cover Video */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Cover Video (URL or Upload)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-[#EAE8E3] dark:bg-white/5 border border-black/10 dark:border-white/10 p-2.5 text-xs font-medium text-black dark:text-white outline-none flex-grow focus:border-red-600 dark:focus:border-red-400 transition-colors"
                placeholder="Video URL (e.g. mp4)"
              />
              <input
                type="file"
                ref={videoFileInputRef}
                onChange={handleVideoUpload}
                accept="video/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoFileInputRef.current?.click()}
                disabled={videoUploading}
                className="px-3 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {videoUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                Upload
              </button>
            </div>

             {/* Video Preview & Drag and Drop Dropzone */}
             <div 
               onDragEnter={handleVideoDrag}
               onDragOver={handleVideoDrag}
               onDragLeave={handleVideoDrag}
               onDrop={handleVideoDrop}
               className={`mt-2 border border-black/10 dark:border-white/10 aspect-[16/9] overflow-hidden bg-black/5 relative group flex items-center justify-center transition-all duration-300
                 ${isVideoDragActive ? 'border-dashed border-red-600 bg-black/10 dark:bg-white/10 scale-[1.01]' : ''}
               `}
             >
               {videoUrl ? (
                 <>
                   <video src={videoUrl} controls muted className="w-full h-full object-cover" />
                   <button
                     type="button"
                     onClick={() => setVideoUrl('')}
                     className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 hover:bg-red-700 transition-colors shadow-md rounded-sm z-10"
                   >
                     Delete Video
                   </button>
                 </>
               ) : (
                 <div className="text-black/45 dark:text-white/45 text-[10px] font-bold uppercase tracking-widest text-center flex flex-col items-center justify-center p-4 pointer-events-none">
                   {videoUploading ? (
                     <div className="flex flex-col items-center gap-2">
                       <Loader2 className="w-5 h-5 animate-spin" />
                       <span>동영상을 업로드 중입니다...</span>
                     </div>
                   ) : (
                     <>
                       동영상을 드래그 앤 드롭하거나<br />위의 Upload 버튼을 눌러주세요
                     </>
                   )}
                 </div>
               )}
             </div>
          </div>

          {/* Status Badge Option */}
          <div className="flex flex-col gap-1.5 mt-4">
            <label className="text-[9px] uppercase font-black tracking-widest opacity-60 text-black dark:text-white">
              Status Badge (영문 상태 뱃지)
            </label>
            <div className="flex gap-2">
              {(['', 'NEW', 'EDITING'] as const).map((badgeOpt) => (
                <button
                  key={badgeOpt}
                  type="button"
                  onClick={() => setStatusBadge(badgeOpt)}
                  className={`flex-grow py-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                    statusBadge === badgeOpt
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-xs'
                      : 'bg-transparent border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/30 dark:hover:border-white/30'
                  }`}
                >
                  {badgeOpt || 'NONE'}
                </button>
              ))}
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
              disabled={saving || uploading || videoUploading}
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
