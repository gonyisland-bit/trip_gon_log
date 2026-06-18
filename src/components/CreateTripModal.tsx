import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Tag, Edit3 } from 'lucide-react';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, dateRange: string, location: string, tags: string[], lat?: number, lng?: number, members?: string[], locations?: { name: string; lat?: number; lng?: number }[], statusBadge?: string) => void;
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

export function CreateTripModal({
  isOpen,
  onClose,
  onCreate,
  existingTags,
}: CreateTripModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<{ name: string; lat?: number; lng?: number; country?: string }[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [statusBadge, setStatusBadge] = useState<'NEW' | 'EDITING' | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setStartDate('');
      setEndDate('');
      setLocation('');
      setLocations([]);
      setLocationInput('');
      setLat(undefined);
      setLng(undefined);
      setTags([]);
      setTagInput('');
      setMembers([]);
      setMemberInput('');
      setStatusBadge('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) return setError('여정 제목을 입력해 주세요.');
    if (!startDate) return setError('시작 날짜를 입력해 주세요.');
    if (!endDate) return setError('종료 날짜를 입력해 주세요.');
    if (new Date(startDate) > new Date(endDate)) return setError('종료일은 시작일보다 빠를 수 없습니다.');
    if (locations.length === 0) return setError('여행 위치(도시명)를 1개 이상 추가해 주세요.');

    // Convert dates: YYYY-MM-DD -> YYYY.MM.DD
    const startFormatted = startDate.replace(/-/g, '.');
    const endFormatted = endDate.replace(/-/g, '.');
    const dateRange = `${startFormatted} - ${endFormatted}`;

    const combinedLocationStr = locations.map(loc => loc.name).join(', ');
    const firstLat = locations[0]?.lat;
    const firstLng = locations[0]?.lng;

    onCreate(
      title.trim(),
      dateRange,
      combinedLocationStr,
      tags.length > 0 ? tags : ['Personal'],
      firstLat,
      firstLng,
      members,
      locations,
      statusBadge
    );
    onClose();
  };

  const filteredSuggestions = tagInput.trim()
    ? existingTags.filter(
        tag =>
          tag.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(tag)
      )
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-[#F9F8F6] dark:bg-[#111111] border border-black/20 dark:border-white/20 p-6 md:p-8 shadow-2xl flex flex-col z-10 transition-colors duration-300 text-black dark:text-white my-auto shrink-0">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:opacity-60 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-tighter uppercase mb-1">
            Create New Journey
          </h2>
          <p className="text-[10px] md:text-xs text-black/50 dark:text-white/50 uppercase tracking-widest">
            새로운 여행 기록 또는 계획을 시작하세요
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium tracking-wide">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
              Journey Title
            </label>
            <div className="relative">
              <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
              <input 
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. KYOTO AUTUMN TRIP"
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
              />
            </div>
          </div>

          {/* Date Range (Start & End) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30 pointer-events-none" />
                <input 
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setStartDate(newStart);
                    if (newStart) {
                      const d = new Date(newStart);
                      d.setDate(d.getDate() + 1);
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      setEndDate(`${yyyy}-${mm}-${dd}`);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30 pointer-events-none" />
                <input 
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Location with Google Autocomplete (복수 장소 등록 지원) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
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
                        const resolvedCountry = countryName
                          ? extractCountry(countryName) || countryName.toUpperCase()
                          : extractCountry(address);
                        return [...prev, { name: name.trim(), lat: coords?.lat, lng: coords?.lng, country: resolvedCountry }];
                      });
                      setLocationInput('');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
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
                className="px-3 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest hover:opacity-85 transition-opacity shrink-0 rounded-none border border-black/20 dark:border-white/20"
              >
                추가
              </button>
            </div>
          </div>

          {/* Tags Pill Input */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
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
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
              <input 
                type="text"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="e.g. Kyoto, 2026, Autumn"
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
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
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
              Trip Members (참석 인원)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {members.length === 0 ? (
                <span className="text-[10px] text-black/30 dark:text-white/30 italic">설정된 인원이 없습니다.</span>
              ) : (
                members.map(m => (
                  <span 
                    key={m} 
                    className="flex items-center gap-1.5 bg-white dark:bg-[#151515] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-black/15 dark:border-white/15 text-black dark:text-white shadow-xs"
                  >
                    {m}
                    <button
                      type="button"
                      onClick={() => setMembers(prev => prev.filter(x => x !== m))}
                      className="text-black/45 dark:text-white/45 hover:text-red-500 transition-colors text-xs leading-none"
                    >
                      &times;
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
                className="w-full px-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
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

          {/* Status Badge Option */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
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

          <button 
            type="submit"
            className="mt-4 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest hover:opacity-85 active:opacity-95 transition-opacity flex items-center justify-center rounded-none"
          >
            Create Journey
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
