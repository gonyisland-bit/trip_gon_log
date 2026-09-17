import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bookmark, MapPin, Plus, ExternalLink, Trash2, Edit3, Compass, 
  Search, Check, X, ArrowUpRight, ChevronRight, Layers, Sparkles,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Map, MoreVertical, Star,
  Upload, Image as ImageIcon, Loader2, Heart, MessageSquare,
  Globe, FileText, CheckSquare, Square,
  SlidersHorizontal, ArrowUpDown, ChevronDown, GripVertical, ArrowUp, ArrowDown,
  Tag
} from 'lucide-react';
import { SpotPocketItem, PocketCategory, Trip, Plan, TimelineItem, PocketComment } from '../types';
import { getSavedPockets, savePockets, detectPlatform, subscribePockets, getOrCreateGuestId, toggleSpotLike } from '../utils/pocketStorage';
import { PlaceAutocompleteInput } from '../components/PlaceAutocompleteInput';
import { ConfirmModal } from '../components/ConfirmModal';
import { PocketScheduleModal } from '../components/PocketScheduleModal';
import { PocketDetailModal } from '../components/PocketDetailModal';
import { compressImage } from '../utils/imageHelper';
import { uploadFileToR2 } from '../utils/storageHelper';
import { auth } from '../firebase';

interface PocketHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddTimelineItemToTrip?: (tripId: number, item: TimelineItem) => void;
  onCreateTripWithPockets?: (selectedPockets: SpotPocketItem[]) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDarkMode: boolean;
  onOpenAuthModal?: () => void;
}

const CATEGORY_META: Record<PocketCategory, { label: string; icon: React.ElementType; color: string }> = {
  food: { label: 'FOOD', icon: Utensils, color: '#dc2626' },
  cafe: { label: 'CAFE', icon: Coffee, color: '#d97706' },
  spot: { label: 'SPOT', icon: Camera, color: '#2563eb' },
  shopping: { label: 'SHOPPING', icon: ShoppingBag, color: '#7c3aed' },
  tip: { label: 'TIP', icon: Lightbulb, color: '#059669' },
};

const renderPlatformIcon = (platform?: string) => {
  const p = (platform || '').toLowerCase();
  if (p.includes('insta')) {
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }
  if (p.includes('youtu')) {
    return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (p.includes('thread') || p.includes('blog') || p.includes('naver') || p.includes('tistory')) {
    return <FileText className="w-3.5 h-3.5" />;
  }
  if (p.includes('map')) {
    return <MapPin className="w-3.5 h-3.5" />;
  }
  return <Globe className="w-3.5 h-3.5" />;
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  '대한민국': 'KOREA',
  '한국': 'KOREA',
  '남한': 'KOREA',
  'KOREA': 'KOREA',
  'SOUTH KOREA': 'KOREA',
  '일본': 'JAPAN',
  'JAPAN': 'JAPAN',
  '미국': 'USA',
  'USA': 'USA',
  'UNITED STATES': 'USA',
  '프랑스': 'FRANCE',
  'FRANCE': 'FRANCE',
  '이탈리아': 'ITALY',
  'ITALY': 'ITALY',
  '스페인': 'SPAIN',
  'SPAIN': 'SPAIN',
  '영국': 'UK',
  'UK': 'UK',
  'UNITED KINGDOM': 'UK',
  '대만': 'TAIWAN',
  'TAIWAN': 'TAIWAN',
  '베트남': 'VIETNAM',
  'VIETNAM': 'VIETNAM',
  '태국': 'THAILAND',
  'THAI': 'THAILAND',
  'THAILAND': 'THAILAND',
  '중국': 'CHINA',
  'CHINA': 'CHINA',
  '홍콩': 'HONG KONG',
  'HONG KONG': 'HONG KONG',
  '마카오': 'MACAU',
  'MACAU': 'MACAU',
  '싱가포르': 'SINGAPORE',
  'SINGAPORE': 'SINGAPORE',
  '독일': 'GERMANY',
  'GERMANY': 'GERMANY',
  '스위스': 'SWITZERLAND',
  'SWITZERLAND': 'SWITZERLAND',
  '오스트리아': 'AUSTRIA',
  'AUSTRIA': 'AUSTRIA',
  '호주': 'AUSTRALIA',
  'AUSTRALIA': 'AUSTRALIA',
  '체코': 'CZECH',
  'CZECH': 'CZECH',
  '헝가리': 'HUNGARY',
  'HUNGARY': 'HUNGARY',
  '캐나다': 'CANADA',
  'CANADA': 'CANADA',
};

export function getNormalizedCountry(rawCountry?: string): string {
  if (!rawCountry) return '';
  const trimmed = rawCountry.trim();
  const upper = trimmed.toUpperCase();
  if (COUNTRY_NAME_MAP[trimmed]) return COUNTRY_NAME_MAP[trimmed];
  if (COUNTRY_NAME_MAP[upper]) return COUNTRY_NAME_MAP[upper];
  return upper;
}

export function getNormalizedCity(spot: { country?: string; city?: string; address?: string }): string {
  const c = (spot.city || '').trim();
  const addr = (spot.address || '').trim();
  const country = getNormalizedCountry(spot.country);
  const combined = `${c} ${addr}`.toLowerCase();

  if (country === 'JAPAN' || combined.includes('japan') || combined.includes('일본')) {
    if (/도쿄|tokyo|시부야|shibuya|치요다|chiyoda|신주쿠|shinjuku|미나토|minato|긴자|ginza|아사쿠사|asakusa|우에노|ueno|롯폰기|roppongi|아키하바라|akihabara|주오구|chuo|메구로|meguro|세타가야|setagaya|도시마|toshima|이케부쿠로|ikebukuro|하라주쿠|harajuku|오모테산도|omotesando|다이칸야마|daikanyama|스미다|sumida|오다이바|odaiba|시나가와|shinagawa|분쿄|bunkyo|고토|koto/.test(combined)) {
      return '도쿄';
    }
    if (/오사카|osaka|난바|nanba|namba|우메다|umeda|도톤보리|dotonbori|신사이바시|shinsaibashi|나니와|naniwa/.test(combined)) {
      return '오사카';
    }
    if (/교토|kyoto|기온|gion|아라시야마|arashiyama/.test(combined)) {
      return '교토';
    }
    if (/후쿠오카|fukuoka|하카타|hakata|텐진|tenjin/.test(combined)) {
      return '후쿠오카';
    }
    if (/삿포로|sapporo|오타루|otaru|스스키노|susukino/.test(combined)) {
      return '삿포로';
    }
    if (/오키나와|okinawa|나하|naha/.test(combined)) {
      return '오키나와';
    }
    if (/나고야|nagoya/.test(combined)) {
      return '나고야';
    }
  }

  if (country === 'KOREA' || combined.includes('korea') || combined.includes('한국') || combined.includes('대한민국')) {
    if (/서울|seoul|강남|gangnam|종로|jongno|중구|마포|mapo|홍대|hongdae|성수|seongsu|이태원|itaewon|용산|yongsan|명동|myeongdong|서초|seocho|송파|songpa|잠실|jamsil|영등포|yeongdeungpo|여의도|yeouido/.test(combined)) {
      return '서울';
    }
    if (/부산|busan|해운대|haeundae|광안리|gwangan|서면|seomyeon|남포동|nampo/.test(combined)) {
      return '부산';
    }
    if (/제주|jeju|서귀포|seogwipo/.test(combined)) {
      return '제주';
    }
    if (/강릉|gangneung|속초|sokcho/.test(combined)) {
      return '강릉';
    }
  }

  if (c) {
    if (c.toLowerCase() === 'tokyo' || c === '도쿄도') return '도쿄';
    if (c.toLowerCase() === 'osaka' || c === '오사카부') return '오사카';
    if (c.toLowerCase() === 'kyoto' || c === '교토부') return '교토';
    if (c.toLowerCase() === 'seoul' || c === '서울특별시') return '서울';
    if (c.toLowerCase() === 'busan' || c === '부산광역시') return '부산';
    return c;
  }
  return '';
}

export function PocketHubPage({
  trips,
  plans,
  onNavigate,
  onAddTimelineItemToTrip,
  onCreateTripWithPockets,
  isLoggedIn,
  isAdmin,
  isDarkMode,
  onOpenAuthModal,
}: PocketHubPageProps) {
  const [spots, setSpots] = useState<SpotPocketItem[]>(() => getSavedPockets());

  // Filter state — 2-level country → city hierarchy
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchInputOpen, setIsSearchInputOpen] = useState<boolean>(false);
  const [isFavoriteFilter, setIsFavoriteFilter] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Sort state
  type SortMode = 'custom' | 'newest' | 'oldest' | 'title' | 'category';
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Drag-reorder state (admin-only, requires explicit reorder toggle)
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [draggingSpotId, setDraggingSpotId] = useState<string | null>(null);
  const [dragOverSpotId, setDragOverSpotId] = useState<string | null>(null);

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

  // Detail Modal state
  const [selectedSpotForModal, setSelectedSpotForModal] = useState<SpotPocketItem | null>(null);

  // User/Guest identifier for Likes
  const currentUserId = useMemo(() => {
    return getOrCreateGuestId();
  }, []);

  const handleToggleLike = async (spotId: string) => {
    const updated = await toggleSpotLike(spotId, currentUserId);
    setSpots(updated);
    if (selectedSpotForModal && selectedSpotForModal.id === spotId) {
      const updatedItem = updated.find(s => s.id === spotId);
      if (updatedItem) setSelectedSpotForModal(updatedItem);
    }
  };

  const handleSaveSpotComments = async (spotId: string, comments: PocketComment[]) => {
    const updated = spots.map(s => s.id === spotId ? { ...s, comments } : s);
    setSpots(updated);
    await savePockets(updated);
    if (selectedSpotForModal && selectedSpotForModal.id === spotId) {
      setSelectedSpotForModal(prev => prev ? { ...prev, comments } : null);
    }
  };

  // Multi-selection state for creating trip with selected pockets
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedSpotIds, setSelectedSpotIds] = useState<Set<string>>(new Set());

  // Delete Confirm Modal
  const [spotToDelete, setSpotToDelete] = useState<SpotPocketItem | null>(null);

  // Use in Trip Popover & Schedule Modal
  const [spotToUseInTrip, setSpotToUseInTrip] = useState<SpotPocketItem | null>(null);
  const [scheduleTargetTrip, setScheduleTargetTrip] = useState<Trip | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

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

  // ESC 키로 선택 해제 및 셀렉트 모드 종료 제어
  useEffect(() => {
    if (!isSelectionMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        // 모달이나 팝오버가 열려있지 않은 상태일 때만 반응
        if (isAddModalOpen || selectedSpotForModal || spotToDelete || spotToUseInTrip) return;

        if (selectedSpotIds.size > 0) {
          e.preventDefault();
          setSelectedSpotIds(new Set());
        } else {
          e.preventDefault();
          setIsSelectionMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, selectedSpotIds.size, isAddModalOpen, selectedSpotForModal, spotToDelete, spotToUseInTrip]);

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

  // Close sort dropdown when clicking outside
  useEffect(() => {
    if (!isSortOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    window.addEventListener('click', handleDocumentClick);
    return () => window.removeEventListener('click', handleDocumentClick);
  }, [isSortOpen]);

  // Auto-exit reorder mode when sort mode changes away from CUSTOM
  useEffect(() => {
    if (sortMode !== 'custom') setIsReorderMode(false);
  }, [sortMode]);

  const allAvailableTrips = useMemo(() => {
    return [...trips, ...plans];
  }, [trips, plans]);

  // Country options from all spots (normalized to uppercase English)
  const countryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    spots.forEach(s => {
      const c = getNormalizedCountry(s.country);
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([country, count]) => ({ country, count }));
  }, [spots]);

  // City options for the selected country (normalized to major cities)
  const cityOptions = useMemo(() => {
    if (selectedCountry === 'ALL') return [];
    const counts: Record<string, number> = {};
    spots.filter(s => getNormalizedCountry(s.country) === selectedCountry).forEach(s => {
      const city = getNormalizedCity(s);
      if (city) counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([city, count]) => ({ city, count }));
  }, [spots, selectedCountry]);

  // Favorite count
  const favoriteCount = useMemo(() => {
    return spots.filter(s => s.isFavorite).length;
  }, [spots]);

  // Active filter count (for badge)
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedCountry !== 'ALL') n++;
    if (selectedCity !== 'ALL') n++;
    if (selectedCategory !== 'ALL') n++;
    if (isFavoriteFilter) n++;
    return n;
  }, [selectedCountry, selectedCity, selectedCategory, isFavoriteFilter]);

  // Filtered spots
  const filteredSpots = useMemo(() => {
    return spots.filter(s => {
      if (isFavoriteFilter && !s.isFavorite) return false;
      if (selectedCountry !== 'ALL') {
        if (getNormalizedCountry(s.country) !== selectedCountry) return false;
        if (selectedCity !== 'ALL' && getNormalizedCity(s) !== selectedCity) return false;
      }
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchMemo = (s.memo || '').toLowerCase().includes(q);
        const matchLoc = (s.country || '').toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q) || (s.address || '').toLowerCase().includes(q);
        if (!matchTitle && !matchMemo && !matchLoc) return false;
      }
      return true;
    });
  }, [spots, isFavoriteFilter, selectedCountry, selectedCity, selectedCategory, searchQuery]);

  // Original index map for stable custom sorting fallback
  const originalIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    spots.forEach((s, idx) => { map[s.id] = idx; });
    return map;
  }, [spots]);

  // Sorted spots
  const sortedSpots = useMemo(() => {
    const copy = [...filteredSpots];
    switch (sortMode) {
      case 'newest':   return copy.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest':   return copy.sort((a, b) => a.createdAt - b.createdAt);
      case 'title':    return copy.sort((a, b) => a.title.localeCompare(b.title));
      case 'category': return copy.sort((a, b) => a.category.localeCompare(b.category));
      case 'custom':
      default:
        return copy.sort((a, b) => {
          const ao = typeof a.order === 'number' ? a.order : (originalIndexMap[a.id] ?? 0);
          const bo = typeof b.order === 'number' ? b.order : (originalIndexMap[b.id] ?? 0);
          return ao - bo;
        });
    }
  }, [filteredSpots, sortMode, originalIndexMap]);

  // Is drag-reorder mode active? (admin + explicit reorder toggle + custom sort + no filters)
  const isDragMode = isAdmin && isReorderMode && sortMode === 'custom' && activeFilterCount === 0 && !searchQuery.trim();

  // Grouped spots by country (top-level grouping — avoids sub-district fragmentation)
  const groupedSpots = useMemo(() => {
    const groups: { key: string; label: string; items: SpotPocketItem[] }[] = [];
    const record: Record<string, SpotPocketItem[]> = {};
    sortedSpots.forEach(s => {
      const country = getNormalizedCountry(s.country) || 'UNCATEGORIZED';
      if (!record[country]) record[country] = [];
      record[country].push(s);
    });
    Object.entries(record).forEach(([key, items]) => groups.push({ key, label: key.toUpperCase(), items }));
    return groups;
  }, [sortedSpots]);

  // Sort labels
  const SORT_LABELS: Record<string, string> = {
    custom: 'CUSTOM',
    newest: 'NEWEST',
    oldest: 'OLDEST',
    title: 'A-Z',
    category: 'CATEGORY',
  };

  // Admin-only: reorder spots by drag result
  const handleDrop = async (targetId: string) => {
    if (!draggingSpotId || draggingSpotId === targetId) {
      setDraggingSpotId(null);
      setDragOverSpotId(null);
      return;
    }
    const currentOrder = sortedSpots.map(s => s.id);
    const fromIdx = currentOrder.indexOf(draggingSpotId);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...currentOrder];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, draggingSpotId);
    const orderRecord: Record<string, number> = {};
    reordered.forEach((id, idx) => { orderRecord[id] = idx; });
    const updated = spots.map(s => s.id in orderRecord ? { ...s, order: orderRecord[s.id] } : s);
    setSpots(updated);
    setDraggingSpotId(null);
    setDragOverSpotId(null);
    await savePockets(updated);
  };

  // Admin-only: move spot up/down in custom order
  const handleMoveSpot = async (spotId: string, direction: 'up' | 'down') => {
    const currentOrder = sortedSpots.map(s => s.id);
    const idx = currentOrder.indexOf(spotId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= currentOrder.length) return;
    const reordered = [...currentOrder];
    reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, spotId);
    const orderRecord: Record<string, number> = {};
    reordered.forEach((id, i) => { orderRecord[id] = i; });
    const updated = spots.map(s => s.id in orderRecord ? { ...s, order: orderRecord[s.id] } : s);
    setSpots(updated);
    setActiveMenuSpotId(null);
    await savePockets(updated);
  };

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
    <div className="min-h-screen bg-transparent text-black dark:text-white flex flex-col font-sans">
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-mono tracking-widest uppercase shadow-2xl flex items-center gap-2 border border-black/20 dark:border-white/20 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-3.5 h-3.5 text-red-500" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* 1. Header - Editorial Masthead (Matching Trip & Magazine Style) */}
      <section className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-8 sm:pt-14 pb-8 border-b border-black/10 dark:border-white/10">
        {/* Top Metadata Barcode & Category Tag */}
        <div className="flex items-center justify-between text-xs font-mono tracking-widest uppercase text-black/60 dark:text-white/60 mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="bg-black text-white dark:bg-white dark:text-black font-black px-2 py-0.5 text-[10px]">
              POCKET
            </span>
            <span className="font-bold text-red-600 dark:text-red-400">
              SPOT INSPIRATION
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">VOL. 01</span>
            <span>{spots.length} SPOTS SAVED</span>
          </div>
        </div>

        {/* Large Editorial Title & Description */}
        <div className="flex flex-col gap-2 sm:gap-4 max-w-5xl">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-satoshi font-black uppercase tracking-tight leading-[0.98] text-black dark:text-white">
            POCKET
          </h1>
          <p className="text-xs sm:text-sm md:text-base font-['Noto_Sans_KR',sans-serif] font-medium text-black/60 dark:text-white/60 max-w-2xl leading-relaxed pt-1 break-keep">
            SNS 스크랩 & 숨은 핫플 꿀팁을 지역별 갤러리로 보관하고, 여정 작성 시 즉시 꺼내어 활용하세요.
          </p>
        </div>
      </section>

      {/* 2. Controls & Toolbar Bar (Trip Standard Height py-4 & border-b) */}
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-4 border-b border-black/10 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        {/* Left: Section Sub-label */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-['Inter',sans-serif] font-bold uppercase tracking-wider text-black dark:text-white">
            ALL SPOTS ({sortedSpots.length})
          </span>
        </div>

        {/* Right: Search, Filter, Sort & Action buttons */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto">
          {/* Left Group on Mobile: FILTER + SEARCH close together (Trip Hub Standard) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* FILTER toggle button (Unified to Trip Tag icon standard) */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(prev => !prev)}
              className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 uppercase font-mono font-bold tracking-wider border rounded-none transition-all flex items-center gap-1.5 cursor-pointer ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                  : 'border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-black/5 dark:bg-white/5 text-black dark:text-white'
              }`}
              title="필터"
            >
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">FILTER</span>
              {activeFilterCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              )}
            </button>

            {/* Search Button (Trip Standard: expands inline input) */}
            <button
              type="button"
              onClick={() => {
                setIsSearchInputOpen(v => !v);
                if (isSearchInputOpen) setSearchQuery('');
              }}
              className={`p-2 border transition-colors flex items-center justify-center rounded-none cursor-pointer relative ${
                isSearchInputOpen || searchQuery
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                  : 'border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-transparent text-black dark:text-white'
              }`}
              title="포켓 검색"
            >
              <Search className="w-3.5 h-3.5" />
              {searchQuery && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600" />
              )}
            </button>

            {/* Inline Search Input */}
            {isSearchInputOpen && (
              <div className="relative flex items-center animate-in fade-in slide-in-from-left-2 duration-150">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="장소, 지역 검색..."
                  className="w-24 sm:w-44 pl-2.5 pr-6 py-1.5 text-xs bg-white dark:bg-[#181818] border border-black/20 dark:border-white/20 font-sans font-medium outline-none text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 rounded-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white p-0.5 cursor-pointer"
                    title="검색어 지우기"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Group on Mobile: SORT + GRIP aligned right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort dropdown (Trip Standard native Swiss select) */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-black/60 dark:text-white/60 shrink-0" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="bg-transparent text-[10px] sm:text-xs font-black uppercase tracking-widest border border-black/20 dark:border-white/20 px-2.5 py-1.5 focus:outline-none focus:border-black dark:focus:border-white transition-colors cursor-pointer rounded-none font-sans text-black dark:text-white"
              >
                <option value="custom" className="bg-[#F9F8F6] dark:bg-[#111111]">CUSTOM</option>
                <option value="newest" className="bg-[#F9F8F6] dark:bg-[#111111]">NEWEST</option>
                <option value="oldest" className="bg-[#F9F8F6] dark:bg-[#111111]">OLDEST</option>
                <option value="title" className="bg-[#F9F8F6] dark:bg-[#111111]">A-Z</option>
                <option value="category" className="bg-[#F9F8F6] dark:bg-[#111111]">CATEGORY</option>
              </select>
            </div>

            {/* Admin Reorder Grip Button */}
            {isAdmin && sortMode === 'custom' && (
              <button
                type="button"
                onClick={() => setIsReorderMode(prev => !prev)}
                className={`p-1.5 border rounded-none transition-colors cursor-pointer shrink-0 ${
                  isReorderMode
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                    : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-black dark:hover:border-white'
                }`}
                title={isReorderMode ? "피드 순서 편집 활성" : "피드 순서 편집"}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ADD (Primary CTA) - Standardized with Trip Hub, full width on mobile */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] md:text-xs font-mono font-black uppercase tracking-widest border border-black dark:border-white px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD</span>
          </button>
        </div>
      </div>

      {/* 3. Filter Rail & Panel (Expandable under 2nd line) */}
      {(activeFilterCount > 0 || isFilterOpen) && (
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-3 border-b border-black/10 dark:border-white/10 space-y-3">
          {/* Active filter chips: Clean horizontal rail */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 animate-in fade-in duration-150">
              {selectedCountry !== 'ALL' && (
                <button
                  onClick={() => { setSelectedCountry('ALL'); setSelectedCity('ALL'); }}
                  className="h-7 px-2 flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase border border-black dark:border-white bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-red-500/10 hover:border-red-500 transition-colors shrink-0"
                >
                  <span>{selectedCountry}{selectedCity !== 'ALL' ? ` · ${selectedCity}` : ''}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {selectedCategory !== 'ALL' && (
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="h-7 px-2 flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase border border-black dark:border-white bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-red-500/10 hover:border-red-500 transition-colors shrink-0"
                >
                  <span>{selectedCategory}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {isFavoriteFilter && (
                <button
                  onClick={() => setIsFavoriteFilter(false)}
                  className="h-7 px-2 flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase border border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 cursor-pointer hover:bg-red-500/10 hover:border-red-500 transition-colors shrink-0"
                >
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <span>FAVORITES</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              <button
                onClick={() => { setSelectedCountry('ALL'); setSelectedCity('ALL'); setSelectedCategory('ALL'); setIsFavoriteFilter(false); }}
                className="h-7 px-2 text-[10px] font-mono uppercase tracking-wider text-black/40 dark:text-white/40 hover:text-red-500 cursor-pointer transition-colors shrink-0"
              >
                RESET
              </button>
            </div>
          )}

          {/* Slide-open Filter Panel */}
          {isFilterOpen && (
            <div className="border border-black/15 dark:border-white/15 p-3 sm:p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 bg-black/[0.015] dark:bg-white/[0.015]">
              {/* COUNTRY */}
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[9px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase pt-1.5 shrink-0 w-16">COUNTRY</span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  <button
                    onClick={() => { setSelectedCountry('ALL'); setSelectedCity('ALL'); }}
                    className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                      selectedCountry === 'ALL'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent font-bold'
                        : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                    }`}
                  >ALL</button>
                  {countryOptions.map(({ country, count }) => {
                    const isSelected = selectedCountry === country;
                    return (
                      <button
                        key={country}
                        onClick={() => { setSelectedCountry(country); setSelectedCity('ALL'); }}
                        className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent font-bold'
                            : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {country} <span className="opacity-60 text-[9px]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CITY (Visible when country selected) */}
              {selectedCountry !== 'ALL' && cityOptions.length > 0 && (
                <div className="flex items-start gap-2 flex-wrap pt-2 border-t border-black/10 dark:border-white/10">
                  <span className="text-[9px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase pt-1.5 shrink-0 w-16">CITY</span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    <button
                      onClick={() => setSelectedCity('ALL')}
                      className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                        selectedCity === 'ALL'
                          ? 'bg-black text-white dark:bg-white dark:text-black border-transparent font-bold'
                          : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                      }`}
                    >ALL</button>
                    {cityOptions.map(({ city, count }) => {
                      const isSelected = selectedCity === city;
                      return (
                        <button
                          key={city}
                          onClick={() => setSelectedCity(city)}
                          className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-black text-white dark:bg-white dark:text-black border-transparent font-bold'
                              : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          {city} <span className="opacity-60 text-[9px]">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CATEGORY */}
              <div className="flex items-start gap-2 flex-wrap pt-2 border-t border-black/10 dark:border-white/10">
                <span className="text-[9px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase pt-1.5 shrink-0 w-16">CATEGORY</span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                      selectedCategory === 'ALL'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent font-bold'
                        : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                    }`}
                  >ALL</button>
                  {(Object.keys(CATEGORY_META) as PocketCategory[]).map(cat => {
                    const meta = CATEGORY_META[cat];
                    const CatIcon = meta.icon;
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent font-bold'
                            : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <CatIcon className="w-2.5 h-2.5" style={{ color: isSelected ? undefined : meta.color }} />
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FAVORITES + RESET */}
              <div className="flex items-center justify-between pt-1 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsFavoriteFilter(prev => !prev)}
                  className={`flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider cursor-pointer transition-colors ${
                    isFavoriteFilter ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Star className={`w-3 h-3 ${isFavoriteFilter ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>FAVORITES ({favoriteCount})</span>
                </button>
                <button
                  onClick={() => { setSelectedCountry('ALL'); setSelectedCity('ALL'); setSelectedCategory('ALL'); setIsFavoriteFilter(false); }}
                  className="text-[10px] font-mono uppercase tracking-wider text-black/40 dark:text-white/40 hover:text-red-500 cursor-pointer transition-colors"
                >
                  RESET ALL
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Main Gallery Feed Section (Matching Trip Standard Padding py-6 sm:py-10) */}
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-6 sm:py-10 flex-grow flex flex-col">
        {/* Gallery — Grouped by country·city or flat drag mode */}
        {sortedSpots.length === 0 ? (
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
            {/* Helper to render a single card */}
            {(() => {
              const hasAnySelected = isSelectionMode && selectedSpotIds.size > 0;

              const renderCard = (spot: SpotPocketItem, cardIdx: number = 0) => {
                const meta = CATEGORY_META[spot.category] || CATEGORY_META.spot;
                const Icon = meta.icon;
                const normalizedCountry = getNormalizedCountry(spot.country);
                const normalizedCity = getNormalizedCity(spot);
                const locationLabel = [normalizedCountry, normalizedCity].filter(Boolean).join(' · ') || 'LOCATION';
                const isSelected = selectedSpotIds.has(spot.id);
                const isDimmed = hasAnySelected && !isSelected;
                const isDraggingThis = draggingSpotId === spot.id;
                const isDragOver = dragOverSpotId === spot.id;
                const isLiked = Array.isArray(spot.likedBy) && spot.likedBy.includes(currentUserId);

                return (
                  <div
                    key={spot.id}
                    style={{
                      animation: 'cardEntrance 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
                      animationDelay: `${Math.min(cardIdx * 30, 240)}ms`
                    }}
                    draggable={isDragMode}
                    onDragStart={isDragMode ? () => setDraggingSpotId(spot.id) : undefined}
                    onDragOver={isDragMode ? (e) => { e.preventDefault(); setDragOverSpotId(spot.id); } : undefined}
                    onDragLeave={isDragMode ? () => setDragOverSpotId(null) : undefined}
                    onDrop={isDragMode ? (e) => { e.preventDefault(); handleDrop(spot.id); } : undefined}
                    onDragEnd={isDragMode ? () => { setDraggingSpotId(null); setDragOverSpotId(null); } : undefined}
                    onClick={() => { 
                      if (isSelectionMode) {
                        handleToggleSelectSpot(spot.id);
                      } else {
                        setSelectedSpotForModal(spot);
                      }
                    }}
                    className={`group flex flex-col border bg-white dark:bg-[#1C1C1E] rounded-3xl transition-all duration-300 overflow-hidden shadow-xs hover:shadow-2xl dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)] cursor-pointer ${
                      isDragMode ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${
                      isDraggingThis ? 'opacity-30 scale-[0.98]' : ''
                    } ${
                      isDragOver ? 'ring-2 ring-black dark:ring-white border-transparent' :
                      isSelected ? 'ring-2 ring-black dark:ring-white bg-black/[0.02] dark:bg-white/[0.04]' :
                      'border-black/10 dark:border-white/20 hover:border-black/30 dark:hover:border-white/40'
                    } ${
                      isDimmed ? 'opacity-35 hover:opacity-75 transition-opacity' : 'opacity-100'
                    }`}
                  >
                    {/* Drag Handle (admin + custom sort mode + order mode only) */}
                    {isDragMode && (
                      <div className="flex items-center justify-center h-6 bg-black/[0.03] dark:bg-white/[0.04] border-b border-black/10 dark:border-white/10 cursor-grab text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Top Media Frame (Clean 4:3 Aspect Ratio) */}
                    <div className="relative aspect-[4/3] w-full bg-black/5 dark:bg-white/5 overflow-hidden border-b border-black/10 dark:border-white/10">
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
                        <div className="w-full h-full flex flex-col items-center justify-center text-black/25 dark:text-white/25">
                          <Icon className="w-10 h-10 mb-1" />
                          <span className="text-[9px] font-mono tracking-widest uppercase font-normal">{meta.label}</span>
                        </div>
                      )}

                      {/* Category Chip Overlay (Top-Left) */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 dark:bg-black/85 backdrop-blur-md text-black dark:text-white text-[9px] sm:text-[9.5px] font-mono font-bold tracking-wider uppercase border border-black/10 dark:border-white/15 rounded-full flex items-center gap-1.5 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                        <span>{meta.label}</span>
                      </div>

                      {/* Header Right Actions Overlay (Top-Right) */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                        {isSelectionMode ? (
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelectSpot(spot.id, e)}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                              isSelected
                                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                : 'bg-white/90 dark:bg-black/90 border-black/20 dark:border-white/20 text-transparent hover:border-black dark:hover:border-white'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                          </button>
                        ) : (
                          <>
                            {/* Favorite Star Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(spot.id, e)}
                              className="w-7 h-7 rounded-full bg-white/90 dark:bg-black/85 backdrop-blur-md border border-black/10 dark:border-white/15 flex items-center justify-center text-black/50 dark:text-white/60 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer shadow-xs"
                              title={spot.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                            >
                              <Star className={`w-3.5 h-3.5 ${spot.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Card Body — Full-width Hero Title (No Truncation) & Editorial Meta */}
                    <div className="p-3.5 sm:p-4 flex-grow flex flex-col justify-between">
                      <div>
                        {/* Region & Platform Meta Tag */}
                        <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-black/45 dark:text-white/45 mb-1.5 truncate">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span>{locationLabel}</span>
                          {spot.platform && (
                            <>
                              <span className="text-black/20 dark:text-white/20">·</span>
                              <span className="text-black/60 dark:text-white/60 font-semibold">@{spot.platform}</span>
                            </>
                          )}
                        </div>

                        {/* Main Spot Title (Hero Headline, Full Width, Wrap without truncation) */}
                        <h3 className="text-sm sm:text-base font-black tracking-tight text-black dark:text-white leading-snug break-keep line-clamp-2 sm:line-clamp-3 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {spot.title}
                        </h3>

                        {/* Memo */}
                        {spot.memo && (
                          <p className="mt-2 text-[11px] sm:text-[11.5px] font-sans text-black/60 dark:text-white/65 leading-relaxed line-clamp-2 font-normal break-words">
                            {spot.memo}
                          </p>
                        )}

                        {/* Address */}
                        {spot.address && (
                          <p className="mt-1.5 text-[9px] sm:text-[9.5px] text-black/35 dark:text-white/40 font-mono truncate font-normal">
                            {spot.address}
                          </p>
                        )}
                      </div>

                      {/* SNS Action Bar (1-Row Toolbar) */}
                      <div className="pt-3 mt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {/* Likes Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleLike(spot.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              isLiked
                                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
                                : 'border-black/10 dark:border-white/15 text-black/65 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                            }`}
                            title="좋아요 관심사 체크"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''}`} />
                            <span>{spot.likes || 0}</span>
                          </button>

                          {/* Comment Trigger with Count Badge: Opens Detail Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedSpotForModal(spot)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10.5px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              spot.comments && spot.comments.length > 0
                                ? 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 text-black dark:text-white shadow-xs'
                                : 'w-7 h-7 !p-0 justify-center border-black/10 dark:border-white/15 text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                            }`}
                            title={`댓글 ${spot.comments?.length || 0}개 (클릭하여 보기/작성)`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {spot.comments && spot.comments.length > 0 && (
                              <span>{spot.comments.length}</span>
                            )}
                          </button>

                          {/* Add to Trip (USE IN TRIP) */}
                          <button
                            type="button"
                            onClick={() => setSpotToUseInTrip(spot)}
                            className="w-7 h-7 rounded-full border border-black/10 dark:border-white/15 flex items-center justify-center text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30 transition-colors cursor-pointer"
                            title="여정 타임라인에 추가"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Platform Simple Icon Link (Clean, No text truncation!) */}
                        {spot.sourceUrl && (
                          <a
                            href={spot.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-full border border-black/10 dark:border-white/15 flex items-center justify-center text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30 transition-colors cursor-pointer"
                            title={`${spot.platform || '원문 출처'} 바로가기`}
                          >
                            {renderPlatformIcon(spot.platform)}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {/* Grouped sections by country — Always maintains consistent structure in both normal and reorder mode */}
                  <div className="space-y-10">
                    {groupedSpots.map(group => (
                      <div key={group.key}>
                        {/* Section header */}
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[11px] font-mono font-black tracking-widest uppercase text-black dark:text-white">
                            {group.label}
                          </span>
                          <span className="text-[10px] font-mono text-black/40 dark:text-white/40">{group.items.length}</span>
                          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-5 md:gap-6">
                          {group.items.slice(0, visibleCount).map((spot, idx) => renderCard(spot, idx))}
                        </div>
                      </div>
                    ))}
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
                  {visibleCount < sortedSpots.length && (
                    <div className="flex justify-center mt-10">
                      <button
                        type="button"
                        onClick={() => setVisibleCount(prev => prev + 40)}
                        className="h-10 px-6 border border-black dark:border-white text-xs font-mono font-black uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <span>LOAD MORE (+40)</span>
                        <span className="text-black/40 dark:text-white/40 font-normal">
                          ({visibleCount} / {sortedSpots.length})
                        </span>
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
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
                allAvailableTrips.map(trip => {
                  const isPlanItem = plans.some(p => p.id === trip.id) || trip.statusBadge === 'PLAN' || trip.isPlan;
                  return (
                    <button
                      key={trip.id}
                      onClick={() => handleSelectTripForSpot(trip)}
                      className="w-full text-left p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-black dark:text-white group-hover:text-red-500 transition-colors">
                            {trip.title}
                          </span>
                          {isPlanItem && (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-widest uppercase border border-amber-600/50 text-amber-600 dark:border-amber-400/50 dark:text-amber-400">
                              PLAN
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-black/40 dark:text-white/40 mt-0.5">
                          {trip.date || '일정 미지정'} · {trip.locationStr || '위치 미지정'}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })
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

      {/* ── SPOT DETAIL EXPANDED MODAL ── */}
      <PocketDetailModal
        isOpen={Boolean(selectedSpotForModal)}
        spot={selectedSpotForModal}
        onClose={() => setSelectedSpotForModal(null)}
        onToggleLike={handleToggleLike}
        onUseInTrip={(spot) => setSpotToUseInTrip(spot)}
        onEdit={(spot) => handleOpenEditSpot(spot)}
        onDelete={(spot) => setSpotToDelete(spot)}
        isLiked={Boolean(selectedSpotForModal && Array.isArray(selectedSpotForModal.likedBy) && selectedSpotForModal.likedBy.includes(currentUserId))}
        isAdmin={isAdmin}
        onSaveComments={handleSaveSpotComments}
        isLoggedIn={isLoggedIn}
        currentUser={auth.currentUser}
        onOpenAuthModal={onOpenAuthModal}
      />

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
