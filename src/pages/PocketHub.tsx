import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bookmark, MapPin, Plus, ExternalLink, Trash2, Edit3, Compass, 
  Search, Check, X, ArrowUpRight, ChevronRight, Layers, Sparkles,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Map, MoreVertical, Star,
  Upload, Image as ImageIcon, Loader2
} from 'lucide-react';
import { SpotPocketItem, PocketCategory, Trip, Plan, TimelineItem } from '../types';
import { getSavedPockets, savePockets, detectPlatform, subscribePockets } from '../utils/pocketStorage';
import { PlaceAutocompleteInput } from '../components/PlaceAutocompleteInput';
import { ConfirmModal } from '../components/ConfirmModal';
import { PocketScheduleModal } from '../components/PocketScheduleModal';
import { compressImage } from '../utils/imageHelper';
import { uploadFileToR2 } from '../utils/storageHelper';

interface PocketHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddTimelineItemToTrip?: (tripId: number, item: TimelineItem) => void;
  onCreateTripWithPockets?: (selectedPockets: SpotPocketItem[]) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDarkMode: boolean;
}

const CATEGORY_META: Record<PocketCategory, { label: string; icon: React.ElementType; color: string }> = {
  food: { label: 'FOOD', icon: Utensils, color: '#dc2626' },
  cafe: { label: 'CAFE', icon: Coffee, color: '#d97706' },
  spot: { label: 'SPOT', icon: Camera, color: '#2563eb' },
  shopping: { label: 'SHOPPING', icon: ShoppingBag, color: '#7c3aed' },
  tip: { label: 'TIP', icon: Lightbulb, color: '#059669' },
};

export function PocketHubPage({
  trips,
  plans,
  onNavigate,
  onAddTimelineItemToTrip,
  onCreateTripWithPockets,
  isLoggedIn,
  isAdmin,
  isDarkMode
}: PocketHubPageProps) {
  const [spots, setSpots] = useState<SpotPocketItem[]>(() => getSavedPockets());
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFavoriteFilter, setIsFavoriteFilter] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(40);
  
  // New or Edit Spot Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingSpot, setEditingSpot] = useState<SpotPocketItem | null>(null);
  const [activeMenuSpotId, setActiveMenuSpotId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<PocketCategory>('spot');
  const [newMemo, setNewMemo] = useState<string>('');
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string>('');
  const [newCountry, setNewCountry] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('');
  const [newLat, setNewLat] = useState<number | undefined>();
  const [newLng, setNewLng] = useState<number | undefined>();
  const [newAddress, setNewAddress] = useState<string>('');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState<boolean>(false);
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState<boolean>(false);

  // Multi-selection state for creating trip with selected pockets
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedSpotIds, setSelectedSpotIds] = useState<Set<string>>(new Set());

  const handleToggleSelectSpot = (spotId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSpotIds(prev => {
      const next = new Set(prev);
      if (next.has(spotId)) {
        next.delete(spotId);
      } else {
        next.add(spotId);
      }
      return next;
    });
  };

  const handleCreateTripFromSelectedPockets = () => {
    const selectedList = spots.filter(s => selectedSpotIds.has(s.id));
    if (selectedList.length === 0) return;

    try {
      sessionStorage.setItem('builder_selected_pockets', JSON.stringify(selectedList));
    } catch (_) {}

    const firstCountry = selectedList.find(s => s.country)?.country || '';
    const firstCity = selectedList.find(s => s.city)?.city || '';

    if (firstCountry) {
      try { sessionStorage.setItem('builder_target_country', firstCountry); } catch (_) {}
    }
    if (firstCity) {
      try { sessionStorage.setItem('builder_target_city', firstCity); } catch (_) {}
    }

    if (onCreateTripWithPockets) {
      onCreateTripWithPockets(selectedList);
    } else {
      onNavigate('map');
    }
  };

  // Handle direct file upload (drag & drop, file picker, or paste) in Modal
  const handleUploadThumbnailFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      setIsUploadingThumbnail(true);
      const compressed = await compressImage(file, 1600, 1200, 0.85);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `pockets/${Date.now()}_${safeName}`;
      const url = await uploadFileToR2(compressed, storagePath);
      setNewThumbnailUrl(url);
    } catch (err) {
      console.error('Failed to upload pocket thumbnail:', err);
      alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploadingThumbnail(false);
      setIsDraggingThumbnail(false);
    }
  };

  // Clipboard paste listener when modal is open
  useEffect(() => {
    if (!isAddModalOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      // If user is focused on an input/textarea and pasting plain text, don't hijack unless it's an image file
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleUploadThumbnailFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAddModalOpen]);

  // Delete Confirm Modal
  const [spotToDelete, setSpotToDelete] = useState<SpotPocketItem | null>(null);

  // Use in Trip Popover & Schedule Modal
  const [spotToUseInTrip, setSpotToUseInTrip] = useState<SpotPocketItem | null>(null);
  const [scheduleTargetTrip, setScheduleTargetTrip] = useState<Trip | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Real-time sync with Firestore server on mount (multi-device synchronization)
  useEffect(() => {
    const unsub = subscribePockets((cloudSpots) => {
      setSpots(cloudSpots);
    });
    return () => unsub();
  }, []);

  // Close card menu when clicking outside
  useEffect(() => {
    if (!activeMenuSpotId) return;
    const handleDocumentClick = () => setActiveMenuSpotId(null);
    window.addEventListener('click', handleDocumentClick);
    return () => window.removeEventListener('click', handleDocumentClick);
  }, [activeMenuSpotId]);

  const allAvailableTrips = useMemo(() => {
    return [...trips, ...plans];
  }, [trips, plans]);

  // Unique Region Chips (Country · City)
  const regionOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    spots.forEach(s => {
      const country = (s.country || '').trim();
      const city = (s.city || '').trim();
      const key = country && city ? `${country} · ${city}` : (country || city || '기타');
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([region, count]) => ({ region, count }));
  }, [spots]);

  // Favorite count
  const favoriteCount = useMemo(() => {
    return spots.filter(s => s.isFavorite).length;
  }, [spots]);

  // Filtered spots
  const filteredSpots = useMemo(() => {
    return spots.filter(s => {
      // Favorite filter
      if (isFavoriteFilter && !s.isFavorite) {
        return false;
      }
      // Region filter
      if (selectedRegion !== 'ALL') {
        const country = (s.country || '').trim();
        const city = (s.city || '').trim();
        const key = country && city ? `${country} · ${city}` : (country || city || '기타');
        if (key !== selectedRegion) return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchMemo = (s.memo || '').toLowerCase().includes(q);
        const matchLoc = (s.country || '').toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q);
        if (!matchTitle && !matchMemo && !matchLoc) return false;
      }
      return true;
    });
  }, [spots, isFavoriteFilter, selectedRegion, selectedCategory, searchQuery]);

  // Toggle Favorite
  const handleToggleFavorite = async (spotId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = spots.map(s => s.id === spotId ? { ...s, isFavorite: !s.isFavorite } : s);
    setSpots(updated);
    await savePockets(updated);
  };

  // Open Edit Modal
  const handleOpenEditSpot = (spot: SpotPocketItem) => {
    setEditingSpot(spot);
    setNewTitle(spot.title);
    setNewCategory(spot.category);
    setNewMemo(spot.memo || '');
    setNewSourceUrl(spot.sourceUrl || '');
    setNewThumbnailUrl(spot.thumbnailUrl || '');
    setNewCountry(spot.country || '');
    setNewCity(spot.city || '');
    setNewLat(spot.lat);
    setNewLng(spot.lng);
    setNewAddress(spot.address || '');
    setActiveMenuSpotId(null);
    setIsAddModalOpen(true);
  };

  // Reset form
  const handleCloseModal = () => {
    setEditingSpot(null);
    setNewTitle('');
    setNewCategory('spot');
    setNewMemo('');
    setNewSourceUrl('');
    setNewThumbnailUrl('');
    setNewCountry('');
    setNewCity('');
    setNewLat(undefined);
    setNewLng(undefined);
    setNewAddress('');
    setIsUploadingThumbnail(false);
    setIsDraggingThumbnail(false);
    setIsAddModalOpen(false);
  };

  // Create or Update spot
  const handleSaveSpot = async (e: React.FormEvent) => {
    e.preventDefault();

    // 장소명이 비어있고 팁인 경우 자동 명명
    let finalTitle = newTitle.trim();
    if (!finalTitle && newCategory === 'tip') {
      finalTitle = newCity || newCountry ? `${newCity || newCountry} 여행 꿀팁` : '여행 꿀팁';
    }

    if (!finalTitle) {
      alert('제목(장소명 또는 꿀팁 제목)을 입력해주세요.');
      return;
    }

    const platform = detectPlatform(newSourceUrl);

    if (editingSpot) {
      // Update existing
      const updated = spots.map(s => {
        if (s.id === editingSpot.id) {
          return {
            ...s,
            title: finalTitle,
            category: newCategory,
            memo: newMemo.trim() || undefined,
            sourceUrl: newSourceUrl.trim() || undefined,
            platform,
            thumbnailUrl: newThumbnailUrl.trim() || undefined,
            country: newCountry.trim() || undefined,
            city: newCity.trim() || undefined,
            lat: newLat,
            lng: newLng,
            address: newAddress.trim() || undefined,
          };
        }
        return s;
      });
      setSpots(updated);
      await savePockets(updated);
      setActionSuccessToast(`'${finalTitle}' 수정 완료`);
    } else {
      // Create new
      const item: SpotPocketItem = {
        id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: finalTitle,
        category: newCategory,
        memo: newMemo.trim() || undefined,
        sourceUrl: newSourceUrl.trim() || undefined,
        platform,
        thumbnailUrl: newThumbnailUrl.trim() || undefined,
        country: newCountry.trim() || undefined,
        city: newCity.trim() || undefined,
        lat: newLat,
        lng: newLng,
        address: newAddress.trim() || undefined,
        createdAt: Date.now()
      };
      const updated = [item, ...spots];
      setSpots(updated);
      await savePockets(updated);
      setActionSuccessToast(`'${item.title}' 포켓에 보관 완료`);
    }

    handleCloseModal();
    setTimeout(() => setActionSuccessToast(null), 3000);
  };

  // Delete spot
  const handleDeleteSpot = async () => {
    if (!spotToDelete) return;
    const updated = spots.filter(s => s.id !== spotToDelete.id);
    setSpots(updated);
    await savePockets(updated);
    setSpotToDelete(null);
  };

  // Helper to reliably extract valid YYYY.MM.DD dates from a trip's date string
  const getTripValidDates = (dateStr?: string): string[] => {
    if (!dateStr) return ['2025.04.12'];
    const cleaned = dateStr.replace(/~/g, '-');
    const parts = cleaned.split('-').map(s => s.trim().replace(/\//g, '.'));
    if (parts.length >= 2) {
      const sMatch = parts[0].match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
      const eMatch = parts[1].match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
      if (sMatch && eMatch) {
        const sDate = new Date(parseInt(sMatch[1]), parseInt(sMatch[2]) - 1, parseInt(sMatch[3]));
        const eDate = new Date(parseInt(eMatch[1]), parseInt(eMatch[2]) - 1, parseInt(eMatch[3]));
        const list: string[] = [];
        const cur = new Date(sDate);
        while (cur <= eDate && list.length < 30) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          list.push(`${y}.${m}.${d}`);
          cur.setDate(cur.getDate() + 1);
        }
        if (list.length > 0) return list;
      }
    }
    if (parts[0] && parts[0].match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/)) {
      return [parts[0]];
    }
    return ['2025.04.12'];
  };

  // Step 1: When user clicks trip in "USE IN TRIP" list, open the Schedule Picker modal
  const handleSelectTripForSpot = (targetTrip: Trip) => {
    setScheduleTargetTrip(targetTrip);
  };

  // Step 2: Confirm selected date and time slot from modal
  const handleConfirmSchedule = (chosenDate: string, chosenTime: string) => {
    if (!spotToUseInTrip || !scheduleTargetTrip) return;

    const newItem: TimelineItem = {
      id: Date.now(),
      time: chosenTime,
      type: spotToUseInTrip.category === 'food' || spotToUseInTrip.category === 'cafe' ? 'restaurant' : 'activity',
      place: spotToUseInTrip.title,
      cost: '-',
      memo: spotToUseInTrip.memo || '',
      lat: spotToUseInTrip.lat,
      lng: spotToUseInTrip.lng,
      date: chosenDate,
      tripId: scheduleTargetTrip.id,
      link: spotToUseInTrip.sourceUrl || ''
    };

    if (onAddTimelineItemToTrip) {
      onAddTimelineItemToTrip(scheduleTargetTrip.id, newItem);
    } else {
      try {
        const raw = localStorage.getItem('timeline_data') || '{}';
        const parsed = JSON.parse(raw);
        if (!parsed[chosenDate]) parsed[chosenDate] = [];
        parsed[chosenDate].push(newItem);
        localStorage.setItem('timeline_data', JSON.stringify(parsed));
      } catch (_) {}
    }

    setActionSuccessToast(`'${scheduleTargetTrip.title}' 타임라인(${chosenDate} ${chosenTime})에 추가 완료`);
    setTimeout(() => setActionSuccessToast(null), 3500);

    setScheduleTargetTrip(null);
    setSpotToUseInTrip(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-black dark:text-white flex flex-col font-sans">
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-mono tracking-widest uppercase shadow-2xl flex items-center gap-2 border border-black/20 dark:border-white/20 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-3.5 h-3.5 text-red-500" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-16 flex-grow flex flex-col">
        {/* Header - Swiss Minimal Typographic Hierarchy */}
        <div className="border-b border-black/15 dark:border-white/15 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] font-mono tracking-widest uppercase text-black/50 dark:text-white/50 mb-1.5">
              <Bookmark className="w-3.5 h-3.5 text-red-500" />
              <span>SPOT POCKET ARCHIVE · {spots.length} SAVED GEMS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase">
              SPOT POCKET
            </h1>
            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 font-mono mt-1">
              SNS 스크랩 & 숨은 핫플 꿀팁을 지역별 갤러리로 보관하고, 여정 작성 시 즉시 꺼내어 활용하세요.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(prev => !prev);
                if (isSelectionMode) setSelectedSpotIds(new Set());
              }}
              className={`h-10 px-4 text-xs font-mono font-bold tracking-widest uppercase flex items-center gap-2 border transition-colors cursor-pointer ${
                isSelectionMode
                  ? 'bg-red-600 text-white border-red-600'
                  : 'border-black/20 dark:border-white/20 text-black/80 dark:text-white/80 hover:border-black dark:hover:border-white'
              }`}
              title="포켓들을 복수로 선택하여 신규 여정 만들기"
            >
              <Layers className="w-4 h-4" />
              <span>{isSelectionMode ? 'EXIT SELECT' : 'SELECT'}</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>KEEP SPOT</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="space-y-4 mb-8">
          {/* 1. Region Chips (Country · City) & Favorites */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {/* Favorite Filter Chip */}
            <button
              type="button"
              onClick={() => setIsFavoriteFilter(prev => !prev)}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                isFavoriteFilter
                  ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs'
                  : 'border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:border-black/40'
              }`}
            >
              <Star className={`w-3 h-3 ${isFavoriteFilter ? 'fill-white text-white' : 'text-amber-500 fill-amber-500'}`} />
              <span>FAVORITES ({favoriteCount})</span>
            </button>

            <span className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase whitespace-nowrap mx-1">
              REGION:
            </span>
            <button
              onClick={() => setSelectedRegion('ALL')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                selectedRegion === 'ALL'
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                  : 'border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40 text-black/70 dark:text-white/70'
              }`}
            >
              ALL ({spots.length})
            </button>
            {regionOptions.map(({ region, count }) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                  selectedRegion === region
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                    : 'border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40 text-black/70 dark:text-white/70'
                }`}
              >
                {region} ({count})
              </button>
            ))}
          </div>

          {/* 2. Category Chips & Search Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-black/10 dark:border-white/10">
            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === 'ALL'
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                    : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60'
                }`}
              >
                ALL
              </button>
              {(Object.keys(CATEGORY_META) as PocketCategory[]).map(cat => {
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                        : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" style={{ color: isSelected ? undefined : meta.color }} />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="장소명, 꿀팁, 지역 검색..."
                className="w-full h-8 pl-9 pr-3 bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 text-xs font-mono placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Gallery Grid (Mobile 2-column: grid-cols-2) */}
        {filteredSpots.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-24 border border-dashed border-black/20 dark:border-white/20 text-center">
            <Bookmark className="w-8 h-8 text-black/20 dark:text-white/20 mb-3" />
            <p className="text-sm font-mono text-black/50 dark:text-white/50 uppercase tracking-widest">
              보관된 스팟이 없습니다
            </p>
            <p className="text-xs text-black/40 dark:text-white/40 mt-1">
              상단의 'KEEP SPOT' 버튼을 눌러 인스타, 유튜브 등의 핫플과 꿀팁을 킵해보세요.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
              {filteredSpots.slice(0, visibleCount).map(spot => {
                const meta = CATEGORY_META[spot.category] || CATEGORY_META.spot;
                const Icon = meta.icon;
                const locationLabel = [spot.country, spot.city].filter(Boolean).join(' · ') || 'LOCATION';
                const isSelected = selectedSpotIds.has(spot.id);

                return (
                  <div
                    key={spot.id}
                    onClick={() => {
                      if (isSelectionMode) handleToggleSelectSpot(spot.id);
                    }}
                    className={`group flex flex-col border bg-white dark:bg-[#111111] transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md ${
                      isSelectionMode ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'border-red-600 ring-2 ring-red-600'
                        : 'border-black/15 dark:border-white/15 hover:border-black/50 dark:hover:border-white/50'
                    }`}
                  >
                    {/* Card Visual / Thumbnail (3:4 SNS Aspect Ratio) */}
                    <div className="relative aspect-[3/4] bg-black/5 dark:bg-white/5 overflow-hidden transition-all">
                      {spot.thumbnailUrl ? (
                        <img
                          src={spot.thumbnailUrl}
                          alt={spot.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-black/20 dark:text-white/20">
                          <Icon className="w-10 h-10 mb-1" />
                          <span className="text-[10px] font-mono tracking-widest uppercase">{meta.label}</span>
                        </div>
                      )}

                      {/* Selection Checkbox (Visible in Selection Mode) */}
                      {isSelectionMode ? (
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectSpot(spot.id, e)}
                          className={`absolute top-2.5 left-2.5 w-6 h-6 border flex items-center justify-center transition-all z-20 cursor-pointer shadow-md ${
                            isSelected
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'bg-white/90 dark:bg-black/90 border-black/40 dark:border-white/40 text-transparent hover:border-red-600'
                          }`}
                        >
                          <Check className={`w-4 h-4 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                        </button>
                      ) : (
                        /* Favorite Star Button Overlay */
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(spot.id, e)}
                          className="absolute top-2 left-2 w-6 h-6 sm:w-7 sm:h-7 bg-black/70 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-black transition-colors cursor-pointer z-10"
                          title={spot.isFavorite ? "즐겨찾기 해제" : "자주 쓰는 스팟 즐겨찾기"}
                        >
                          <Star className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${spot.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-white/80'}`} />
                        </button>
                      )}

                      {/* Platform Badge Overlay */}
                      {spot.platform && spot.platform !== 'web' && (
                        <div className={`absolute top-2 ${isSelectionMode ? 'left-10' : 'left-9 sm:left-10'} px-1.5 sm:px-2 py-0.5 bg-black/80 backdrop-blur-sm text-white text-[8px] sm:text-[9px] font-mono tracking-widest uppercase border border-white/20`}>
                          {spot.platform}
                        </div>
                      )}

                      {/* Category Chip Overlay */}
                      <div className="absolute top-2 right-2 px-1.5 sm:px-2 py-0.5 bg-white/90 dark:bg-black/90 backdrop-blur-sm text-black dark:text-white text-[8.5px] sm:text-[9px] font-mono tracking-wider uppercase border border-black/10 dark:border-white/10 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span>{meta.label}</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-2.5 sm:p-3.5 flex-grow flex flex-col justify-between">
                      <div>
                        {/* Region Tag */}
                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono tracking-wider uppercase text-black/50 dark:text-white/50 mb-1">
                          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500 shrink-0" />
                          <span className="truncate">{locationLabel}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-black dark:text-white group-hover:text-red-500 transition-colors line-clamp-1">
                          {spot.title}
                        </h3>

                        {/* Memo / Tip Highlight */}
                        {spot.memo && (
                          <div className="mt-1.5 p-1.5 bg-black/[0.03] dark:bg-white/[0.03] border-l-2 border-red-500 text-[10px] sm:text-[11px] text-black/80 dark:text-white/80 font-mono leading-relaxed line-clamp-2">
                            {spot.memo}
                          </div>
                        )}

                        {/* Address preview */}
                        {spot.address && (
                          <p className="mt-1 text-[9px] sm:text-[10px] text-black/40 dark:text-white/40 font-mono truncate">
                            {spot.address}
                          </p>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 mt-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSpotToUseInTrip(spot);
                          }}
                          className="flex-1 h-6 sm:h-7 px-1.5 sm:px-2 bg-black text-white dark:bg-white dark:text-black text-[9px] sm:text-[10px] font-mono tracking-wider uppercase font-bold flex items-center justify-center gap-1 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors cursor-pointer"
                          title="트립 타임라인에 바로 복사 추가"
                        >
                          <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                          <span className="hidden sm:inline">USE IN TRIP</span>
                          <span className="sm:hidden">USE</span>
                        </button>

                        {spot.sourceUrl && (
                          <a
                            href={spot.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
                            title="원본 SNS 링크 열기"
                          >
                            <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </a>
                        )}

                        {/* Hamburger More Menu (Edit & Delete) */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuSpotId(prev => prev === spot.id ? null : spot.id);
                            }}
                            className={`h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center border transition-colors cursor-pointer ${
                              activeMenuSpotId === spot.id
                                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                                : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                            }`}
                            title="스팟 메뉴 (수정/삭제)"
                          >
                            <MoreVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>

                          {activeMenuSpotId === spot.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-full mb-1 z-30 w-28 bg-white dark:bg-[#181818] border border-black/20 dark:border-white/20 shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100 font-mono text-[10px] sm:text-[11px]"
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEditSpot(spot)}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white cursor-pointer font-bold"
                              >
                                <Edit3 className="w-3 h-3 text-blue-500" />
                                <span>수정</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuSpotId(null);
                                  setSpotToDelete(spot);
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-500/10 text-red-500 cursor-pointer font-bold"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                                <span>삭제</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selection Mode Floating Action Bar */}
            {isSelectionMode && selectedSpotIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black text-white dark:bg-white dark:text-black px-5 py-3 border border-black/20 dark:border-white/20 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-lg w-[92vw]">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider truncate">
                  <span className="w-2 h-2 bg-red-600 shrink-0 inline-block" />
                  <span>SELECTED: {selectedSpotIds.size} SPOTS</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedSpotIds(new Set())}
                    className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border border-white/20 dark:border-black/20 hover:border-white dark:hover:border-black transition-colors cursor-pointer"
                  >
                    DESELECT
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateTripFromSelectedPockets}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>CREATE TRIP</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pagination: 40 items per batch */}
            {visibleCount < filteredSpots.length && (
              <div className="flex justify-center mt-10">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => prev + 40)}
                  className="h-10 px-6 border border-black dark:border-white text-xs font-mono font-black uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>LOAD MORE (+40)</span>
                  <span className="text-black/40 dark:text-white/40 font-normal">
                    ({visibleCount} / {filteredSpots.length})
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── USE IN TRIP SELECTOR POPOVER MODAL ── */}
      {spotToUseInTrip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] border border-black dark:border-white w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase">ADD TO TIMELINE</span>
                <h3 className="text-lg font-black uppercase tracking-tight truncate max-w-[280px]">
                  {spotToUseInTrip.title}
                </h3>
              </div>
              <button
                onClick={() => setSpotToUseInTrip(null)}
                className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-black/60 dark:text-white/60 mb-4">
              어느 여정의 타임라인에 이 장소를 추가하시겠습니까?
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border-t border-b border-black/10 dark:border-white/10 py-3">
              {allAvailableTrips.length === 0 ? (
                <p className="text-xs font-mono text-center text-black/40 dark:text-white/40 py-4">
                  등록된 여정이 없습니다.
                </p>
              ) : (
                allAvailableTrips.map(trip => (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTripForSpot(trip)}
                    className="w-full text-left p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-black dark:text-white group-hover:text-red-500 transition-colors">
                        {trip.title}
                      </div>
                      <div className="text-[10px] font-mono text-black/40 dark:text-white/40">
                        {trip.date || '일정 미지정'} · {trip.locationStr || '위치 미지정'}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSpotToUseInTrip(null)}
                className="h-8 px-4 border border-black/20 dark:border-white/20 text-xs font-mono uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE SLOT PICKER MODAL ── */}
      {scheduleTargetTrip && spotToUseInTrip && (
        <PocketScheduleModal
          isOpen={Boolean(scheduleTargetTrip)}
          spot={spotToUseInTrip}
          trip={scheduleTargetTrip}
          availableDates={getTripValidDates(scheduleTargetTrip.date)}
          onClose={() => setScheduleTargetTrip(null)}
          onConfirm={handleConfirmSchedule}
        />
      )}

      {/* ── CREATE OR EDIT SPOT MODAL (Swiss Minimal) ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-3 mb-5">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase">
                  {editingSpot ? 'EDIT SPOT' : 'KEEP SPOT'}
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {editingSpot ? 'EDIT SAVED SPOT' : 'KEEP NEW SPOT'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpot} className="space-y-5">
              {/* Title / Spot Name or Tip Title */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold tracking-widest text-black/70 dark:text-white/70 mb-1">
                  제목 (장소명 또는 꿀팁 제목) *
                </label>
                <PlaceAutocompleteInput
                  value={newTitle}
                  onChange={setNewTitle}
                  onSelectPlace={(placeName, coords, address, countryName, cityName) => {
                    if (placeName) setNewTitle(placeName);
                    if (coords?.lat) setNewLat(coords.lat);
                    if (coords?.lng) setNewLng(coords.lng);
                    if (address) setNewAddress(address);
                    if (countryName) setNewCountry(countryName);
                    if (cityName) setNewCity(cityName);
                  }}
                  placeholder="장소 검색 또는 직접 꿀팁 제목 입력 (예: 시부야 환전 꿀팁)"
                  className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                />
                <p className="text-[9.5px] font-mono text-black/40 dark:text-white/40 mt-1">
                  구글 장소 자동완성을 사용하거나, 꿀팁인 경우 제목을 직접 입력하세요.
                </p>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold tracking-widest text-black/70 dark:text-white/70 mb-1.5">
                  카테고리
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(Object.keys(CATEGORY_META) as PocketCategory[]).map(cat => {
                    const isSelected = newCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setNewCategory(cat)}
                        className={`h-8 text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                            : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/40'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Country & City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold tracking-widest text-black/70 dark:text-white/70 mb-1">
                    국가 (Country)
                  </label>
                  <input
                    type="text"
                    value={newCountry}
                    onChange={e => setNewCountry(e.target.value)}
                    placeholder="예: Japan, France"
                    className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold tracking-widest text-black/70 dark:text-white/70 mb-1">
                    도시/지역 (City)
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    placeholder="예: Tokyo, Paris"
                    className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Memo & Tips */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold tracking-widest text-black/70 dark:text-white/70 mb-1">
                  핵심 꿀팁 / 할인 / 웨이팅 정보
                </label>
                <textarea
                  value={newMemo}
                  onChange={e => setNewMemo(e.target.value)}
                  rows={2}
                  placeholder="예: 3시 이후 웨이팅 없음. 바닐라 라떼 & 크루아상 추천. 인스타 예약 필수."
                  className="w-full px-0 py-1.5 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none resize-none leading-relaxed transition-colors"
                />
              </div>

              {/* Source SNS URL */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold tracking-widest text-black/70 dark:text-white/70 mb-1">
                  SNS 원본 링크 (인스타, 유튜브, 블로그, 구글맵)
                </label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                />
              </div>

              {/* Thumbnail Image Uploader (Swiss Minimal, Drag&Drop, Paste, URL) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/70 dark:text-white/70">
                    썸네일 이미지 (선택)
                  </label>
                  <span className="text-[9px] font-mono text-black/40 dark:text-white/40">
                    드래그&드롭 · 붙여넣기(Ctrl+V) 지원
                  </span>
                </div>

                {newThumbnailUrl ? (
                  <div className="relative aspect-[3/4] max-h-64 mx-auto overflow-hidden border border-black/20 dark:border-white/20 group bg-black/5 dark:bg-white/5">
                    <img
                      src={newThumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="h-7 px-3 bg-white text-black text-[10px] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer hover:bg-white/90">
                        <Upload className="w-3.5 h-3.5" />
                        CHANGE
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (file) await handleUploadThumbnailFile(file);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewThumbnailUrl('')}
                        className="h-7 px-3 bg-red-600 text-white text-[10px] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer hover:bg-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        REMOVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      onDragOver={e => {
                        e.preventDefault();
                        setIsDraggingThumbnail(true);
                      }}
                      onDragLeave={() => setIsDraggingThumbnail(false)}
                      onDrop={async e => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) await handleUploadThumbnailFile(file);
                      }}
                      className={`block border border-dashed transition-all p-4 text-center cursor-pointer ${
                        isDraggingThumbnail
                          ? 'border-red-500 bg-red-500/5'
                          : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (file) await handleUploadThumbnailFile(file);
                        }}
                      />
                      {isUploadingThumbnail ? (
                        <div className="flex flex-col items-center justify-center py-2 gap-1.5">
                          <Loader2 className="w-5 h-5 animate-spin text-black dark:text-white" />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60">
                            UPLOADING IMAGE...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-2 gap-1">
                          <Upload className="w-4 h-4 text-black/50 dark:text-white/50" />
                          <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                            CLICK OR DRAG IMAGE HERE
                          </span>
                          <span className="text-[9px] font-mono text-black/40 dark:text-white/40">
                            또는 이미지를 클립보드에 복사 후 Ctrl+V 붙여넣기
                          </span>
                        </div>
                      )}
                    </label>

                    {/* URL direct input */}
                    <div className="mt-2">
                      <input
                        type="url"
                        value={newThumbnailUrl}
                        onChange={e => setNewThumbnailUrl(e.target.value)}
                        placeholder="또는 이미지 URL 직접 입력 (https://...)"
                        className="w-full h-7 px-0 bg-transparent border-b border-black/15 dark:border-white/15 text-[11px] font-mono focus:border-black dark:focus:border-white focus:outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-black/15 dark:border-white/15 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="h-9 px-4 border border-black/20 dark:border-white/20 text-xs font-mono uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {editingSpot ? 'SAVE' : 'KEEP SPOT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      <ConfirmModal
        isOpen={Boolean(spotToDelete)}
        title="DELETE SPOT"
        message={`'${spotToDelete?.title || ''}' 스팟을 포켓에서 삭제하시겠습니까?`}
        confirmLabel="DELETE"
        cancelLabel="CANCEL"
        onConfirm={handleDeleteSpot}
        onCancel={() => setSpotToDelete(null)}
        confirmVariant="danger"
      />
    </div>
  );
}
