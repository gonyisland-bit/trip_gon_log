import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Save, 
  Trash2, 
  RotateCcw,
  RotateCw,
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
  Layout,
  ShieldCheck,
  HardDrive,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Server,
  Terminal
} from 'lucide-react';
import { collection, getDocs, doc, getDoc, deleteDoc, updateDoc, deleteField, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Plan, MagazineMoment, MagazineSection, MagazineItem, MagazineHubConfig, ArchiveHubConfig, TimelineData, TimelineItem, TrashedMagazineSection } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { getEffectiveImageUrl, uploadFileToR2, deleteFileFromR2 } from '../utils/storageHelper';
import { compressImage } from '../utils/imageHelper';
import { inspectAndPrepareVideo } from '../utils/videoHelper';
import { cleanAdministrativeDistricts, resolveTimelineItemLocation } from '../components/SummaryView';
import { resolveTimelinePlaceName, buildDefaultMagazineSections } from '../utils/magazineHelper';

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
  homeMagazineSectionId?: string;
  homeMagazineLimit?: number;
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
    gradientToParam?: string,
    homeMagazineSectionIdParam?: string,
    homeMagazineLimitParam?: number
  ) => Promise<void>;
  // Magazine Highlights & Sections
  magazineMoments?: MagazineMoment[];
  magazineSections?: MagazineSection[];
  magazineHubConfig?: MagazineHubConfig;
  onSaveMagazineHubConfig?: (config: MagazineHubConfig) => Promise<void>;
  archiveHubConfig?: ArchiveHubConfig;
  onSaveArchiveHubConfig?: (config: ArchiveHubConfig) => Promise<void>;
  timelineData?: TimelineData;
  onSaveMagazineMoments?: (moments: MagazineMoment[]) => Promise<void>;
  onSaveMagazineSections?: (sections: MagazineSection[]) => Promise<void>;
  // Trash bin
  trashedJourneys: Trip[];
  trashedSections?: TrashedMagazineSection[];
  onRestoreJourney: (id: number) => Promise<void>;
  onPermanentDeleteJourney: (id: number) => Promise<void>;
  onDeleteMagazineSection?: (sectionId: string) => Promise<void>;
  onRestoreMagazineSection?: (sectionId: string) => Promise<void>;
  onPermanentDeleteMagazineSection?: (sectionId: string) => Promise<void>;
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
  homeMagazineSectionId = 'main',
  homeMagazineLimit = 6,
  onSaveAllHomeSettings,
  trashedJourneys,
  trashedSections = [],
  onRestoreJourney,
  onPermanentDeleteJourney,
  onDeleteMagazineSection,
  onRestoreMagazineSection,
  onPermanentDeleteMagazineSection,
  isLoggedIn,
  isDarkMode,
  magazineMoments = [],
  magazineSections = [],
  magazineHubConfig,
  onSaveMagazineHubConfig,
  archiveHubConfig,
  onSaveArchiveHubConfig,
  timelineData = {},
  onSaveMagazineMoments,
  onSaveMagazineSections,
  onDirtyChange,
  saveRef,
}: ManageHubPageProps) {
  // Magazine Hub Header Configuration State
  const [hubMainTitle, setHubMainTitle] = useState(magazineHubConfig?.mainTitle || 'A VISUAL ARCHIVE OF JOURNEYS, CURATED STORIES & MOMENTS');
  const [hubSubtitle, setHubSubtitle] = useState(magazineHubConfig?.subtitle || '여행의 찬란한 순간과 에피소드를 엄선하여 잡지 형식으로 기록한 매거진 컬렉션입니다. 이슈를 선택하여 전체 화보와 이야기를 감상하세요.');
  const [hubBadgeText, setHubBadgeText] = useState(magazineHubConfig?.badgeText || 'CURATED ARCHIVE');
  const [hubVolumeText, setHubVolumeText] = useState(magazineHubConfig?.volumeText || `VOL. ${new Date().getFullYear()}`);
  const [isHubHeaderOpen, setIsHubHeaderOpen] = useState(false);
  const [isSavingHubHeader, setIsSavingHubHeader] = useState(false);
  const [hubHeaderSaveSuccess, setHubHeaderSaveSuccess] = useState(false);

  useEffect(() => {
    if (magazineHubConfig) {
      if (magazineHubConfig.mainTitle !== undefined) setHubMainTitle(magazineHubConfig.mainTitle);
      if (magazineHubConfig.subtitle !== undefined) setHubSubtitle(magazineHubConfig.subtitle);
      if (magazineHubConfig.badgeText !== undefined) setHubBadgeText(magazineHubConfig.badgeText);
      if (magazineHubConfig.volumeText !== undefined) setHubVolumeText(magazineHubConfig.volumeText);
    }
  }, [magazineHubConfig]);

  const handleSaveHubHeader = async () => {
    if (!onSaveMagazineHubConfig) return;
    setIsSavingHubHeader(true);
    try {
      await onSaveMagazineHubConfig({
        mainTitle: hubMainTitle,
        subtitle: hubSubtitle,
        badgeText: hubBadgeText,
        volumeText: hubVolumeText,
      });
      setHubHeaderSaveSuccess(true);
      setTimeout(() => setHubHeaderSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingHubHeader(false);
    }
  };

  // Archive (Trip) Hub Header Configuration State
  const [archiveHubMainTitle, setArchiveHubMainTitle] = useState(archiveHubConfig?.mainTitle || 'A VISUAL CHRONICLE OF JOURNEYS & TRAVEL ARCHIVES');
  const [archiveHubSubtitle, setArchiveHubSubtitle] = useState(archiveHubConfig?.subtitle || '발걸음이 닿았던 모든 도시와 찬란했던 시간의 기록. 엄선된 사진과 함께 지난 여정들을 다시 마주합니다.');
  const [archiveHubBadgeText, setArchiveHubBadgeText] = useState(archiveHubConfig?.badgeText || 'JOURNEY ARCHIVE');
  const [archiveHubVolumeText, setArchiveHubVolumeText] = useState(archiveHubConfig?.volumeText || `VOL. ${new Date().getFullYear()}`);
  const [isArchiveHubHeaderOpen, setIsArchiveHubHeaderOpen] = useState(false);
  const [isSavingArchiveHubHeader, setIsSavingArchiveHubHeader] = useState(false);
  const [archiveHubHeaderSaveSuccess, setArchiveHubHeaderSaveSuccess] = useState(false);

  useEffect(() => {
    if (archiveHubConfig) {
      if (archiveHubConfig.mainTitle !== undefined) setArchiveHubMainTitle(archiveHubConfig.mainTitle);
      if (archiveHubConfig.subtitle !== undefined) setArchiveHubSubtitle(archiveHubConfig.subtitle);
      if (archiveHubConfig.badgeText !== undefined) setArchiveHubBadgeText(archiveHubConfig.badgeText);
      if (archiveHubConfig.volumeText !== undefined) setArchiveHubVolumeText(archiveHubConfig.volumeText);
    }
  }, [archiveHubConfig]);

  const handleSaveArchiveHubHeader = async () => {
    if (!onSaveArchiveHubConfig) return;
    setIsSavingArchiveHubHeader(true);
    try {
      await onSaveArchiveHubConfig({
        mainTitle: archiveHubMainTitle,
        subtitle: archiveHubSubtitle,
        badgeText: archiveHubBadgeText,
        volumeText: archiveHubVolumeText,
      });
      setArchiveHubHeaderSaveSuccess(true);
      setTimeout(() => setArchiveHubHeaderSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingArchiveHubHeader(false);
    }
  };

  // Top-level mode tabs ordered: 'HOME' | 'ARCHIVE' | 'MAGAZINE' | 'MAP' | 'TRASH' | 'CLEANUP'
  const [activeMode, setActiveMode] = useState<'HOME' | 'ARCHIVE' | 'MAGAZINE' | 'MAP' | 'TRASH' | 'CLEANUP'>(() => {
    const fromSession = sessionStorage.getItem('initialManageTab');
    if (fromSession && ['HOME', 'ARCHIVE', 'MAGAZINE', 'MAP', 'TRASH', 'CLEANUP'].includes(fromSession)) {
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
    return buildDefaultMagazineSections(trips, magazineMoments);
  });

  const [activeMagSectionId, setActiveMagSectionId] = useState<string>(() => {
    const fromSession = sessionStorage.getItem('initialMagazineSectionId') || sessionStorage.getItem('lastMagazineSectionId');
    if (sessionStorage.getItem('initialMagazineSectionId')) {
      sessionStorage.removeItem('initialMagazineSectionId');
    }
    if (fromSession) {
      return fromSession;
    }
    return 'main';
  });

  // Keep lastMagazineSectionId synchronized with active section in manage mode
  useEffect(() => {
    if (activeMagSectionId) {
      sessionStorage.setItem('lastMagazineSectionId', activeMagSectionId);
    }
  }, [activeMagSectionId]);

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
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [selectedTripForAutoGenerate, setSelectedTripForAutoGenerate] = useState<number | null>(null);

  // Magazine Undo / Redo Snapshot Stack (History)
  const [magUndoStack, setMagUndoStack] = useState<MagazineSection[][]>([]);
  const [magRedoStack, setMagRedoStack] = useState<MagazineSection[][]>([]);

  // Firestore magazine sections direct diagnostic state
  const [firestoreMagSections, setFirestoreMagSections] = useState<MagazineSection[] | null>(null);
  const [isLoadingFirestoreMag, setIsLoadingFirestoreMag] = useState(false);
  const [firestoreMagLoadedAt, setFirestoreMagLoadedAt] = useState<string | null>(null);

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

  // Home Magazine Section & Limit state
  const [homeMagSectionId, setHomeMagSectionId] = useState<string>(() => {
    return homeMagazineSectionId || localStorage.getItem('home_magazine_section_id') || 'main';
  });
  const [homeMagLimit, setHomeMagLimit] = useState<number>(() => {
    const saved = localStorage.getItem('home_magazine_limit');
    return saved ? parseInt(saved, 10) : (homeMagazineLimit || 6);
  });

  useEffect(() => {
    if (homeMagazineSectionId) setHomeMagSectionId(homeMagazineSectionId);
  }, [homeMagazineSectionId]);

  useEffect(() => {
    if (homeMagazineLimit) setHomeMagLimit(homeMagazineLimit);
  }, [homeMagazineLimit]);

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

  // ── CLEANUP & OPTIMIZER STATE & HANDLERS ──
  interface DiagnosticReport {
    scannedAt: Date;
    activeTripsCount: number;
    activeTimelineCount: number;
    orphanedTimelineDocs: { id: string; tripId?: any }[];
    orphanedStaysDocs: { id: string; tripId?: any }[];
    orphanedFlightsDocs: { id: string; tripId?: any }[];
    orphanedTransitsDocs: { id: string; tripId?: any }[];
    orphanedMagazineMoments: { sectionId: string; sectionTitle: string; momentId: string; title: string; tripId?: any }[];
    outOfSyncMagazineMoments: { sectionId: string; sectionTitle: string; momentId: string; title: string; reason: string }[];
    deprecatedSubtitleDocs: { collection: string; id: string }[];
    obsoleteStorageKeys: string[];
    isClean: boolean;
  }

  const [diagReport, setDiagReport] = useState<DiagnosticReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanLog, setCleanLog] = useState<string[]>([]);
  const [showCleanSuccessModal, setShowCleanSuccessModal] = useState(false);
  const [cleanupSummary, setCleanupSummary] = useState<{ orphanedDeleted: number; subtitleCleaned: number; cacheCleaned: number; magazineOptimized: number } | null>(null);

  const handleScanCleanup = async () => {
    setIsScanning(true);
    setCleanLog([]);
    const uid = 'public';
    try {
      const validTripIds = new Set<string>();
      trips.forEach(t => validTripIds.add(String(t.id)));
      plans.forEach(p => validTripIds.add(String(p.id)));
      trashedJourneys.forEach(t => validTripIds.add(String(t.id)));

      const [timelineSnap, staysSnap, flightsSnap, transitsSnap, tripsSnap, plansSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'timeline')),
        getDocs(collection(db, 'users', uid, 'stays')),
        getDocs(collection(db, 'users', uid, 'flights')),
        getDocs(collection(db, 'users', uid, 'transits')),
        getDocs(collection(db, 'users', uid, 'trips')),
        getDocs(collection(db, 'users', uid, 'plans'))
      ]);

      const orphanedTimelineDocs: { id: string; tripId?: any }[] = [];
      let activeTimelineCount = 0;
      const deprecatedSubtitleDocs: { collection: string; id: string }[] = [];

      timelineSnap.forEach(d => {
        const data = d.data();
        const tId = String(data.tripId || d.id);
        if (!validTripIds.has(tId)) {
          orphanedTimelineDocs.push({ id: d.id, tripId: data.tripId });
        } else {
          activeTimelineCount++;
        }
        if (data.subtitle !== undefined) {
          deprecatedSubtitleDocs.push({ collection: 'timeline', id: d.id });
        }
      });

      const orphanedStaysDocs: { id: string; tripId?: any }[] = [];
      staysSnap.forEach(d => {
        const data = d.data();
        const tId = String(data.tripId || d.id);
        if (!validTripIds.has(tId)) {
          orphanedStaysDocs.push({ id: d.id, tripId: data.tripId });
        }
        if (data.subtitle !== undefined) {
          deprecatedSubtitleDocs.push({ collection: 'stays', id: d.id });
        }
      });

      const orphanedFlightsDocs: { id: string; tripId?: any }[] = [];
      flightsSnap.forEach(d => {
        const data = d.data();
        const tId = String(data.tripId || d.id);
        if (!validTripIds.has(tId)) {
          orphanedFlightsDocs.push({ id: d.id, tripId: data.tripId });
        }
        if (data.subtitle !== undefined) {
          deprecatedSubtitleDocs.push({ collection: 'flights', id: d.id });
        }
      });

      const orphanedTransitsDocs: { id: string; tripId?: any }[] = [];
      transitsSnap.forEach(d => {
        const data = d.data();
        const tId = String(data.tripId || d.id);
        if (!validTripIds.has(tId)) {
          orphanedTransitsDocs.push({ id: d.id, tripId: data.tripId });
        }
        if (data.subtitle !== undefined) {
          deprecatedSubtitleDocs.push({ collection: 'transits', id: d.id });
        }
      });

      tripsSnap.forEach(d => {
        const data = d.data();
        if (data.subtitle !== undefined) {
          deprecatedSubtitleDocs.push({ collection: 'trips', id: d.id });
        }
      });

      plansSnap.forEach(d => {
        const data = d.data();
        if (data.subtitle !== undefined) {
          deprecatedSubtitleDocs.push({ collection: 'plans', id: d.id });
        }
      });

      // ── Scan Magazine Sections & Moments ──
      const orphanedMagazineMoments: { sectionId: string; sectionTitle: string; momentId: string; title: string; tripId?: any }[] = [];
      const outOfSyncMagazineMoments: { sectionId: string; sectionTitle: string; momentId: string; title: string; reason: string }[] = [];

      // Collect all active timeline items across days
      const allActiveTimelineItems: TimelineItem[] = [];
      Object.values(timelineData || {}).forEach(dayItems => {
        if (Array.isArray(dayItems)) {
          allActiveTimelineItems.push(...dayItems);
        }
      });

      // Also collect gallery items from active journeys to recognize gallery-sourced moments
      const galleryPhotoUrls = new Set<string>();
      localJourneys.forEach(j => {
        if (j.gallery && Array.isArray(j.gallery)) {
          j.gallery.forEach((g: any) => {
            const url = typeof g === 'string' ? g : g?.url;
            if (url) galleryPhotoUrls.add(url);
          });
        }
      });

      sectionsList.forEach(section => {
        (section.items || []).forEach(moment => {
          // 0. Protected cards: text-only cards, editorial quotes, custom cards without tripId are 100% protected
          if (moment.isTextOnly || !moment.tripId) {
            return;
          }

          // 1. Orphaned check: tripId doesn't exist in active trips/plans/trash
          if (moment.tripId !== undefined && moment.tripId !== null && !validTripIds.has(String(moment.tripId))) {
            orphanedMagazineMoments.push({
              sectionId: section.id,
              sectionTitle: section.title,
              momentId: moment.id,
              title: moment.title,
              tripId: moment.tripId
            });
            return;
          }

          // 2. Gallery photos: if photo belongs to active journey's gallery, treat as valid without strict timeline place duplication check
          if (moment.img && galleryPhotoUrls.has(moment.img)) {
            return;
          }

          // 3. Check if moment has matched timeline item whose title/place or image is out of sync
          if (moment.timelineItemId !== undefined) {
            const matchedTimeline = allActiveTimelineItems.find(t => Number(t.id) === Number(moment.timelineItemId));
            if (matchedTimeline) {
              const pTrip = trips.find(t => t.id === matchedTimeline.tripId) || plans.find(p => p.id === matchedTimeline.tripId);
              const expectedTitle = safeStr(matchedTimeline.place) || safeStr(pTrip?.title)?.replace(/\s*\(Plan\)$/i, '') || 'UNTITLED';
              const cleanExpected = expectedTitle.trim().toLowerCase();
              const mTitle = (moment.title || '').trim().toLowerCase();
              
              // Only report if expectedTitle exists, is different from custom title, and timeline image is missing or mismatched
              if (cleanExpected && mTitle && cleanExpected !== mTitle && matchedTimeline.img && moment.img && matchedTimeline.img !== moment.img) {
                outOfSyncMagazineMoments.push({
                  sectionId: section.id,
                  sectionTitle: section.title,
                  momentId: moment.id,
                  title: moment.title,
                  reason: `타임라인 원본 이미지/제목('${matchedTimeline.place}')과 불일치`
                });
              }
            }
          }
        });
      });

      const obsoleteStorageKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('temp_') || key.startsWith('draft_deleted_') || key.startsWith('old_backup_'))) {
          obsoleteStorageKeys.push(key);
        }
      }

      const totalIssues = orphanedTimelineDocs.length + 
        orphanedStaysDocs.length + 
        orphanedFlightsDocs.length + 
        orphanedTransitsDocs.length + 
        orphanedMagazineMoments.length + 
        outOfSyncMagazineMoments.length + 
        deprecatedSubtitleDocs.length + 
        obsoleteStorageKeys.length;

      const report: DiagnosticReport = {
        scannedAt: new Date(),
        activeTripsCount: trips.length + plans.length,
        activeTimelineCount,
        orphanedTimelineDocs,
        orphanedStaysDocs,
        orphanedFlightsDocs,
        orphanedTransitsDocs,
        orphanedMagazineMoments,
        outOfSyncMagazineMoments,
        deprecatedSubtitleDocs,
        obsoleteStorageKeys,
        isClean: totalIssues === 0,
      };

      setDiagReport(report);
    } catch (err: any) {
      console.error('Diagnostic scan error:', err);
      alert(`데이터베이스 진단 스캔 중 오류가 발생했습니다:\n${err?.message || err}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecuteCleanup = async () => {
    if (!diagReport) return;
    if (!confirm('안전 최적화 및 찌꺼기 정리를 실행하시겠습니까?\n\n[안전 보장 원칙]\n- 현재 등록된 모든 활성 여정 및 타임라인 데이터는 100% 안전하게 온전히 보존됩니다.\n- 이미 삭제된 과거 여정의 고아(Orphaned) 문서와 폐기된 subtitle 속성만 선별 정리됩니다.\n- 매거진은 원본 타임라인 데이터를 기준으로 완벽하게 최적화 및 동기화됩니다.')) {
      return;
    }

    setIsCleaning(true);
    const logs: string[] = [];
    let orphanedDeleted = 0;
    let subtitleCleaned = 0;
    let cacheCleaned = 0;
    let magazineOptimized = 0;
    const uid = 'public';

    try {
      // Create safety snapshot before any DB operations
      try {
        localStorage.setItem(`cached_magazine_sections_backup_cleanup_${Date.now()}`, JSON.stringify(sectionsList));
      } catch (_) {}

      logs.push(`[${new Date().toLocaleTimeString()}] 🚀 데이터 최적화 및 클린화 작업 시작...`);

      // 1. Delete orphaned timeline docs
      for (const item of diagReport.orphanedTimelineDocs) {
        await deleteDoc(doc(db, 'users', uid, 'timeline', item.id));
        orphanedDeleted++;
        logs.push(`- [타임라인] 고아 문서 안전 제거 (ID: ${item.id})`);
      }

      // 2. Delete orphaned stays
      for (const item of diagReport.orphanedStaysDocs) {
        await deleteDoc(doc(db, 'users', uid, 'stays', item.id));
        orphanedDeleted++;
        logs.push(`- [숙소] 고아 문서 안전 제거 (ID: ${item.id})`);
      }

      // 3. Delete orphaned flights
      for (const item of diagReport.orphanedFlightsDocs) {
        await deleteDoc(doc(db, 'users', uid, 'flights', item.id));
        orphanedDeleted++;
        logs.push(`- [항공] 고아 문서 안전 제거 (ID: ${item.id})`);
      }

      // 4. Delete orphaned transits
      for (const item of diagReport.orphanedTransitsDocs) {
        await deleteDoc(doc(db, 'users', uid, 'transits', item.id));
        orphanedDeleted++;
        logs.push(`- [교통] 고아 문서 안전 제거 (ID: ${item.id})`);
      }

      // 5. Clean deprecated subtitle field
      for (const item of diagReport.deprecatedSubtitleDocs) {
        try {
          await updateDoc(doc(db, 'users', uid, item.collection, item.id), {
            subtitle: deleteField()
          });
          subtitleCleaned++;
          logs.push(`- [필드 정리] 폐기된 subtitle 속성 제거 (${item.collection}/${item.id})`);
        } catch (e) {
          console.warn(`Could not updateDoc for ${item.collection}/${item.id}`, e);
        }
      }

      // 6. Clear obsolete storage keys
      for (const key of diagReport.obsoleteStorageKeys) {
        localStorage.removeItem(key);
        cacheCleaned++;
        logs.push(`- [로컬 캐시] 폐기된 임시 키 정리: ${key}`);
      }

      // 7. Clean and Optimize Magazine Moments
      if (diagReport.orphanedMagazineMoments.length > 0 || diagReport.outOfSyncMagazineMoments.length > 0) {
        const orphanedMomentIds = new Set(diagReport.orphanedMagazineMoments.map(m => m.momentId));
        
        // Prepare timeline lookup
        const allTripTimelineItems: TimelineItem[] = [];
        Object.values(timelineData || {}).forEach(dayItems => {
          if (Array.isArray(dayItems)) {
            allTripTimelineItems.push(...dayItems);
          }
        });

        let magModified = false;
        const cleanedSections = sectionsList.map(sec => {
          let secChanged = false;
          // Filter out orphaned moments
          const filteredItems = (sec.items || []).filter(item => {
            if (orphanedMomentIds.has(item.id)) {
              secChanged = true;
              orphanedDeleted++;
              logs.push(`- [매거진] 고아 카드 안전 제거: '${item.title}' (섹션: ${sec.title})`);
              return false;
            }
            return true;
          });

          // Optimize out-of-sync moments using timeline as truth
          const optimizedItems = filteredItems.map((item, idx) => {
            let matchedTimeline: TimelineItem | undefined;
            if (item.timelineItemId !== undefined) {
              matchedTimeline = allTripTimelineItems.find(t => Number(t.id) === Number(item.timelineItemId));
            }
            if (!matchedTimeline && item.img) {
              const cleanImg = item.img.split('?')[0];
              matchedTimeline = allTripTimelineItems.find(t => t.img && t.img.split('?')[0] === cleanImg);
            }

            if (matchedTimeline) {
              const parentTrip = trips.find(t => t.id === matchedTimeline?.tripId) || plans.find(p => p.id === matchedTimeline?.tripId);
              const tripItems = allTripTimelineItems.filter(t => t.tripId === matchedTimeline?.tripId);
              const resolvedLoc = resolveTimelinePlaceName(matchedTimeline, tripItems, parentTrip);
              const correctTitle = safeStr(matchedTimeline.place) || safeStr(parentTrip?.title) || item.title;
              const correctDate = safeStr(matchedTimeline.date) || item.date;

              if (
                item.title !== correctTitle ||
                item.placeName !== resolvedLoc ||
                item.timelineItemId !== matchedTimeline.id ||
                item.order !== idx
              ) {
                secChanged = true;
                magazineOptimized++;
                logs.push(`- [매거진 최적화] '${item.title}' -> 제목/장소/시간 동기화 완료: '${correctTitle}' / '${resolvedLoc}'`);
                return {
                  ...item,
                  timelineItemId: matchedTimeline.id,
                  title: correctTitle,
                  placeName: resolvedLoc,
                  date: correctDate,
                  order: idx,
                };
              }
            } else if ((item.placeName || '').trim().toLowerCase() === (item.title || '').trim().toLowerCase()) {
              // Duplicate title/place fix even if no timeline match
              const parentTrip = trips.find(t => t.id === item.tripId);
              const fallbackLoc = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || 'VISITED PLACE';
              secChanged = true;
              magazineOptimized++;
              logs.push(`- [매거진 장소명 최적화] '${item.title}' 중복 장소명을 '${fallbackLoc}'으로 분리`);
              return {
                ...item,
                placeName: fallbackLoc,
                order: idx,
              };
            }

            return { ...item, order: idx };
          });

          if (secChanged) {
            magModified = true;
            return { ...sec, items: optimizedItems };
          }
          return sec;
        });

        if (magModified) {
          setSectionsList(cleanedSections);
          const activeSec = cleanedSections.find(s => s.id === activeMagSectionId) || cleanedSections[0];
          setMomentsList(activeSec?.items || []);
          if (onSaveMagazineSections) {
            await onSaveMagazineSections(cleanedSections);
          }
          logs.push(`- [매거진] 최적화된 매거진 섹션 데이터 Firestore에 안전 영구 반영 완료`);
        }
      }

      logs.push(`[${new Date().toLocaleTimeString()}] ✅ 모든 최적화 및 클린화 작업이 안전하게 완료되었습니다!`);
      setCleanLog(logs);
      setCleanupSummary({ orphanedDeleted, subtitleCleaned, cacheCleaned, magazineOptimized });
      setShowCleanSuccessModal(true);

      // Refresh scan
      await handleScanCleanup();
    } catch (err: any) {
      console.error('Execute cleanup error:', err);
      alert(`정리 작업 중 오류가 발생했습니다:\n${err?.message || err}`);
    } finally {
      setIsCleaning(false);
    }
  };

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
      homeMagSectionId !== (homeMagazineSectionId || 'main') ||
      homeMagLimit !== (homeMagazineLimit || 6) ||
      JSON.stringify(momentsList) !== JSON.stringify(magazineMoments || [])
    );
  }, [title, homeTitle, subtitle, homeSubtitle, selectedHeroIds, heroJourneyIds, autoSlide, heroAutoSlide, slideDuration, heroSlideDuration, mediaType, heroMediaType, showMarquee, marqueeShow, homeMarquee, marqueeMessage, homeSpeed, marqueeSpeed, gradientEnabled, homeGradientEnabled, gradientFrom, homeGradientFrom, gradientTo, homeGradientTo, homeMagSectionId, homeMagazineSectionId, homeMagLimit, homeMagazineLimit, momentsList, magazineMoments]);

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

  // Dirty tracking for Archive & Magazine Hub Headers
  const isArchiveHubHeaderDirty = useMemo(() => {
    if (!archiveHubConfig) return false;
    return (
      archiveHubMainTitle !== (archiveHubConfig.mainTitle || '') ||
      archiveHubSubtitle !== (archiveHubConfig.subtitle || '') ||
      archiveHubBadgeText !== (archiveHubConfig.badgeText || '') ||
      archiveHubVolumeText !== (archiveHubConfig.volumeText || '')
    );
  }, [archiveHubConfig, archiveHubMainTitle, archiveHubSubtitle, archiveHubBadgeText, archiveHubVolumeText]);

  const isMagazineHubHeaderDirty = useMemo(() => {
    if (!magazineHubConfig) return false;
    return (
      hubMainTitle !== (magazineHubConfig.mainTitle || '') ||
      hubSubtitle !== (magazineHubConfig.subtitle || '') ||
      hubBadgeText !== (magazineHubConfig.badgeText || '') ||
      hubVolumeText !== (magazineHubConfig.volumeText || '')
    );
  }, [magazineHubConfig, hubMainTitle, hubSubtitle, hubBadgeText, hubVolumeText]);

  // Unified global dirty state across all management tabs & sub-settings
  const isAnyDirty = isHomeDirty || isArchiveDirty || isMagazineDirty || isArchiveHubHeaderDirty || isMagazineHubHeaderDirty;

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isAnyDirty);
    }
  }, [isAnyDirty, onDirtyChange]);

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
      localStorage.setItem('home_magazine_section_id', homeMagSectionId);
      localStorage.setItem('home_magazine_limit', String(homeMagLimit));
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
        gradientTo,
        homeMagSectionId,
        homeMagLimit
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

  // ── Magazine Undo / Redo Snapshot Helpers ────────────────────────
  const pushMagazineSnapshot = () => {
    setMagUndoStack(prev => {
      const next = [...prev, JSON.parse(JSON.stringify(sectionsList))];
      if (next.length > 30) next.shift(); // keep max 30 levels of history
      return next;
    });
    setMagRedoStack([]); // Clear redo on any new edit
  };

  const handleMagazineUndo = () => {
    if (magUndoStack.length === 0) return;
    const previousSnapshot = magUndoStack[magUndoStack.length - 1];
    const newUndoStack = magUndoStack.slice(0, magUndoStack.length - 1);

    // Push current state to redo stack
    setMagRedoStack(prev => [...prev, JSON.parse(JSON.stringify(sectionsList))]);
    setMagUndoStack(newUndoStack);
    setSectionsList(previousSnapshot);
    if (previousSnapshot.length > 0 && !previousSnapshot.some(s => s.id === activeMagSectionId)) {
      setActiveMagSectionId(previousSnapshot[0].id);
    }
  };

  const handleMagazineRedo = () => {
    if (magRedoStack.length === 0) return;
    const nextSnapshot = magRedoStack[magRedoStack.length - 1];
    const newRedoStack = magRedoStack.slice(0, magRedoStack.length - 1);

    // Push current state to undo stack
    setMagUndoStack(prev => [...prev, JSON.parse(JSON.stringify(sectionsList))]);
    setMagRedoStack(newRedoStack);
    setSectionsList(nextSnapshot);
    if (nextSnapshot.length > 0 && !nextSnapshot.some(s => s.id === activeMagSectionId)) {
      setActiveMagSectionId(nextSnapshot[0].id);
    }
  };

  // Keyboard Shortcuts: Ctrl+S to Save, Ctrl+Z to Undo, Ctrl+Y / Ctrl+Shift+Z to Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl + S / Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (activeMode === 'HOME') handleSaveHome();
        else if (activeMode === 'ARCHIVE') handleSaveJourney();
        else if (activeMode === 'MAGAZINE') handleSaveMagazine();
        return;
      }

      // 2. Magazine Undo: Ctrl + Z / Cmd + Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        if (activeMode === 'MAGAZINE') {
          // If not typing in an active text input or textarea, or allow undoing card operations
          const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
          const isInputFocused = targetTag === 'input' || targetTag === 'textarea';
          if (!isInputFocused) {
            e.preventDefault();
            handleMagazineUndo();
          }
        }
        return;
      }

      // 3. Magazine Redo: Ctrl + Y / Cmd + Y or Ctrl + Shift + Z / Cmd + Shift + Z
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        if (activeMode === 'MAGAZINE') {
          const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
          const isInputFocused = targetTag === 'input' || targetTag === 'textarea';
          if (!isInputFocused) {
            e.preventDefault();
            handleMagazineRedo();
          }
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, isHomeDirty, isArchiveDirty, isMagazineDirty, title, subtitle, selectedHeroIds, autoSlide, showMarquee, homeMarquee, homeSpeed, mediaType, momentsList, slideDuration, gradientEnabled, gradientFrom, gradientTo, selectedJourney, editTitle, editDate, editLocation, editCountry, editTags, editImg, editVideoUrl, editHeroImg, editHeroVideoUrl, editStatusBadge, sectionsList, magUndoStack, magRedoStack]);

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

    // Prevent duplicate addition in current section
    const isDuplicate = momentsList.some(m => 
      (m.timelineItemId !== undefined && m.timelineItemId === item.id) ||
      (m.img && item.img && (m.img === item.img || m.img.split('?')[0] === item.img.split('?')[0]))
    );
    if (isDuplicate) {
      alert("이미 현재 매거진 섹션에 등록된 이미지입니다.");
      return;
    }

    const parentTrip = trips.find(t => t.id === item.tripId);
    const pName = safeStr(item.place);
    const jTitle = safeStr(item.journeyTitle) || parentTrip?.title || '';
    const jLoc = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || safeStr(item.journeyLocation);
    
    // Resolve location using chronological backwards inheritance:
    const allTripTimelineItems: TimelineItem[] = [];
    Object.values(timelineData || {}).forEach(dayItems => {
      if (Array.isArray(dayItems)) {
        dayItems.forEach(t => {
          if (t.tripId === item.tripId) {
            allTripTimelineItems.push(t);
          }
        });
      }
    });
    const locStr = resolveTimelinePlaceName(item, allTripTimelineItems, parentTrip);

    const newMoment: MagazineMoment = {
      id: `moment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tripId: item.tripId,
      timelineItemId: item.id,
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
    pushMagazineSnapshot();
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

  const handleAutoGenerateSectionFromTrip = (tripId: number) => {
    const targetTrip = localJourneys.find(j => Number(j.id) === Number(tripId)) || trips.find(t => Number(t.id) === Number(tripId)) || plans.find(p => Number(p.id) === Number(tripId));
    if (!targetTrip) {
      alert('여정을 찾을 수 없습니다.');
      return;
    }

    pushMagazineSnapshot();

    const tripItems: MagazineItem[] = [];
    const seenImages = new Set<string>();

    // 1. Cover photo
    if (targetTrip.img) {
      seenImages.add(targetTrip.img);
      tripItems.push({
        id: `auto-${targetTrip.id}-cover-${Date.now()}`,
        tripId: targetTrip.id,
        title: targetTrip.title.replace(/\s*\(Plan\)$/i, ''),
        date: targetTrip.date,
        location: targetTrip.locationStr || targetTrip.country,
        placeName: (targetTrip.locations && targetTrip.locations[0]?.name) || targetTrip.locationStr,
        caption: '',
        img: targetTrip.img,
        layoutType: 'portrait',
        order: tripItems.length,
      });
    }

    // 2. Gallery photos
    if (targetTrip.gallery && Array.isArray(targetTrip.gallery)) {
      targetTrip.gallery.forEach((g: any, gIdx) => {
        const url = typeof g === 'string' ? g : g?.url;
        if (url && !seenImages.has(url)) {
          seenImages.add(url);
          const gTitle = (typeof g === 'object' && g?.place) ? g.place : `${targetTrip.title.replace(/\s*\(Plan\)$/i, '')} #${gIdx + 1}`;
          const gDate = (typeof g === 'object' && g?.date) ? g.date : targetTrip.date;
          const gLoc = (typeof g === 'object' && g?.place) ? g.place : targetTrip.locationStr;
          const gMemo = typeof g === 'object' ? g?.imgNote || '' : '';
          tripItems.push({
            id: `auto-${targetTrip.id}-g-${gIdx}-${Date.now()}`,
            tripId: targetTrip.id,
            title: gTitle,
            date: gDate,
            location: targetTrip.locationStr || targetTrip.country,
            placeName: gLoc,
            caption: gMemo,
            img: url,
            layoutType: gIdx % 3 === 0 ? 'portrait' : gIdx % 3 === 1 ? 'landscape' : 'wide',
            order: tripItems.length,
          });
        }
      });
    }

    // 3. Timeline items for this trip
    Object.values(timelineData || {}).forEach(dayItems => {
      if (Array.isArray(dayItems)) {
        dayItems.forEach(tItem => {
          if (Number(tItem.tripId) === Number(targetTrip.id) && tItem.img && !seenImages.has(tItem.img)) {
            seenImages.add(tItem.img);
            const pName = safeStr(tItem.place);
            const jTitle = targetTrip.title.replace(/\s*\(Plan\)$/i, '');
            const displayTitle = pName || jTitle || 'MOMENT';
            const itemDate = safeStr(tItem.date) || targetTrip.date;
            tripItems.push({
              id: `auto-${targetTrip.id}-tl-${tItem.id}-${Date.now()}`,
              tripId: targetTrip.id,
              timelineItemId: tItem.id,
              title: displayTitle,
              date: itemDate,
              placeName: pName || targetTrip.locationStr,
              location: targetTrip.locationStr || targetTrip.country,
              caption: safeStr(tItem.memo),
              img: tItem.img,
              layoutType: tripItems.length % 3 === 0 ? 'portrait' : 'landscape',
              order: tripItems.length,
            });
          }
        });
      }
    });

    const newSectionId = `trip-section-${targetTrip.id}-${Date.now()}`;
    const newSection: MagazineSection = {
      id: newSectionId,
      title: targetTrip.title.replace(/\s*\(Plan\)$/i, '').toUpperCase(),
      subtitle: `${targetTrip.date} · ${targetTrip.locationStr || targetTrip.country || 'JOURNEY'}`,
      heroImg: targetTrip.heroImg || targetTrip.img || (tripItems[0]?.img || ''),
      heroTitle: targetTrip.title.replace(/\s*\(Plan\)$/i, ''),
      heroDate: targetTrip.date,
      heroLocation: targetTrip.locationStr || targetTrip.country,
      heroTripId: targetTrip.id,
      items: tripItems,
      order: sectionsList.length,
      isDefault: false,
    };

    setSectionsList(prev => [...prev, newSection]);
    setActiveMagSectionId(newSectionId);
    setShowAutoGenerateModal(false);
    setSelectedTripForAutoGenerate(null);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (sectionsList.length <= 1) {
      alert('최소 1개의 매거진 섹션은 유지되어야 합니다.');
      return;
    }
    const target = sectionsList.find(s => s.id === sectionId);
    if (!window.confirm(`'${target?.title || '선택한'}' 매거진 섹션을 삭제하시겠습니까?\n\n삭제된 섹션은 휴지통(TRASH) 탭에서 언제든 복원할 수 있습니다.`)) {
      return;
    }

    pushMagazineSnapshot();

    try {
      // Local safety snapshot backup before deletion
      try {
        localStorage.setItem(`cached_magazine_sections_backup_${Date.now()}`, JSON.stringify(sectionsList));
      } catch (_) {}

      if (onDeleteMagazineSection) {
        await onDeleteMagazineSection(sectionId);
      }

      setSectionsList(prev => {
        const filtered = prev.filter(s => s.id !== sectionId);
        const reordered = filtered.map((s, idx) => ({ ...s, order: idx }));
        if (activeMagSectionId === sectionId && reordered.length > 0) {
          setActiveMagSectionId(reordered[0].id);
        }
        return reordered;
      });
    } catch (err) {
      console.error('Failed to delete magazine section:', err);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sectionsList.length) return;
    pushMagazineSnapshot();
    const copy = [...sectionsList];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setSectionsList(copy.map((s, idx) => ({ ...s, order: idx })));
  };

  const handleUpdateSectionField = (sectionId: string, field: keyof MagazineSection, val: any) => {
    pushMagazineSnapshot();
    setSectionsList(prev => prev.map(s => s.id === sectionId ? { ...s, [field]: val } : s));
  };

  // Add Item to Current Section
  const handleAddItemToCurrentSection = (item: TimelineItem & { journeyTitle?: string; journeyLocation?: string }) => {
    if (!currentMagSection || !item.img) return;

    // Check duplicate in current section
    const isDuplicate = (currentMagSection.items || []).some(m =>
      (m.timelineItemId !== undefined && m.timelineItemId === item.id) ||
      (m.img && item.img && (m.img === item.img || m.img.split('?')[0] === item.img.split('?')[0]))
    );
    if (isDuplicate) {
      alert("이미 현재 매거진 섹션에 등록된 이미지입니다.");
      return;
    }

    pushMagazineSnapshot();

    const parentTrip = trips.find(t => t.id === item.tripId);
    const pName = safeStr(item.place);
    const jTitle = safeStr(item.journeyTitle) || parentTrip?.title || '';
    const jLoc = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || safeStr(item.journeyLocation);

    // Resolve location using chronological backwards inheritance:
    const allTripTimelineItems: TimelineItem[] = [];
    Object.values(timelineData || {}).forEach(dayItems => {
      if (Array.isArray(dayItems)) {
        dayItems.forEach(t => {
          if (t.tripId === item.tripId) {
            allTripTimelineItems.push(t);
          }
        });
      }
    });
    const locStr = resolveTimelinePlaceName(item, allTripTimelineItems, parentTrip);

    const currentItems = [...(currentMagSection.items || [])];
    const newItem: MagazineItem = {
      id: `moment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tripId: item.tripId,
      timelineItemId: item.id,
      title: pName || jTitle || 'UNTITLED MOMENT',
      date: safeStr(item.date),
      placeName: locStr,
      location: jLoc,
      img: item.img,
      layoutType: 'portrait',
      order: currentItems.length,
    };

    let nextItems: MagazineItem[];
    const selectedIdx = selectedMagCardId ? currentItems.findIndex(it => it.id === selectedMagCardId) : -1;
    if (selectedIdx !== -1) {
      // Insert right after the currently selected card
      currentItems.splice(selectedIdx + 1, 0, newItem);
      nextItems = currentItems.map((it, idx) => ({ ...it, order: idx }));
    } else {
      nextItems = [...currentItems, newItem].map((it, idx) => ({ ...it, order: idx }));
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

    setSelectedMagCardId(newItem.id);
  };

  const handleAddTextCardToCurrentSection = () => {
    if (!currentMagSection) return;
    pushMagazineSnapshot();
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
      layoutType: 'portrait',
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
    pushMagazineSnapshot();
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
    pushMagazineSnapshot();
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
    pushMagazineSnapshot();
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
    pushMagazineSnapshot();
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

  // Refresh & Sync current magazine section cards with latest timeline data
  const [isSyncingMagazine, setIsSyncingMagazine] = useState(false);
  const handleRefreshAndSyncMagazine = async () => {
    if (!currentMagSection || isSyncingMagazine) return;
    setIsSyncingMagazine(true);

    try {
      // Gather all timeline items across all dates + gallery photos
      const allTimelineItems: TimelineItem[] = [];
      Object.values(timelineData || {}).forEach(dayItems => {
        if (Array.isArray(dayItems)) {
          allTimelineItems.push(...dayItems);
        }
      });

      // Also gather photos from journey gallery metadata to ensure parity with candidate pool
      localJourneys.forEach(j => {
        if (j.gallery && Array.isArray(j.gallery)) {
          j.gallery.forEach((gItem, gIdx) => {
            const url = typeof gItem === 'string' ? gItem : gItem?.url;
            if (!url) return;
            const gDate = typeof gItem === 'object' && gItem?.date ? gItem.date : j.date;
            const gPlace = typeof gItem === 'object' && gItem?.place ? gItem.place : '';
            const gMemo = typeof gItem === 'object' && gItem?.imgNote ? gItem.imgNote : '';
            allTimelineItems.push({
              id: 900000 + j.id * 1000 + gIdx,
              time: typeof gItem === 'object' && gItem?.time ? gItem.time : '12:00',
              type: 'PHOTO',
              place: gPlace || j.locationStr || j.title.replace(/\s*\(Plan\)$/i, ''),
              cost: '',
              memo: gMemo,
              img: url,
              date: gDate,
              tripId: j.id,
            });
          });
        }
      });

      let changesCount = 0;
      const updatedItems = (currentMagSection.items || []).map(item => {
        if (item.isTextOnly || !item.img) return item;

        // Strict 1:1 match by timelineItemId, exact image URL, or trip+date+title smart match
        let matched: TimelineItem | undefined;
        if (item.timelineItemId !== undefined) {
          matched = allTimelineItems.find(t => 
            Number(t.id) === Number(item.timelineItemId) || 
            String(t.id) === String(item.timelineItemId)
          );
        }
        if (!matched && item.img) {
          const cleanImg = item.img.split('?')[0];
          matched = allTimelineItems.find(t => t.img && (t.img === item.img || t.img.split('?')[0] === cleanImg));
        }
        if (!matched && item.tripId && item.date && item.title) {
          const cleanTitle = item.title.trim().toLowerCase();
          matched = allTimelineItems.find(t =>
            Number(t.tripId) === Number(item.tripId) &&
            t.date === item.date &&
            t.place && t.place.trim().toLowerCase() === cleanTitle
          );
        }

        if (matched) {
          const parentTrip = trips.find(t => t.id === matched?.tripId) || plans.find(p => p.id === matched?.tripId);
          const tripTimeline = allTimelineItems.filter(t => t.tripId === matched?.tripId);
          const resolvedLoc = resolveTimelinePlaceName(matched, tripTimeline, parentTrip);
          const newTitle = matched.place?.trim() || item.title;
          const newDate = matched.date || item.date;
          const newImg = matched.img || item.img;

          if (
            item.title !== newTitle ||
            item.placeName !== resolvedLoc ||
            item.date !== newDate ||
            item.img !== newImg ||
            item.timelineItemId !== matched.id
          ) {
            changesCount++;
            return {
              ...item,
              timelineItemId: matched.id,
              title: newTitle,
              placeName: resolvedLoc,
              date: newDate,
              img: newImg,
            };
          }
        } else {
          // If title and placeName are identical, fix duplicate placeName
          const pName = (item.placeName || '').trim().toLowerCase();
          const mTitle = (item.title || '').trim().toLowerCase();
          if (pName && mTitle && pName === mTitle) {
            const parentTrip = trips.find(t => t.id === item.tripId) || plans.find(p => p.id === item.tripId);
            const fallbackLoc = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || parentTrip?.country || 'VISITED PLACE';
            changesCount++;
            return {
              ...item,
              placeName: fallbackLoc,
            };
          }
        }

        return item;
      });

      const updatedSections = sectionsList.map(s => {
        if (s.id === currentMagSection.id) {
          return { ...s, items: updatedItems };
        }
        return s;
      });

      setSectionsList(updatedSections);
      if (onSaveMagazineSections) {
        await onSaveMagazineSections(updatedSections);
      }
      alert(`타임라인 기준 매거진 동기화가 완료되었습니다.\n(${changesCount}개 항목 최신화 및 저장 완료)`);
    } catch (err: any) {
      console.error('Failed to sync magazine with timeline:', err);
      alert('타임라인 동기화 중 오류가 발생했습니다: ' + (err?.message || err));
    } finally {
      setIsSyncingMagazine(false);
    }
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

  // Unified Save All Changes Function across all tabs & sections
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllSuccess, setSaveAllSuccess] = useState(false);

  const handleSaveAllChanges = async (showModal: boolean = true) => {
    if (isSavingAll) return;
    setIsSavingAll(true);
    try {
      // 1. Save Home Settings
      localStorage.setItem('playVideoOnActivate', String(playVideoOnActivate));
      localStorage.setItem('home_journey_limit', String(homeJourneyLimit));
      localStorage.setItem('hero_slide_duration', String(slideDuration));
      localStorage.setItem('home_gradient_enabled', String(gradientEnabled));
      localStorage.setItem('home_gradient_from', gradientFrom);
      localStorage.setItem('home_gradient_to', gradientTo);
      localStorage.setItem('home_magazine_section_id', homeMagSectionId);
      localStorage.setItem('home_magazine_limit', String(homeMagLimit));
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
        gradientTo,
        homeMagSectionId,
        homeMagLimit
      );

      // 2. Save Journey if currently editing one
      if (selectedJourney) {
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
      }

      // 3. Save Journey Hub Header if configured
      if (onSaveArchiveHubConfig) {
        await onSaveArchiveHubConfig({
          mainTitle: archiveHubMainTitle,
          subtitle: archiveHubSubtitle,
          badgeText: archiveHubBadgeText,
          volumeText: archiveHubVolumeText,
        });
      }

      // 4. Save Magazine Hub Header if configured
      if (onSaveMagazineHubConfig) {
        await onSaveMagazineHubConfig({
          mainTitle: hubMainTitle,
          subtitle: hubSubtitle,
          badgeText: hubBadgeText,
          volumeText: hubVolumeText,
        });
      }

      // 5. Save Magazine Sections
      if (onSaveMagazineSections) {
        await onSaveMagazineSections(sectionsList);
      } else if (onSaveMagazineMoments) {
        const mainSec = sectionsList.find(s => s.id === 'main') || sectionsList[0];
        await onSaveMagazineMoments(mainSec?.items || []);
      }

      setSaveAllSuccess(true);
      setHomeSaveSuccess(true);
      setTripSaveSuccess(true);
      setMagazineSaveSuccess(true);
      setArchiveHubHeaderSaveSuccess(true);
      setHubHeaderSaveSuccess(true);
      if (showModal) {
        setShowSaveSuccessModal(true);
      }
      setTimeout(() => {
        setSaveAllSuccess(false);
        setHomeSaveSuccess(false);
        setTripSaveSuccess(false);
        setMagazineSaveSuccess(false);
        setArchiveHubHeaderSaveSuccess(false);
        setHubHeaderSaveSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to save all management changes:', err);
      alert('설정 저장 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsSavingAll(false);
    }
  };

  // Directly read magazineSections from Firestore for diagnostics
  const handleLoadFirestoreMagazineSections = async () => {
    setIsLoadingFirestoreMag(true);
    try {
      const snap = await getDoc(doc(db, 'users', 'public', 'settings', 'home'));
      if (snap.exists()) {
        const data = snap.data();
        const sections = Array.isArray(data.magazineSections) ? data.magazineSections as MagazineSection[] : [];
        setFirestoreMagSections(sections);
        setFirestoreMagLoadedAt(new Date().toLocaleTimeString());
      } else {
        setFirestoreMagSections([]);
        setFirestoreMagLoadedAt(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      console.error('Firestore direct read error:', err);
      alert(`Firestore 직접 읽기 실패: ${err?.message || err}`);
    } finally {
      setIsLoadingFirestoreMag(false);
    }
  };

  // Force restore: load Firestore data into current sectionsList and save
  const handleForceRestoreSectionsFromFirestore = () => {
    if (!firestoreMagSections || firestoreMagSections.length === 0) {
      alert('Firestore에 복구할 데이터가 없습니다. 먼저 진단 스캔을 실행해주세요.');
      return;
    }
    setSectionsList(firestoreMagSections);
    setActiveMagSectionId(firestoreMagSections[0]?.id || 'main');
    alert(`✅ Firestore에서 ${firestoreMagSections.length}개 섹션을 현재 편집기로 불러왔습니다.\n매거진 모드로 이동 후 "SAVE MAGAZINE SETTINGS" 버튼으로 최종 저장하세요.`);
    setActiveMode('MAGAZINE');
  };

  // Force push: save current sectionsList directly to Firestore (emergency save)
  const handleForceSaveCurrentSectionsToFirestore = async () => {
    if (sectionsList.length === 0) {
      alert('현재 섹션 목록이 비어있어 저장할 수 없습니다.');
      return;
    }
    if (!confirm(`현재 편집기의 ${sectionsList.length}개 섹션을 Firestore에 강제 저장하시겠습니까?`)) return;
    try {
      const cleaned = sectionsList.map((s, idx) => ({
        ...s,
        order: idx,
        items: (s.items || []).map((it, iIdx) => ({ ...it, order: iIdx })),
      }));
      if (onSaveMagazineSections) {
        await onSaveMagazineSections(cleaned);
      } else {
        await setDoc(doc(db, 'users', 'public', 'settings', 'home'), {
          magazineSections: cleaned,
        }, { merge: true });
      }
      alert(`✅ ${cleaned.length}개 섹션이 Firestore에 성공적으로 저장되었습니다!`);
      // Refresh diagnostics
      await handleLoadFirestoreMagazineSections();
    } catch (err: any) {
      console.error('Force save error:', err);
      alert(`강제 저장 실패: ${err?.message || err}`);
    }
  };

  // Sync saveRef with the unified save handler so any unsaved state across all tabs gets saved before navigating away
  useEffect(() => {
    if (saveRef) {
      saveRef.current = () => handleSaveAllChanges(false);
    }
  }, [saveRef, handleSaveAllChanges]);

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
      case 'CLEANUP':
      case 'HOME':
      default:
        return 'home';
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#FAF9F6] dark:bg-[#141414] text-black dark:text-white flex flex-col font-sans select-none animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar with Swiss Minimal Mode Switcher & Unified SAVE ALL CHANGES Action */}
      <div className="border-b border-black/15 dark:border-white/15 px-4 sm:px-8 py-2.5 bg-white dark:bg-[#111111] flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
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

        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Switcher: HOME / TRIP / MAGAZINE / MAP / TRASH / CLEANUP */}
          <div className="flex items-center border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 p-0.5 rounded-none overflow-x-auto">
            {(['HOME', 'ARCHIVE', 'MAGAZINE', 'MAP', 'TRASH', 'CLEANUP'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setActiveMode(mode);
                  if (mode === 'CLEANUP' && !diagReport && !isScanning) {
                    handleScanCleanup();
                  }
                }}
                className={`px-3 sm:px-4 py-1.5 text-xs font-black uppercase tracking-wider font-sans transition-colors cursor-pointer whitespace-nowrap ${
                  activeMode === mode
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                {mode === 'ARCHIVE' ? 'TRIP' : (mode === 'CLEANUP' ? 'OPTIMIZE' : mode)}
                {mode === 'TRASH' && trashedJourneys.length > 0 && (
                  <span className="ml-1 text-[9px] font-mono px-1 bg-red-600 text-white">
                    {trashedJourneys.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Top Permanent Unified SAVE ALL Button */}
          <button
            type="button"
            onClick={() => handleSaveAllChanges(true)}
            disabled={isSavingAll}
            className={`px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-all border ${
              saveAllSuccess
                ? '!bg-emerald-600 !text-white !border-emerald-600'
                : isAnyDirty
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white hover:opacity-85'
            }`}
            title="모든 탭과 섹션의 변경사항을 즉시 통합 저장합니다."
          >
            {isSavingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveAllSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {saveAllSuccess
                ? 'ALL SAVED!'
                : isSavingAll
                  ? 'SAVING...'
                  : isAnyDirty
                    ? '● SAVE ALL'
                    : 'SAVE ALL'}
            </span>
          </button>
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
              {/* Header Title */}
              <div className="flex flex-col gap-1 border-b-2 border-black dark:border-white pb-4">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                  APP & HOMEPAGE CONFIGURATION
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                  HOME SETTING
                </h2>
                <p className="text-xs text-black/60 dark:text-white/60 font-mono">
                  [홈페이지 메인 타이틀, 마퀴 배너, 히어로 슬라이드 및 큐레이션 매거진 설정]
                </p>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* SECTION: MAIN (메인 & 마퀴 설정)                              */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <section className="flex flex-col gap-6 pt-2">
                  <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
                    <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white font-sans">
                      MAIN & MARQUEE
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
                          BACKGROUND GRADIENT (전체 감성 그라데이션 - 홈, 트립, 매거진 적용)
                        </span>
                        <span className="text-[10px] text-black/50 dark:text-white/50">
                          화이트/블랙의 단조로움을 없애고 은은한 톤으로 홈, 트립, 매거진 전체 배경 일괄 연출
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
                {/* SECTION: MAGAZINE (홈 매거진 연동 설정)                         */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <section className="flex flex-col gap-6 pt-6 border-t border-black/20 dark:border-white/20">
                  <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
                    <div className="flex items-baseline gap-3">
                      <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                        MAGAZINE
                      </h3>
                      <span className="text-xs font-mono font-bold text-black/50 dark:text-white/50 uppercase">
                        HOME CURATION
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMode('MAGAZINE')}
                      className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>매거진 허브 편집기 바로가기 →</span>
                    </button>
                  </div>

                  {/* 1. Feature Section Selector */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/80 dark:text-white/80">
                      FEATURED MAGAZINE SECTION (홈에 노출할 매거진 섹션)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {sectionsList.map(sec => {
                        const isSelected = homeMagSectionId === sec.id;
                        return (
                          <div
                            key={sec.id}
                            onClick={() => setHomeMagSectionId(sec.id)}
                            className={`p-3 border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
                                : 'bg-white dark:bg-[#161616] border-black/15 dark:border-white/15 text-black dark:text-white hover:border-black/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs font-sans uppercase truncate">
                                {sec.title}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
                              <span>{sec.items?.length || 0} ITEMS</span>
                              <span>{sec.isDefault ? 'DEFAULT' : 'CUSTOM'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Display Limit */}
                  <div className="flex items-center justify-between py-2 border-t border-black/10 dark:border-white/10">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold uppercase text-black/80 dark:text-white/80">
                        DISPLAY ITEMS LIMIT (노출 카드 수)
                      </span>
                      <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                        3장 단위로 슬라이드 스프레드가 구성됩니다.
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[3, 6, 9, 12].map(limit => (
                        <button
                          key={limit}
                          type="button"
                          onClick={() => setHomeMagLimit(limit)}
                          className={`px-3 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                            homeMagLimit === limit
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                              : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-black'
                          }`}
                        >
                          {limit} ITEMS
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Preview of Featured Section Cards */}
                  {(() => {
                    const activeSec = sectionsList.find(s => s.id === homeMagSectionId) || sectionsList[0];
                    const itemsToPreview = (activeSec?.items || []).slice(0, homeMagLimit);

                    return (
                      <div className="flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                            HOME PREVIEW ({itemsToPreview.length} / {activeSec?.items?.length || 0})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMagSectionId(homeMagSectionId);
                              setActiveMode('MAGAZINE');
                            }}
                            className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            이 섹션 편집하기 →
                          </button>
                        </div>

                        {itemsToPreview.length === 0 ? (
                          <div className="py-8 text-center text-xs font-mono text-black/40 dark:text-white/40 border border-dashed border-black/20 dark:border-white/20">
                            선택된 매거진 섹션에 등록된 사진이 없습니다. 매거진 허브 편집기에서 사진을 추가해주세요.
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                            {itemsToPreview.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                onClick={() => {
                                  setActiveMagSectionId(homeMagSectionId);
                                  setActiveMode('MAGAZINE');
                                }}
                                className="group relative aspect-[3/4] overflow-hidden bg-black/10 border border-black/10 dark:border-white/10 cursor-pointer"
                                title={`${item.title} (클릭 시 매거진 편집기로 이동)`}
                              >
                                <img
                                  src={getEffectiveImageUrl(item.img || '')}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 flex flex-col justify-end">
                                  <span className="text-[9px] font-mono text-white/70">#{idx + 1}</span>
                                  <span className="text-[10px] font-bold text-white truncate">{item.title}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: ARCHIVE (Top: Header Config, Left: Edit Form, Right: List)    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'ARCHIVE' && (
          <div className="flex-1 flex flex-col w-full overflow-y-auto max-h-[calc(100vh-60px)]">
            
            {/* Top Bar with Header */}
            <div className="w-full px-4 sm:px-8 pt-6 pb-4 border-b border-black/15 dark:border-white/15 shrink-0">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                JOURNEY LOGS & PLANNER MANAGEMENT
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                TRIP SETTING
              </h2>
              <p className="text-xs text-black/60 dark:text-white/60 font-mono mt-1">
                [여정 허브 헤더 소개글 설정 및 개별 여정 정보·사진·태그·순서 통합 관리]
              </p>
            </div>

            {/* 0. Journey Hub Main Header Configuration Accordion (Trip Hub Editorial Masthead) */}
            <div className="w-full border-b border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
              <div className="w-full p-4 sm:px-8">
                <button
                  type="button"
                  onClick={() => setIsArchiveHubHeaderOpen(!isArchiveHubHeaderOpen)}
                  className="w-full flex items-center justify-between py-2 text-left cursor-pointer group select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white font-['Noto_Sans_KR',sans-serif]">
                      여정 허브 메인 헤더 & 소개글 설정 (JOURNEY ARCHIVE MAIN HEADER)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black uppercase">
                      HUB CONFIG
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-black/50 dark:text-white/50 font-['Noto_Sans_KR',sans-serif]">
                      {isArchiveHubHeaderOpen ? '접기 ▲' : '펼치기 ▼'}
                    </span>
                  </div>
                </button>

                {isArchiveHubHeaderOpen && (
                  <div className="pt-4 pb-2 flex flex-col gap-4 border-t border-black/10 dark:border-white/10 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Badge Text */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                          HUB BADGE TEXT (상단 태그 텍스트)
                        </label>
                        <input
                          type="text"
                          value={archiveHubBadgeText}
                          onChange={e => setArchiveHubBadgeText(e.target.value)}
                          placeholder="e.g. JOURNEY ARCHIVE"
                          className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white font-['Noto_Sans_KR',sans-serif]"
                        />
                      </div>

                      {/* Volume Text */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                          HUB VOLUME TEXT (발행 연도 / 볼륨)
                        </label>
                        <input
                          type="text"
                          value={archiveHubVolumeText}
                          onChange={e => setArchiveHubVolumeText(e.target.value)}
                          placeholder="e.g. VOL. 2026"
                          className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white font-['Noto_Sans_KR',sans-serif]"
                        />
                      </div>
                    </div>

                    {/* Main Title */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                        MAIN HEADLINE TITLE (허브 메인 대형 헤드라인 타이틀)
                      </label>
                      <input
                        type="text"
                        value={archiveHubMainTitle}
                        onChange={e => setArchiveHubMainTitle(e.target.value)}
                        placeholder="e.g. A VISUAL CHRONICLE OF JOURNEYS & TRAVEL ARCHIVES"
                        className="px-3 py-2 text-xs font-satoshi font-bold uppercase bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                      />
                    </div>

                    {/* Subtitle */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                        INTRO SUBTITLE / DESCRIPTION (허브 소개 및 설명 문구)
                      </label>
                      <textarea
                        rows={2}
                        value={archiveHubSubtitle}
                        onChange={e => setArchiveHubSubtitle(e.target.value)}
                        placeholder="e.g. 발걸음이 닿았던 모든 도시와 찬란했던 시간의 기록. 엄선된 사진과 함께 지난 여정들을 다시 마주합니다."
                        className="px-3 py-2 text-xs font-['Noto_Sans_KR',sans-serif] bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white resize-none"
                      />
                    </div>

                    {/* Save Button for Hub Header */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                      <span className="text-[11px] font-mono text-black/50 dark:text-white/50 font-['Noto_Sans_KR',sans-serif]">
                        * 수정 후 [SAVE TRIP HUB HEADER]를 누르면 여정 허브 메인에 즉시 반영됩니다.
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveArchiveHubHeader}
                        disabled={isSavingArchiveHubHeader}
                        className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-red-600 dark:hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer font-['Noto_Sans_KR',sans-serif]"
                      >
                        {isSavingArchiveHubHeader ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{archiveHubHeaderSaveSuccess ? 'SAVED!' : 'SAVE TRIP HUB HEADER'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
        </div>
      )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: MAGAZINE (Sections, Hero, Layout & Moments Management)        */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'MAGAZINE' && (
          <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-60px)] animate-in fade-in duration-200">
            
            {/* Top Bar with Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black dark:border-white pb-4">
              <div>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                  EDITORIAL MAGAZINE CURATION
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                  MAGAZINE SETTING
                </h2>
                <p className="text-xs text-black/60 dark:text-white/60 font-mono mt-1">
                  [매거진 허브 메인 소개글 및 이슈 섹션별 에디토리얼 화보와 스토리 모먼트 관리]
                </p>
              </div>
            </div>

            {/* 0. Magazine Hub Main Header & Intro Configuration Accordion (허브 메인 내용 편집 기능) */}
            <div className="flex flex-col border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setIsHubHeaderOpen(prev => !prev)}
                className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white font-['Noto_Sans_KR',sans-serif]">
                    매거진 허브 메인 헤더 & 소개글 설정 (MAGAZINE HUB MAIN HEADER)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black uppercase">
                    HUB CONFIG
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-black/50 dark:text-white/50 font-['Noto_Sans_KR',sans-serif]">
                    {isHubHeaderOpen ? '접기 ▲' : '펼치기 ▼'}
                  </span>
                </div>
              </button>

              {isHubHeaderOpen && (
                <div className="p-4 sm:p-6 flex flex-col gap-4 border-t border-black/10 dark:border-white/10 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Badge Text */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                        HUB BADGE TEXT (상단 태그 텍스트)
                      </label>
                      <input
                        type="text"
                        value={hubBadgeText}
                        onChange={e => setHubBadgeText(e.target.value)}
                        placeholder="e.g. CURATED ARCHIVE"
                        className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white font-['Noto_Sans_KR',sans-serif]"
                      />
                    </div>

                    {/* Volume Text */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                        HUB VOLUME TEXT (발행 연도 / 볼륨)
                      </label>
                      <input
                        type="text"
                        value={hubVolumeText}
                        onChange={e => setHubVolumeText(e.target.value)}
                        placeholder="e.g. VOL. 2026"
                        className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white font-['Noto_Sans_KR',sans-serif]"
                      />
                    </div>
                  </div>

                  {/* Main Title */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                      MAIN HEADLINE TITLE (허브 메인 대형 헤드라인 타이틀)
                    </label>
                    <input
                      type="text"
                      value={hubMainTitle}
                      onChange={e => setHubMainTitle(e.target.value)}
                      placeholder="e.g. A VISUAL ARCHIVE OF JOURNEYS, CURATED STORIES & MOMENTS"
                      className="px-3 py-2 text-xs font-satoshi font-bold uppercase bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                      INTRO SUBTITLE / DESCRIPTION (허브 소개 및 설명 문구)
                    </label>
                    <textarea
                      rows={2}
                      value={hubSubtitle}
                      onChange={e => setHubSubtitle(e.target.value)}
                      placeholder="e.g. 여행의 찬란한 순간과 에피소드를 엄선하여 잡지 형식으로 기록한 매거진 컬렉션입니다."
                      className="px-3 py-2 text-xs font-['Noto_Sans_KR',sans-serif] bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white resize-none"
                    />
                  </div>

                  {/* Save Button for Hub Header */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                    <span className="text-[11px] font-mono text-black/50 dark:text-white/50 font-['Noto_Sans_KR',sans-serif]">
                      * 수정 후 [SAVE MAGAZINE HUB HEADER]를 누르면 매거진 허브 메인에 즉시 반영됩니다.
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveHubHeader}
                      disabled={isSavingHubHeader}
                      className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-red-600 dark:hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer font-['Noto_Sans_KR',sans-serif]"
                    >
                      {isSavingHubHeader ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{hubHeaderSaveSuccess ? 'SAVED!' : 'SAVE MAGAZINE HUB HEADER'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Section Switcher Bar */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-black/15 dark:border-white/15">
              <div className="flex items-center gap-2">
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
                        onClick={() => {
                          setActiveMagSectionId(sec.id);
                          setMomentsList(sec.items || []);
                          setSelectedMagCardId(null);
                        }}
                        className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                      >
                        <span>{String(idx + 1).padStart(2, '0')}.</span>
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

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 border-r border-black/15 dark:border-white/15 pr-2 mr-1">
                  <button
                    type="button"
                    onClick={handleMagazineUndo}
                    disabled={magUndoStack.length === 0}
                    className="p-1.5 border border-black/20 dark:border-white/20 text-black dark:text-white disabled:opacity-20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    title="실행 취소 (Ctrl+Z)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleMagazineRedo}
                    disabled={magRedoStack.length === 0}
                    className="p-1.5 border border-black/20 dark:border-white/20 text-black dark:text-white disabled:opacity-20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    title="다시 실행 (Ctrl+Y / Ctrl+Shift+Z)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(true)}
                  className="px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>신규 섹션 (NEW)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTripForAutoGenerate(localJourneys[0]?.id ?? null);
                    setShowAutoGenerateModal(true);
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="선택한 여정의 커버, 갤러리 및 타임라인 사진으로 매거진 섹션을 자동 생성합니다."
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>여정 자동 생성 (AUTO-GENERATE)</span>
                </button>
              </div>
            </div>

            {/* 2. Active Section Settings & Dual Live Previews (Hero & Hub Card) */}
            {currentMagSection && (
              <div className="flex flex-col gap-6 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 p-4 sm:p-6">
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-red-600 dark:text-red-500" />
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

                {/* Dual Live Previews Grid: 1) Hero Banner Preview + 2) Hub Section Card Preview (Matched Heights) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Preview 1: Hero Banner (7 cols on lg) */}
                  <div className="lg:col-span-7 flex flex-col gap-2 h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                        1. HERO BANNER LIVE PREVIEW
                      </span>
                    </div>

                    <div className="w-full flex-1 min-h-[340px] sm:min-h-[360px] relative overflow-hidden bg-black/10 dark:bg-white/5 border border-black/15 dark:border-white/15 group flex flex-col justify-between">
                      {currentMagSection.heroImg ? (
                        <>
                          <img
                            src={getEffectiveImageUrl(currentMagSection.heroImg)}
                            alt={currentMagSection.heroTitle || 'Hero'}
                            className="absolute inset-0 w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20 pointer-events-none" />
                          <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-between h-full text-white pointer-events-none">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-black/60 backdrop-blur-xs border border-white/20">
                                HERO PREVIEW
                              </span>
                              {currentMagSection.heroLocation && (
                                <span className="text-[10px] font-mono tracking-widest uppercase text-white/80">
                                  {currentMagSection.heroLocation}
                                </span>
                              )}
                            </div>
                            <div>
                              {currentMagSection.heroDate && (
                                <span className="text-[10px] font-mono uppercase tracking-widest text-white/70 block mb-1">
                                  {currentMagSection.heroDate}
                                </span>
                              )}
                              <h2 className="text-lg sm:text-xl font-satoshi font-light uppercase tracking-tight text-white drop-shadow-md line-clamp-2">
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
                          <span className="text-[10px] font-mono">
                            하단 사진에서 [★ SET AS HERO] 버튼을 눌러 지정해주세요.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview 2: Hub Section Card Live Preview (MOUTHWASH style, 5 cols on lg) */}
                  <div className="lg:col-span-5 flex flex-col gap-2 h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        2. HUB SECTION CARD LIVE PREVIEW (실시간 허브 카드)
                      </span>
                    </div>

                    <div className="w-full flex-1 min-h-[340px] sm:min-h-[360px] p-3.5 bg-white dark:bg-[#141414] border border-black/15 dark:border-white/15 shadow-sm flex flex-col items-center justify-between">
                      {/* MOUTHWASH Card Top Bold Title */}
                      <div className="min-h-[2.8rem] flex items-center justify-center mb-1 px-1 w-full">
                        <h4 className="text-sm sm:text-base font-satoshi font-black uppercase tracking-tight text-center leading-[1.12] text-black dark:text-white line-clamp-2">
                          {currentMagSection.heroTitle || currentMagSection.title || 'UNTITLED ISSUE'}
                        </h4>
                      </div>

                      {/* Photo Frame (3:4 ratio) */}
                      <div className="relative aspect-[3/4] w-full max-w-[180px] overflow-hidden bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 my-auto">
                        {currentMagSection.heroImg ? (
                          <img
                            src={getEffectiveImageUrl(currentMagSection.heroImg)}
                            alt="Card Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-black/40 dark:text-white/40">
                            NO COVER
                          </div>
                        )}
                      </div>

                      {/* Bottom Meta */}
                      <div className="pt-2.5 flex flex-col items-center justify-center text-center font-['Inter',sans-serif] gap-0.5 w-full">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center justify-center gap-1">
                          <span className="text-red-600 dark:text-red-400 font-black">
                            ISSUE {String(sectionsList.findIndex(s => s.id === currentMagSection.id) + 1).padStart(2, '0')}
                          </span>
                          {currentMagSection.heroDate && (
                            <>
                              <span className="opacity-30">/</span>
                              <span>{currentMagSection.heroDate}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[9px] font-sans font-semibold tracking-wide uppercase text-black/50 dark:text-white/50 flex items-center justify-center gap-1.5">
                          {currentMagSection.heroLocation && (
                            <span className="truncate max-w-[140px]">{currentMagSection.heroLocation}</span>
                          )}
                          {currentMagSection.heroLocation && <span className="opacity-40">·</span>}
                          <span>{currentMagSection.items?.length || 0} STORIES</span>
                        </div>
                      </div>
                    </div>
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
                      className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
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
                      onClick={handleRefreshAndSyncMagazine}
                      disabled={isSyncingMagazine}
                      className="px-3 py-1 bg-white dark:bg-[#1f1f1f] text-black dark:text-white border border-black/20 dark:border-white/20 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                      title="타임라인 최신 사진/제목/장소 데이터로 즉시 동기화"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingMagazine ? 'animate-spin text-red-500' : 'text-black/70 dark:text-white/70'}`} />
                      <span>{isSyncingMagazine ? '동기화 중...' : '타임라인 동기화 (SYNC)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTextCardToCurrentSection}
                      className="px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ADD TEXT CARD</span>
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
                        <span>아래 타임라인 사진에서 '+ ADD'를 누르거나 상단의 'ADD TEXT CARD'를 클릭해주세요.</span>
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

                  // Gather all timeline items for place resolution
                  const allTimelineList: TimelineItem[] = [];
                  if (timelineData) {
                    Object.values(timelineData).forEach(tItems => {
                      if (Array.isArray(tItems)) {
                        allTimelineList.push(...tItems);
                      }
                    });
                  }

                  const items = rawItems.map(item => {
                    if (item.isTextOnly || !item.img) return item;
                    const matched = timelineByUrl.get(item.img) || timelineByUrl.get(getEffectiveImageUrl(item.img));
                    const targetTripId = matched?.tripId || item.tripId;
                    const parentTrip = trips.find(t => t.id === targetTripId);
                    const tripTimeline = allTimelineList.filter(t => t.tripId === targetTripId);

                    if (matched) {
                      const pName = matched.place?.trim() || '';
                      const jTitle = parentTrip?.title?.replace(/\s*\(Plan\)$/i, '') || '';
                      const resolvedLocation = resolveTimelinePlaceName(matched, tripTimeline, parentTrip);
                      return {
                        ...item,
                        tripId: targetTripId,
                        title: pName || jTitle || item.title || 'UNTITLED MOMENT',
                        placeName: resolvedLocation,
                        location: resolvedLocation,
                        date: matched.date || item.date,
                        caption: matched.imgNote || matched.memo || item.caption,
                      };
                    } else {
                      let resolvedLocation = item.placeName || '';
                      const pName = (item.title || '').trim().toLowerCase();
                      if (!resolvedLocation || resolvedLocation.trim().toLowerCase() === pName) {
                        resolvedLocation = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || parentTrip?.country || 'VISITED PLACE';
                      }
                      return {
                        ...item,
                        placeName: resolvedLocation,
                        location: resolvedLocation,
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
                        // In a 3-col combined row (PL or LP), aspect-[4/3] on mobile and aspect-[16/10] on desktop aligns horizontal height with portrait (3:4) sibling
                        aspectClass = 'aspect-[4/3] md:aspect-[16/10] w-full';
                      } else if (isLandscape) {
                        aspectClass = 'aspect-[4/3] md:aspect-[16/10] w-full';
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

                      // Check if already attached to current section
                      const isAttached = (currentMagSection?.items || []).some(m =>
                        (m.timelineItemId !== undefined && Number(m.timelineItemId) === Number(item.id)) ||
                        (m.img && item.img && (m.img === item.img || m.img.split('?')[0] === item.img.split('?')[0]))
                      );

                      return (
                        <div
                          key={`mag-cand-${item.id || i}-${i}`}
                          onClick={() => {
                            if (isAttached) {
                              alert("이미 현재 매거진 섹션에 등록된 사진입니다.");
                              return;
                            }
                            handleAddItemToCurrentSection(item);
                          }}
                          className={`group relative h-32 sm:h-36 bg-white dark:bg-[#121212] border overflow-hidden flex flex-col justify-end transition-all select-none ${
                            isAttached
                              ? 'border-black/30 dark:border-white/30 opacity-40 grayscale cursor-not-allowed'
                              : 'border-black/15 dark:border-white/15 cursor-pointer active:scale-95 hover:border-black dark:hover:border-white shadow-xs'
                          }`}
                          title={isAttached ? `${displayTitle} (이미 등록됨 - ATTACHED)` : `${displayTitle} (${itemDate}) - 클릭하여 추가`}
                        >
                          <img
                            src={getEffectiveImageUrl(item.img || '')}
                            alt={displayTitle}
                            loading="lazy"
                            decoding="async"
                            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                              !isAttached ? 'group-hover:scale-105' : ''
                            }`}
                          />
                          
                          {/* Attached Minimal Badge */}
                          {isAttached ? (
                            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-black/90 text-white dark:bg-white dark:text-black text-[9px] font-mono font-black tracking-wider uppercase shadow-md">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>ATTACHED</span>
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-mono text-xs font-black p-2 text-center z-10">
                              + ADD TO {currentMagSection?.title}
                            </div>
                          )}

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
                      ADD NEW MAGAZINE SECTION (새 섹션 추가)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddSectionModal(false)}
                      className="p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white cursor-pointer"
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
                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
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

                  {/* Alternative Action: Auto-generate shortcut */}
                  <div className="p-3 bg-red-500/5 border border-red-500/20 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-black/70 dark:text-white/70">
                      여정의 사진과 스토리로 즉시 생성하시겠습니까?
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSectionModal(false);
                        setSelectedTripForAutoGenerate(localJourneys[0]?.id ?? null);
                        setShowAutoGenerateModal(true);
                      }}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>여정 자동 생성 →</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAddSectionModal(false)}
                      className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="px-5 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-85 transition-opacity"
                    >
                      CREATE SECTION
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Auto-Generate Section from Journey */}
            {showAutoGenerateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                <div className="w-full max-w-lg bg-white dark:bg-[#161616] border border-black dark:border-white p-6 shadow-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-red-600 dark:text-red-500" />
                      <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                        여정 선택 및 매거진 섹션 자동 생성 (AUTO-GENERATE)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAutoGenerateModal(false)}
                      className="p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed font-sans">
                    선택하신 여정의 커버 이미지, 갤러리 및 타임라인 사진을 수집하여 잡지 스타일의 매거진 이슈 섹션을 즉시 구성합니다.
                  </p>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/80 dark:text-white/80">
                      SELECT JOURNEY (생성할 여정 선택)
                    </label>
                    <select
                      value={selectedTripForAutoGenerate ?? ''}
                      onChange={e => setSelectedTripForAutoGenerate(Number(e.target.value))}
                      className="px-3 py-2.5 text-xs font-mono font-bold bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                    >
                      {localJourneys.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country} · {j.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const selected = localJourneys.find(j => Number(j.id) === Number(selectedTripForAutoGenerate));
                    if (!selected) return null;
                    return (
                      <div className="p-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center gap-3">
                        <div className="w-14 h-14 aspect-square bg-black/10 overflow-hidden shrink-0 border border-black/10">
                          <img src={getEffectiveImageUrl(selected.img)} alt={selected.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-black dark:text-white uppercase truncate">
                            {selected.title}
                          </div>
                          <div className="text-[11px] font-mono text-black/60 dark:text-white/60">
                            {selected.locationStr || selected.country} · {selected.date}
                          </div>
                          <div className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-0.5">
                            * 대표 커버, 갤러리 및 타임라인 사진으로 새 매거진 섹션이 자동 구성됩니다.
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAutoGenerateModal(false)}
                      className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      disabled={!selectedTripForAutoGenerate}
                      onClick={() => {
                        if (selectedTripForAutoGenerate) {
                          handleAutoGenerateSectionFromTrip(selectedTripForAutoGenerate);
                        }
                      }}
                      className="px-5 py-2 bg-red-600 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:bg-red-700 disabled:opacity-30 flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>GENERATE SECTION (자동 생성)</span>
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
            <div className="flex flex-col gap-1 border-b-2 border-black dark:border-white pb-4">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                WORLD MAP PREFERENCES
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                MAP SETTING
              </h2>
              <p className="text-xs text-black/60 dark:text-white/60 font-mono">
                [전세계 지도 타일셋 스타일 및 표시 옵션 설정]
              </p>
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
            <div className="flex flex-col gap-1 border-b-2 border-black dark:border-white pb-4">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                TRASH REPOSITORY
              </span>
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                  TRASH SETTING ({trashedJourneys.length + trashedSections.length})
                </h2>
                <span className="text-xs font-mono text-black/50 dark:text-white/50">
                  삭제된 여정 및 매거진 섹션은 영구 삭제 전까지 안전하게 보관됩니다.
                </span>
              </div>
            </div>

            {trashedJourneys.length === 0 && trashedSections.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-black/40 dark:text-white/40 font-mono text-xs">
                <Trash2 className="w-8 h-8 opacity-40 mb-1" />
                <span>휴지통이 비어 있습니다.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* 1. Trashed Magazine Sections */}
                {trashedSections.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                      MAGAZINE SECTIONS ({trashedSections.length})
                    </span>
                    <div className="flex flex-col gap-2">
                      {trashedSections.map(section => (
                        <div
                          key={section.id}
                          className="p-3.5 border border-red-500/20 bg-red-500/[0.02] flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-14 aspect-square border border-black/15 dark:border-white/15 shrink-0 overflow-hidden bg-black/10 flex items-center justify-center">
                              {section.heroImg || (section.items && section.items[0]?.img) ? (
                                <img
                                  src={getEffectiveImageUrl(section.heroImg || section.items[0]?.img || '')}
                                  alt={section.title}
                                  className="w-full h-full object-cover grayscale opacity-75"
                                />
                              ) : (
                                <BookOpen className="w-6 h-6 text-black/40 dark:text-white/40" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 bg-red-600/10 text-red-600 dark:text-red-400">
                                  MAGAZINE SECTION
                                </span>
                                <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                                  {section.items?.length || 0} items
                                </span>
                              </div>
                              <h4 className="text-sm font-black font-sans uppercase tracking-tight text-black dark:text-white truncate mt-0.5 line-through opacity-75">
                                {section.title}
                              </h4>
                              {section.subtitle && (
                                <span className="text-[11px] font-mono text-black/50 dark:text-white/50 block">
                                  {section.subtitle}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onRestoreMagazineSection && onRestoreMagazineSection(section.id)}
                              className="px-3 py-1.5 border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                              title="매거진 섹션 복원"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>RESTORE</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onPermanentDeleteMagazineSection && onPermanentDeleteMagazineSection(section.id)}
                              className="px-3 py-1.5 text-red-600 dark:text-red-400 border border-red-600/30 dark:border-red-400/30 text-xs font-mono font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                              title="영구 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>DELETE</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Trashed Journeys */}
                {trashedJourneys.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                      JOURNEYS ({trashedJourneys.length})
                    </span>
                    <div className="flex flex-col gap-2">
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
                              className="px-3 py-1.5 border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                              title="여정 복구"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>RESTORE</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`'${journey.title}' 여정을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                                  onPermanentDeleteJourney(journey.id);
                                }
                              }}
                              className="px-3 py-1.5 text-red-600 dark:text-red-400 border border-red-600/30 dark:border-red-400/30 text-xs font-mono font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
                              title="영구 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>DELETE</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: CLEANUP & DATABASE OPTIMIZER (데이터 클린화 및 최적화 도구)     */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'CLEANUP' && (
          <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-60px)] animate-in fade-in duration-200">
            {/* Header Title Section */}
            <div className="flex flex-col gap-2 border-b-2 border-black dark:border-white pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                    DATABASE INTEGRITY & REPOSITORY OPTIMIZER
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans flex items-center gap-2.5">
                    <Database className="w-6 h-6 sm:w-7 sm:h-7 text-red-600 dark:text-red-500" />
                    <span>CLEANUP & OPTIMIZE</span>
                  </h2>
                  <p className="text-xs text-black/60 dark:text-white/60 font-mono mt-1">
                    [데이터베이스 무결성 검사 및 불필요한 찌꺼기 / 고아 데이터 안전 선별 정리]
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanCleanup}
                    disabled={isScanning || isCleaning}
                    className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-wider font-sans hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-sm rounded-none disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>진단 검사 중...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>정밀 진단 스캔 (Scan)</span>
                      </>
                    )}
                  </button>

                  {diagReport && !diagReport.isClean && (
                    <button
                      type="button"
                      onClick={handleExecuteCleanup}
                      disabled={isScanning || isCleaning}
                      className="px-4 py-2 bg-red-600 text-white text-xs font-black uppercase tracking-wider font-sans hover:bg-red-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm rounded-none disabled:opacity-50"
                    >
                      {isCleaning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>정리 실행 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>안전 정리 실행 (Clean)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 0. Magazine Sections Firestore Direct Diagnostic Panel */}
            <div className="border border-red-500/40 bg-red-500/[0.03] p-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                    MAGAZINE SECTIONS FIRESTORE DIAGNOSTIC
                  </span>
                  <span className="text-xs text-black/70 dark:text-white/70">
                    Firestore에 실제 저장된 매거진 섹션 데이터를 직접 읽어서 확인하고 복구합니다.
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleLoadFirestoreMagazineSections}
                    disabled={isLoadingFirestoreMag}
                    className="px-3 py-2 bg-black text-white dark:bg-white dark:text-black text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:opacity-80 disabled:opacity-40 transition-all"
                  >
                    {isLoadingFirestoreMag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                    <span>Firestore 직접 읽기 (SCAN)</span>
                  </button>
                  {firestoreMagSections && firestoreMagSections.length > 0 && (
                    <button
                      type="button"
                      onClick={handleForceRestoreSectionsFromFirestore}
                      className="px-3 py-2 bg-emerald-600 text-white text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:bg-emerald-700 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>편집기로 불러오기 (RESTORE)</span>
                    </button>
                  )}
                  {sectionsList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleForceSaveCurrentSectionsToFirestore}
                      className="px-3 py-2 bg-red-600 text-white text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:bg-red-700 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>현재 섹션 강제 저장 (FORCE SAVE)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Diagnostic Result */}
              {firestoreMagSections !== null && (
                <div className="flex flex-col gap-2">
                  <div className={`flex items-center gap-2 text-xs font-mono font-bold ${firestoreMagSections.length > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {firestoreMagSections.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>
                      Firestore 저장 상태: {firestoreMagSections.length > 0 ? `${firestoreMagSections.length}개 섹션 발견 (데이터 존재)` : '❌ magazineSections 필드 없음 또는 빈 배열 (데이터 없음)'}
                    </span>
                    {firestoreMagLoadedAt && <span className="text-black/40 dark:text-white/40 text-[10px] font-normal ml-2">조회 시각: {firestoreMagLoadedAt}</span>}
                  </div>
                  {firestoreMagSections.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-black/10 dark:border-white/10 p-3 bg-white dark:bg-[#121212]">
                      {firestoreMagSections.map((sec, idx) => (
                        <div key={sec.id} className="flex items-center justify-between text-xs py-1 border-b border-black/5 dark:border-white/5 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-black/40 dark:text-white/40">#{idx + 1}</span>
                            <span className="font-bold text-black dark:text-white uppercase">{sec.title}</span>
                            <span className="text-black/50 dark:text-white/50 font-normal">{sec.subtitle}</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black/5 dark:bg-white/5">
                            {sec.items?.length || 0} items
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {firestoreMagSections.length === 0 && (
                    <div className="p-3 bg-red-500/5 border border-red-500/20 text-xs text-red-700 dark:text-red-400">
                      ⚠️ Firestore에 매거진 섹션 데이터가 없습니다. "현재 섹션 강제 저장 (FORCE SAVE)" 버튼으로 현재 편집기 섹션을 저장하거나, MAGAZINE 탭에서 섹션을 다시 구성 후 저장하세요.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 1. Absolute Safety Guarantee Notice Banner */}

            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block mb-0.5">
                  100% 안전 보장 원칙 (Zero Data Loss Safety Principle)
                </span>
                <span className="text-emerald-950 dark:text-emerald-200/80">
                  현재 등록되어 있는 모든 활성 여정({trips.length + plans.length}개) 및 연결된 타임라인, 사진, 항공, 숙소, 교통 데이터는 <strong>절대 삭제되지 않고 100% 온전히 보존</strong>됩니다. 오직 이미 삭제된 과거 여정의 고아(Orphaned) 문서 및 폐기된 <code className="px-1 py-0.5 bg-black/10 dark:bg-white/10 font-mono">subtitle</code> 속성만 안전하게 정리됩니다.
                </span>
              </div>
            </div>

            {/* 2. System Status Diagnostic Cards */}
            {isScanning ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                  Firestore & Cloudflare R2 스토리지 메타데이터 정밀 분석 중...
                </span>
              </div>
            ) : diagReport ? (
              <div className="flex flex-col gap-6">
                {/* Metrics 3-column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 1: Active Protected Data */}
                  <div className="p-4 bg-white dark:bg-[#161616] border border-black/15 dark:border-white/15 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                        PROTECTED ACTIVE DATA
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-black font-mono">
                        {diagReport.activeTripsCount} <span className="text-sm font-sans font-normal text-black/60 dark:text-white/60">Journeys</span>
                      </div>
                      <div className="text-xs text-black/60 dark:text-white/60 font-mono mt-1">
                        연결된 타임라인: {diagReport.activeTimelineCount}개 (보호됨)
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 w-fit">
                      100% HEALTHY & PRESERVED
                    </span>
                  </div>

                  {/* Card 2: Orphaned Documents */}
                  <div className={`p-4 bg-white dark:bg-[#161616] border flex flex-col justify-between gap-3 ${
                    (diagReport.orphanedTimelineDocs.length + diagReport.orphanedStaysDocs.length + diagReport.orphanedFlightsDocs.length + diagReport.orphanedTransitsDocs.length + diagReport.orphanedMagazineMoments.length) > 0
                      ? 'border-amber-500/50 bg-amber-500/[0.02]'
                      : 'border-black/15 dark:border-white/15'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                        ORPHANED DOCUMENTS
                      </span>
                      {(diagReport.orphanedTimelineDocs.length + diagReport.orphanedStaysDocs.length + diagReport.orphanedFlightsDocs.length + diagReport.orphanedTransitsDocs.length + diagReport.orphanedMagazineMoments.length) > 0 ? (
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-black font-mono">
                        {diagReport.orphanedTimelineDocs.length + diagReport.orphanedStaysDocs.length + diagReport.orphanedFlightsDocs.length + diagReport.orphanedTransitsDocs.length + diagReport.orphanedMagazineMoments.length}{' '}
                        <span className="text-sm font-sans font-normal text-black/60 dark:text-white/60">Items</span>
                      </div>
                      <div className="text-xs text-black/60 dark:text-white/60 font-mono mt-1">
                        과거 삭제 여정 잔여물 (타임라인/숙소/매거진 등)
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 w-fit ${
                      (diagReport.orphanedTimelineDocs.length + diagReport.orphanedStaysDocs.length + diagReport.orphanedFlightsDocs.length + diagReport.orphanedTransitsDocs.length + diagReport.orphanedMagazineMoments.length) > 0
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {(diagReport.orphanedTimelineDocs.length + diagReport.orphanedStaysDocs.length + diagReport.orphanedFlightsDocs.length + diagReport.orphanedTransitsDocs.length + diagReport.orphanedMagazineMoments.length) > 0
                        ? '정리 대상 발견 (CLEANUP READY)'
                        : '고아 데이터 없음 (CLEAN)'}
                    </span>
                  </div>

                  {/* Card 3: Magazine & Fields Optimization */}
                  <div className={`p-4 bg-white dark:bg-[#161616] border flex flex-col justify-between gap-3 ${
                    (diagReport.outOfSyncMagazineMoments.length + diagReport.deprecatedSubtitleDocs.length + diagReport.obsoleteStorageKeys.length) > 0
                      ? 'border-amber-500/50 bg-amber-500/[0.02]'
                      : 'border-black/15 dark:border-white/15'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                        OPTIMIZATION & CACHE
                      </span>
                      {(diagReport.outOfSyncMagazineMoments.length + diagReport.deprecatedSubtitleDocs.length + diagReport.obsoleteStorageKeys.length) > 0 ? (
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-black font-mono">
                        {diagReport.outOfSyncMagazineMoments.length + diagReport.deprecatedSubtitleDocs.length + diagReport.obsoleteStorageKeys.length}{' '}
                        <span className="text-sm font-sans font-normal text-black/60 dark:text-white/60">Items</span>
                      </div>
                      <div className="text-xs text-black/60 dark:text-white/60 font-mono mt-1">
                        매거진 동기화: {diagReport.outOfSyncMagazineMoments.length}개 / 폐기 필드: {diagReport.deprecatedSubtitleDocs.length}개 / 캐시: {diagReport.obsoleteStorageKeys.length}개
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 w-fit ${
                      (diagReport.outOfSyncMagazineMoments.length + diagReport.deprecatedSubtitleDocs.length + diagReport.obsoleteStorageKeys.length) > 0
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {(diagReport.outOfSyncMagazineMoments.length + diagReport.deprecatedSubtitleDocs.length + diagReport.obsoleteStorageKeys.length) > 0
                        ? '최적화 정리 권장'
                        : '최적화 상태 (OPTIMIZED)'}
                    </span>
                  </div>
                </div>

                {/* Detailed Findings Table */}
                <div className="flex flex-col gap-3 p-4 bg-white dark:bg-[#161616] border border-black/15 dark:border-white/15">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                    진단 상세 항목 (Detailed Audit Log)
                  </span>

                  {diagReport.isClean ? (
                    <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="text-xs font-bold font-sans">
                        데이터베이스가 완벽하게 최적화되어 있으며 정리할 불필요한 데이터가 없습니다.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto text-xs font-mono border border-black/10 dark:border-white/10 p-2 bg-black/[0.02] dark:bg-white/[0.02]">
                      {diagReport.orphanedTimelineDocs.map((item, idx) => (
                        <div key={`orph-timeline-${idx}`} className="flex items-center justify-between text-amber-700 dark:text-amber-300 py-0.5 border-b border-black/5 dark:border-white/5">
                          <span>[고아 타임라인 문서] ID: {item.id} (연결 여정 없음)</span>
                          <span className="text-[10px] px-1 bg-amber-500/10 font-bold">DELETE READY</span>
                        </div>
                      ))}
                      {diagReport.orphanedMagazineMoments.map((item, idx) => (
                        <div key={`orph-mag-${idx}`} className="flex items-center justify-between text-amber-700 dark:text-amber-300 py-0.5 border-b border-black/5 dark:border-white/5">
                          <span>[고아 매거진 카드] '{item.title}' (섹션: {item.sectionTitle} / 삭제된 여정 ID: {item.tripId})</span>
                          <span className="text-[10px] px-1 bg-amber-500/10 font-bold">DELETE READY</span>
                        </div>
                      ))}
                      {diagReport.outOfSyncMagazineMoments.map((item, idx) => (
                        <div key={`sync-mag-${idx}`} className="flex items-center justify-between text-blue-700 dark:text-blue-300 py-0.5 border-b border-black/5 dark:border-white/5">
                          <span>[매거진 최적화 대상] '{item.title}' ({item.reason})</span>
                          <span className="text-[10px] px-1 bg-blue-500/10 font-bold">OPTIMIZE READY</span>
                        </div>
                      ))}
                      {diagReport.orphanedStaysDocs.map((item, idx) => (
                        <div key={`orph-stay-${idx}`} className="flex items-center justify-between text-amber-700 dark:text-amber-300 py-0.5 border-b border-black/5 dark:border-white/5">
                          <span>[고아 숙소 문서] ID: {item.id}</span>
                          <span className="text-[10px] px-1 bg-amber-500/10 font-bold">DELETE READY</span>
                        </div>
                      ))}
                      {diagReport.orphanedFlightsDocs.map((item, idx) => (
                        <div key={`orph-flight-${idx}`} className="flex items-center justify-between text-amber-700 dark:text-amber-300 py-0.5 border-b border-black/5 dark:border-white/5">
                          <span>[고아 항공 문서] ID: {item.id}</span>
                          <span className="text-[10px] px-1 bg-amber-500/10 font-bold">DELETE READY</span>
                        </div>
                      ))}
                      {diagReport.orphanedTransitsDocs.map((item, idx) => (
                        <div key={`orph-transit-${idx}`} className="flex items-center justify-between text-amber-700 dark:text-amber-300 py-0.5 border-b border-black/5 dark:border-white/5">
                          <span>[고아 교통 문서] ID: {item.id}</span>
                          <span className="text-[10px] px-1 bg-amber-500/10 font-bold">DELETE READY</span>
                        </div>
                      ))}
                      {diagReport.deprecatedSubtitleDocs.map((item, idx) => (
                        <div key={`dep-sub-${idx}`} className="flex items-center justify-between text-blue-700 dark:text-blue-300 py-0.5 border-b border-black/5 dark:border-white/5">
                          <span>[폐기된 subtitle 필드] {item.collection} / {item.id}</span>
                          <span className="text-[10px] px-1 bg-blue-500/10 font-bold">STRIP FIELD</span>
                        </div>
                      ))}
                      {diagReport.obsoleteStorageKeys.map((key, idx) => (
                        <div key={`obs-key-${idx}`} className="flex items-center justify-between text-purple-700 dark:text-purple-300 py-0.5 border-b border-black/5 dark:border-white/5">
                          <span>[로컬 임시 키] {key}</span>
                          <span className="text-[10px] px-1 bg-purple-500/10 font-bold">CLEAR KEY</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Execution Log Terminal */}
                {cleanLog.length > 0 && (
                  <div className="flex flex-col gap-2 p-4 bg-black text-emerald-400 font-mono text-xs border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-white/60 text-[10px] uppercase font-bold border-b border-white/10 pb-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>실행 로그 (EXECUTION TERMINAL)</span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {cleanLog.map((log, idx) => (
                        <div key={idx}>{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center gap-4 bg-white dark:bg-[#161616] border border-black/15 dark:border-white/15 text-center p-6">
                <Database className="w-12 h-12 text-black/30 dark:text-white/30" />
                <div className="flex flex-col gap-1 max-w-md">
                  <span className="text-sm font-bold uppercase">시스템 최적화 진단 준비 완료</span>
                  <span className="text-xs text-black/60 dark:text-white/60 font-sans">
                    위의 <strong>'정밀 진단 스캔 (Scan)'</strong> 버튼을 클릭하여 Firestore 데이터베이스와 로컬 캐시의 찌꺼기 및 고아 데이터를 안전하게 진단하세요.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleScanCleanup}
                  className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-wider font-sans hover:opacity-90 transition-all cursor-pointer rounded-none"
                >
                  진단 스캔 시작하기
                </button>
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

      {/* Clean Success Modal */}
      <ConfirmModal
        isOpen={showCleanSuccessModal}
        title="OPTIMIZATION COMPLETE"
        message={`데이터베이스 최적화 및 안전 정리가 완료되었습니다.\n- 고아 문서/카드 정리: ${cleanupSummary?.orphanedDeleted ?? 0}건\n- 매거진 동기화 및 장소명 최적화: ${cleanupSummary?.magazineOptimized ?? 0}건\n- 폐기 속성(subtitle) 제거: ${cleanupSummary?.subtitleCleaned ?? 0}건\n- 로컬 임시 캐시 정리: ${cleanupSummary?.cacheCleaned ?? 0}건\n\n모든 활성 여정 및 타임라인 데이터는 100% 온전히 유지됩니다.`}
        confirmLabel="확인 (OK)"
        iconType="check"
        singleButton
        onConfirm={() => setShowCleanSuccessModal(false)}
        onCancel={() => setShowCleanSuccessModal(false)}
      />
    </main>
  );
}
