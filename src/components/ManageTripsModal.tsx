import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Archive, Save, Loader2, Search } from 'lucide-react';
import { Trip, Plan } from '../types';
import { fetchPlacePredictions, fetchCoordinatesByPlaceId, fetchCoordinates } from '../utils/googleMapsHelper';

interface ManageTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  plans: Plan[];
  onUpdateTrip: (id: number, field: string, value: any) => Promise<void> | void;
  onDeleteJourney: (id: number) => Promise<void> | void;
  onMoveToArchive: (plan: Plan) => Promise<void> | void;
}

export function ManageTripsModal({
  isOpen,
  onClose,
  trips,
  plans,
  onUpdateTrip,
  onDeleteJourney,
  onMoveToArchive,
}: ManageTripsModalProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  // Edit fields state
  const [title, setTitle] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  
  // Location Autocomplete state
  const [predictions, setPredictions] = useState<{ description: string; placeId: string }[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
    }
  }, [isOpen]);

  // Handle outside click for predictions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const allJourneys = [
    ...trips.map(t => ({ ...t, isPlan: false })),
    ...plans.map(p => ({ ...p, isPlan: true }))
  ];

  const startEditing = (journey: any) => {
    setEditingId(journey.id);
    setTitle(journey.title);
    setDateRange(journey.date);
    setLocation(journey.locationStr || '');
    setTags(journey.tags.join(', '));
    setImgUrl(journey.img || '');
    setPredictions([]);
    setShowPredictions(false);
  };

  const handleLocationChange = async (val: string) => {
    setLocation(val);
    if (val.trim().length > 1) {
      const preds = await fetchPlacePredictions(val);
      setPredictions(preds);
      setShowPredictions(true);
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const selectPrediction = async (pred: any) => {
    setLocation(pred.description);
    setShowPredictions(false);
    // Background fetch coordinates
    const coords = await fetchCoordinatesByPlaceId(pred.placeId);
    if (coords && editingId) {
      onUpdateTrip(editingId, 'lat', coords.lat);
      onUpdateTrip(editingId, 'lng', coords.lng);
    }
  };

  const saveJourney = async (id: number) => {
    if (!title.trim() || !dateRange.trim() || !location.trim()) {
      alert("모든 필수 항목(제목, 날짜, 장소)을 입력해주세요.");
      return;
    }

    try {
      const cleanTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t !== '');

      await onUpdateTrip(id, 'title', title);
      await onUpdateTrip(id, 'date', dateRange);
      await onUpdateTrip(id, 'locationStr', location);
      await onUpdateTrip(id, 'tags', cleanTags);
      await onUpdateTrip(id, 'img', imgUrl);

      // Trigger geocoding for new location string in background
      fetchCoordinates(location).then((coords) => {
        if (coords) {
          onUpdateTrip(id, 'lat', coords.lat);
          onUpdateTrip(id, 'lng', coords.lng);
        }
      });

      setEditingId(null);
      alert("성공적으로 저장되었습니다.");
    } catch (error) {
      console.error(error);
      alert("저장에 실패했습니다.");
    }
  };

  const confirmDelete = async (journey: any) => {
    if (window.confirm(`정말 "${journey.title}" 여정을 완전히 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.`)) {
      await onDeleteJourney(journey.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-[#F9F8F6] dark:bg-[#111111] border border-black/20 dark:border-white/20 p-6 md:p-8 shadow-2xl flex flex-col z-10 transition-colors duration-300 text-black dark:text-white my-auto max-h-[85vh] overflow-hidden rounded-sm">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:opacity-60 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase">
            Manage Journeys
          </h2>
          <p className="text-[10px] md:text-xs text-black/50 dark:text-white/50 uppercase tracking-widest mt-1">
            여정 목록 수정 및 삭제 (전체 관리자 모드)
          </p>
        </div>

        {/* Scrollable list */}
        <div className="flex-grow overflow-y-auto pr-2 flex flex-col gap-4">
          {allJourneys.length === 0 ? (
            <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs uppercase font-bold tracking-widest">
              등록된 여정이 없습니다.
            </div>
          ) : (
            allJourneys.map((j) => {
              const isEditing = editingId === j.id;
              return (
                <div 
                  key={j.id} 
                  className={`border p-4 bg-white/40 dark:bg-white/5 transition-all flex flex-col md:flex-row gap-4 relative rounded-sm ${isEditing ? 'border-red-500/50 shadow-md' : 'border-black/10 dark:border-white/10'}`}
                >
                  {/* Preview Image */}
                  <div className="w-full md:w-32 aspect-[4/3] md:aspect-square overflow-hidden shrink-0 border border-black/10 dark:border-white/10">
                    <img 
                      src={isEditing ? imgUrl : j.img} 
                      alt={j.title} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400&auto=format&fit=crop';
                      }}
                    />
                  </div>

                  {/* Info / Editing Form */}
                  <div className="flex-grow flex flex-col justify-between">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase tracking-widest font-black opacity-50">Title</label>
                          <input 
                            type="text" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            className="bg-[#F9F8F6] dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 p-2 outline-none rounded-none w-full"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase tracking-widest font-black opacity-50">Date Range (YYYY.MM.DD - YYYY.MM.DD)</label>
                          <input 
                            type="text" 
                            value={dateRange} 
                            onChange={(e) => setDateRange(e.target.value)} 
                            className="bg-[#F9F8F6] dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 p-2 outline-none rounded-none w-full"
                          />
                        </div>

                        <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
                          <label className="text-[8px] uppercase tracking-widest font-black opacity-50">Location</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={location} 
                              onChange={(e) => handleLocationChange(e.target.value)} 
                              className="bg-[#F9F8F6] dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 p-2 pr-8 outline-none rounded-none w-full"
                            />
                            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 opacity-30" />
                          </div>
                          {showPredictions && predictions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 shadow-xl z-50 max-h-40 overflow-y-auto">
                              {predictions.map(p => (
                                <div 
                                  key={p.placeId} 
                                  onClick={() => selectPrediction(p)}
                                  className="p-2 text-[10px] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer truncate border-b border-black/5 dark:border-white/5 last:border-0"
                                >
                                  {p.description}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase tracking-widest font-black opacity-50">Tags (comma separated)</label>
                          <input 
                            type="text" 
                            value={tags} 
                            onChange={(e) => setTags(e.target.value)} 
                            className="bg-[#F9F8F6] dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 p-2 outline-none rounded-none w-full"
                          />
                        </div>

                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-[8px] uppercase tracking-widest font-black opacity-50">Cover Image URL</label>
                          <input 
                            type="text" 
                            value={imgUrl} 
                            onChange={(e) => setImgUrl(e.target.value)} 
                            className="bg-[#F9F8F6] dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 p-2 outline-none rounded-none w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-sm ${j.isPlan ? 'border-yellow-600/50 text-yellow-600 bg-yellow-500/10' : 'border-green-600/50 text-green-600 bg-green-500/10'}`}>
                            {j.isPlan ? 'Plan' : 'Trip'}
                          </span>
                          <span className="text-[10px] font-bold text-black/50 dark:text-white/50">{j.date}</span>
                        </div>
                        <h3 className="text-base font-bold tracking-tight uppercase">{j.title}</h3>
                        <p className="text-[11px] text-black/60 dark:text-white/60 mt-0.5">{j.locationStr || '위치 미지정'}</p>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {j.tags.map(tag => (
                            <span key={tag} className="text-[8px] font-bold bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-sm text-black/60 dark:text-white/60">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions panel */}
                    <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-black/5 dark:border-white/5 text-[9px] uppercase tracking-widest font-bold items-center">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={() => saveJourney(j.id)}
                            className="flex items-center gap-1.5 text-green-600 hover:text-green-500 transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEditing(j)}
                            className="text-blue-600 hover:text-blue-500 transition-colors"
                          >
                            Edit Basics
                          </button>
                          {j.isPlan && (
                            <button 
                              onClick={() => onMoveToArchive(j as Plan)}
                              className="flex items-center gap-1 text-yellow-600 hover:text-yellow-500 transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" /> Move to Archive
                            </button>
                          )}
                          <button 
                            onClick={() => confirmDelete(j)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-500 transition-colors ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
