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
  AlertTriangle,
  GripVertical,
  Eye,
  Loader2,
  Plus,
  BookOpen,
  Layers,
  Sparkles,
  Layout
} from 'lucide-react';
import { Trip, Plan, MagazineMoment, MagazineSection, MagazineItem, TimelineData, TimelineItem } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { getEffectiveImageUrl, uploadFileToR2, deleteFileFromR2 } from '../utils/storageHelper';
import { compressImage } from '../utils/imageHelper';
import { inspectAndPrepareVideo } from '../utils/videoHelper';
import { cleanAdministrativeDistricts, resolveTimelineItemLocation } from '../components/SummaryView';

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
  heroSlideDuration?: number;
  marqueeShow: boolean;
  marqueeMessage: string;
  marqueeSpeed: number;
  homeGradientEnabled?: boolean;
  homeGradientFrom?: string;
  homeGradientTo?: string;
  onSaveAllHomeSettings: (
    title: string,
    subtitle: string,
    heroIds: number[],
    autoSlide: boolean,
    marqueeShow: boolean,
    marqueeMsg: string,
    marqueeSpd: number,
    heroMediaTypeParam?: 'image' | 'video',
    magazineMomentsParam?: MagazineMoment[],
    heroSlideDurationParam?: number,
    gradientEnabledParam?: boolean,
    gradientFromParam?: string,
    gradientToParam?: string
  ) => Promise<void>;
  // Magazine Highlights & Sections
  magazineMoments?: MagazineMoment[];
  magazineSections?: MagazineSection[];
  timelineData?: TimelineData;
  onSaveMagazineMoments?: (moments: MagazineMoment[]) => Promise<void>;
  onSaveMagazineSections?: (sections: MagazineSection[]) => Promise<void>;
  // Trash bin
  trashedJourneys: Trip[];
  onRestoreJourney: (id: number) => Promise<void>;
  onPermanentDeleteJourney: (id: number) => Promise<void>;
  isLoggedIn: boolean;
  isDarkMode: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  saveRef?: React.MutableRefObject<((showModal?: boolean) => Promise<void>) | null>;
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
  heroSlideDuration = 6,
  marqueeShow,
  marqueeMessage,
  marqueeSpeed,
  homeGradientEnabled,
  homeGradientFrom,
  homeGradientTo,
  onSaveAllHomeSettings,
  trashedJourneys,
  onRestoreJourney,
  onPermanentDeleteJourney,
  isLoggedIn,
  isDarkMode,
  magazineMoments = [],
  magazineSections = [],
  timelineData = {},
  onSaveMagazineMoments,
  onSaveMagazineSections,
  onDirtyChange,
  saveRef,
}: ManageHubPageProps) {
  // Top-level mode tabs ordered: 'HOME' | 'ARCHIVE' | 'MAGAZINE' | 'MAP' | 'TRASH'
  const [activeMode, setActiveMode] = useState<'HOME' | 'ARCHIVE' | 'MAGAZINE' | 'MAP' | 'TRASH'>(() => {
    const fromSession = sessionStorage.getItem('initialManageTab');
    if (fromSession && ['HOME', 'ARCHIVE', 'MAGAZINE', 'MAP', 'TRASH'].includes(fromSession)) {
      sessionStorage.removeItem('initialManageTab');
      return fromSession as any;
    }
    return 'HOME';
  });

  const handleMoveHeroOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedHeroIds.length) return;
    const next = [...selectedHeroIds];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setSelectedHeroIds(next);
  };

  const handleToggleHero = (id: number) => {
    setSelectedHeroIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Mobile Archive Switcher: 'LIST' or 'EDIT'
  const [mobileArchiveTab, setMobileArchiveTab] = useState<'LIST' | 'EDIT'>('LIST');

  // Selected Magazine Card for targeted insertion
  const [selectedMagCardId, setSelectedMagCardId] = useState<string | null>(null);

  // Home Background Gradient state
  const [gradientEnabled, setGradientEnabled] = useState<boolean>(() => {
    if (homeGradientEnabled !== undefined) return homeGradientEnabled;
    return localStorage.getItem('home_gradient_enabled') === 'true';
  });
  const [gradientFrom, setGradientFrom] = useState<string>(() => {
    return homeGradientFrom || localStorage.getItem('home_gradient_from') || '#F7F2EB';
  });
  const [gradientTo, setGradientTo] = useState<string>(() => {
    return homeGradientTo || localStorage.getItem('home_gradient_to') || '#E7DEC8';
  });

  useEffect(() => {
    if (homeGradientEnabled !== undefined) setGradientEnabled(homeGradientEnabled);
    if (homeGradientFrom) setGradientFrom(homeGradientFrom);
    if (homeGradientTo) setGradientTo(homeGradientTo);
  }, [homeGradientEnabled, homeGradientFrom, homeGradientTo]);

  // Selected journey for editing in ARCHIVE mode
  const [localJourneys, setLocalJourneys] = useState<(Trip | Plan)[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<number | null>(null);

  // Magazine sections & moments state
  const [sectionsList, setSectionsList] = useState<MagazineSection[]>(() => {
    if (magazineSections && magazineSections.length > 0) {
      return magazineSections;
    }
    const mainItems = (magazineMoments && magazineMoments.length > 0) ? magazineMoments : [];
    return [
      {
        id: 'main',
        title: 'MAGAZINE HOME',
        subtitle: 'Curated Moments & Editorial Stories',
        heroImg: trips[0]?.heroImg || trips[0]?.img || '',
        heroTitle: 'The Other Side of Paradise',
        heroSubtitle: '나만의 감성으로 기록하고 기억하는 여행의 순간들.',
        heroDate: trips[0]?.date || '2024 — 2026',
        heroLocation: trips[0]?.locationStr || 'GLOBAL ARCHIVE',
        heroTripId: trips[0]?.id,
        items: mainItems,
        order: 0,
        isDefault: true,
      }
    ];
  });

  const [activeMagSectionId, setActiveMagSectionId] = useState<string>(() => {
    const fromSession = sessionStorage.getItem('initialMagazineSectionId');
    if (fromSession) {
      sessionStorage.removeItem('initialMagazineSectionId');
      return fromSession;
    }
    return 'main';
  });

  const [momentsList, setMomentsList] = useState<MagazineMoment[]>(magazineMoments || []);
  const [selectedTripForMoments, setSelectedTripForMoments] = useState<number | null>(null);
  const [momentSearchQuery, setMomentSearchQuery] = useState('');
  const [isSavingMoments, setIsSavingMoments] = useState(false);
  const [momentsSaveSuccess, setMomentsSaveSuccess] = useState(false);
  const [isSavingMagazine, setIsSavingMagazine] = useState(false);
  const [magazineSaveSuccess, setMagazineSaveSuccess] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');

  useEffect(() => {
    if (magazineSections && magazineSections.length > 0) {
      setSectionsList(magazineSections);
    }
  }, [magazineSections]);

  useEffect(() => {
    if (magazineMoments && magazineMoments.length > 0) {
      setMomentsList(magazineMoments);
    }
  }, [magazineMoments]);

  // Current selected magazine section
  const currentMagSection = useMemo(() => {
    return sectionsList.find(s => s.id === activeMagSectionId) || sectionsList[0] || null;
  }, [sectionsList, activeMagSectionId]);

  // Home configuration state
  const [title, setTitle] = useState(homeTitle || '');
  const [subtitle, setSubtitle] = useState(homeSubtitle || '');
  const [selectedHeroIds, setSelectedHeroIds] = useState<number[]>(heroJourneyIds || []);
  const [autoSlide, setAutoSlide] = useState(heroAutoSlide);
  const [slideDuration, setSlideDuration] = useState<number>(heroSlideDuration || 6);
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
  const [pendingJourneyId, setPendingJourneyId] = useState<number | null>(null);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

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
      slideDuration !== heroSlideDuration ||
      mediaType !== heroMediaType ||
      showMarquee !== marqueeShow ||
      homeMarquee !== (marqueeMessage || '') ||
      homeSpeed !== (marqueeSpeed || 50) ||
      gradientEnabled !== (homeGradientEnabled ?? false) ||
      gradientFrom !== (homeGradientFrom || '#F7F2EB') ||
      gradientTo !== (homeGradientTo || '#E7DEC8') ||
      JSON.stringify(momentsList) !== JSON.stringify(magazineMoments || [])
    );
  }, [title, homeTitle, subtitle, homeSubtitle, selectedHeroIds, heroJourneyIds, autoSlide, heroAutoSlide, slideDuration, heroSlideDuration, mediaType, heroMediaType, showMarquee, marqueeShow, homeMarquee, marqueeMessage, homeSpeed, marqueeSpeed, gradientEnabled, homeGradientEnabled, gradientFrom, homeGradientFrom, gradientTo, homeGradientTo, momentsList, magazineMoments]);

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

  // Dirty tracking for MAGAZINE sections & moments
  const isMagazineDirty = useMemo(() => {
    return JSON.stringify(sectionsList) !== JSON.stringify(magazineSections || []);
  }, [sectionsList, magazineSections]);

  const isCurrentDirty = (activeMode === 'HOME' && isHomeDirty) || (activeMode === 'ARCHIVE' && isArchiveDirty) || (activeMode === 'MAGAZINE' && isMagazineDirty);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isCurrentDirty);
    }
  }, [isCurrentDirty, onDirtyChange]);

  // Sync journeys from props with localStorage order preservation
  useEffect(() => {
    const plansWithFlag = (plans || []).map(p => ({
      ...p,
      isPlan: true,
      tags: Array.from(new Set((p.tags || []).filter(t => t !== 'Archived').concat(p.tags?.includes('Plan') ? [] : ['Plan']))),
    }));
    const tripsClean = (trips || []).map(t => ({
      ...t,
      isPlan: false,
      tags: Array.from(new Set((t.tags || []).filter(t => t !== 'Archived'))),
    }));
    let combined = [...tripsClean, ...plansWithFlag];
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
  const handleSaveJourney = async (showModal: boolean = true) => {
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
      if (showModal) {
        setShowSaveSuccessModal(true);
      }
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
  const handleSaveHome = async (showModal: boolean = true) => {
    setIsSavingHome(true);
    try {
      localStorage.setItem('playVideoOnActivate', String(playVideoOnActivate));
      localStorage.setItem('home_journey_limit', String(homeJourneyLimit));
      localStorage.setItem('hero_slide_duration', String(slideDuration));
      localStorage.setItem('home_gradient_enabled', String(gradientEnabled));
      localStorage.setItem('home_gradient_from', gradientFrom);
      localStorage.setItem('home_gradient_to', gradientTo);
      window.dispatchEvent(new CustomEvent('homeConfigChanged', {
        detail: {
          gradientEnabled,
          gradientFrom,
          gradientTo,
        }
      }));
      await onSaveAllHomeSettings(
        title,
        subtitle,
        selectedHeroIds,
        autoSlide,
        showMarquee,
        homeMarquee,
        homeSpeed,
        mediaType,
        momentsList,
        slideDuration,
        gradientEnabled,
        gradientFrom,
        gradientTo
      );
      setHomeSaveSuccess(true);
      if (showModal) {
        setShowSaveSuccessModal(true);
      }
      setTimeout(() => setHomeSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save home settings:', err);
      alert('홈 설정 저장에 실패했습니다.');
    } finally {
      setIsSavingHome(false);
    }
  };

  // Keyboard Shortcuts: Ctrl+S to Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + S / Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (activeMode === 'HOME') handleSaveHome();
        else if (activeMode === 'ARCHIVE') handleSaveJourney();
        else if (activeMode === 'MAGAZINE') handleSaveMagazine();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, isHomeDirty, isArchiveDirty, isMagazineDirty, title, subtitle, selectedHeroIds, autoSlide, showMarquee, homeMarquee, homeSpeed, mediaType, momentsList, slideDuration, gradientEnabled, gradientFrom, gradientTo, selectedJourney, editTitle, editDate, editLocation, editCountry, editTags, editImg, editVideoUrl, editHeroImg, editHeroVideoUrl, editStatusBadge, sectionsList]);

  // Save Map Settings
  const handleSaveMapSettings = () => {
    localStorage.setItem('mapTileStyle', mapTileStyle);
    window.dispatchEvent(new CustomEvent('mapTileStyleChanged', { detail: mapTileStyle }));
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

  // Safe string helper to prevent crash when location or other properties are objects
  const safeStr = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      if (typeof val.name === 'string') return val.name;
      if (typeof val.formatted_address === 'string') return val.formatted_address;
      if (typeof val.address === 'string') return val.address;
    }
    return '';
  };

  // Extract candidate timeline & gallery photos on-demand (only when trip is selected or search query is active)
  const candidateTimelineItems = useMemo(() => {
    // If no trip selected and no search query, do NOT process database to keep mobile entry blazing fast
    if (selectedTripForMoments === null && !momentSearchQuery.trim()) {
      return [];
    }

    const list: (TimelineItem & { journeyTitle?: string; journeyLocation?: string })[] = [];
    const journeyMap = new Map(localJourneys.map(j => [j.id, j]));
    const seenImages = new Set<string>();
    const q = momentSearchQuery.toLowerCase().trim();

    // 1. From timelineData
    Object.entries(timelineData).forEach(([date, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (!item.img) return;
          if (selectedTripForMoments !== null && String(item.tripId) !== String(selectedTripForMoments)) {
            return;
          }
          const matchedJourney = item.tripId ? journeyMap.get(item.tripId) : undefined;
          if (q) {
            const place = safeStr(item.place).toLowerCase();
            const memo = safeStr(item.memo).toLowerCase();
            const loc = safeStr(item.location).toLowerCase();
            const jTitle = safeStr(matchedJourney?.title).toLowerCase();
            const jLoc = safeStr(matchedJourney?.locationStr || matchedJourney?.country).toLowerCase();
            if (!place.includes(q) && !memo.includes(q) && !loc.includes(q) && !jTitle.includes(q) && !jLoc.includes(q)) {
              return;
            }
          }
          if (!seenImages.has(item.img)) {
            seenImages.add(item.img);
            list.push({
              ...item,
              date: item.date || date,
              journeyTitle: matchedJourney?.title ? matchedJourney.title.replace(/\s*\(Plan\)$/i, '') : undefined,
              journeyLocation: matchedJourney?.locationStr || matchedJourney?.country,
            });
          }
        });
      }
    });

    // 2. From journey gallery metadata
    const targetJourneys = selectedTripForMoments !== null
      ? localJourneys.filter(j => String(j.id) === String(selectedTripForMoments))
      : localJourneys;

    targetJourneys.forEach(j => {
      if (j.gallery && Array.isArray(j.gallery)) {
        j.gallery.forEach((gItem, gIdx) => {
          const url = typeof gItem === 'string' ? gItem : gItem?.url;
          if (!url || seenImages.has(url)) return;

          const gDate = typeof gItem === 'object' && gItem?.date ? gItem.date : j.date;
          const gPlace = typeof gItem === 'object' && gItem?.place ? gItem.place : '';
          const gMemo = typeof gItem === 'object' && gItem?.imgNote ? gItem.imgNote : '';

          if (q) {
            const place = gPlace.toLowerCase();
            const memo = gMemo.toLowerCase();
            const jTitle = safeStr(j.title).toLowerCase();
            const jLoc = safeStr(j.locationStr || j.country).toLowerCase();
            if (!place.includes(q) && !memo.includes(q) && !jTitle.includes(q) && !jLoc.includes(q)) {
              return;
            }
          }

          seenImages.add(url);
          list.push({
            id: 900000 + j.id * 1000 + gIdx,
            time: typeof gItem === 'object' && gItem?.time ? gItem.time : '12:00',
            type: 'PHOTO',
            place: gPlace || j.locationStr || j.title.replace(/\s*\(Plan\)$/i, ''),
            cost: '',
            memo: gMemo,
            img: url,
            date: gDate,
            tripId: j.id,
            journeyTitle: j.title.replace(/\s*\(Plan\)$/i, ''),
            journeyLocation: j.locationStr || j.country,
          });
        });
      }
    });

    // Sort candidate items strictly in chronological order (earliest date & time first)
    const parseDateTimeScore = (item: { date?: string; time?: string }) => {
      const rawDate = safeStr(item.date).trim();
      const rawTime = safeStr(item.time).trim();

      // Extract Year, Month, Day
      const dateMatch = rawDate.match(/(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
      let year = 9999, month = 99, day = 99;
      if (dateMatch) {
        year = parseInt(dateMatch[1], 10);
        month = parseInt(dateMatch[2], 10);
        day = parseInt(dateMatch[3], 10);
      } else {
        const dayMatch = rawDate.match(/day\s*(\d+)/i);
        if (dayMatch) {
          year = 2000;
          month = 1;
          day = parseInt(dayMatch[1], 10);
        }
      }

      // Extract Hours, Minutes
      let hours = 12, minutes = 0;
      const timeMatch = rawTime.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        if (/pm/i.test(rawTime) && hours < 12) hours += 12;
        if (/am/i.test(rawTime) && hours === 12) hours = 0;
      }

      return year * 100000000 + month * 1000000 + day * 10000 + hours * 100 + minutes;
    };

    list.sort((a, b) => {
      const scoreA = parseDateTimeScore(a);
      const scoreB = parseDateTimeScore(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    return list;
  }, [timelineData, localJourneys, selectedTripForMoments, momentSearchQuery]);

  // Add timeline item as a magazine moment
  const handleAddMomentFromTimeline = (item: TimelineItem & { journeyTitle?: string; journeyLocation?: string }) => {
    if (!item.img) return;
    const parentTrip = trips.find(t => t.id === item.tripId);
    const pName = safeStr(item.place);
    const jTitle = safeStr(item.journeyTitle) || parentTrip?.title || '';
    const jLoc = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || safeStr(item.journeyLocation);
    const locStr = safeStr(item.location) || pName;
    const newMoment: MagazineMoment = {
      id: `moment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tripId: item.tripId,
      title: pName || jTitle || 'UNTITLED MOMENT',
      date: safeStr(item.date),
      placeName: locStr,
      location: jLoc,
      caption: '',
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

  // Section Management Handlers
  const handleAddSection = () => {
    if (!newSectionTitle.trim()) {
      alert('섹션 제목을 입력해주세요.');
      return;
    }
    const newId = `section-${Date.now()}`;
    const newSection: MagazineSection = {
      id: newId,
      title: newSectionTitle.trim().toUpperCase(),
      subtitle: newSectionSubtitle.trim(),
      heroImg: '',
      heroTitle: newSectionTitle.trim(),
      heroSubtitle: newSectionSubtitle.trim(),
      heroDate: '',
      heroLocation: '',
      items: [],
      order: sectionsList.length,
      isDefault: false,
    };
    setSectionsList(prev => [...prev, newSection]);
    setActiveMagSectionId(newId);
    setNewSectionTitle('');
    setNewSectionSubtitle('');
    setShowAddSectionModal(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (sectionsList.length <= 1) {
      alert('최소 1개의 매거진 섹션은 유지되어야 합니다.');
      return;
    }
    const target = sectionsList.find(s => s.id === sectionId);
    if (window.confirm(`'${target?.title || '선택한'}' 매거진 섹션을 삭제하시겠습니까?`)) {
      setSectionsList(prev => {
        const filtered = prev.filter(s => s.id !== sectionId);
        const reordered = filtered.map((s, idx) => ({ ...s, order: idx }));
        if (activeMagSectionId === sectionId && reordered.length > 0) {
          setActiveMagSectionId(reordered[0].id);
        }
        return reordered;
      });
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sectionsList.length) return;
    const copy = [...sectionsList];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setSectionsList(copy.map((s, idx) => ({ ...s, order: idx })));
  };

  const handleUpdateSectionField = (sectionId: string, field: keyof MagazineSection, val: any) => {
    setSectionsList(prev => prev.map(s => s.id === sectionId ? { ...s, [field]: val } : s));
  };

  // Add Item to Current Section
  const handleAddItemToCurrentSection = (item: TimelineItem & { journeyTitle?: string; journeyLocation?: string }) => {
    if (!currentMagSection || !item.img) return;
    const parentTrip = trips.find(t => t.id === item.tripId);
    const pName = safeStr(item.place);
    const jTitle = safeStr(item.journeyTitle) || parentTrip?.title || '';
    const jLoc = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || safeStr(item.journeyLocation);
    const locStr = safeStr(item.location) || pName;

    const newItem: MagazineItem = {
      id: `moment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tripId: item.tripId,
      title: pName || jTitle || 'UNTITLED MOMENT',
      date: safeStr(item.date),
      placeName: locStr,
      location: jLoc,
      img: item.img,
      layoutType: 'portrait',
      order: (currentMagSection.items || []).length,
    };

    setSectionsList(prev => prev.map(s => {
      if (s.id === currentMagSection.id) {
        return {
          ...s,
          items: [...(s.items || []), newItem],
        };
      }
      return s;
    }));
  };

  const handleAddTextCardToCurrentSection = () => {
    if (!currentMagSection) return;
    const currentItems = [...(currentMagSection.items || [])];
    const newTextItem: MagazineItem = {
      id: `text-card-${Date.now()}`,
      title: 'EDITORIAL NOTE',
      textContent: '여정에서 마주한 잊지 못할 순간과 기록.',
      date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      placeName: currentMagSection.heroLocation || '',
      location: currentMagSection.heroLocation || '',
      img: '',
      isTextOnly: true,
      layoutType: 'landscape',
      order: currentItems.length,
    };

    let nextItems: MagazineItem[];
    const selectedIdx = selectedMagCardId ? currentItems.findIndex(it => it.id === selectedMagCardId) : -1;
    if (selectedIdx !== -1) {
      // Insert right after the currently selected card
      currentItems.splice(selectedIdx + 1, 0, newTextItem);
      nextItems = currentItems.map((it, idx) => ({ ...it, order: idx }));
    } else {
      nextItems = [...currentItems, newTextItem].map((it, idx) => ({ ...it, order: idx }));
    }

    setSectionsList(prev => prev.map(s => {
      if (s.id === currentMagSection.id) {
        return {
          ...s,
          items: nextItems,
        };
      }
      return s;
    }));

    setSelectedMagCardId(newTextItem.id);
  };

  const handleRemoveItemFromCurrentSection = (itemId: string) => {
    if (!currentMagSection) return;
    setSectionsList(prev => prev.map(s => {
      if (s.id === currentMagSection.id) {
        return {
          ...s,
          items: (s.items || []).filter(it => it.id !== itemId).map((it, idx) => ({ ...it, order: idx })),
        };
      }
      return s;
    }));
  };

  const handleMoveItemInCurrentSection = (index: number, direction: 'up' | 'down') => {
    if (!currentMagSection || !currentMagSection.items) return;
    const items = [...currentMagSection.items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    const reordered = items.map((it, idx) => ({ ...it, order: idx }));

    setSectionsList(prev => prev.map(s => {
      if (s.id === currentMagSection.id) {
        return { ...s, items: reordered };
      }
      return s;
    }));
  };

  const handleUpdateItemInCurrentSection = (itemId: string, field: keyof MagazineItem, val: any) => {
    if (!currentMagSection || !currentMagSection.items) return;
    setSectionsList(prev => prev.map(s => {
      if (s.id === currentMagSection.id) {
        return {
          ...s,
          items: s.items.map(it => it.id === itemId ? { ...it, [field]: val } : it),
        };
      }
      return s;
    }));
  };

  const handleSetAsHeroFromItem = (item: MagazineItem) => {
    if (!currentMagSection) return;
    setSectionsList(prev => prev.map(s => {
      if (s.id === currentMagSection.id) {
        return {
          ...s,
          heroImg: item.img || '',
          heroDate: item.date || s.heroDate || '',
          heroLocation: item.placeName || item.location || s.heroLocation || '',
          heroTripId: item.tripId || s.heroTripId,
        };
      }
      return s;
    }));
  };

  // Save Magazine Sections & Moments
  const handleSaveMagazine = async (showModal: boolean = true) => {
    if (isSavingMagazine) return;
    setIsSavingMagazine(true);
    try {
      if (onSaveMagazineSections) {
        await onSaveMagazineSections(sectionsList);
      } else if (onSaveMagazineMoments) {
        const mainSec = sectionsList.find(s => s.id === 'main') || sectionsList[0];
        await onSaveMagazineMoments(mainSec?.items || []);
      }
      setMagazineSaveSuccess(true);
      if (showModal) {
        setShowSaveSuccessModal(true);
      }
      setTimeout(() => setMagazineSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save magazine settings:', err);
      alert('매거진 설정 저장에 실패했습니다.');
    } finally {
      setIsSavingMagazine(false);
    }
  };

  // Sync saveRef with the current active mode's save handler
  useEffect(() => {
    if (saveRef) {
      if (activeMode === 'HOME') {
        saveRef.current = handleSaveHome;
      } else if (activeMode === 'ARCHIVE') {
        saveRef.current = handleSaveJourney;
      } else if (activeMode === 'MAGAZINE') {
        saveRef.current = handleSaveMagazine;
      } else {
        saveRef.current = null;
      }
    }
  }, [saveRef, activeMode, handleSaveHome, handleSaveJourney, handleSaveMagazine]);

  const isSelectedPlan = Boolean(
    selectedJourney && (
      (selectedJourney as any).isPlan ||
      (plans && plans.some(p => String(p.id) === String(selectedJourney.id))) ||
      selectedJourney.tags?.includes('Plan') ||
      selectedJourney.title?.includes('(Plan)')
    )
  );

  const getReturnView = () => {
    switch (activeMode) {
      case 'MAGAZINE':
        return 'magazine';
      case 'ARCHIVE':
        return 'archive';
      case 'MAP':
        return 'map';
      case 'HOME':
      default:
        return 'home';
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#FAF9F6] dark:bg-[#141414] text-black dark:text-white flex flex-col font-sans select-none animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar with Swiss Minimal Mode Switcher: HOME / ARCHIVE / MAP / TRASH */}
      <div className="border-b border-black/15 dark:border-white/15 px-4 sm:px-8 py-3 bg-white dark:bg-[#111111] flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onNavigate(getReturnView());
            }}
            className="p-1.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
            title="돌아가기"
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

        {/* Mode Switcher: HOME / TRIP / MAGAZINE / MAP / TRASH */}
        <div className="flex items-center border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 p-0.5 rounded-none overflow-x-auto">
          {(['HOME', 'ARCHIVE', 'MAGAZINE', 'MAP', 'TRASH'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-3 sm:px-4 py-1.5 text-xs font-black uppercase tracking-wider font-sans transition-colors cursor-pointer whitespace-nowrap ${
                activeMode === mode
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              {mode === 'ARCHIVE' ? 'TRIP' : mode}
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
          <div className="w-full max-w-3xl mx-auto p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-60px)] animate-in fade-in duration-200">
            <div className="flex flex-col gap-8">
              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* SECTION: MAIN (메인 & 마퀴 설정)                              */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <section className="flex flex-col gap-6 pt-2">
                  <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                      MAIN
                    </h3>
                  </div>

                  {/* Home Title */}
                  <div className="flex flex-col gap-1.5 max-w-md">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                      HOME TITLE
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="TRIP GON LOG"
                      className="px-3 py-2 text-xs font-bold bg-transparent border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white text-black dark:text-white"
                    />
                  </div>

                  {/* Marquee Banner (Now under MAIN) */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-black/10 dark:border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold uppercase text-black/80 dark:text-white/80">
                        MARQUEE BANNER
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMarquee(!showMarquee)}
                        className={`px-3 py-1 text-xs font-mono font-bold uppercase border transition-colors cursor-pointer ${
                          showMarquee
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'border-black/20 dark:border-white/20 text-black/40 dark:text-white/40'
                        }`}
                      >
                        {showMarquee ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {showMarquee && (
                      <div className="flex flex-col gap-3 pt-1">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                            MARQUEE TEXT
                          </label>
                          <input
                            type="text"
                            value={homeMarquee}
                            onChange={e => setHomeMarquee(e.target.value)}
                            placeholder="TRIP GON LOG - PLAN YOUR JOURNEY OR EXPLORE ARCHIVED LOGS"
                            className="px-3 py-2 text-xs font-bold bg-transparent border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white text-black dark:text-white"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <span className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 shrink-0">
                            SPEED: {homeSpeed}s
                          </span>
                          <input
                            type="range"
                            min={15}
                            max={120}
                            value={homeSpeed}
                            onChange={e => setHomeSpeed(parseInt(e.target.value, 10))}
                            className="flex-1 accent-black dark:accent-white cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Background Gradient Settings */}
                  <div className="flex flex-col gap-3.5 pt-4 border-t border-black/10 dark:border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase text-black/80 dark:text-white/80 block">
                          BACKGROUND GRADIENT (홈 감성 그라데이션)
                        </span>
                        <span className="text-[10px] text-black/50 dark:text-white/50">
                          화이트/블랙의 단조로움을 없애고 두 가지 은은한 톤으로 감성 느낌 연출
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGradientEnabled(!gradientEnabled)}
                        className={`px-3 py-1 text-xs font-mono font-bold uppercase border transition-colors cursor-pointer ${
                          gradientEnabled
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'border-black/20 dark:border-white/20 text-black/40 dark:text-white/40'
                        }`}
                      >
                        {gradientEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {gradientEnabled && (
                      <div className="flex flex-col gap-4 pt-2 bg-black/[0.02] dark:bg-white/[0.02] p-4 border border-black/10 dark:border-white/10">
                        {/* Presets */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                            SWISS MINIMAL PRESETS (추천 프리셋)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {[
                              { name: 'Minimal Sand', from: '#F7F2EB', to: '#E7DEC8' },
                              { name: 'Soft Lavender', from: '#F4F0F9', to: '#DFD5EB' },
                              { name: 'Misty Sage', from: '#F0F5F1', to: '#D4E3D2' },
                              { name: 'Slate Cool', from: '#EFF3F8', to: '#D3DFEE' },
                              { name: 'Warm Sunset', from: '#FBF1E6', to: '#F0D8C3' },
                            ].map((p, idx) => {
                              const isSelected = gradientFrom.toLowerCase() === p.from.toLowerCase() && gradientTo.toLowerCase() === p.to.toLowerCase();
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setGradientFrom(p.from);
                                    setGradientTo(p.to);
                                  }}
                                  className={`p-2 border text-left flex flex-col gap-1.5 transition-all cursor-pointer relative ${
                                    isSelected
                                      ? 'border-black dark:border-white ring-2 ring-black dark:ring-white bg-black/5 dark:bg-white/10 shadow-sm'
                                      : 'border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  <div
                                    className="w-full h-5 border border-black/10 dark:border-white/10 relative"
                                    style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                                  >
                                    {isSelected && (
                                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-black dark:bg-white shadow-xs" />
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-[10px] truncate ${isSelected ? 'font-black text-black dark:text-white' : 'font-bold text-black/80 dark:text-white/80'}`}>
                                      {p.name}
                                    </span>
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-black dark:text-white shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom Color Pickers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Color 1 */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                              COLOR 1 (시작 색상)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={gradientFrom}
                                onChange={e => setGradientFrom(e.target.value)}
                                className="w-8 h-8 p-0 border border-black/20 dark:border-white/20 rounded-none cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={gradientFrom}
                                onChange={e => setGradientFrom(e.target.value)}
                                placeholder="#FAF8F5"
                                className="flex-1 px-3 py-1.5 text-xs font-mono font-bold uppercase bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none"
                              />
                            </div>
                          </div>

                          {/* Color 2 */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                              COLOR 2 (끝 색상)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={gradientTo}
                                onChange={e => setGradientTo(e.target.value)}
                                className="w-8 h-8 p-0 border border-black/20 dark:border-white/20 rounded-none cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={gradientTo}
                                onChange={e => setGradientTo(e.target.value)}
                                placeholder="#F1ECE1"
                                className="flex-1 px-3 py-1.5 text-xs font-mono font-bold uppercase bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Live Preview Strip */}
                        <div className="flex flex-col gap-1 pt-1">
                          <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                            LIVE PREVIEW (실시간 미리보기)
                          </label>
                          <div
                            className="w-full h-12 border border-black/15 dark:border-white/15 flex items-center justify-center p-3 shadow-inner"
                            style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
                          >
                            <span className="text-xs font-mono font-black text-black/80 tracking-widest uppercase">
                              PREVIEW: {gradientFrom} &rarr; {gradientTo}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* SECTION: HERO (히어로 설정)                                   */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <section className="flex flex-col gap-6 pt-6 border-t border-black/20 dark:border-white/20">
                  <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                      HERO
                    </h3>
                  </div>

                  {/* Hero Auto Slide & Slide Limit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Hero Auto Slide Toggle */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                        HERO AUTO SLIDE
                      </label>
                      <button
                        type="button"
                        onClick={() => setAutoSlide(!autoSlide)}
                        className={`w-full py-2 text-xs font-mono font-bold uppercase border transition-colors cursor-pointer rounded-none flex items-center justify-center ${
                          autoSlide
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'bg-transparent border-black/20 dark:border-white/20 text-black/50 dark:text-white/50'
                        }`}
                      >
                        {autoSlide ? 'AUTO SLIDE: ON' : 'AUTO SLIDE: OFF'}
                      </button>
                    </div>

                    {/* Hero Slide Limit (3s ~ 9s) */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                          SLIDE LIMIT
                        </label>
                        <span className="font-mono text-xs font-bold text-red-600 dark:text-red-500">
                          {slideDuration}s
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={3}
                          max={9}
                          step={1}
                          value={slideDuration}
                          onChange={e => setSlideDuration(parseInt(e.target.value, 10))}
                          className="flex-1 accent-black dark:accent-white cursor-pointer"
                        />
                        <div className="flex items-center gap-1">
                          {[3, 5, 7, 9].map(sec => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setSlideDuration(sec)}
                              className={`px-2 py-1 text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                                slideDuration === sec
                                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                  : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-black'
                              }`}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Autoplay On Hover Toggle */}
                  <div className="flex items-center justify-between py-2 border-t border-black/10 dark:border-white/10">
                    <span className="text-xs font-mono font-bold uppercase text-black/80 dark:text-white/80">
                      VIDEO AUTOPLAY ON HOVER
                    </span>
                    <button
                      type="button"
                      onClick={() => setPlayVideoOnActivate(!playVideoOnActivate)}
                      className={`px-3 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer rounded-none ${
                        playVideoOnActivate
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'border-black/20 dark:border-white/20 text-black/50 dark:text-white/50'
                      }`}
                    >
                      {playVideoOnActivate ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Hero Journeys Selection */}
                  <div className="flex flex-col gap-3 pt-2 border-t border-black/10 dark:border-white/10">
                    <div className="flex justify-between items-baseline">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                        HERO JOURNEYS
                      </label>
                      <span className="text-xs font-mono font-bold text-red-600 dark:text-red-500">
                        {selectedHeroIds.length} ITEMS
                      </span>
                    </div>

                    {/* Selected Hero Slides Reorder List */}
                    {selectedHeroIds.length > 0 && (
                      <div className="flex flex-col gap-1.5 p-2 border border-black/15 dark:border-white/15">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 px-1">
                          SLIDE ORDER
                        </span>
                        <div className="flex flex-col gap-1">
                          {selectedHeroIds.map((id, idx) => {
                            const journey = localJourneys.find(j => j.id === id);
                            if (!journey) return null;
                            return (
                              <div
                                key={id}
                                className="p-1.5 bg-white dark:bg-[#161616] border border-black/15 dark:border-white/15 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="font-mono text-xs font-bold text-red-600 dark:text-red-500 w-5 shrink-0 text-center">
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <div className="w-8 h-8 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                                    <img
                                      src={getEffectiveImageUrl(journey.img)}
                                      alt={journey.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold truncate text-black dark:text-white font-sans">
                                      {journey.title}
                                    </div>
                                    <div className="text-[10px] font-mono text-black/50 dark:text-white/50">
                                      {journey.date}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveHeroOrder(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                    title="위로 이동"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveHeroOrder(idx, 'down')}
                                    disabled={idx === selectedHeroIds.length - 1}
                                    className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                    title="아래로 이동"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHero(id)}
                                    className="p-1 text-black/40 dark:text-white/40 hover:text-red-600 transition-colors cursor-pointer"
                                    title="제거"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Journeys Checklist Search & Selection */}
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                        <input
                          type="text"
                          value={heroSearchQuery}
                          onChange={e => setHeroSearchQuery(e.target.value)}
                          placeholder="여정 검색 (제목, 장소)..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#161616] border border-black/15 dark:border-white/15 outline-none rounded-none focus:border-black dark:focus:border-white"
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto border border-black/15 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10 bg-white dark:bg-[#161616]">
                        {filteredHeroCandidates.length === 0 ? (
                          <div className="p-4 text-center text-xs font-mono text-black/40 dark:text-white/40">
                            검색 결과가 없습니다.
                          </div>
                        ) : (
                          filteredHeroCandidates.map(journey => {
                            const isSelected = selectedHeroIds.includes(journey.id);
                            return (
                              <div
                                key={journey.id}
                                onClick={() => handleToggleHero(journey.id)}
                                className={`p-2 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-black/5 dark:bg-white/10'
                                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4 h-4 rounded-none border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                                      : 'border-black/30 dark:border-white/30'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div className="w-7 h-7 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                                    <img
                                      src={getEffectiveImageUrl(journey.img)}
                                      alt={journey.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold truncate text-black dark:text-white font-sans">
                                      {journey.title}
                                    </div>
                                    <div className="text-[10px] font-mono text-black/50 dark:text-white/50">
                                      {journey.locationStr} · {journey.date}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black shrink-0">
                                    SLIDE #{selectedHeroIds.indexOf(journey.id) + 1}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* SECTION: TRIP (여정 표시 설정 - 구 ARCHIVE)                    */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <section className="flex flex-col gap-6 pt-6 border-t border-black/20 dark:border-white/20">
                  <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                      TRIP
                    </h3>
                  </div>

                  {/* Journeys Display Limit */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-mono font-bold uppercase text-black/80 dark:text-white/80">
                      JOURNEYS DISPLAY LIMIT
                    </span>
                    <div className="flex items-center gap-1">
                      {[4, 6, 8, 999].map(limit => (
                        <button
                          key={limit}
                          type="button"
                          onClick={() => setHomeJourneyLimit(limit)}
                          className={`px-3 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                            homeJourneyLimit === limit
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                              : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-black'
                          }`}
                        >
                          {limit === 999 ? 'ALL' : limit}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* SECTION: MAGAZINE (홈 매거진 순간 선별)                         */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <section className="flex flex-col gap-6 pt-6 border-t border-black/20 dark:border-white/20">
                  <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                      MAGAZINE
                    </h3>
                    <span className="text-xs font-mono font-bold text-red-600 dark:text-red-500">
                      {momentsList.length} ITEMS
                    </span>
                  </div>

                  {/* Curated Moments: Slim Card without caption/subtitle */}
                  {momentsList.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                      {momentsList.map((m, idx) => (
                        <div 
                          key={m.id || idx}
                          className="p-2 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-10 h-10 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10 relative">
                              <img src={getEffectiveImageUrl(m.img)} alt={m.title} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 left-0 bg-black text-white text-[8px] font-mono px-1">
                                #{idx + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <input 
                                type="text"
                                value={m.title}
                                onChange={e => handleUpdateMoment(m.id, 'title', e.target.value)}
                                placeholder="Title"
                                className="text-xs font-bold bg-transparent border-b border-black/20 dark:border-white/20 outline-none pb-0.5 focus:border-black dark:focus:border-white text-black dark:text-white"
                              />
                              <input 
                                type="text"
                                value={m.quote || ''}
                                onChange={e => handleUpdateMoment(m.id, 'quote', e.target.value)}
                                placeholder="“Quote / Phrase”"
                                className="text-[11px] font-serif italic bg-transparent border-b border-black/10 dark:border-white/10 outline-none text-black/80 dark:text-white/80"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveMoment(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                              title="위로 이동"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveMoment(idx, 'down')}
                              disabled={idx === momentsList.length - 1}
                              className="p-1 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer"
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
                  )}

                  {/* Selection Tool */}
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Filter by Journey */}
                      <select
                        value={selectedTripForMoments === null ? '' : selectedTripForMoments}
                        onChange={e => setSelectedTripForMoments(e.target.value === '' ? null : Number(e.target.value))}
                        className="px-3 py-2 text-xs font-mono font-bold bg-transparent border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white text-black dark:text-white"
                      >
                        <option value="" className="text-black bg-white dark:bg-[#161616] dark:text-white">-- SELECT JOURNEY TO LOAD PHOTOS --</option>
                        {localJourneys.map(j => (
                          <option key={j.id} value={j.id} className="text-black bg-white dark:bg-[#161616] dark:text-white">
                            {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country})
                          </option>
                        ))}
                      </select>

                      {/* Search Keyword */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                        <input
                          type="text"
                          value={momentSearchQuery}
                          onChange={e => setMomentSearchQuery(e.target.value)}
                          placeholder="Search place, memo, location..."
                          className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-transparent border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white text-black dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Candidate Timeline Images Grid */}
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                          TIMELINE PHOTOS ({candidateTimelineItems.length})
                        </span>
                        {selectedTripForMoments !== null && (
                          <button
                            type="button"
                            onClick={() => setSelectedTripForMoments(null)}
                            className="text-[10px] font-mono text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            CLEAR SELECTION
                          </button>
                        )}
                      </div>

                      {candidateTimelineItems.length === 0 ? (
                        selectedTripForMoments === null && !momentSearchQuery.trim() ? (
                          <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02]">
                            <ImageIcon className="w-6 h-6 text-black/30 dark:text-white/30" />
                            <span className="text-xs font-mono font-black text-black/70 dark:text-white/70 tracking-wider uppercase">
                              SELECT A JOURNEY TO VIEW PHOTOS
                            </span>
                            <span className="text-[11px] text-black/40 dark:text-white/40 max-w-sm leading-relaxed">
                              위 드롭다운에서 여행을 선택하시거나 검색어를 입력하시면 해당 사진들이 즉시 로드됩니다.
                            </span>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs font-mono text-black/40 dark:text-white/40 border border-black/10 dark:border-white/10">
                            NO PHOTOS FOUND FOR THIS SELECTION
                          </div>
                        )
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[520px] overflow-y-auto p-1 border border-black/15 dark:border-white/15">
                          {candidateTimelineItems.map((item, i) => {
                            const pName = safeStr(item.place);
                            const jTitle = safeStr(item.journeyTitle);
                            const displayTitle = pName || jTitle || 'MOMENT';
                            const itemDate = safeStr(item.date);
                            return (
                              <div
                                key={`cand-${item.id || i}-${i}`}
                                onClick={() => handleAddMomentFromTimeline(item)}
                                className="group relative h-32 sm:h-40 bg-white dark:bg-[#121212] border border-black/15 dark:border-white/15 overflow-hidden cursor-pointer flex flex-col justify-end transition-all select-none rounded-none active:scale-95"
                                title={`${displayTitle} (${itemDate})`}
                              >
                                <img
                                  src={getEffectiveImageUrl(item.img || '')}
                                  alt={displayTitle}
                                  loading="lazy"
                                  decoding="async"
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-mono text-xs font-black p-2 text-center z-10">
                                  + ADD
                                </div>

                                <div className="relative z-10 w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 pt-4 flex flex-col gap-0.5">
                                  <span className="text-[11px] font-bold text-white truncate leading-tight">
                                    {displayTitle}
                                  </span>
                                  {itemDate && (
                                    <span className="text-[9px] font-mono text-white/70 truncate">
                                      {itemDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

              {/* Save Button */}
              <div className="pt-6 border-t border-black/20 dark:border-white/20 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveHome()}
                  disabled={isSavingHome}
                  className={`px-8 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity ${
                    homeSaveSuccess ? '!bg-green-600 !text-white' : ''
                  }`}
                >
                  {homeSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  <span>{homeSaveSuccess ? 'SAVED' : 'SAVE'}</span>
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
                        onClick={() => handleSaveJourney()}
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

                    {/* Journey Type (LOG vs PLAN) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Type (여정 유형 구분)
                      </label>
                      <div className="flex items-center gap-1.5 h-[35px]">
                        <button
                          type="button"
                          onClick={async () => {
                            if (isSelectedPlan && selectedJourney) {
                              await onMoveToArchive(selectedJourney as Plan);
                              setEditTags(prev => prev.filter(t => t !== 'Plan' && t !== 'Archived'));
                              setEditTitle(prev => prev.replace(/\s*\(Plan\)$/i, '').trim());
                            }
                          }}
                          disabled={!isSelectedPlan}
                          className={`flex-1 h-full text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                            !isSelectedPlan
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                              : 'bg-transparent text-black/50 dark:text-white/50 border-black/20 dark:border-white/20 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${!isSelectedPlan ? 'bg-red-500' : 'bg-transparent'}`} />
                          <span>LOG (기록)</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!isSelectedPlan && selectedJourney) {
                              await onMoveToPlans(selectedJourney);
                              setEditTags(prev => {
                                const next = prev.filter(t => t !== 'Archived');
                                return next.includes('Plan') ? next : [...next, 'Plan'];
                              });
                              setEditTitle(prev => prev.endsWith(' (Plan)') ? prev : `${prev} (Plan)`);
                            }
                          }}
                          disabled={isSelectedPlan}
                          className={`flex-1 h-full text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelectedPlan
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                              : 'bg-transparent text-black/50 dark:text-white/50 border-black/20 dark:border-white/20 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelectedPlan ? 'bg-blue-500' : 'bg-transparent'}`} />
                          <span>PLAN (계획)</span>
                        </button>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Status Badge (상태 뱃지)
                      </label>
                      <select
                        value={editStatusBadge}
                        onChange={e => setEditStatusBadge(e.target.value as any)}
                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white cursor-pointer h-[35px]"
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
                                <video src={getEffectiveImageUrl(editVideoUrl)} controls muted playsInline preload="metadata" className="w-full h-full object-cover" />
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
                                      const inspection = await inspectAndPrepareVideo(file);
                                      if (!inspection.isCompatible) {
                                        alert("경고: 선택하신 동영상은 모바일(아이폰)에서 지원되지 않는 비표준 코덱(VP9/AV1/ProRes 등)을 포함하고 있습니다. 모바일 정상 재생을 위해 표준 H.264 MP4 형식의 영상을 권장합니다.");
                                      }
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
                                    const inspection = await inspectAndPrepareVideo(file);
                                    if (!inspection.isCompatible) {
                                      alert("경고: 선택하신 동영상은 모바일(아이폰)에서 지원되지 않는 비표준 코덱(VP9/AV1/ProRes 등)을 포함하고 있습니다. 모바일 정상 재생을 위해 표준 H.264 MP4 형식의 영상을 권장합니다.");
                                    }
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
                                <video src={getEffectiveImageUrl(editHeroVideoUrl)} controls muted playsInline preload="metadata" className="w-full h-full object-cover" />
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
                        onClick={async () => {
                          if (isSelectedPlan) {
                            await onMoveToArchive(selectedJourney as Plan);
                            setEditTags(prev => prev.filter(t => t !== 'Plan' && t !== 'Archived'));
                            setEditTitle(prev => prev.replace(/\s*\(Plan\)$/i, '').trim());
                          } else {
                            await onMoveToPlans(selectedJourney);
                            setEditTags(prev => {
                              const next = prev.filter(t => t !== 'Archived');
                              return next.includes('Plan') ? next : [...next, 'Plan'];
                            });
                            setEditTitle(prev => prev.endsWith(' (Plan)') ? prev : `${prev} (Plan)`);
                          }
                        }}
                        className="px-3 py-2 border border-black/20 dark:border-white/20 text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>{isSelectedPlan ? 'LOG(여정)로 전환' : 'PLAN(계획)으로 전환'}</span>
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
                        if (selectedJourneyId !== journey.id && isArchiveDirty) {
                          setPendingJourneyId(journey.id);
                          setShowUnsavedModal(true);
                        } else {
                          setSelectedJourneyId(journey.id);
                          setMobileArchiveTab('EDIT');
                        }
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
        {/* MODE: MAGAZINE (Sections, Hero, Layout & Moments Management)        */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'MAGAZINE' && (
          <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-60px)] animate-in fade-in duration-200">
            
            {/* Top Bar with Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/15 dark:border-white/15 pb-4">
              <div>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                  EDITORIAL MAGAZINE CURATION
                </span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                  매거진 섹션 및 에디토리얼 관리
                </h2>
                <p className="text-xs text-black/60 dark:text-white/60 mt-0.5">
                  기본 홈 매거진 및 여정별·테마별 섹션을 추가하고 잡지 스타일의 리듬감 있는 레이아웃을 구성합니다.
                </p>
              </div>
            </div>

            {/* 1. Section Selector & Manager Bar */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                  MAGAZINE SECTIONS ({sectionsList.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(true)}
                  className="px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ ADD NEW SECTION</span>
                </button>
              </div>

              {/* Sections Tab Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-black/10 dark:border-white/10">
                {sectionsList.map((sec, idx) => {
                  const isActive = sec.id === activeMagSectionId;
                  return (
                    <div
                      key={sec.id}
                      className={`group flex items-center border transition-all ${
                        isActive 
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs' 
                          : 'bg-white dark:bg-[#181818] text-black/70 dark:text-white/70 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveMagSectionId(sec.id)}
                        className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                      >
                        <span>{sec.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 ${isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-black/10 dark:bg-white/10'}`}>
                          {sec.items?.length || 0}
                        </span>
                      </button>

                      {/* Active Section Quick Actions (Reorder & Delete) */}
                      {isActive && (
                        <div className="flex items-center border-l border-white/20 dark:border-black/20 pr-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSection(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 hover:bg-white/20 dark:hover:bg-black/20 disabled:opacity-20 cursor-pointer"
                            title="섹션 앞으로 이동"
                          >
                            <ChevronUp className="w-3 h-3 -rotate-90" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSection(idx, 'down')}
                            disabled={idx === sectionsList.length - 1}
                            className="p-1 hover:bg-white/20 dark:hover:bg-black/20 disabled:opacity-20 cursor-pointer"
                            title="섹션 뒤로 이동"
                          >
                            <ChevronDown className="w-3 h-3 -rotate-90" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id)}
                            disabled={sectionsList.length <= 1}
                            className="p-1 text-red-400 hover:bg-red-500/20 disabled:opacity-20 cursor-pointer"
                            title={sectionsList.length <= 1 ? "최소 1개의 섹션은 유지되어야 합니다" : "섹션 삭제"}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Active Section Settings & Hero Configuration */}
            {currentMagSection && (
              <div className="flex flex-col gap-6 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 p-4 sm:p-6">
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-red-600 dark:text-red-500" />
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                      SECTION & HERO SETTINGS: [{currentMagSection.title}]
                    </h3>
                  </div>
                  {currentMagSection.isDefault && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black uppercase">
                      DEFAULT MAIN
                    </span>
                  )}
                </div>

                {/* Hero Live Preview (실제 비율로 시원하게 라이브 로딩) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                      HERO LIVE PREVIEW (히어로 실제 비율 미리보기)
                    </span>
                    <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                      * 하단 큐레이팅 사진에서 [★ SET AS HERO]를 클릭하면 즉시 반영됩니다.
                    </span>
                  </div>

                  <div className="w-full h-52 sm:h-64 md:h-72 relative overflow-hidden bg-black/10 dark:bg-white/5 border border-black/15 dark:border-white/15 group">
                    {currentMagSection.heroImg ? (
                      <>
                        <img
                          src={getEffectiveImageUrl(currentMagSection.heroImg)}
                          alt={currentMagSection.heroTitle || 'Hero'}
                          className="w-full h-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 p-5 sm:p-8 flex flex-col justify-between text-white pointer-events-none">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-black/60 backdrop-blur-xs border border-white/20">
                              HERO PREVIEW
                            </span>
                            {currentMagSection.heroLocation && (
                              <span className="text-[11px] font-mono tracking-widest uppercase text-white/80">
                                {currentMagSection.heroLocation}
                              </span>
                            )}
                          </div>
                          <div>
                            {currentMagSection.heroDate && (
                              <span className="text-[11px] font-mono uppercase tracking-widest text-white/70 block mb-1">
                                {currentMagSection.heroDate}
                              </span>
                            )}
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-black uppercase tracking-tight text-white drop-shadow-md line-clamp-2">
                              {currentMagSection.heroTitle || 'SECTION HERO TITLE'}
                            </h2>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6 text-black/40 dark:text-white/40">
                        <Sparkles className="w-6 h-6 opacity-40" />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider">
                          히어로 이미지가 지정되지 않았습니다.
                        </span>
                        <span className="text-[11px] font-mono">
                          하단 큐레이팅된 사진 목록에서 [★ SET AS HERO] 버튼을 눌러 지정해주세요.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simplified Section Settings Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-black/10 dark:border-white/10">
                  {/* Section Title */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                      SECTION TITLE (섹션 이름)
                    </label>
                    <input
                      type="text"
                      value={currentMagSection.title || ''}
                      onChange={e => handleUpdateSectionField(currentMagSection.id, 'title', e.target.value)}
                      placeholder="e.g. TOKYO VIBES, JEJU ISLAND"
                      className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none uppercase text-black dark:text-white"
                    />
                  </div>

                  {/* Hero Big Title */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                      HERO BIG TITLE (히어로 대형 타이틀)
                    </label>
                    <input
                      type="text"
                      value={currentMagSection.heroTitle || ''}
                      onChange={e => handleUpdateSectionField(currentMagSection.id, 'heroTitle', e.target.value)}
                      placeholder="e.g. The Other Side of Paradise"
                      className="px-3 py-2 text-xs font-serif font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                    />
                  </div>

                  {/* Linked Trip */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                      LINKED JOURNEY (연계 여정 상세 연결)
                    </label>
                    <select
                      value={currentMagSection.heroTripId || ''}
                      onChange={e => handleUpdateSectionField(currentMagSection.id, 'heroTripId', e.target.value ? Number(e.target.value) : undefined)}
                      className="px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                    >
                      <option value="">-- NO LINKED JOURNEY --</option>
                      {localJourneys.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Current Section Moments & Editorial Cards Manager */}
            {currentMagSection && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 text-black/70 dark:text-white/70" />
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                      CURATED MOMENTS & EDITORIAL CARDS ({currentMagSection.items?.length || 0})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddTextCardToCurrentSection}
                      className="px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ADD TEXT CARD</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Visual Cards Grid (Synchronized with 3-Column / 2-Column Magazine Rules) */}
                {(() => {
                  const rawItems = currentMagSection.items || [];
                  if (rawItems.length === 0) {
                    return (
                      <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-xs font-mono text-black/40 dark:text-white/40 border border-dashed border-black/20 dark:border-white/20 p-8">
                        <Layout className="w-6 h-6 opacity-30" />
                        <span>현재 섹션에 등록된 카드가 없습니다.</span>
                        <span>아래 타임라인 사진에서 '+ ADD'를 누르거나 상단의 '+ ADD TEXT CARD'를 클릭해주세요.</span>
                      </div>
                    );
                  }

                  // Live sync items with timelineData
                  const timelineByUrl = new Map<string, TimelineItem>();
                  if (timelineData) {
                    Object.values(timelineData).forEach(tItems => {
                      if (Array.isArray(tItems)) {
                        tItems.forEach(t => {
                          if (t.img) {
                            timelineByUrl.set(t.img, t);
                            const eff = getEffectiveImageUrl(t.img);
                            if (eff) timelineByUrl.set(eff, t);
                          }
                          const gImages = (t as any).galleryImages;
                          if (Array.isArray(gImages)) {
                            gImages.forEach((g: any) => {
                              const gUrl = typeof g === 'string' ? g : g?.url;
                              if (gUrl) {
                                timelineByUrl.set(gUrl, {
                                  ...t,
                                  place: (typeof g !== 'string' && g?.place) || t.place,
                                  location: (typeof g !== 'string' && g?.location) || t.location,
                                  imgNote: (typeof g !== 'string' && g?.imgNote) || t.imgNote,
                                  date: (typeof g !== 'string' && g?.date) || t.date,
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }

                  const items = rawItems.map(item => {
                    if (item.isTextOnly || !item.img) return item;
                    const matched = timelineByUrl.get(item.img) || timelineByUrl.get(getEffectiveImageUrl(item.img));
                    const parentTrip = trips.find(t => t.id === (matched?.tripId || item.tripId));
                    if (matched) {
                      const pName = matched.place?.trim() || '';
                      const jTitle = parentTrip?.title?.replace(/\s*\(Plan\)$/i, '') || '';
                      const resolvedLocation = resolveTimelineItemLocation(matched, timelineData, parentTrip);
                      return {
                        ...item,
                        tripId: matched.tripId || item.tripId,
                        title: pName || jTitle || item.title || 'UNTITLED MOMENT',
                        placeName: resolvedLocation,
                        location: resolvedLocation,
                        date: matched.date || item.date,
                        caption: matched.imgNote || matched.memo || item.caption,
                      };
                    } else {
                      const resolvedLocation = resolveTimelineItemLocation(null, timelineData, parentTrip);
                      return {
                        ...item,
                        placeName: item.placeName || resolvedLocation,
                        location: item.location || resolvedLocation,
                      };
                    }
                  });

                  const isLand = (item: MagazineItem) =>
                    item.layoutType === 'landscape' || item.layoutType === 'wide' || item.layoutType === 'large';

                  type MagRow = 
                    | { type: 'PPP'; items: [MagazineItem, MagazineItem, MagazineItem] }
                    | { type: 'PL'; items: [MagazineItem, MagazineItem] }
                    | { type: 'LP'; items: [MagazineItem, MagazineItem] }
                    | { type: 'LL'; items: [MagazineItem, MagazineItem] }
                    | { type: 'SINGLE_LANDSCAPE'; items: [MagazineItem] }
                    | { type: 'PP'; items: [MagazineItem, MagazineItem] }
                    | { type: 'SINGLE_PORTRAIT'; items: [MagazineItem] };

                  const rows: MagRow[] = [];
                  let i = 0;
                  while (i < items.length) {
                    const cur = items[i];
                    const next1 = items[i + 1];
                    const next2 = items[i + 2];

                    if (isLand(cur)) {
                      if (next1 && !isLand(next1)) {
                        rows.push({ type: 'LP', items: [cur, next1] });
                        i += 2;
                      } else if (next1 && isLand(next1)) {
                        rows.push({ type: 'LL', items: [cur, next1] });
                        i += 2;
                      } else {
                        rows.push({ type: 'SINGLE_LANDSCAPE', items: [cur] });
                        i += 1;
                      }
                    } else {
                      if (next1 && isLand(next1)) {
                        rows.push({ type: 'PL', items: [cur, next1] });
                        i += 2;
                      } else if (next1 && !isLand(next1) && next2 && !isLand(next2)) {
                        rows.push({ type: 'PPP', items: [cur, next1, next2] });
                        i += 3;
                      } else if (next1 && !isLand(next1)) {
                        rows.push({ type: 'PP', items: [cur, next1] });
                        i += 2;
                      } else {
                        rows.push({ type: 'SINGLE_PORTRAIT', items: [cur] });
                        i += 1;
                      }
                    }
                  }

                    const renderAdminCuratedCard = (
                      item: MagazineItem,
                      options: { spanClass?: string; isMatchedHeight?: boolean } = {}
                    ) => {
                      const idx = items.findIndex(x => x.id === item.id);
                      const isItemHero = currentMagSection.heroImg === item.img;
                      const isLandscape = isLand(item);
                      const isTextCard = item.isTextOnly || !item.img;
                      const isCardSelected = selectedMagCardId === item.id;

                      let aspectClass = 'aspect-[3/4] w-full';
                      if (options.isMatchedHeight) {
                        // In a 3-col combined row (PL or LP), aspect-[16/10] (1.6:1) perfectly aligns horizontal height with portrait (3:4) sibling
                        aspectClass = 'aspect-[16/10] w-full';
                      } else if (isLandscape) {
                        aspectClass = 'aspect-[16/10] w-full';
                      }

                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => setSelectedMagCardId(prev => prev === item.id ? null : item.id)}
                          className={`flex flex-col gap-3 p-4 bg-white dark:bg-[#161616] border transition-all shadow-xs h-full cursor-pointer select-none ${options.spanClass || ''} ${
                            isCardSelected
                              ? 'border-black dark:border-white ring-2 ring-black dark:ring-white shadow-md bg-black/[0.02] dark:bg-white/[0.04]'
                              : isItemHero 
                                ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' 
                                : 'border-black/15 dark:border-white/15 hover:border-black/60 dark:hover:border-white/60'
                          }`}
                        >
                          {/* Card Controls Top Bar */}
                          <div 
                            className="flex items-center justify-between gap-2 pb-1 border-b border-black/10 dark:border-white/10"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-mono font-bold uppercase text-black/40 dark:text-white/40 mr-1">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemInCurrentSection(item.id, 'layoutType', isLandscape ? 'portrait' : 'landscape')}
                                className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                                title="가로형/세로형 비율 전환"
                              >
                                {isLandscape ? '가로형 ⟳' : '세로형 ⟳'}
                              </button>
                              {isCardSelected && (
                                <span className="px-1.5 py-0.5 text-[9px] font-mono font-black uppercase bg-black text-white dark:bg-white dark:text-black tracking-wider animate-in fade-in">
                                  SELECTED
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {!isTextCard && (
                                <button
                                  type="button"
                                  onClick={() => handleSetAsHeroFromItem(item)}
                                  className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer border ${
                                    isItemHero
                                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                      : 'border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                                  }`}
                                  title="섹션 히어로로 지정"
                                >
                                  {isItemHero ? '★ HERO' : 'SET HERO'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleMoveItemInCurrentSection(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                                title="앞으로 이동"
                              >
                                <ChevronUp className="w-3 h-3 -rotate-90" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveItemInCurrentSection(idx, 'down')}
                                disabled={idx === items.length - 1}
                                className="p-1 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                                title="뒤로 이동"
                              >
                                <ChevronDown className="w-3 h-3 -rotate-90" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedMagCardId === item.id) setSelectedMagCardId(null);
                                  handleRemoveItemFromCurrentSection(item.id);
                                }}
                                className="p-1 text-red-500 hover:bg-red-500/10 border border-red-500/30 cursor-pointer"
                                title="카드 삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Visual Card Frame: Real-time Aspect Ratio Preview */}
                          {isTextCard ? (
                            <div
                              onClick={e => e.stopPropagation()}
                              className={`w-full ${aspectClass} bg-transparent text-black dark:text-white p-4 sm:p-5 flex flex-col justify-between border border-black/15 dark:border-white/15 relative group transition-all my-auto`}
                            >
                              <div className="flex items-center justify-between pb-1 border-b border-black/10 dark:border-white/10">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                                  EDITORIAL TEXT CARD
                                </span>
                                <span className="text-[9px] font-mono uppercase text-black/40 dark:text-white/40">
                                  INTER BOLD
                                </span>
                              </div>
                              <textarea
                                value={item.textContent || ''}
                                onChange={e => handleUpdateItemInCurrentSection(item.id, 'textContent', e.target.value)}
                                placeholder="매거진 본문 텍스트를 입력하세요..."
                                className="w-full h-full my-2 bg-transparent text-black dark:text-white font-['Inter',sans-serif] font-bold text-sm sm:text-base md:text-lg leading-snug tracking-tight outline-none resize-none border-0 placeholder:text-black/30 dark:placeholder:text-white/30"
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-full ${aspectClass} overflow-hidden bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 relative group transition-all`}
                            >
                              <img
                                src={getEffectiveImageUrl(item.img)}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                              {isItemHero && (
                                <div className="absolute top-2 left-2 bg-black text-white dark:bg-white dark:text-black text-[9px] font-mono font-bold px-1.5 py-0.5 shadow-sm">
                                  HERO SELECTED ★
                                </div>
                              )}
                            </div>
                          )}

                          {/* Synced Read-only Info (Title, Place, Date) - Only for Photo Cards */}
                          {!isTextCard && (
                            <div 
                              className="flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/10 font-['Inter',sans-serif] mt-auto"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                                  TITLE · 타임라인 동기화
                                </span>
                                <div className="text-xs sm:text-sm font-bold font-['Inter',sans-serif] text-black dark:text-white truncate" title={item.title}>
                                  {item.title || 'UNTITLED MOMENT'}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                                    PLACE · 자동 매핑
                                  </span>
                                  <div className="text-xs sm:text-sm font-bold font-['Inter',sans-serif] text-black dark:text-white truncate" title={item.placeName || item.location}>
                                    {item.placeName || item.location || 'VISITED PLACE'}
                                  </div>
                                </div>
                                {item.date && (
                                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                                      DATE
                                    </span>
                                    <div className="text-[11px] sm:text-xs font-mono font-bold text-black/60 dark:text-white/60">
                                      {item.date}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    };

                  return (
                    <div className="flex flex-col gap-6 sm:gap-8">
                      {rows.map((row, rowIdx) => {
                        if (row.type === 'PPP') {
                          return (
                            <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                              {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                              {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-1' })}
                              {renderAdminCuratedCard(row.items[2], { spanClass: 'md:col-span-1' })}
                            </div>
                          );
                        }
                        if (row.type === 'PL') {
                          return (
                            <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                              {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                              {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-2', isMatchedHeight: true })}
                            </div>
                          );
                        }
                        if (row.type === 'LP') {
                          return (
                            <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                              {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-2', isMatchedHeight: true })}
                              {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-1' })}
                            </div>
                          );
                        }
                        if (row.type === 'LL') {
                          return (
                            <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
                              {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                              {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-1' })}
                            </div>
                          );
                        }
                        if (row.type === 'SINGLE_LANDSCAPE') {
                          return (
                            <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
                              {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                            </div>
                          );
                        }
                        if (row.type === 'PP') {
                          return (
                            <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                              {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                              {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-1' })}
                            </div>
                          );
                        }
                        if (row.type === 'SINGLE_PORTRAIT') {
                          return (
                            <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                              {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 4. Timeline Photos Selection Tool (여정 사진 탐색 및 즉시 추가) */}
            <div className="flex flex-col gap-3 pt-4 border-t border-black/15 dark:border-white/15">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                  + ADD PHOTOS FROM TIMELINE TO [{currentMagSection?.title}]
                </span>
                <span className="text-[11px] font-mono text-black/50 dark:text-white/50">
                  사진을 클릭하면 현재 선택된 섹션에 자동 추가됩니다.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Filter by Journey */}
                <select
                  value={selectedTripForMoments === null ? '' : selectedTripForMoments}
                  onChange={e => setSelectedTripForMoments(e.target.value === '' ? null : Number(e.target.value))}
                  className="px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                >
                  <option value="">-- SELECT JOURNEY TO LOAD PHOTOS --</option>
                  {localJourneys.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country})
                    </option>
                  ))}
                </select>

                {/* Search Keyword */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                  <input
                    type="text"
                    value={momentSearchQuery}
                    onChange={e => setMomentSearchQuery(e.target.value)}
                    placeholder="Search place, memo, location..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Photo Candidates Grid */}
              <div className="mt-2">
                {candidateTimelineItems.length === 0 ? (
                  selectedTripForMoments === null && !momentSearchQuery.trim() ? (
                    <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02]">
                      <ImageIcon className="w-6 h-6 text-black/30 dark:text-white/30" />
                      <span className="text-xs font-mono font-black text-black/70 dark:text-white/70 tracking-wider uppercase">
                        SELECT A JOURNEY TO VIEW CANDIDATE PHOTOS
                      </span>
                      <span className="text-[11px] text-black/40 dark:text-white/40 max-w-sm leading-relaxed">
                        위 드롭다운에서 여행을 선택하시거나 검색어를 입력하시면 사진들이 즉시 로드됩니다.
                      </span>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs font-mono text-black/40 dark:text-white/40 border border-black/10 dark:border-white/10">
                      NO PHOTOS FOUND FOR THIS SELECTION
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[480px] overflow-y-auto p-1 border border-black/15 dark:border-white/15">
                    {candidateTimelineItems.map((item, i) => {
                      const pName = safeStr(item.place);
                      const jTitle = safeStr(item.journeyTitle);
                      const displayTitle = pName || jTitle || 'MOMENT';
                      const itemDate = safeStr(item.date);
                      return (
                        <div
                          key={`mag-cand-${item.id || i}-${i}`}
                          onClick={() => handleAddItemToCurrentSection(item)}
                          className="group relative h-32 sm:h-36 bg-white dark:bg-[#121212] border border-black/15 dark:border-white/15 overflow-hidden cursor-pointer flex flex-col justify-end transition-all select-none active:scale-95"
                          title={`${displayTitle} (${itemDate}) - 클릭하여 추가`}
                        >
                          <img
                            src={getEffectiveImageUrl(item.img || '')}
                            alt={displayTitle}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-mono text-xs font-black p-2 text-center z-10">
                            + ADD TO {currentMagSection?.title}
                          </div>

                          <div className="relative z-10 w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 pt-3 flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-white truncate leading-tight">
                              {displayTitle}
                            </span>
                            {itemDate && (
                              <span className="text-[9px] font-mono text-white/70 truncate">
                                {itemDate}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Save Button */}
            <div className="pt-6 border-t border-black/20 dark:border-white/20 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveMagazine()}
                disabled={isSavingMagazine}
                className={`px-8 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity shadow-md ${
                  magazineSaveSuccess ? '!bg-green-600 !text-white' : ''
                }`}
              >
                {magazineSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{magazineSaveSuccess ? 'SAVED' : 'SAVE MAGAZINE SETTINGS'}</span>
              </button>
            </div>

            {/* Modal: Add New Section */}
            {showAddSectionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                <div className="w-full max-w-md bg-white dark:bg-[#161616] border border-black dark:border-white p-6 shadow-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                      ADD NEW MAGAZINE SECTION
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddSectionModal(false)}
                      className="p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                        SECTION TITLE (예: TOKYO, FUKUOKA, JEJU)
                      </label>
                      <input
                        type="text"
                        value={newSectionTitle}
                        onChange={e => setNewSectionTitle(e.target.value)}
                        placeholder="e.g. TOKYO VIBES"
                        autoFocus
                        className="px-3 py-2 text-xs font-bold uppercase bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                        SUBTITLE / MEMO (부제목)
                      </label>
                      <input
                        type="text"
                        value={newSectionSubtitle}
                        onChange={e => setNewSectionSubtitle(e.target.value)}
                        placeholder="e.g. City lights, quiet alleys, coffee"
                        className="px-3 py-2 text-xs bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAddSectionModal(false)}
                      className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="px-5 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-85"
                    >
                      CREATE SECTION
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                    onClick={() => {
                      setMapTileStyle('esri');
                      localStorage.setItem('mapTileStyle', 'esri');
                      window.dispatchEvent(new CustomEvent('mapTileStyleChanged', { detail: 'esri' }));
                    }}
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
                    onClick={() => {
                      setMapTileStyle('google');
                      localStorage.setItem('mapTileStyle', 'google');
                      window.dispatchEvent(new CustomEvent('mapTileStyleChanged', { detail: 'google' }));
                    }}
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
            else if (activeMode === 'MAGAZINE') handleSaveMagazine();
          }}
          disabled={activeMode === 'HOME' ? isSavingHome : (activeMode === 'ARCHIVE' ? isSavingTrip : (activeMode === 'MAGAZINE' ? isSavingMagazine : false))}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer border ${
            (homeSaveSuccess || tripSaveSuccess || magazineSaveSuccess)
              ? 'bg-green-600 text-white border-green-600 scale-105'
              : 'bg-black text-white dark:bg-white dark:text-black border-white/20 dark:border-black/20 hover:scale-110 active:scale-95'
          }`}
          title="변경사항 저장 (단축키: Ctrl + S)"
        >
          {(homeSaveSuccess || tripSaveSuccess || magazineSaveSuccess) ? (
            <Check className="w-5 h-5 animate-in zoom-in" />
          ) : (
            <Save className="w-5 h-5" />
          )}
        </button>

        {/* Floating View Mode Button (Eye icon) */}
        <button
          type="button"
          onClick={() => {
            onNavigate(getReturnView());
          }}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl bg-white dark:bg-[#1a1a1a] text-black dark:text-white border border-black/15 dark:border-white/15 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          title="뷰 모드로 이동"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* 4. Common Minimal Unsaved Changes Modal */}
      <ConfirmModal
        isOpen={showUnsavedModal && pendingJourneyId !== null}
        title="UNSAVED CHANGES"
        message="Are you sure?"
        confirmLabel="SAVE (Y)"
        discardLabel="DISCARD (N)"
        cancelLabel="SKIP (ESC)"
        onConfirm={async () => {
          if (pendingJourneyId !== null) {
            await handleSaveJourney();
            setSelectedJourneyId(pendingJourneyId);
            setPendingJourneyId(null);
            setMobileArchiveTab('EDIT');
            setShowSaveSuccessModal(true);
          }
          setShowUnsavedModal(false);
        }}
        onDiscard={() => {
          if (pendingJourneyId !== null) {
            setSelectedJourneyId(pendingJourneyId);
            setPendingJourneyId(null);
            setMobileArchiveTab('EDIT');
          }
          setShowUnsavedModal(false);
        }}
        onCancel={() => {
          setPendingJourneyId(null);
          setShowUnsavedModal(false);
        }}
      />

      {/* Save Success Auto-Dismiss Modal */}
      <ConfirmModal
        isOpen={showSaveSuccessModal}
        title="SAVED"
        message="All changes have been successfully saved."
        confirmLabel="OK"
        iconType="check"
        singleButton
        autoDismiss
        autoDismissDuration={2000}
        onConfirm={() => setShowSaveSuccessModal(false)}
        onCancel={() => setShowSaveSuccessModal(false)}
      />
    </main>
  );
}
