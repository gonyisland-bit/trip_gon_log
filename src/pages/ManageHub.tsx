import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Save, 
  Trash2, 
  RotateCcw,
  Copy, 
  ArrowRightLeft, 
  ArrowLeft,
  Upload, 
  Calendar, 
  MapPin, 
  Tag as TagIcon, 
  Check, 
  Sliders,
  Globe,
  Home as HomeIcon,
  Archive as ArchiveIcon,
  X,
  Play,
  Film,
  Image as ImageIcon,
  ExternalLink,
  Search,
  GripVertical,
  Eye,
  Loader2
} from 'lucide-react';
import { Trip, Plan, MagazineMoment, TimelineData, TimelineItem } from '../types';
import { getEffectiveImageUrl, uploadFileToR2 } from '../utils/storageHelper';
import { compressImage } from '../utils/imageHelper';

interface ManageHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onSaveTrip: (tripId: number, updatedData: Partial<Trip>) => Promise<void>;
  onDeleteTrip: (tripId: number) => Promise<void>;
  onCloneTrip: (tripId: number) => Promise<void>;
  onMoveToPlans: (trip: Trip) => Promise<void>;
  onMoveToArchive: (plan: Plan) => Promise<void>;
  onReorderTrips: (orderedIds: number[]) => Promise<void>;
  // Home & App settings
  homeTitle: string;
  homeSubtitle: string;
  heroJourneyIds: number[];
  heroAutoSlide: boolean;
  heroMediaType: 'image' | 'video';
  marqueeShow: boolean;
  marqueeMessage: string;
  marqueeSpeed: number;
  onSaveAllHomeSettings: (
    title: string,
    subtitle: string,
    heroIds: number[],
    autoSlide: boolean,
    marqueeShow: boolean,
    marqueeMsg: string,
    marqueeSpd: number,
    heroMediaTypeParam?: 'image' | 'video',
    magazineMomentsParam?: MagazineMoment[]
  ) => Promise<void>;
  // Magazine Highlights
  magazineMoments?: MagazineMoment[];
  timelineData?: TimelineData;
  onSaveMagazineMoments?: (moments: MagazineMoment[]) => Promise<void>;
  // Trash bin
  trashedJourneys: Trip[];
  onRestoreJourney: (id: number) => Promise<void>;
  onPermanentDeleteJourney: (id: number) => Promise<void>;
  isLoggedIn: boolean;
  isDarkMode: boolean;
}

export function ManageHubPage({
  trips,
  plans,
  onNavigate,
  onSaveTrip,
  onDeleteTrip,
  onCloneTrip,
  onMoveToPlans,
  onMoveToArchive,
  onReorderTrips,
  homeTitle,
  homeSubtitle,
  heroJourneyIds,
  heroAutoSlide,
  heroMediaType,
  marqueeShow,
  marqueeMessage,
  marqueeSpeed,
  onSaveAllHomeSettings,
  trashedJourneys,
  onRestoreJourney,
  onPermanentDeleteJourney,
  isLoggedIn,
  isDarkMode,
  magazineMoments = [],
  timelineData = {},
  onSaveMagazineMoments,
}: ManageHubPageProps) {
  // Top-level mode tabs ordered: 'HOME' | 'ARCHIVE' | 'MAP' | 'TRASH'
  const [activeMode, setActiveMode] = useState<'HOME' | 'ARCHIVE' | 'MAP' | 'TRASH'>('HOME');

  // Mobile Archive Switcher: 'LIST' or 'EDIT'
  const [mobileArchiveTab, setMobileArchiveTab] = useState<'LIST' | 'EDIT'>('LIST');

  // Combined Journeys for ARCHIVE management
  const [localJourneys, setLocalJourneys] = useState<(Trip | Plan)[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<number | null>(null);

  // Magazine highlights state
  const [momentsList, setMomentsList] = useState<MagazineMoment[]>(magazineMoments || []);
  const [selectedTripForMoments, setSelectedTripForMoments] = useState<number | null>(null);
  const [momentSearchQuery, setMomentSearchQuery] = useState('');
  const [isSavingMoments, setIsSavingMoments] = useState(false);
  const [momentsSaveSuccess, setMomentsSaveSuccess] = useState(false);

  useEffect(() => {
    if (magazineMoments && magazineMoments.length > 0) {
      setMomentsList(magazineMoments);
    }
  }, [magazineMoments]);

  // Home configuration state
  const [title, setTitle] = useState(homeTitle || '');
  const [subtitle, setSubtitle] = useState(homeSubtitle || '');
  const [selectedHeroIds, setSelectedHeroIds] = useState<number[]>(heroJourneyIds || []);
  const [autoSlide, setAutoSlide] = useState(heroAutoSlide);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(heroMediaType || 'image');
  const [showMarquee, setShowMarquee] = useState(marqueeShow);
  const [homeMarquee, setHomeMarquee] = useState(marqueeMessage || '');
  const [homeSpeed, setHomeSpeed] = useState(marqueeSpeed || 50);
  const [playVideoOnActivate, setPlayVideoOnActivate] = useState(() => localStorage.getItem('playVideoOnActivate') !== 'false');
  const [isSavingHome, setIsSavingHome] = useState(false);
  const [homeSaveSuccess, setHomeSaveSuccess] = useState(false);
  const [heroSearchQuery, setHeroSearchQuery] = useState('');

  // Map settings state
  const [mapTileStyle, setMapTileStyle] = useState<'esri' | 'google'>(() => {
    return (localStorage.getItem('mapTileStyle') as any) || 'esri';
  });

  // Selected journey edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [editImg, setEditImg] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editHeroImg, setEditHeroImg] = useState('');
  const [editHeroVideoUrl, setEditHeroVideoUrl] = useState('');
  const [editStatusBadge, setEditStatusBadge] = useState<'' | 'NEW' | 'EDITING'>('');
  const [archiveMediaTab, setArchiveMediaTab] = useState<'main' | 'hero'>('main');
  const [homeJourneyLimit, setHomeJourneyLimit] = useState<number>(() => {
    return parseInt(localStorage.getItem('home_journey_limit') || '4', 10);
  });
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [tripSaveSuccess, setTripSaveSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMainDragActive, setIsMainDragActive] = useState(false);
  const [isHeroDragActive, setIsHeroDragActive] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Selected Journey memo
  const selectedJourney = useMemo(() => {
    return localJourneys.find(j => j.id === selectedJourneyId);
  }, [localJourneys, selectedJourneyId]);

  // Dirty tracking for HOME configuration & magazine moments
  const isHomeDirty = useMemo(() => {
    return (
      title !== (homeTitle || '') ||
      subtitle !== (homeSubtitle || '') ||
      homeJourneyLimit !== parseInt(localStorage.getItem('home_journey_limit') || '4', 10) ||
      JSON.stringify(selectedHeroIds) !== JSON.stringify(heroJourneyIds || []) ||
      autoSlide !== heroAutoSlide ||
      mediaType !== heroMediaType ||
      showMarquee !== marqueeShow ||
      homeMarquee !== (marqueeMessage || '') ||
      homeSpeed !== (marqueeSpeed || 50) ||
      JSON.stringify(momentsList) !== JSON.stringify(magazineMoments || [])
    );
  }, [title, homeTitle, subtitle, homeSubtitle, selectedHeroIds, heroJourneyIds, autoSlide, heroAutoSlide, mediaType, heroMediaType, showMarquee, marqueeShow, homeMarquee, marqueeMessage, homeSpeed, marqueeSpeed, momentsList, magazineMoments]);

  // Dirty tracking for currently selected journey in ARCHIVE mode
  const isArchiveDirty = useMemo(() => {
    if (!selectedJourney) return false;
    return (
      editTitle !== (selectedJourney.title || '') ||
      editDate !== (selectedJourney.date || '') ||
      editLocation !== (selectedJourney.locationStr || '') ||
      editCountry !== (selectedJourney.country || '') ||
      JSON.stringify(editTags) !== JSON.stringify(selectedJourney.tags || []) ||
      editImg !== (selectedJourney.img || '') ||
      editVideoUrl !== (selectedJourney.videoUrl || '') ||
      editHeroImg !== (selectedJourney.heroImg || '') ||
      editHeroVideoUrl !== (selectedJourney.heroVideoUrl || '') ||
      editStatusBadge !== (selectedJourney.statusBadge || '')
    );
  }, [selectedJourney, editTitle, editDate, editLocation, editCountry, editTags, editImg, editVideoUrl, editHeroImg, editHeroVideoUrl, editStatusBadge]);

  const isCurrentDirty = (activeMode === 'HOME' && isHomeDirty) || (activeMode === 'ARCHIVE' && isArchiveDirty);

  // Sync journeys from props with localStorage order preservation
  useEffect(() => {
    let combined = [...trips, ...plans];
    try {
      const saved = localStorage.getItem('journey_order');
      if (saved) {
        const order: number[] = JSON.parse(saved);
        const idMap = new Map(order.map((id, idx) => [id, idx]));
        combined = combined.sort((a, b) => {
          const orderA = idMap.has(a.id) ? idMap.get(a.id)! : (a.displayOrder ?? 999999);
          const orderB = idMap.has(b.id) ? idMap.get(b.id)! : (b.displayOrder ?? 999999);
          return orderA - orderB;
        });
      } else {
        combined = combined.sort((a, b) => (a.displayOrder ?? 999999) - (b.displayOrder ?? 999999));
      }
    } catch (_) {
      combined = combined.sort((a, b) => (a.displayOrder ?? 999999) - (b.displayOrder ?? 999999));
    }

    setLocalJourneys(combined);
    if (combined.length > 0 && selectedJourneyId === null) {
      setSelectedJourneyId(combined[0].id);
    }
  }, [trips, plans]);

  // When selected journey changes, populate form

  useEffect(() => {
    if (selectedJourney) {
      setEditTitle(selectedJourney.title || '');
      setEditDate(selectedJourney.date || '');
      setEditLocation(selectedJourney.locationStr || '');
      setEditCountry(selectedJourney.country || '');
      setEditTags(selectedJourney.tags || []);
      setEditImg(selectedJourney.img || '');
      setEditVideoUrl(selectedJourney.videoUrl || '');
      setEditHeroImg(selectedJourney.heroImg || '');
      setEditHeroVideoUrl(selectedJourney.heroVideoUrl || '');
      setEditStatusBadge(selectedJourney.statusBadge || '');
      setTripSaveSuccess(false);
    }
  }, [selectedJourneyId, selectedJourney]);

  // Order shift handlers (▲ / ▼)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!isLoggedIn) return alert('로그인 후 순서를 변경할 수 있습니다.');
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localJourneys.length) return;

    const newArr = [...localJourneys];
    const [moved] = newArr.splice(index, 1);
    newArr.splice(targetIndex, 0, moved);

    setLocalJourneys(newArr);
    const orderedIds = newArr.map(j => j.id);
    try {
      await onReorderTrips(orderedIds);
    } catch (err) {
      console.error('Failed to update trip order:', err);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newArr = [...localJourneys];
    const [moved] = newArr.splice(draggedIndex, 1);
    newArr.splice(dropIndex, 0, moved);

    setDraggedIndex(null);
    setLocalJourneys(newArr);
    const orderedIds = newArr.map(j => j.id);
    try {
      await onReorderTrips(orderedIds);
    } catch (err) {
      console.error('Failed to update trip order:', err);
    }
  };

  // Save journey handler
  const handleSaveJourney = async () => {
    if (!selectedJourney) return;
    if (!isLoggedIn) return alert('로그인 후 저장 가능합니다.');

    setIsSavingTrip(true);
    try {
      await onSaveTrip(selectedJourney.id, {
        title: editTitle,
        date: editDate,
        locationStr: editLocation,
        country: editCountry,
        tags: editTags,
        img: editImg,
        videoUrl: editVideoUrl,
        heroImg: editHeroImg,
        heroVideoUrl: editHeroVideoUrl,
        statusBadge: editStatusBadge,
      });

      setTripSaveSuccess(true);
      setTimeout(() => setTripSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving trip:', err);
      alert('여정 저장에 실패했습니다.');
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Image Upload helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'img' | 'heroImg') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let fileToUpload: File | Blob = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file, 1920, 1080, 0.85);
      }
      const url = await uploadFileToR2(fileToUpload, `covers/${Date.now()}_${file.name}`);
      if (targetField === 'img') {
        setEditImg(url);
        setEditVideoUrl('');
      }
      if (targetField === 'heroImg') {
        setEditHeroImg(url);
        setEditHeroVideoUrl('');
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // Tag management
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim().replace(/^#/, '');
    if (!editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(t => t !== tagToRemove));
  };

  // Save Home Settings + Magazine Moments together
  const handleSaveHome = async () => {
    setIsSavingHome(true);
    try {
      localStorage.setItem('playVideoOnActivate', String(playVideoOnActivate));
      localStorage.setItem('home_journey_limit', String(homeJourneyLimit));
      window.dispatchEvent(new CustomEvent('homeConfigChanged'));
      await onSaveAllHomeSettings(
        title,
        subtitle,
        selectedHeroIds,
        autoSlide,
        showMarquee,
        homeMarquee,
        homeSpeed,
        mediaType,
        momentsList
      );
      setHomeSaveSuccess(true);
      setTimeout(() => setHomeSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save home settings:', err);
      alert('홈 설정 저장에 실패했습니다.');
    } finally {
      setIsSavingHome(false);
    }
  };

  // Keyboard Shortcuts: Enter / ESC / D in Unsaved Modal, and Ctrl+S to Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Unsaved changes modal shortcuts: Yes (Y), No (N), Cancel (ESC)
      if (showUnsavedModal) {
        if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
          e.preventDefault();
          (async () => {
            if (activeMode === 'HOME') await handleSaveHome();
            else if (activeMode === 'ARCHIVE') await handleSaveJourney();
            setShowUnsavedModal(false);
            onNavigate('home');
          })();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          setShowUnsavedModal(false);
          onNavigate('home');
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowUnsavedModal(false);
        }
        return;
      }

      // 2. Ctrl + S / Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (activeMode === 'HOME') handleSaveHome();
        else if (activeMode === 'ARCHIVE') handleSaveJourney();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUnsavedModal, activeMode, isHomeDirty, isArchiveDirty, title, subtitle, selectedHeroIds, autoSlide, showMarquee, homeMarquee, homeSpeed, mediaType, momentsList, selectedJourney, editTitle, editDate, editLocation, editCountry, editTags, editImg, editVideoUrl, editHeroImg, editHeroVideoUrl, editStatusBadge]);

  // Save Map Settings
  const handleSaveMapSettings = () => {
    localStorage.setItem('mapTileStyle', mapTileStyle);
    alert('지도 스타일 설정이 저장되었습니다.');
  };

  // Filter hero candidate journeys by search query
  const filteredHeroCandidates = useMemo(() => {
    if (!heroSearchQuery.trim()) return localJourneys;
    const q = heroSearchQuery.toLowerCase().trim();
    return localJourneys.filter(j => 
      j.title.toLowerCase().includes(q) || 
      j.locationStr?.toLowerCase().includes(q) ||
      j.country?.toLowerCase().includes(q)
    );
  }, [localJourneys, heroSearchQuery]);

  // Extract all timeline items with images across timelineData
  const allTimelineItemsWithImages = useMemo(() => {
    const list: (TimelineItem & { journeyTitle?: string; journeyLocation?: string })[] = [];
    const journeyMap = new Map(localJourneys.map(j => [j.id, j]));

    Object.entries(timelineData).forEach(([date, items]) => {
      items.forEach(item => {
        if (item.img) {
          const matchedJourney = item.tripId ? journeyMap.get(item.tripId) : undefined;
          list.push({
            ...item,
            date: item.date || date,
            journeyTitle: matchedJourney?.title.replace(' (Plan)', ''),
            journeyLocation: matchedJourney?.locationStr || matchedJourney?.country,
          });
        }
      });
    });
    return list;
  }, [timelineData, localJourneys]);

  // Filtered timeline candidate items based on selected trip OR search query
  const candidateTimelineItems = useMemo(() => {
    let result = allTimelineItemsWithImages;
    if (selectedTripForMoments !== null) {
      result = result.filter(item => Number(item.tripId) === Number(selectedTripForMoments));
    }
    if (momentSearchQuery.trim()) {
      const q = momentSearchQuery.toLowerCase().trim();
      result = result.filter(item => 
        (item.place && item.place.toLowerCase().includes(q)) ||
        (item.memo && item.memo.toLowerCase().includes(q)) ||
        (item.journeyTitle && item.journeyTitle.toLowerCase().includes(q)) ||
        (item.journeyLocation && item.journeyLocation.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allTimelineItemsWithImages, selectedTripForMoments, momentSearchQuery]);

  // Add timeline item as a magazine moment
  const handleAddMomentFromTimeline = (item: TimelineItem & { journeyTitle?: string; journeyLocation?: string }) => {
    if (!item.img) return;
    const newMoment: MagazineMoment = {
      id: `moment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tripId: item.tripId,
      title: item.place || item.journeyTitle || 'UNTITLED MOMENT',
      date: item.date || '',
      placeName: item.place || '',
      location: item.place || item.journeyLocation || '',
      caption: item.imgNote || '',
      quote: '',
      img: item.img,
      order: momentsList.length,
    };
    setMomentsList(prev => [...prev, newMoment]);
  };

  // Move moment up/down
  const handleMoveMoment = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= momentsList.length) return;
    const updated = [...momentsList];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setMomentsList(updated.map((m, i) => ({ ...m, order: i })));
  };

  // Remove moment
  const handleRemoveMoment = (id: string) => {
    setMomentsList(prev => prev.filter(m => m.id !== id));
  };

  // Update moment field
  const handleUpdateMoment = (id: string, field: keyof MagazineMoment, value: any) => {
    setMomentsList(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const isSelectedPlan = selectedJourney?.tags?.includes('Plan') || selectedJourney?.title.includes('(Plan)');

  return (
    <main className="min-h-screen w-full bg-[#FAF9F6] dark:bg-[#0A0A0A] text-black dark:text-white flex flex-col font-sans select-none animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar with Swiss Minimal Mode Switcher: HOME / ARCHIVE / MAP / TRASH */}
      <div className="border-b border-black/15 dark:border-white/15 px-4 sm:px-8 py-3 bg-white dark:bg-[#111111] flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('archive')}
            className="p-1.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
            title="아카이브로 이동"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight font-sans">
              MANAGEMENT HUB
            </h1>
            <span className="text-[10px] font-mono text-black/40 dark:text-white/40 hidden sm:inline">
              [수정·관리 센터]
            </span>
          </div>
        </div>

        {/* Mode Switcher: HOME / ARCHIVE / MAP / TRASH */}
        <div className="flex items-center border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 p-0.5 rounded-none">
          {(['HOME', 'ARCHIVE', 'MAP', 'TRASH'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-3 sm:px-4 py-1.5 text-xs font-black uppercase tracking-wider font-sans transition-colors cursor-pointer ${
                activeMode === mode
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              {mode}
              {mode === 'TRASH' && trashedJourneys.length > 0 && (
                <span className="ml-1 text-[9px] font-mono px-1 bg-red-600 text-white">
                  {trashedJourneys.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Mode Content Container */}
      <div className="flex-1 flex flex-col w-full overflow-hidden">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: HOME (Full App & Home Settings Integration)                   */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'HOME' && (
          <div className="w-full max-w-3xl mx-auto p-6 sm:p-12 flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-60px)] animate-in fade-in duration-200">
            <div className="border-b border-black/15 dark:border-white/15 pb-4">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                APP & HOME GENERAL SETTINGS
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
                홈 메인 및 앱 환경설정
              </h2>
            </div>

            <div className="flex flex-col gap-6">
              {/* Home Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                    HOME TITLE (메인 타이틀)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="px-3.5 py-2.5 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                    HOME SUBTITLE (서브 타이틀)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    className="px-3.5 py-2.5 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none"
                  />
                </div>
              </div>

              {/* Hero Media Type & Auto Slide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/10 dark:border-white/10">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                    HERO MEDIA TYPE (히어로 미디어 형태)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaType('image')}
                      className={`flex-1 py-2 text-xs font-bold uppercase border transition-colors cursor-pointer rounded-none flex items-center justify-center gap-1.5 ${
                        mediaType === 'image'
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'bg-white dark:bg-[#161616] border-black/20 dark:border-white/20'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>IMAGE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType('video')}
                      className={`flex-1 py-2 text-xs font-bold uppercase border transition-colors cursor-pointer rounded-none flex items-center justify-center gap-1.5 ${
                        mediaType === 'video'
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'bg-white dark:bg-[#161616] border-black/20 dark:border-white/20'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>VIDEO</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                    HERO AUTO SLIDE (자동 롤링)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoSlide(!autoSlide)}
                    className={`w-full py-2 text-xs font-bold uppercase border transition-colors cursor-pointer rounded-none flex items-center justify-center gap-2 ${
                      autoSlide
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-[#161616] border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
                    }`}
                  >
                    <span>{autoSlide ? 'AUTO SLIDE: ON' : 'AUTO SLIDE: OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Video Autoplay On Hover Toggle */}
              <div className="flex items-center justify-between p-3.5 border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02]">
                <div>
                  <span className="text-xs font-bold uppercase block text-black dark:text-white">
                    카드 호버 시 비디오 자동 재생
                  </span>
                  <span className="text-[10px] text-black/50 dark:text-white/50">
                    여정 카드에 마우스를 올렸을 때 비디오를 자동으로 재생합니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPlayVideoOnActivate(!playVideoOnActivate)}
                  className={`px-3 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer rounded-none ${
                    playVideoOnActivate
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'bg-white dark:bg-[#161616] border-black/20 dark:border-white/20 text-black/60'
                  }`}
                >
                  {playVideoOnActivate ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Marquee Banner Toggle & Speed (도시 자동 롤링 전광판) */}
              <div className="flex flex-col gap-3 pt-4 border-t border-black/10 dark:border-white/10">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                      MARQUEE BANNER (전광판 롤링)
                    </label>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                      등록된 여정의 도시명들이 상단에 자동 롤링됩니다
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMarquee(!showMarquee)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase border transition-colors cursor-pointer ${
                      showMarquee
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-[#161616] border-black/20 dark:border-white/20 text-black/40 dark:text-white/40'
                    }`}
                  >
                    {showMarquee ? 'ON (표시)' : 'OFF (숨김)'}
                  </button>
                </div>

                {showMarquee && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                      <span>MARQUEE SPEED (흘러가는 속도)</span>
                      <span className="font-mono text-red-600 dark:text-red-500">{homeSpeed}s</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={120}
                      value={homeSpeed}
                      onChange={e => setHomeSpeed(parseInt(e.target.value, 10))}
                      className="w-full accent-black dark:accent-white cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Home Journeys Display Limit */}
              <div className="flex flex-col gap-2 pt-4 border-t border-black/10 dark:border-white/10">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                      JOURNEYS DISPLAY LIMIT (홈 여정 표시 개수)
                    </label>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                      설정 개수 초과 시 'VIEW ALL' 버튼으로 아카이브 유도
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[4, 6, 8, 999].map(limit => (
                      <button
                        key={limit}
                        type="button"
                        onClick={() => setHomeJourneyLimit(limit)}
                        className={`px-2.5 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                          homeJourneyLimit === limit
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'bg-white dark:bg-[#161616] border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-black'
                        }`}
                      >
                        {limit === 999 ? 'ALL' : limit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hero Journeys Selection: Swiss Minimal Editorial Search List */}
              <div className="flex flex-col gap-3 pt-4 border-t border-black/10 dark:border-white/10">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                    HERO JOURNEYS (히어로 노출 여정 선택)
                  </label>
                  <span className="text-[10px] font-mono text-red-600 dark:text-red-500 font-black">
                    SELECTED ({selectedHeroIds.length})
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                  <input
                    type="text"
                    value={heroSearchQuery}
                    onChange={e => setHeroSearchQuery(e.target.value)}
                    placeholder="여정 제목 또는 도시명 검색으로 바로 찾기..."
                    className="w-full pl-8 pr-8 py-2 text-xs font-sans font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
                  />
                  {heroSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHeroSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Editorial List of Candidates */}
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto p-1.5 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                  {filteredHeroCandidates.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-black/40 dark:text-white/40">
                      검색된 여정이 없습니다.
                    </div>
                  ) : (
                    filteredHeroCandidates.map(j => {
                      const isSelected = selectedHeroIds.includes(j.id);
                      return (
                        <div
                          key={j.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedHeroIds(selectedHeroIds.filter(id => id !== j.id));
                            } else {
                              setSelectedHeroIds([...selectedHeroIds, j.id]);
                            }
                          }}
                          className={`p-2 border transition-all flex items-center justify-between gap-3 cursor-pointer rounded-none ${
                            isSelected
                              ? 'bg-black/5 dark:bg-white/10 border-black dark:border-white shadow-xs'
                              : 'border-transparent hover:border-black/20 dark:hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* 1:1 Thumbnail */}
                            <div className="w-10 h-10 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                              <img
                                src={getEffectiveImageUrl(j.img)}
                                alt={j.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black font-sans uppercase tracking-tight text-black dark:text-white truncate">
                                {j.title.replace(' (Plan)', '')}
                              </h5>
                              <span className="text-[10px] font-mono text-black/50 dark:text-white/50 block truncate">
                                {j.date} · {j.locationStr}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase border ${
                              isSelected
                                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                : 'border-black/20 dark:border-white/20 text-black/50 dark:text-white/50'
                            }`}>
                              {isSelected ? '✓ SELECTED' : '+ SELECT'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────── */}
              {/* MAGAZINE EDITORIAL MOMENTS CURATION (잡지 연출 선별 및 편집) */}
              {/* ───────────────────────────────────────────────────────── */}
              <div className="flex flex-col gap-4 pt-6 border-t border-black/15 dark:border-white/15">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div>
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                      HOME EDITORIAL HIGHLIGHTS
                    </span>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-black dark:text-white">
                      홈 잡지 연출 순간 선별 및 편집 ({momentsList.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-sans text-black/50 dark:text-white/50">
                    타임라인 사진을 직접 골라 홈 허브 잡지 화보로 연출합니다.
                  </span>
                </div>

                {/* Currently Curated Moments List */}
                {momentsList.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <div className="text-[10px] font-mono uppercase font-bold text-black/60 dark:text-white/60">
                      현재 등록된 잡지 연출 목록:
                    </div>
                    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                      {momentsList.map((m, idx) => (
                        <div 
                          key={m.id || idx}
                          className="p-3 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-14 h-14 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10 relative">
                              <img src={getEffectiveImageUrl(m.img)} alt={m.title} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 left-0 bg-black text-white text-[8px] font-mono px-1">
                                #{idx + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-1 w-full">
                              <input 
                                type="text"
                                value={m.title}
                                onChange={e => handleUpdateMoment(m.id, 'title', e.target.value)}
                                placeholder="제목 (Title)"
                                className="text-xs font-black uppercase tracking-tight bg-transparent border-b border-black/20 dark:border-white/20 outline-none pb-0.5"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input 
                                  type="text"
                                  value={m.quote || ''}
                                  onChange={e => handleUpdateMoment(m.id, 'quote', e.target.value)}
                                  placeholder="인용구 (“감성 문구”)"
                                  className="text-[10px] font-serif italic bg-transparent border-b border-black/10 dark:border-white/10 outline-none"
                                />
                                <input 
                                  type="text"
                                  value={m.caption || ''}
                                  onChange={e => handleUpdateMoment(m.id, 'caption', e.target.value)}
                                  placeholder="설명 / 캡션"
                                  className="text-[10px] font-sans bg-transparent border-b border-black/10 dark:border-white/10 outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleMoveMoment(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                              title="위로 이동"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveMoment(idx, 'down')}
                              disabled={idx === momentsList.length - 1}
                              className="p-1 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                              title="아래로 이동"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMoment(m.id)}
                              className="p-1 text-red-500 hover:bg-red-500/10 border border-red-500/30 cursor-pointer ml-1"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-black/20 dark:border-white/20 text-center text-xs font-mono text-black/50 dark:text-white/50">
                    아직 선별된 잡지 연출 순간이 없습니다. 아래 타임라인에서 인상적인 사진을 골라 추가해보세요.
                  </div>
                )}

                {/* Selection Tool: Select from Journey OR Search */}
                <div className="p-4 border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-3">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-black/70 dark:text-white/70">
                    타임라인에서 새로운 순간 선별하기
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Filter by Journey */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase text-black/50 dark:text-white/50">
                        여정별로 모아보기
                      </label>
                      <select
                        value={selectedTripForMoments === null ? '' : selectedTripForMoments}
                        onChange={e => setSelectedTripForMoments(e.target.value === '' ? null : Number(e.target.value))}
                        className="px-2.5 py-2 text-xs font-sans font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none"
                      >
                        <option value="">모든 여정 ({allTimelineItemsWithImages.length}개 사진)</option>
                        {localJourneys.map(j => (
                          <option key={j.id} value={j.id}>
                            {j.title.replace(' (Plan)', '')} ({j.locationStr})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Search Keyword */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase text-black/50 dark:text-white/50">
                        검색어로 찾기 (장소/메모/도시)
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                        <input
                          type="text"
                          value={momentSearchQuery}
                          onChange={e => setMomentSearchQuery(e.target.value)}
                          placeholder="검색어 입력..."
                          className="w-full pl-8 pr-3 py-2 text-xs font-sans font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Candidate Timeline Images Grid: Zero-Gap Swiss Editorial Grid */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                        선택 가능한 타임라인 사진 ({candidateTimelineItems.length}개)
                      </span>
                      <span className="text-[9px] font-mono text-black/40 dark:text-white/40">
                        * 클릭 시 잡지 목록에 바로 추가됩니다
                      </span>
                    </div>

                    {candidateTimelineItems.length === 0 ? (
                      <div className="py-8 text-center text-xs font-mono text-black/40 dark:text-white/40 border border-black/10 dark:border-white/10 bg-white dark:bg-[#111]">
                        사진이 등록된 타임라인 항목이 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-black/20 dark:bg-white/20 border border-black/20 dark:border-white/20 max-h-80 overflow-y-auto">
                        {candidateTimelineItems.slice(0, 48).map((item, i) => {
                          const displayTitle = item.place || item.journeyTitle || 'MOMENT';
                          return (
                            <div
                              key={`cand-${item.id}-${i}`}
                              onClick={() => handleAddMomentFromTimeline(item)}
                              className="group relative aspect-[4/3] sm:aspect-square bg-white dark:bg-[#121212] overflow-hidden cursor-pointer flex flex-col justify-end transition-transform select-none"
                              title={`${displayTitle} (${item.date || ''}) 잡지 컬렉션에 추가`}
                            >
                              <img
                                src={getEffectiveImageUrl(item.img || '')}
                                alt={displayTitle}
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              
                              {/* Hover Highlight Overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-mono text-xs font-black p-2 text-center z-10">
                                + 추가 (ADD)
                              </div>

                              {/* Large Legible Bottom Title Bar */}
                              <div className="relative z-10 w-full bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 pt-4 flex flex-col">
                                <span className="text-[10px] sm:text-[11px] font-sans font-black text-white uppercase tracking-tight truncate leading-tight">
                                  {displayTitle}
                                </span>
                                {item.date && (
                                  <span className="text-[9px] font-mono text-white/70 truncate">
                                    {item.date}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Unified Save Notice */}
                  <div className="flex items-center justify-between pt-2 text-[10px] font-mono text-black/50 dark:text-white/50 border-t border-black/10 dark:border-white/10 mt-2">
                    <span>* 변경된 잡지 연출 목록은 하단의 'SAVE ALL SETTINGS' 또는 좌측 하단 플로팅 저장 버튼을 누를 때 홈 설정과 함께 한 번에 저장됩니다.</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-black/15 dark:border-white/15 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveHome}
                  disabled={isSavingHome}
                  className={`px-6 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-widest font-sans flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity ${
                    homeSaveSuccess ? '!bg-green-600 !text-white' : ''
                  }`}
                >
                  {homeSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  <span>{homeSaveSuccess ? 'SAVED' : 'SAVE ALL SETTINGS'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: ARCHIVE (Left: Detailed Edit Form, Right: Reorderable List)  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'ARCHIVE' && (
          <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
            
            {/* Mobile Tab Switcher: LIST vs EDIT */}
            <div className="lg:hidden flex border-b border-black/15 dark:border-white/15 bg-white dark:bg-[#111] shrink-0">
              <button
                type="button"
                onClick={() => setMobileArchiveTab('LIST')}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider font-sans border-r border-black/15 dark:border-white/15 cursor-pointer ${
                  mobileArchiveTab === 'LIST'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-black/60 dark:text-white/60'
                }`}
              >
                여정 목록 (LIST: {localJourneys.length})
              </button>
              <button
                type="button"
                onClick={() => setMobileArchiveTab('EDIT')}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider font-sans cursor-pointer ${
                  mobileArchiveTab === 'EDIT'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-black/60 dark:text-white/60'
                }`}
              >
                상세 수정 (EDIT)
              </button>
            </div>

            {/* Left: Journey Edit Form */}
            <div className={`w-full lg:w-3/5 border-b lg:border-b-0 lg:border-r border-black/15 dark:border-white/15 p-4 sm:p-8 overflow-y-auto max-h-[calc(100vh-110px)] lg:max-h-[calc(100vh-60px)] ${
              mobileArchiveTab === 'EDIT' ? 'block' : 'hidden lg:block'
            }`}>
              {selectedJourney ? (
                <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                  
                  {/* Top Bar for Selected Journey with Direct View Link */}
                  <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-4">
                    <div className="min-w-0 pr-2">
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                        EDITING ID #{selectedJourney.id}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white truncate">
                        {editTitle || 'Untitled Journey'}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* View Journey Direct Link Button */}
                      <button
                        type="button"
                        onClick={() => onNavigate('detail', selectedJourney.id)}
                        className="px-3 py-2 border border-black/30 dark:border-white/30 text-xs font-black uppercase tracking-wider font-sans flex items-center gap-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                        title="이 여정의 상세 페이지로 바로 이동"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">VIEW JOURNEY →</span>
                        <span className="sm:hidden">VIEW →</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveJourney}
                        disabled={isSavingTrip}
                        className={`px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-widest font-sans flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity ${
                          tripSaveSuccess ? '!bg-green-600 !text-white' : ''
                        }`}
                      >
                        {tripSaveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{tripSaveSuccess ? 'SAVED' : 'SAVE'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Title */}
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Title (여정 제목)
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
                      />
                    </div>

                    {/* Date */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Date Range (일정 기간)
                      </label>
                      <input
                        type="text"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        placeholder="YYYY.MM.DD - YYYY.MM.DD"
                        className="px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
                      />
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Location / Cities (장소 / 도시)
                      </label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={e => setEditLocation(e.target.value)}
                        placeholder="e.g. Tokyo, Osaka, Kyoto"
                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
                      />
                    </div>

                    {/* Country */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Country (국가명)
                      </label>
                      <input
                        type="text"
                        value={editCountry}
                        onChange={e => setEditCountry(e.target.value)}
                        placeholder="e.g. JAPAN"
                        className="px-3 py-2 text-xs font-bold uppercase bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
                      />
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Status Badge (상태 뱃지)
                      </label>
                      <select
                        value={editStatusBadge}
                        onChange={e => setEditStatusBadge(e.target.value as any)}
                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white cursor-pointer"
                      >
                        <option value="">None (없음)</option>
                        <option value="NEW">NEW (신규)</option>
                        <option value="EDITING">EDITING (작성중)</option>
                      </select>
                    </div>

                    {/* Tags */}
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Tags (태그 관리)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={e => setNewTagInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                          placeholder="새 태그 입력 후 Enter..."
                          className="flex-1 px-3 py-1.5 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-3 py-1.5 bg-black/10 dark:bg-white/10 text-black dark:text-white text-xs font-bold uppercase rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                        >
                          ADD
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {editTags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-black/5 dark:bg-white/10 text-xs font-mono font-bold flex items-center gap-1 border border-black/10 dark:border-white/10"
                          >
                            #{tag}
                            <X
                              className="w-3 h-3 cursor-pointer hover:text-red-500"
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Media Tabs: MAIN / HERO (Unified Single Dropzone per Section) */}
                    <div className="sm:col-span-2 flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                      <div className="flex border-b border-black/15 dark:border-white/15 mb-2">
                        <button
                          type="button"
                          onClick={() => setArchiveMediaTab('main')}
                          className={`flex-1 py-1.5 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer border-b-2 -mb-px flex items-center justify-center gap-1.5 ${
                            archiveMediaTab === 'main'
                              ? 'border-black dark:border-white text-black dark:text-white'
                              : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <span>MAIN</span>
                          {(editImg || editVideoUrl) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchiveMediaTab('hero')}
                          className={`flex-1 py-1.5 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer border-b-2 -mb-px flex items-center justify-center gap-1.5 ${
                            archiveMediaTab === 'hero'
                              ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                              : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <span>HERO</span>
                          {(editHeroImg || editHeroVideoUrl) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
                          )}
                        </button>
                      </div>

                      {archiveMediaTab === 'main' ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                              MAIN MEDIA (이미지 또는 비디오)
                            </label>
                            {isUploading && (
                              <span className="text-[9.5px] font-mono font-bold text-red-600 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> 업로드 중...
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editVideoUrl || editImg}
                              onChange={e => {
                                const val = e.target.value;
                                if (!val) {
                                  setEditVideoUrl('');
                                  setEditImg('');
                                } else if (val.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                                  setEditVideoUrl(val);
                                  setEditImg('');
                                } else {
                                  setEditImg(val);
                                  setEditVideoUrl('');
                                }
                              }}
                              placeholder="이미지 또는 영상 URL 입력 / 파일 드롭"
                              className="px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none flex-1"
                            />
                            <label className="px-3 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0">
                              <Upload className="w-3 h-3" />
                              <span>UPLOAD</span>
                              <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.type.startsWith('video/')) {
                                    setIsUploading(true);
                                    try {
                                      const url = await uploadFileToR2(file, `covers/${Date.now()}_${file.name}`);
                                      setEditVideoUrl(url);
                                      setEditImg('');
                                    } catch (err) {
                                      alert('비디오 업로드 실패');
                                    } finally {
                                      setIsUploading(false);
                                    }
                                  } else {
                                    handleFileUpload(e, 'img');
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* MAIN Drag & Drop Box */}
                          <div
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsMainDragActive(true); }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsMainDragActive(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsMainDragActive(false); }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsMainDragActive(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                const file = e.dataTransfer.files[0];
                                if (file.type.startsWith('video/')) {
                                  setIsUploading(true);
                                  try {
                                    const url = await uploadFileToR2(file, `covers/${Date.now()}_${file.name}`);
                                    setEditVideoUrl(url);
                                    setEditImg('');
                                  } catch (err) {
                                    alert('비디오 업로드 실패');
                                  } finally {
                                    setIsUploading(false);
                                  }
                                } else if (file.type.startsWith('image/')) {
                                  setIsUploading(true);
                                  try {
                                    const compressedBlob = await compressImage(file, 1920, 1080, 0.85);
                                    const url = await uploadFileToR2(compressedBlob, `covers/${Date.now()}_${file.name}`);
                                    setEditImg(url);
                                    setEditVideoUrl('');
                                  } catch (err) {
                                    alert('이미지 업로드 실패');
                                  } finally {
                                    setIsUploading(false);
                                  }
                                }
                              }
                            }}
                            className={`border border-black/15 dark:border-white/15 aspect-[16/9] overflow-hidden bg-black/5 dark:bg-white/5 relative group flex items-center justify-center transition-all ${
                              isMainDragActive ? 'border-dashed border-red-600 bg-red-500/10 scale-[1.01]' : ''
                            }`}
                          >
                            {editVideoUrl ? (
                              <div className="relative w-full h-full">
                                <video src={editVideoUrl} controls muted className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditVideoUrl('');
                                    setEditImg('');
                                  }}
                                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 transition-colors z-20 cursor-pointer"
                                >
                                  Delete Video
                                </button>
                              </div>
                            ) : editImg ? (
                              <div className="relative w-full h-full">
                                <img src={getEffectiveImageUrl(editImg)} alt="Cover preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditImg('');
                                    setEditVideoUrl('');
                                  }}
                                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 transition-colors z-20 cursor-pointer"
                                >
                                  Delete Image
                                </button>
                              </div>
                            ) : (
                              <div className="text-black/45 dark:text-white/45 text-[10px] font-bold uppercase tracking-wider text-center flex flex-col items-center justify-center p-4">
                                {isUploading ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>미디어를 업로드 중입니다...</span>
                                  </div>
                                ) : (
                                  <span>이미지 또는 동영상을 드래그 앤 드롭하거나<br />위의 UPLOAD 버튼을 눌러주세요</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] text-black/60 dark:text-white/60 font-medium leading-relaxed bg-black/[0.03] dark:bg-white/[0.03] p-2 border border-black/10 dark:border-white/10">
                            홈 상단 히어로 슬라이더에 우선 노출할 미디어입니다. (미등록 시 MAIN 미디어 사용)
                          </p>
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                              HERO MEDIA (이미지 또는 비디오)
                            </label>
                            {isUploading && (
                              <span className="text-[9.5px] font-mono font-bold text-red-600 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> 업로드 중...
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editHeroVideoUrl || editHeroImg}
                              onChange={e => {
                                const val = e.target.value;
                                if (!val) {
                                  setEditHeroVideoUrl('');
                                  setEditHeroImg('');
                                } else if (val.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                                  setEditHeroVideoUrl(val);
                                  setEditHeroImg('');
                                } else {
                                  setEditHeroImg(val);
                                  setEditHeroVideoUrl('');
                                }
                              }}
                              placeholder="히어로 이미지 또는 영상 URL 입력 / 파일 드롭"
                              className="px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none flex-1"
                            />
                            <label className="px-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer shrink-0">
                              <Upload className="w-3 h-3" />
                              <span>UPLOAD</span>
                              <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.type.startsWith('video/')) {
                                    setIsUploading(true);
                                    try {
                                      const url = await uploadFileToR2(file, `covers/hero_${Date.now()}_${file.name}`);
                                      setEditHeroVideoUrl(url);
                                      setEditHeroImg('');
                                    } catch (err) {
                                      alert('비디오 업로드 실패');
                                    } finally {
                                      setIsUploading(false);
                                    }
                                  } else {
                                    handleFileUpload(e, 'heroImg');
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* HERO Drag & Drop Box */}
                          <div
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsHeroDragActive(true); }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsHeroDragActive(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsHeroDragActive(false); }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsHeroDragActive(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                const file = e.dataTransfer.files[0];
                                if (file.type.startsWith('video/')) {
                                  setIsUploading(true);
                                  try {
                                    const url = await uploadFileToR2(file, `covers/hero_${Date.now()}_${file.name}`);
                                    setEditHeroVideoUrl(url);
                                    setEditHeroImg('');
                                  } catch (err) {
                                    alert('비디오 업로드 실패');
                                  } finally {
                                    setIsUploading(false);
                                  }
                                } else if (file.type.startsWith('image/')) {
                                  setIsUploading(true);
                                  try {
                                    const compressedBlob = await compressImage(file, 2048, 2048, 0.85);
                                    const url = await uploadFileToR2(compressedBlob, `covers/hero_${Date.now()}_${file.name}`);
                                    setEditHeroImg(url);
                                    setEditHeroVideoUrl('');
                                  } catch (err) {
                                    alert('이미지 업로드 실패');
                                  } finally {
                                    setIsUploading(false);
                                  }
                                }
                              }
                            }}
                            className={`border border-black/15 dark:border-white/15 aspect-[16/9] overflow-hidden bg-black/5 dark:bg-white/5 relative group flex items-center justify-center transition-all ${
                              isHeroDragActive ? 'border-dashed border-red-600 bg-red-500/10 scale-[1.01]' : ''
                            }`}
                          >
                            {editHeroVideoUrl ? (
                              <div className="relative w-full h-full">
                                <video src={editHeroVideoUrl} controls muted className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditHeroVideoUrl('');
                                    setEditHeroImg('');
                                  }}
                                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 transition-colors z-20 cursor-pointer"
                                >
                                  Delete Video
                                </button>
                              </div>
                            ) : editHeroImg ? (
                              <div className="relative w-full h-full">
                                <img src={getEffectiveImageUrl(editHeroImg)} alt="Hero preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditHeroImg('');
                                    setEditHeroVideoUrl('');
                                  }}
                                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 transition-colors z-20 cursor-pointer"
                                >
                                  Delete Image
                                </button>
                              </div>
                            ) : (
                              <div className="text-black/45 dark:text-white/45 text-[10px] font-bold uppercase tracking-wider text-center flex flex-col items-center justify-center p-4">
                                {isUploading ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>히어로 미디어를 업로드 중입니다...</span>
                                  </div>
                                ) : (
                                  <span>히어로 이미지 또는 동영상을 드래그 앤 드롭하거나<br />위의 UPLOAD 버튼을 눌러주세요</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Clone, Move to Plan/Archive, Delete */}
                  <div className="pt-6 border-t border-black/15 dark:border-white/15 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCloneTrip(selectedJourney.id)}
                        className="px-3 py-2 border border-black/20 dark:border-white/20 text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>복제 (CLONE)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isSelectedPlan) {
                            onMoveToArchive(selectedJourney as Plan);
                          } else {
                            onMoveToPlans(selectedJourney);
                          }
                        }}
                        className="px-3 py-2 border border-black/20 dark:border-white/20 text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>{isSelectedPlan ? '아카이브로 전환' : '플랜으로 전환'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`'${selectedJourney.title}' 여정을 정말 삭제하시겠습니까? (휴지통으로 이동)`)) {
                          onDeleteTrip(selectedJourney.id);
                        }
                      }}
                      className="px-3 py-2 text-red-600 dark:text-red-400 border border-red-600/30 dark:border-red-400/30 text-xs font-black uppercase tracking-wider hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>휴지통으로 이동</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-black/40 dark:text-white/40 font-mono">
                  우측 목록에서 편집할 여정을 선택해 주세요.
                </div>
              )}
            </div>

            {/* Right: Reorderable Journey List with Drag & Drop + [▲] / [▼] buttons */}
            <div className={`w-full lg:w-2/5 p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-110px)] lg:max-h-[calc(100vh-60px)] bg-black/[0.01] dark:bg-white/[0.01] ${
              mobileArchiveTab === 'LIST' ? 'block' : 'hidden lg:block'
            }`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/15 dark:border-white/15">
                <span className="text-xs font-black uppercase tracking-wider font-sans">
                  JOURNEYS ORDER & SELECTION ({localJourneys.length})
                </span>
                <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                  드래그 또는 ▲ ▼ 클릭
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {localJourneys.map((journey, idx) => {
                  const isSelected = journey.id === selectedJourneyId;
                  const isPlan = journey.tags?.includes('Plan') || journey.title.includes('(Plan)');

                  return (
                    <div
                      key={journey.id}
                      draggable={isLoggedIn}
                      onDragStart={e => handleDragStart(e, idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDrop={e => handleDrop(e, idx)}
                      onClick={() => {
                        setSelectedJourneyId(journey.id);
                        setMobileArchiveTab('EDIT');
                      }}
                      className={`p-2.5 border transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                        isSelected
                          ? 'bg-white dark:bg-[#181818] border-red-600 dark:border-red-500 shadow-md ring-1 ring-red-600/30'
                          : 'bg-white/60 dark:bg-[#141414]/60 border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40'
                      }`}
                    >
                      {/* Drag Grip handle */}
                      <div className="cursor-grab active:cursor-grabbing text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white shrink-0">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Order Controls: ▲ & ▼ */}
                      <div className="flex flex-col gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="위로 이동"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(idx, 'down')}
                          disabled={idx === localJourneys.length - 1}
                          className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="아래로 이동"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Number Badge */}
                      <span className="font-mono text-xs font-black text-black/40 dark:text-white/40 w-5 text-center shrink-0">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="w-12 h-12 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                        <img
                          src={getEffectiveImageUrl(journey.img)}
                          alt={journey.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="text-xs font-black font-sans uppercase tracking-tight text-black dark:text-white truncate">
                            {journey.title.replace(' (Plan)', '')}
                          </h4>
                          {isPlan ? (
                            <span className="px-1 py-0.2 bg-blue-600 text-white font-mono text-[8px] font-black uppercase shrink-0">
                              PLAN
                            </span>
                          ) : (
                            <span className="px-1 py-0.2 bg-black text-white dark:bg-white dark:text-black font-mono text-[8px] font-black uppercase shrink-0">
                              LOG
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-black/50 dark:text-white/50 truncate">
                          {journey.date} · {journey.locationStr}
                        </span>
                      </div>

                      {/* Quick Direct Link to Journey */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onNavigate('detail', journey.id);
                        }}
                        className="p-1.5 text-black/40 dark:text-white/40 hover:text-red-600 dark:hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                        title="여정 상세 페이지 바로 보기"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: MAP (Map Tile Style & Defaults)                               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'MAP' && (
          <div className="w-full max-w-2xl mx-auto p-6 sm:p-12 flex flex-col gap-8 animate-in fade-in duration-200">
            <div className="border-b border-black/15 dark:border-white/15 pb-4">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                WORLD MAP PREFERENCES
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
                전세계 지도 설정
              </h2>
            </div>

            <div className="flex flex-col gap-6">
              {/* Tile Style Selector */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                  MAP TILESET (지도 그래픽 타일셋)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMapTileStyle('esri')}
                    className={`p-4 border cursor-pointer transition-all ${
                      mapTileStyle === 'esri'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
                        : 'bg-white dark:bg-[#141414] border-black/20 dark:border-white/20 hover:border-black'
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider block mb-1">
                      ESRI WORLD GRAY CANVAS
                    </span>
                    <p className="text-[11px] opacity-70 leading-relaxed">
                      완전 무료, 워터마크 일체 없음, 스위스 미니멀 모노톤 스타일에 완벽 최적화
                    </p>
                  </div>

                  <div
                    onClick={() => setMapTileStyle('google')}
                    className={`p-4 border cursor-pointer transition-all ${
                      mapTileStyle === 'google'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
                        : 'bg-white dark:bg-[#141414] border-black/20 dark:border-white/20 hover:border-black'
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider block mb-1">
                      GOOGLE MAPS TILES
                    </span>
                    <p className="text-[11px] opacity-70 leading-relaxed">
                      구글 지도 타일, 한국어 지명 상세 표기, 다크모드 필터 지원
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-black/15 dark:border-white/15 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveMapSettings}
                  className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-widest font-sans flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
                >
                  <Save className="w-4 h-4" />
                  <span>SAVE MAP SETTINGS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: TRASH (Trash Bin - Restoring & Permanent Deletion)            */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'TRASH' && (
          <div className="w-full max-w-3xl mx-auto p-6 sm:p-12 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-60px)] animate-in fade-in duration-200">
            <div className="border-b border-black/15 dark:border-white/15 pb-4">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                TRASH REPOSITORY
              </span>
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
                  휴지통 관리 ({trashedJourneys.length})
                </h2>
                <span className="text-xs font-mono text-black/50 dark:text-white/50">
                  삭제된 여정은 영구 삭제 전까지 안전하게 보관됩니다.
                </span>
              </div>
            </div>

            {trashedJourneys.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-black/40 dark:text-white/40 font-mono text-xs">
                <Trash2 className="w-8 h-8 opacity-40 mb-1" />
                <span>휴지통이 비어 있습니다.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {trashedJourneys.map(journey => (
                  <div
                    key={journey.id}
                    className="p-3.5 border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 aspect-square border border-black/15 dark:border-white/15 shrink-0 overflow-hidden bg-black/10">
                        <img
                          src={getEffectiveImageUrl(journey.img)}
                          alt={journey.title}
                          className="w-full h-full object-cover grayscale opacity-75"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black font-sans uppercase tracking-tight text-black dark:text-white truncate line-through opacity-75">
                          {journey.title}
                        </h4>
                        <span className="text-[11px] font-mono text-black/50 dark:text-white/50 block mt-0.5">
                          {journey.date} · {journey.locationStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRestoreJourney(journey.id)}
                        className="px-3 py-1.5 border border-black/20 dark:border-white/20 text-xs font-black uppercase tracking-wider font-sans hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                        title="여정 복구"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>복구</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`'${journey.title}' 여정을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                            onPermanentDeleteJourney(journey.id);
                          }
                        }}
                        className="px-3 py-1.5 text-red-600 dark:text-red-400 border border-red-600/30 dark:border-red-400/30 text-xs font-black uppercase tracking-wider font-sans hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                        title="영구 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>영구 삭제</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 3. Floating Bottom-Left Action Bar: Save & View Mode Buttons */}
      <div className="fixed bottom-6 left-6 z-[600] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
        {/* Floating Save Button */}
        <button
          type="button"
          onClick={() => {
            if (activeMode === 'HOME') handleSaveHome();
            else if (activeMode === 'ARCHIVE') handleSaveJourney();
          }}
          disabled={activeMode === 'HOME' ? isSavingHome : (activeMode === 'ARCHIVE' ? isSavingTrip : false)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer border ${
            (homeSaveSuccess || tripSaveSuccess)
              ? 'bg-green-600 text-white border-green-600 scale-105'
              : 'bg-black text-white dark:bg-white dark:text-black border-white/20 dark:border-black/20 hover:scale-110 active:scale-95'
          }`}
          title="변경사항 저장 (단축키: Ctrl + S)"
        >
          {(homeSaveSuccess || tripSaveSuccess) ? (
            <Check className="w-5 h-5 animate-in zoom-in" />
          ) : (
            <Save className="w-5 h-5" />
          )}
        </button>

        {/* Floating View Mode Button (Eye icon) */}
        <button
          type="button"
          onClick={() => {
            if (isCurrentDirty) {
              setShowUnsavedModal(true);
            } else {
              onNavigate('home');
            }
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl bg-white dark:bg-[#1a1a1a] text-black dark:text-white border border-black/15 dark:border-white/15 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="홈 뷰 모드로 이동"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* 4. Common Minimal Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowUnsavedModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#111] border border-black/20 dark:border-white/20 shadow-2xl p-6 select-none flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500">
                UNSAVED CHANGES
              </span>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-black dark:text-white">
                수정사항이 있는데 저장하시겠습니까?
              </h3>
              <p className="text-xs text-black/60 dark:text-white/60 font-sans mt-0.5 leading-relaxed">
                저장하지 않고 이동하면 편집 중인 내용이 유실될 수 있습니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-black/10 dark:border-white/10 font-sans text-xs font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="px-2 py-2.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60 uppercase tracking-wider cursor-pointer text-center whitespace-nowrap text-[11px]"
              >
                CANCEL (ESC)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  onNavigate('home');
                }}
                className="px-2 py-2.5 border border-red-600/30 text-red-600 dark:text-red-400 hover:bg-red-600/10 font-bold uppercase tracking-wider cursor-pointer text-center whitespace-nowrap text-[11px]"
              >
                NO (N)
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (activeMode === 'HOME') await handleSaveHome();
                  else if (activeMode === 'ARCHIVE') await handleSaveJourney();
                  setShowUnsavedModal(false);
                  onNavigate('home');
                }}
                className="px-2 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:opacity-85 cursor-pointer shadow-sm whitespace-nowrap text-[11px]"
              >
                YES (Y)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
