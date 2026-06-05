import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Tag, Edit3 } from 'lucide-react';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, dateRange: string, location: string, tags: string[]) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setStartDate('');
      setEndDate('');
      setLocation('');
      setTagsInput('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) return setError('여정 제목을 입력해 주세요.');
    if (!startDate) return setError('시작 날짜를 입력해 주세요.');
    if (!endDate) return setError('종료 날짜를 입력해 주세요.');
    if (new Date(startDate) > new Date(endDate)) return setError('종료일은 시작일보다 빠를 수 없습니다.');
    if (!location.trim()) return setError('여행 위치(도시명)를 입력해 주세요.');

    // 날짜 포맷 변환: YYYY-MM-DD -> YYYY.MM.DD
    const startFormatted = startDate.replace(/-/g, '.');
    const endFormatted = endDate.replace(/-/g, '.');
    const dateRange = `${startFormatted} - ${endFormatted}`;

    // 태그 파싱: 쉼표 분리 후 트림 처리
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onCreate(
      title.trim(),
      dateRange,
      location.trim(),
      tags.length > 0 ? tags : ['Personal']
    );
    onClose();
  };

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
          <div className="flex flex-col gap-1">
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
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
              />
            </div>
          </div>

          {/* Date Range (Start & End) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30 pointer-events-none" />
                <input 
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
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
                  className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
              Location / City
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
              <input 
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kyoto, Japan"
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
              Tags (comma separated)
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
              <input 
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. Kyoto, 2026, Autumn"
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
              />
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
};
