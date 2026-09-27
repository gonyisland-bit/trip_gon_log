import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Save, Upload, Calendar, Check } from 'lucide-react';
import {
  collection, getDocs, doc, getDoc, deleteDoc, updateDoc, deleteField, setDoc, onSnapshot,
  QuerySnapshot, DocumentData, query
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  Trip, Plan, MagazineMoment, MagazineSection, MagazineItem, MagazineHubConfig, ArchiveHubConfig,
  TimelineData, TimelineItem, TrashedMagazineSection, UserProfile, UserPermissions,
  LandingHeroMediaItem, HomeWidgetConfig, CityWeatherConfig
} from '../../types';
import { cleanAdministrativeDistricts } from '../../components/SummaryView';
import { sortJourneysByOrder } from '../../utils/journeyOrderHelper';
import { uploadFileToR2 } from '../../utils/storageHelper';
import { compressImage } from '../../utils/imageHelper';
import {
  resolveTimelinePlaceName, buildDefaultMagazineSections, computeEditorialLayoutTypes,
  syncSectionItemsWithTimeline
} from '../../utils/magazineHelper';
import {
  BgmTrack, DEFAULT_BGM_TRACKS, getStoredBgmTracks, saveStoredBgmTracks, getStoredBgmAutoplay,
  saveStoredBgmAutoplay, getStoredBgmDefaultVolume, saveStoredBgmDefaultVolume,
  getStoredBgmShuffle, saveStoredBgmShuffle, getStoredSlideshowInterval,
  saveStoredSlideshowInterval, bgmPlayer
} from '../../utils/audioHelper';
import {
  PresetTripPlan, getSavedPresets, restoreDefaultPresets, saveAllPresets, WORLD_COUNTRIES
} from '../../data/worldDestinations';

export interface ManageHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null, pushHistory?: boolean, tagFilter?: string | null, force?: boolean) => void;
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
    homeMagazineLimitParam?: number,
    magazineSectionsParam?: MagazineSection[],
    landingHeroImageParam?: string,
    landingHeroMediaParam?: LandingHeroMediaItem[]
  ) => Promise<void>;
  landingHeroImage?: string;
  landingHeroMedia?: LandingHeroMediaItem[];
  currentUserProfile?: UserProfile | null;
  isSuperAdmin?: boolean;
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
  onUpdateMagazineSections?: (sections: MagazineSection[]) => void;
  // Trash bin
  trashedJourneys: Trip[];
  trashedSections?: TrashedMagazineSection[];
  onRestoreJourney: (id: number) => Promise<void>;
  onPermanentDeleteJourney: (id: number) => Promise<void>;
  onDeleteMagazineSection?: (sectionId: string) => Promise<void>;
  onRestoreMagazineSection?: (sectionId: string) => Promise<void>;
  onPermanentDeleteMagazineSection?: (sectionId: string) => Promise<void>;
  onBatchPermanentDelete?: (params: { journeyIds: number[]; sectionIds: string[] }) => Promise<void>;
  isLoggedIn: boolean;
  isDarkMode: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  saveRef?: React.MutableRefObject<((showModal?: boolean) => Promise<void>) | null>;
  onSaveBgmSettings?: (
    tracks: BgmTrack[],
    autoplay?: boolean,
    defaultVolume?: number,
    shuffle?: boolean,
    defaultInterval?: number
  ) => Promise<void>;
}

export function useManageHubState(props: ManageHubPageProps) {
  const {
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
  landingHeroImage = '',
  landingHeroMedia = [],
  currentUserProfile,
  isSuperAdmin = false,
  onSaveAllHomeSettings,
  trashedJourneys,
  trashedSections = [],
  onRestoreJourney,
  onPermanentDeleteJourney,
  onDeleteMagazineSection,
  onRestoreMagazineSection,
  onPermanentDeleteMagazineSection,
  onBatchPermanentDelete,
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
  onUpdateMagazineSections,
  onDirtyChange,
  saveRef,
  onSaveBgmSettings,
  } = props;

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
      savedMagazineHubHeaderRef.current = {
        mainTitle: hubMainTitle,
        subtitle: hubSubtitle,
        badgeText: hubBadgeText,
        volumeText: hubVolumeText,
      };
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
      savedArchiveHubHeaderRef.current = {
        mainTitle: archiveHubMainTitle,
        subtitle: archiveHubSubtitle,
        badgeText: archiveHubBadgeText,
        volumeText: archiveHubVolumeText,
      };
      setArchiveHubHeaderSaveSuccess(true);
      setTimeout(() => setArchiveHubHeaderSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingArchiveHubHeader(false);
    }
  };

  // Top-level mode tabs ordered: 'HOME' | 'ARCHIVE' | 'CALENDAR' | 'MAGAZINE' | 'UTIL' | 'USERS'
  const [activeMode, setActiveMode] = useState<'HOME' | 'ARCHIVE' | 'CALENDAR' | 'MAGAZINE' | 'UTIL' | 'USERS'>(() => {
    const fromSession = sessionStorage.getItem('initialManageTab');
    if (fromSession && ['HOME', 'ARCHIVE', 'CALENDAR', 'MAGAZINE', 'UTIL', 'USERS'].includes(fromSession)) {
      sessionStorage.removeItem('initialManageTab');
      return fromSession as any;
    }
    if (fromSession && ['MAP', 'BGM', 'TRASH', 'CLEANUP', 'PRESETS'].includes(fromSession)) {
      sessionStorage.removeItem('initialManageTab');
      return 'UTIL';
    }
    return 'HOME';
  });

  // CALENDAR Tab State: Weather Cities Management (Central Firestore Sync & Guarded Dirty Tracking)
  const [calendarWeatherCities, setCalendarWeatherCities] = useState<CityWeatherConfig[]>(() => {
    try {
      const saved = localStorage.getItem('cached_calendar_weather_cities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      { name: '서울', nameEn: 'SEOUL', country: 'KR', lat: 37.5665, lng: 126.9780, timezone: 'Asia/Seoul' },
      { name: '도쿄', nameEn: 'TOKYO', country: 'JP', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
      { name: '오사카', nameEn: 'OSAKA', country: 'JP', lat: 34.6937, lng: 135.5023, timezone: 'Asia/Tokyo' },
      { name: '파리', nameEn: 'PARIS', country: 'FR', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
      { name: '제주', nameEn: 'JEJU', country: 'KR', lat: 33.4996, lng: 126.5312, timezone: 'Asia/Seoul' },
      { name: '후쿠오카', nameEn: 'FUKUOKA', country: 'JP', lat: 33.5904, lng: 130.4017, timezone: 'Asia/Tokyo' },
    ];
  });
  const [searchCalendarCityQuery, setSearchCalendarCityQuery] = useState<string>('');
  const [calendarCityMovedEn, setCalendarCityMovedEn] = useState<string | null>(null);
  const calendarCityMovedTimerRef = useRef<any>(null);
  const [isSavingCalendar, setIsSavingCalendar] = useState<boolean>(false);
  const [calendarSaveSuccess, setCalendarSaveSuccess] = useState<boolean>(false);

  // Snapshot of saved Calendar Weather Cities for accurate dirty checking
  const savedCalendarCitiesSnapshotRef = useRef<string>(JSON.stringify(calendarWeatherCities));

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.cities) && data.cities.length > 0) {
          // If current state matches saved snapshot (not dirty), sync with incoming Firestore data
          if (savedCalendarCitiesSnapshotRef.current === JSON.stringify(calendarWeatherCities)) {
            setCalendarWeatherCities(data.cities);
            savedCalendarCitiesSnapshotRef.current = JSON.stringify(data.cities);
            try {
              localStorage.setItem('cached_calendar_weather_cities', JSON.stringify(data.cities));
            } catch (_) {}
          }
        }
      }
    }, (err) => {
      console.warn("ManageHub calendar weather sync notice:", err);
    });
    return () => unsub();
  }, [calendarWeatherCities]);

  const handleAddCalendarWeatherCity = (
    placeName: string,
    coords: { lat: number; lng: number } | null,
    address: string,
    countryName?: string,
    cityName?: string
  ) => {
    if (!coords || !coords.lat || !coords.lng) return;
    const rawName = cityName || placeName || '도시';
    const cleaned = cleanAdministrativeDistricts(rawName);
    const finalName = cleaned || rawName;
    const finalEn = (cityName || placeName || 'CITY').toUpperCase().replace(/,\s*(SOUTH KOREA|KOREA|JAPAN|FRANCE|USA|VIETNAM|THAILAND|UK|SPAIN).*$/i, '').trim();
    const finalCountry = countryName || 'WORLD';
    let tz = 'UTC';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (_) {}

    const newCity: CityWeatherConfig = {
      name: finalName,
      nameEn: finalEn,
      country: finalCountry.slice(0, 2).toUpperCase(),
      lat: coords.lat,
      lng: coords.lng,
      timezone: tz
    };

    const exists = calendarWeatherCities.some(c => c.nameEn.toUpperCase() === newCity.nameEn.toUpperCase());
    if (exists) {
      alert('이미 등록된 도시입니다.');
      return;
    }
    const updated = [...calendarWeatherCities, newCity];
    setCalendarWeatherCities(updated);
    setSearchCalendarCityQuery('');
  };

  const handleMoveCalendarWeatherCity = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === calendarWeatherCities.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...calendarWeatherCities];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCalendarWeatherCities(updated);

    setCalendarCityMovedEn(temp.nameEn);
    if (calendarCityMovedTimerRef.current) clearTimeout(calendarCityMovedTimerRef.current);
    calendarCityMovedTimerRef.current = setTimeout(() => {
      setCalendarCityMovedEn(null);
    }, 1200);
  };

  const handleRemoveCalendarWeatherCity = (cityEn: string) => {
    if (calendarWeatherCities.length <= 1) {
      alert('최소 1개 이상의 날씨 지역이 필요합니다.');
      return;
    }
    const updated = calendarWeatherCities.filter(c => c.nameEn.toUpperCase() !== cityEn.toUpperCase());
    setCalendarWeatherCities(updated);
  };

  const handleSaveCalendarSettings = async () => {
    setIsSavingCalendar(true);
    try {
      localStorage.setItem('cached_calendar_weather_cities', JSON.stringify(calendarWeatherCities));
      await setDoc(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'), { cities: calendarWeatherCities }, { merge: true });
      savedCalendarCitiesSnapshotRef.current = JSON.stringify(calendarWeatherCities);
      setSaveRevision(prev => prev + 1);
      setCalendarSaveSuccess(true);
      setTimeout(() => setCalendarSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save calendar weather cities:', err);
      alert('캘린더 날씨 도시 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingCalendar(false);
    }
  };

  // PRESETS Management State
  const [utilSubTab, setUtilSubTab] = useState<'ui' | 'bgm' | 'map' | 'system'>('ui');
  const [presetsList, setPresetsList] = useState<PresetTripPlan[]>(() => getSavedPresets());
  const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');
  const [presetThemeFilter, setPresetThemeFilter] = useState<string>('all');
  const [editingPreset, setEditingPreset] = useState<PresetTripPlan | null>(null);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [presetToDelete, setPresetToDelete] = useState<PresetTripPlan | null>(null);
  const [isSavingPresets, setIsSavingPresets] = useState<boolean>(false);
  const [presetsSaveSuccess, setPresetsSaveSuccess] = useState<boolean>(false);
  const [showRestorePresetsConfirm, setShowRestorePresetsConfirm] = useState<boolean>(false);

  // Snapshot of saved Presets state for dirty checking
  const savedPresetsSnapshotRef = useRef<string>(JSON.stringify(getSavedPresets()));

  // Listen to external preset changes (e.g. from CreateTripModal or other windows)
  useEffect(() => {
    const handlePresetsChanged = () => {
      const current = getSavedPresets();
      setPresetsList(current);
      savedPresetsSnapshotRef.current = JSON.stringify(current);
    };
    window.addEventListener('tripPresetsChanged', handlePresetsChanged);
    return () => window.removeEventListener('tripPresetsChanged', handlePresetsChanged);
  }, []);

  // Landing Hero Media (Guest Mode) State - Array of Images & Videos
  const [localLandingHeroImage, setLocalLandingHeroImage] = useState<string>(landingHeroImage);
  const [localLandingHeroMedia, setLocalLandingHeroMedia] = useState<LandingHeroMediaItem[]>(() => {
    if (landingHeroMedia && landingHeroMedia.length > 0) return landingHeroMedia;
    if (landingHeroImage) {
      return [{ id: 'hero-legacy', url: landingHeroImage, type: 'image', title: 'LANDING HERO' }];
    }
    return [];
  });
  const [isUploadingLandingHero, setIsUploadingLandingHero] = useState<boolean>(false);
  const [isDraggingLandingHero, setIsDraggingLandingHero] = useState<boolean>(false);
  const [replacingLandingHeroIndex, setReplacingLandingHeroIndex] = useState<number | null>(null);
  const [dragOverLandingHeroIndex, setDragOverLandingHeroIndex] = useState<number | null>(null);
  const [isHeroJourneysAccordionOpen, setIsHeroJourneysAccordionOpen] = useState<boolean>(false);

  useEffect(() => {
    setLocalLandingHeroImage(landingHeroImage);
  }, [landingHeroImage]);

  useEffect(() => {
    if (landingHeroMedia && landingHeroMedia.length > 0) {
      setLocalLandingHeroMedia(landingHeroMedia);
    } else if (landingHeroImage) {
      setLocalLandingHeroMedia([{ id: 'hero-legacy', url: landingHeroImage, type: 'image', title: 'LANDING HERO' }]);
    } else {
      setLocalLandingHeroMedia([]);
    }
  }, [landingHeroMedia, landingHeroImage]);

  const handleLandingHeroUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (!isImage && !isVideo) {
      alert('이미지 또는 동영상 파일만 업로드 가능합니다.');
      return;
    }

    setIsUploadingLandingHero(true);
    try {
      let fileToUpload: File | Blob = file;
      if (isImage) {
        fileToUpload = await compressImage(file, 2560, 1600, 0.85);
      }
      const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
      const path = `hero/landing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const url = await uploadFileToR2(fileToUpload, path);
      
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').toUpperCase();
      const newItem: LandingHeroMediaItem = {
        id: `guest_media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url,
        type: isVideo ? 'video' : 'image',
        title: cleanTitle || (isVideo ? 'VIDEO SCENE' : 'PHOTO MOMENT')
      };

      setLocalLandingHeroMedia(prev => [...prev, newItem]);
      if (isImage && !localLandingHeroImage) {
        setLocalLandingHeroImage(url);
      }
    } catch (err) {
      console.error('Failed to upload landing hero media:', err);
      alert('게스트 랜딩 미디어 업로드에 실패했습니다.');
    } finally {
      setIsUploadingLandingHero(false);
    }
  };

  const handleReplaceLandingHeroMedia = async (index: number, file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (!isImage && !isVideo) {
      alert('이미지 또는 동영상 파일만 업로드 가능합니다.');
      return;
    }

    setReplacingLandingHeroIndex(index);
    try {
      let fileToUpload: File | Blob = file;
      if (isImage) {
        fileToUpload = await compressImage(file, 2560, 1600, 0.85);
      }
      const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
      const path = `hero/landing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const url = await uploadFileToR2(fileToUpload, path);
      
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').toUpperCase();
      setLocalLandingHeroMedia(prev => prev.map((m, idx) => idx === index ? {
        ...m,
        url,
        type: isVideo ? 'video' : 'image',
        title: cleanTitle || m.title || (isVideo ? 'VIDEO SCENE' : 'PHOTO MOMENT')
      } : m));

      if (index === 0 && isImage) {
        setLocalLandingHeroImage(url);
      }
    } catch (err) {
      console.error('Failed to replace landing hero media:', err);
      alert('게스트 랜딩 미디어 교체에 실패했습니다.');
    } finally {
      setReplacingLandingHeroIndex(null);
      setDragOverLandingHeroIndex(null);
    }
  };

  const handleRemoveLandingHeroMedia = (id: string) => {
    setLocalLandingHeroMedia(prev => prev.filter(item => item.id !== id));
  };

  const handleMoveLandingHeroMedia = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= localLandingHeroMedia.length) return;
    setLocalLandingHeroMedia(prev => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  // USERS Management State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState<boolean>(false);
  const [delegatingUser, setDelegatingUser] = useState<UserProfile | null>(null);
  const [isDelegatingModalOpen, setIsDelegatingModalOpen] = useState<boolean>(false);
  const [userActionToast, setUserActionToast] = useState<string | null>(null);

  // Admin Account Dynamic Management
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>(() => localStorage.getItem('cached_super_admin_email') || 'gonyisland@naver.com');
  const [newAdminEmailInput, setNewAdminEmailInput] = useState<string>('');
  const [adminEmailSaving, setAdminEmailSaving] = useState<boolean>(false);
  // User Table Filter State ('ALL' | 'PENDING' | 'APPROVED')
  const [userFilterStatus, setUserFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  // User Table Pagination State (20 per page)
  const [userCurrentPage, setUserCurrentPage] = useState<number>(1);
  const USERS_PER_PAGE = 20;

  // Always-on pending count (shows badge on USERS tab from any active tab)
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0);

  // Helper to determine if account is super admin or admin
  const isTargetAdminAccount = (email?: string, role?: string) => {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    return clean === 'gonyisland@naver.com' || clean === currentAdminEmail.toLowerCase().trim() || role === 'admin';
  };

  // Always listen to pending user count from public/users (reliable without security rule blocks)
  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubPendingPublic = onSnapshot(
      collection(db, 'users', 'public', 'users'),
      (snapshot) => {
        let count = 0;
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const cleanEmail = (data.email || '').toLowerCase().trim();
          const isAdminAcc = isTargetAdminAccount(cleanEmail, data.role);
          if (!isAdminAcc && data.status === 'pending') count++;
        });
        setPendingUsersCount(count);
      },
      (err) => {
        console.warn('Failed to listen to public pending users count, falling back:', err);
      }
    );
    return () => unsubPendingPublic();
  }, [isLoggedIn, currentAdminEmail]);

  useEffect(() => {
    if (activeMode !== 'USERS' || !isLoggedIn) return;

    // Dual-source user profile map to guarantee 100% visibility even under Firestore security rule limits
    const usersMap = new Map<string, UserProfile>();

    const updateCombinedList = () => {
      const combined = Array.from(usersMap.values());
      combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUsersList(combined);
    };

    // 1. Primary listener: public safe path (users/public/users)
    const unsubPublicUsers = onSnapshot(collection(db, 'users', 'public', 'users'), (snapshot: QuerySnapshot<DocumentData>) => {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.email) {
          const cleanEmail = data.email.toLowerCase().trim();
          const isAdminAcc = isTargetAdminAccount(cleanEmail, data.role);
          const finalRole = isAdminAcc ? 'admin' : (data.role || 'user');
          const finalStatus = isAdminAcc ? 'approved' : (data.status || 'approved');

          usersMap.set(docSnap.id, {
            uid: docSnap.id,
            email: data.email,
            username: data.username || '',
            profileType: data.profileType || 'icon',
            profileIcon: data.profileIcon || 'smile',
            profileImage: data.profileImage || '',
            lastName: data.lastName || '',
            firstName: data.firstName || '',
            birthdate: data.birthdate || '',
            phone: data.phone || '',
            role: finalRole,
            status: finalStatus,
            approvalToken: data.approvalToken || '',
            permissions: data.permissions || { canCreate: true, canEdit: isAdminAcc, canDelete: isAdminAcc },
            createdAt: data.createdAt || 0,
            lastActiveAt: data.lastActiveAt || 0,
          });
        }
      });
      updateCombinedList();
    }, (err: Error) => {
      console.warn('Notice: public/users listener notice:', err);
    });

    // 2. Secondary listener: root users collection (merges with public)
    const unsubRootUsers = onSnapshot(collection(db, 'users'), (snapshot: QuerySnapshot<DocumentData>) => {
      snapshot.forEach(docSnap => {
        if (docSnap.id === 'public') return; // Skip public root document
        const data = docSnap.data();
        if (data.email) {
          const cleanEmail = data.email.toLowerCase().trim();
          const isAdminAcc = isTargetAdminAccount(cleanEmail, data.role);
          const existing = usersMap.get(docSnap.id);
          const finalRole = isAdminAcc ? 'admin' : (data.role || existing?.role || 'user');
          const finalStatus = isAdminAcc ? 'approved' : (data.status || existing?.status || 'approved');

          usersMap.set(docSnap.id, {
            uid: docSnap.id,
            email: data.email,
            username: data.username || existing?.username || '',
            profileType: data.profileType || existing?.profileType || 'icon',
            profileIcon: data.profileIcon || existing?.profileIcon || 'smile',
            profileImage: data.profileImage || existing?.profileImage || '',
            lastName: data.lastName || existing?.lastName || '',
            firstName: data.firstName || existing?.firstName || '',
            birthdate: data.birthdate || existing?.birthdate || '',
            phone: data.phone || existing?.phone || '',
            role: finalRole,
            status: finalStatus,
            approvalToken: data.approvalToken || existing?.approvalToken || '',
            permissions: data.permissions || existing?.permissions || { canCreate: true, canEdit: isAdminAcc, canDelete: isAdminAcc },
            createdAt: data.createdAt || existing?.createdAt || 0,
            lastActiveAt: data.lastActiveAt || existing?.lastActiveAt || 0,
          });
        }
      });
      updateCombinedList();
    }, (err: Error) => {
      console.warn('Notice: root users listener restricted by rules, relying on public/users:', err);
    });

    // Listen to admin settings for dynamic superAdminEmail
    const unsubAdminConfig = onSnapshot(doc(db, 'users', 'public', 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.superAdminEmail && typeof data.superAdminEmail === 'string') {
          setCurrentAdminEmail(data.superAdminEmail);
        }
      }
    }, (err) => {
      console.warn('Failed to listen to admin settings:', err);
    });

    return () => {
      unsubPublicUsers();
      unsubRootUsers();
      unsubAdminConfig();
    };
  }, [activeMode, isLoggedIn, currentAdminEmail]);

  const handleUpdateAdminEmail = async () => {
    const trimmed = newAdminEmailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      alert("유효한 이메일 주소를 입력해 주세요.");
      return;
    }
    setAdminEmailSaving(true);
    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'admin'), {
        superAdminEmail: trimmed
      }, { merge: true });
      setCurrentAdminEmail(trimmed);
      try {
        localStorage.setItem('cached_super_admin_email', trimmed);
      } catch (_) {}
      setNewAdminEmailInput('');
      setUserActionToast(`최고 관리자 이메일이 [${trimmed}]로 변경되었습니다.`);
      setTimeout(() => setUserActionToast(null), 4000);
    } catch (err: any) {
      console.error("Failed to update admin email:", err);
      alert(`관리자 이메일 저장 실패: ${err?.message || err}`);
    } finally {
      setAdminEmailSaving(false);
    }
  };

  const handleApproveUser = async (user: UserProfile) => {
    try {
      await Promise.allSettled([
        updateDoc(doc(db, 'users', user.uid), { status: 'approved', approvedAt: Date.now() }),
        setDoc(doc(db, 'users', 'public', 'users', user.uid), { ...user, status: 'approved', approvedAt: Date.now() }, { merge: true }),
        deleteDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`))
      ]);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'approved' } : u));
      setUserActionToast(`[${user.lastName} ${user.firstName}] 님의 가입 신청이 승인되었습니다.`);
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to approve user:', err);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleRejectUser = async (user: UserProfile) => {
    if (!window.confirm(`[${user.lastName} ${user.firstName}] 님의 가입 신청을 거절하시겠습니까?`)) return;
    try {
      await Promise.allSettled([
        updateDoc(doc(db, 'users', user.uid), { status: 'rejected', rejectedAt: Date.now() }),
        setDoc(doc(db, 'users', 'public', 'users', user.uid), { ...user, status: 'rejected', rejectedAt: Date.now() }, { merge: true }),
        deleteDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`))
      ]);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'rejected' } : u));
      setUserActionToast(`[${user.lastName} ${user.firstName}] 님의 가입 신청이 거절되었습니다.`);
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to reject user:', err);
      alert('거절 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteUserByAdmin = async (user: UserProfile) => {
    if (isTargetAdminAccount(user.email, user.role)) {
      alert("관리자 계정은 삭제할 수 없습니다.");
      return;
    }
    const fullName = `${user.lastName} ${user.firstName}`.trim() || user.username || user.email;
    if (!window.confirm(`정말로 회원 [${fullName} (${user.email})] 계정을 영구 삭제하시겠습니까?\n모든 프로필 데이터가 완전히 제거됩니다.`)) return;

    try {
      await Promise.allSettled([
        deleteDoc(doc(db, 'users', user.uid)),
        deleteDoc(doc(db, 'users', 'public', 'users', user.uid)),
        deleteDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`))
      ]);
      setUsersList(prev => prev.filter(u => u.uid !== user.uid));
      setUserActionToast(`[${fullName}] 회원 계정이 영구 삭제되었습니다.`);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      alert(`회원 삭제 중 오류가 발생했습니다: ${err?.message || err}`);
    }
  };

  // Admins cannot set another member's password from the browser; Firebase emails a reset link instead
  const [passwordResetTarget, setPasswordResetTarget] = useState<UserProfile | null>(null);

  const handleSendPasswordReset = async () => {
    const user = passwordResetTarget;
    setPasswordResetTarget(null);
    if (!user?.email) return;
    const fullName = `${user.lastName} ${user.firstName}`.trim() || user.username || user.email;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setUserActionToast(`[${fullName}] 님에게 비밀번호 재설정 메일을 보냈습니다.`);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to send password reset email:', err);
      alert(`재설정 메일 발송 중 오류가 발생했습니다: ${err?.message || err}`);
    }
  };

  const handleToggleUserPermission = async (user: UserProfile, permKey: keyof UserPermissions) => {
    const currentVal = user.permissions?.[permKey] ?? false;
    const newVal = !currentVal;
    
    // Local state immediate update
    setUsersList(prev => prev.map(u => u.uid === user.uid ? {
      ...u,
      permissions: {
        ...u.permissions,
        [permKey]: newVal,
      }
    } : u));

    try {
      await Promise.allSettled([
        updateDoc(doc(db, 'users', user.uid), { [`permissions.${permKey}`]: newVal }),
        setDoc(doc(db, 'users', 'public', 'users', user.uid), { permissions: { ...(user.permissions || {}), [permKey]: newVal } }, { merge: true })
      ]);
      setUserActionToast(`[${user.lastName} ${user.firstName}] ${permKey.replace('can', '')} 권한이 ${newVal ? '활성화' : '비활성화'}되었습니다.`);
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to update permission:', err);
      alert('권한 변경 중 오류가 발생했습니다.');
    }
  };

  const handleSaveUserEdit = async (updated: Partial<UserProfile>) => {
    if (!editingUser) return;
    try {
      const cleanData: Record<string, any> = {};
      Object.entries(updated).forEach(([k, v]) => {
        if (v !== undefined) cleanData[k] = v;
      });

      await Promise.allSettled([
        setDoc(doc(db, 'users', editingUser.uid), cleanData, { merge: true }),
        setDoc(doc(db, 'users', 'public', 'users', editingUser.uid), cleanData, { merge: true })
      ]);
      setUsersList(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, ...cleanData } : u));
      setIsUserEditModalOpen(false);
      setEditingUser(null);
      setUserActionToast('유저 정보가 수정되었습니다.');
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to update user:', err);
      alert('유저 정보 수정에 실패했습니다.');
    }
  };

  const handleToggleTripAllowedEditor = async (tripId: number, targetUser: UserProfile) => {
    const trip = trips.find(t => t.id === tripId) || plans.find(p => p.id === tripId);
    if (!trip) return;
    const currentEditors = trip.allowedEditors || [];
    const hasAccess = currentEditors.includes(targetUser.uid) || currentEditors.includes(targetUser.email);
    const newEditors = hasAccess
      ? currentEditors.filter(id => id !== targetUser.uid && id !== targetUser.email)
      : [...currentEditors, targetUser.uid];

    await onSaveTrip(tripId, { allowedEditors: newEditors });
    setUserActionToast(`[${trip.title}] 여정 편집 권한이 ${!hasAccess ? '부여' : '회수'}되었습니다.`);
    setTimeout(() => setUserActionToast(null), 2500);
  };

  // BGM Playlist Management State
  const [bgmTracks, setBgmTracks] = useState<BgmTrack[]>(() => getStoredBgmTracks());
  const [bgmAutoplay, setBgmAutoplay] = useState<boolean>(() => getStoredBgmAutoplay());
  const [bgmDefaultVolume, setBgmDefaultVolume] = useState<number>(() => getStoredBgmDefaultVolume());
  const [bgmShuffle, setBgmShuffle] = useState<boolean>(() => getStoredBgmShuffle());
  const [slideshowInterval, setSlideshowInterval] = useState<number>(() => getStoredSlideshowInterval());
  const [isUploadingBgm, setIsUploadingBgm] = useState<boolean>(false);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [isDraggingBgmFile, setIsDraggingBgmFile] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmFileInputRef = useRef<HTMLInputElement | null>(null);

  // Snapshot of saved BGM state for dirty checking and rollback
  const savedBgmSnapshotRef = useRef<{
    tracksJson: string;
    autoplay: boolean;
    defaultVolume: number;
    shuffle: boolean;
    interval: number;
  }>({
    tracksJson: JSON.stringify(getStoredBgmTracks()),
    autoplay: getStoredBgmAutoplay(),
    defaultVolume: getStoredBgmDefaultVolume(),
    shuffle: getStoredBgmShuffle(),
    interval: getStoredSlideshowInterval(),
  });

  // Stop preview audio when unmounting
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const handleToggleBgmTrack = (id: string) => {
    const updated = bgmTracks.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t));
    setBgmTracks(updated);
  };

  const handleMoveBgmTrack = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= bgmTracks.length) return;
    const next = [...bgmTracks];
    const [item] = next.splice(index, 1);
    next.splice(targetIdx, 0, item);
    setBgmTracks(next);
  };

  const handleDeleteBgmTrack = (id: string) => {
    if (previewTrackId === id && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewTrackId(null);
    }
    const updated = bgmTracks.filter(t => t.id !== id);
    setBgmTracks(updated);
  };

  const handleRestoreDefaultBgm = () => {
    setBgmTracks(DEFAULT_BGM_TRACKS);
  };

  const handleToggleBgmAutoplay = (val: boolean) => {
    setBgmAutoplay(val);
  };

  const handleTogglePreviewTrack = (track: BgmTrack) => {
    if (previewTrackId === track.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewTrackId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    const audio = new Audio(track.url);
    previewAudioRef.current = audio;
    audio.addEventListener('ended', () => setPreviewTrackId(null));
    audio
      .play()
      .then(() => {
        setPreviewTrackId(track.id);
      })
      .catch(err => {
        console.warn('Audio preview failed:', err);
        setPreviewTrackId(null);
      });
  };

  const handleBgmFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingBgm(true);
    try {
      const newTracks: BgmTrack[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|wav|aac|ogg)$/i.test(file.name)) {
          alert(`${file.name}은(는) 지원되지 않는 오디오 파일 형식입니다.`);
          continue;
        }

        const path = `bgm/${Date.now()}_${file.name}`;
        let publicUrl = '';
        try {
          publicUrl = await uploadFileToR2(file, path);
        } catch (uploadErr) {
          console.warn('R2 upload failed, fallback to local blob:', uploadErr);
          publicUrl = URL.createObjectURL(file);
        }

        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        newTracks.push({
          id: `bgm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: cleanTitle,
          url: publicUrl,
          enabled: true,
        });
      }

      if (newTracks.length > 0) {
        const updated = [...bgmTracks, ...newTracks];
        setBgmTracks(updated);
      }
    } catch (err) {
      console.error('Failed to upload BGM:', err);
      alert('음원 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingBgm(false);
      if (bgmFileInputRef.current) bgmFileInputRef.current.value = '';
    }
  };

  // PRESET Management Handlers
  const handleOpenNewPreset = () => {
    setEditingPreset({
      id: `preset_custom_${Date.now()}`,
      title: '',
      subtitle: '',
      country: '',
      city: '',
      durationDays: 4,
      tags: [],
      coverImg: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
      theme: 'culture',
      highlights: [],
      schedule: [],
      isCustom: true
    });
    setIsPresetModalOpen(true);
  };

  const handleOpenEditPreset = (preset: PresetTripPlan) => {
    setEditingPreset({ ...preset, highlights: [...preset.highlights] });
    setIsPresetModalOpen(true);
  };

  const handleSavePresetModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset || !editingPreset.title.trim()) return;
    const nextList = [...presetsList];
    const idx = nextList.findIndex(p => p.id === editingPreset.id);
    if (idx >= 0) {
      nextList[idx] = { ...editingPreset, isCustom: true };
    } else {
      nextList.unshift({ ...editingPreset, isCustom: true });
    }
    setPresetsList(nextList);
    setIsPresetModalOpen(false);
    setEditingPreset(null);
  };

  const handleDeletePresetClick = (preset: PresetTripPlan) => {
    setPresetToDelete(preset);
  };

  const handleConfirmDeletePreset = () => {
    if (!presetToDelete) return;
    const nextList = presetsList.filter(p => p.id !== presetToDelete.id);
    setPresetsList(nextList);
    setPresetToDelete(null);
  };

  const handleConfirmRestorePresets = () => {
    const restored = restoreDefaultPresets();
    setPresetsList(restored);
    savedPresetsSnapshotRef.current = JSON.stringify(restored);
    setShowRestorePresetsConfirm(false);
  };

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
  const [isSavingMagazine, setIsSavingMagazine] = useState(false);
  const [magazineSaveSuccess, setMagazineSaveSuccess] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [selectedTripForAutoGenerate, setSelectedTripForAutoGenerate] = useState<number | null>(null);

  // Set of trip IDs that have dedicated magazine sections created (excluding main default curation section)
  const existingTripIds = useMemo(() => {
    const ids = new Set<number>();
    sectionsList.forEach(s => {
      // Exclude main / default curation section
      if (s.isDefault || s.id === 'main') return;
      if (s.heroTripId !== undefined && s.heroTripId !== null) {
        ids.add(Number(s.heroTripId));
      } else if (s.id && s.id.startsWith('trip-section-')) {
        const parts = s.id.split('-');
        const tId = Number(parts[2]);
        if (!isNaN(tId)) ids.add(tId);
      }
    });
    return ids;
  }, [sectionsList]);

  // Magazine Undo / Redo Snapshot Stack (History)
  const [magUndoStack, setMagUndoStack] = useState<MagazineSection[][]>([]);
  const [magRedoStack, setMagRedoStack] = useState<MagazineSection[][]>([]);

  // Firestore magazine sections direct diagnostic state
  // Restore Lost Magazine Sections state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [availableBackups, setAvailableBackups] = useState<{ key: string; label: string; count: number; sections: MagazineSection[] }[]>([]);

  const handleOpenRestoreModal = () => {
    const backups: { key: string; label: string; count: number; sections: MagazineSection[] }[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cached_magazine_sections_backup_') || k === 'cached_magazine_sections')) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const tsMatch = k.match(/\d+$/);
                const dateStr = tsMatch ? new Date(Number(tsMatch[0])).toLocaleString() : (k === 'cached_magazine_sections' ? '최근 로컬 캐시' : k);
                backups.push({
                  key: k,
                  label: `${dateStr} (${parsed.length}개 섹션)`,
                  count: parsed.length,
                  sections: parsed,
                });
              }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
    setAvailableBackups(backups.sort((a, b) => b.key.localeCompare(a.key)));
    setShowRestoreModal(true);
  };

  const handleRestoreDefaultSections = () => {
    pushMagazineSnapshot();
    const defaults = buildDefaultMagazineSections(trips);
    const hasMain = sectionsList.some(s => s.isDefault || s.id === 'main');
    let updated = [...sectionsList];
    if (!hasMain && defaults.length > 0) {
      updated.unshift(defaults[0]);
    }
    defaults.slice(1).forEach(defSec => {
      const exists = updated.some(s => s.title === defSec.title || (defSec.heroTripId && s.heroTripId === defSec.heroTripId));
      if (!exists) {
        updated.push(defSec);
      }
    });
    const reordered = updated.map((sec, idx) => ({ ...sec, order: idx }));
    setSectionsList(reordered);
    if (reordered.length > 0) {
      setActiveMagSectionId(reordered[0].id);
    }
    if (onUpdateMagazineSections) onUpdateMagazineSections(reordered);
    setShowRestoreModal(false);
    alert(`기본 매거진 홈 및 추천 섹션 ${reordered.length - sectionsList.length}개가 복구되었습니다.\n"SAVE MAGAZINE SETTINGS" 또는 "SAVE ALL" 버튼을 눌러 영구 저장하세요.`);
  };

  const handleApplyBackup = (sections: MagazineSection[]) => {
    if (!sections || sections.length === 0) return;
    if (!confirm(`선택한 백업(${sections.length}개 섹션)으로 복원하시겠습니까?\n현재 변경사항은 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.`)) return;
    pushMagazineSnapshot();
    const reordered = sections.map((s, idx) => ({ ...s, order: idx }));
    setSectionsList(reordered);
    if (reordered.length > 0) {
      setActiveMagSectionId(reordered[0].id);
    }
    if (onUpdateMagazineSections) onUpdateMagazineSections(reordered);
    setShowRestoreModal(false);
    alert(`백업 데이터(${reordered.length}개 섹션)가 복원되었습니다.\n"SAVE MAGAZINE SETTINGS" 또는 "SAVE ALL" 버튼을 눌러 최종 저장하세요.`);
  };

  // Firestore magazine sections direct diagnostic state
  const [firestoreMagSections, setFirestoreMagSections] = useState<MagazineSection[] | null>(null);
  const [isLoadingFirestoreMag, setIsLoadingFirestoreMag] = useState(false);
  const [firestoreMagLoadedAt, setFirestoreMagLoadedAt] = useState<string | null>(null);

  const isLocalEditingRef = useRef(false);

  useEffect(() => {
    if (magazineSections && magazineSections.length > 0) {
      if (isLocalEditingRef.current) {
        // Local edit just performed; consume echo without overwriting local state
        isLocalEditingRef.current = false;
        return;
      }
      setSectionsList(prev => {
        // Deep comparison to avoid unnecessary state updates & re-render loops
        if (JSON.stringify(prev) === JSON.stringify(magazineSections)) {
          return prev;
        }
        return magazineSections;
      });
    }
  }, [magazineSections]);

  // Keep parent App state & localStorage in sync with latest sectionsList
  useEffect(() => {
    if (sectionsList && sectionsList.length > 0) {
      isLocalEditingRef.current = true;
      if (onUpdateMagazineSections) {
        onUpdateMagazineSections(sectionsList);
      }
      try {
        localStorage.setItem('cached_magazine_sections', JSON.stringify(sectionsList));
      } catch (_) {}
    }
  }, [sectionsList, onUpdateMagazineSections]);

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
  const [editStatusBadge, setEditStatusBadge] = useState<'' | 'NEW' | 'EDITING' | 'PLAN'>('');
  const [archiveMediaTab, setArchiveMediaTab] = useState<'main' | 'hero'>('main');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchedCountries = useMemo(() => {
    if (!editCountry.trim()) return [];
    const q = editCountry.trim().toLowerCase();
    return WORLD_COUNTRIES.filter(c => 
      c.nameKo.toLowerCase().includes(q) || 
      c.nameEn.toLowerCase().includes(q) || 
      c.code.toLowerCase() === q ||
      c.aliases?.some(a => a.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [editCountry]);

  const parsedDateInputs = useMemo(() => {
    if (!editDate) return { start: '', end: '' };
    const parts = editDate.split(/[-~]/).map(p => p.trim());
    const toIso = (s: string) => {
      if (!s) return '';
      const clean = s.replace(/\./g, '-').trim();
      const m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) {
        return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      }
      return '';
    };
    return {
      start: toIso(parts[0]),
      end: parts.length > 1 ? toIso(parts[1]) : ''
    };
  }, [editDate]);

  const handleStartDateChange = (newStartIso: string) => {
    const startDot = newStartIso ? newStartIso.replace(/-/g, '.') : '';
    const endDot = parsedDateInputs.end ? parsedDateInputs.end.replace(/-/g, '.') : '';
    if (startDot && endDot) {
      setEditDate(`${startDot} - ${endDot}`);
    } else if (startDot) {
      setEditDate(startDot);
    } else {
      setEditDate(endDot);
    }
  };

  const handleEndDateChange = (newEndIso: string) => {
    const startDot = parsedDateInputs.start ? parsedDateInputs.start.replace(/-/g, '.') : '';
    const endDot = newEndIso ? newEndIso.replace(/-/g, '.') : '';
    if (startDot && endDot) {
      setEditDate(`${startDot} - ${endDot}`);
    } else if (endDot) {
      setEditDate(endDot);
    } else {
      setEditDate(startDot);
    }
  };

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
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [showQuickPhotoPicker, setShowQuickPhotoPicker] = useState(false);
  const [inlineAddMenuCardId, setInlineAddMenuCardId] = useState<string | null>(null);

  // Scroll to Top state and handlers for ManageHub containers
  const [showScrollTop, setShowScrollTop] = useState(false);
  const activeScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const st = e.currentTarget.scrollTop;
    if (st > 300) {
      if (!showScrollTop) setShowScrollTop(true);
    } else {
      if (showScrollTop) setShowScrollTop(false);
    }
    activeScrollContainerRef.current = e.currentTarget;
  };

  useEffect(() => {
    const handleWinScroll = () => {
      if (window.scrollY > 300) {
        if (!showScrollTop) setShowScrollTop(true);
      } else if (!activeScrollContainerRef.current || activeScrollContainerRef.current.scrollTop <= 300) {
        if (showScrollTop) setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleWinScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWinScroll);
  }, [showScrollTop]);

  const scrollToTop = () => {
    if (activeScrollContainerRef.current) {
      activeScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset scroll top visibility when activeMode changes
  useEffect(() => {
    setShowScrollTop(false);
  }, [activeMode]);

  // ── TRASH REPOSITORY STATE & SELECTION ──
  const [selectedTrashJourneyIds, setSelectedTrashJourneyIds] = useState<number[]>([]);
  const [selectedTrashSectionIds, setSelectedTrashSectionIds] = useState<string[]>([]);
  const [isDeletingTrash, setIsDeletingTrash] = useState(false);
  const [trashDeleteModal, setTrashDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  // Clear selections when activeMode changes
  useEffect(() => {
    setSelectedTrashJourneyIds([]);
    setSelectedTrashSectionIds([]);
  }, [activeMode]);

  const handleToggleSelectAllTrash = () => {
    const totalCount = trashedJourneys.length + trashedSections.length;
    const selectedCount = selectedTrashJourneyIds.length + selectedTrashSectionIds.length;
    if (selectedCount === totalCount && totalCount > 0) {
      setSelectedTrashJourneyIds([]);
      setSelectedTrashSectionIds([]);
    } else {
      setSelectedTrashJourneyIds(trashedJourneys.map(j => j.id));
      setSelectedTrashSectionIds(trashedSections.map(s => s.id));
    }
  };

  const handleToggleTrashJourney = (id: number) => {
    setSelectedTrashJourneyIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleTrashSection = (id: string) => {
    setSelectedTrashSectionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const requestPermanentDeleteSingleJourney = (journey: Trip) => {
    setTrashDeleteModal({
      isOpen: true,
      title: 'PERMANENT DELETE',
      message: `'${journey.title}' 여정을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        try {
          setIsDeletingTrash(true);
          await onPermanentDeleteJourney(journey.id);
          setSelectedTrashJourneyIds(prev => prev.filter(x => x !== journey.id));
        } finally {
          setIsDeletingTrash(false);
        }
      },
    });
  };

  const requestPermanentDeleteSingleSection = (section: TrashedMagazineSection) => {
    setTrashDeleteModal({
      isOpen: true,
      title: 'PERMANENT DELETE',
      message: `'${section.title}' 매거진 섹션을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        if (!onPermanentDeleteMagazineSection) return;
        try {
          setIsDeletingTrash(true);
          await onPermanentDeleteMagazineSection(section.id);
          setSelectedTrashSectionIds(prev => prev.filter(x => x !== section.id));
        } finally {
          setIsDeletingTrash(false);
        }
      },
    });
  };

  const handleBatchRestoreSelectedTrash = async () => {
    const journeyIds = [...selectedTrashJourneyIds];
    const sectionIds = [...selectedTrashSectionIds];
    if (journeyIds.length === 0 && sectionIds.length === 0) return;
    for (const jId of journeyIds) {
      await onRestoreJourney(jId);
    }
    if (onRestoreMagazineSection) {
      for (const sId of sectionIds) {
        await onRestoreMagazineSection(sId);
      }
    }
    setSelectedTrashJourneyIds([]);
    setSelectedTrashSectionIds([]);
  };

  const requestBatchDeleteSelected = () => {
    const totalSelected = selectedTrashJourneyIds.length + selectedTrashSectionIds.length;
    if (totalSelected === 0) return;

    setTrashDeleteModal({
      isOpen: true,
      title: 'PERMANENT DELETE',
      message: `선택한 ${totalSelected}개 항목을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        try {
          setIsDeletingTrash(true);
          if (onBatchPermanentDelete) {
            await onBatchPermanentDelete({
              journeyIds: selectedTrashJourneyIds,
              sectionIds: selectedTrashSectionIds,
            });
          } else {
            for (const jId of selectedTrashJourneyIds) {
              await onPermanentDeleteJourney(jId);
            }
            if (onPermanentDeleteMagazineSection) {
              for (const sId of selectedTrashSectionIds) {
                await onPermanentDeleteMagazineSection(sId);
              }
            }
          }
          setSelectedTrashJourneyIds([]);
          setSelectedTrashSectionIds([]);
        } finally {
          setIsDeletingTrash(false);
        }
      },
    });
  };

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
      return report;
    } catch (err: any) {
      console.error('Diagnostic scan error:', err);
      alert(`데이터베이스 진단 스캔 중 오류가 발생했습니다:\n${err?.message || err}`);
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecuteCleanup = async (reportParam?: DiagnosticReport, skipConfirm = false) => {
    const targetReport = reportParam || diagReport;
    if (!targetReport) return;
    if (!skipConfirm && !confirm('안전 최적화 및 찌꺼기 정리를 실행하시겠습니까?\n\n[안전 보장 원칙]\n- 현재 등록된 모든 활성 여정 및 타임라인 데이터는 100% 안전하게 온전히 보존됩니다.\n- 이미 삭제된 과거 여정의 고아(Orphaned) 문서와 폐기된 subtitle 속성만 선별 정리됩니다.\n- 매거진은 원본 타임라인 데이터를 기준으로 완벽하게 최적화 및 동기화됩니다.')) {
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
      for (const item of targetReport.orphanedTimelineDocs) {
        await deleteDoc(doc(db, 'users', uid, 'timeline', item.id));
        orphanedDeleted++;
        logs.push(`- [타임라인] 고아 문서 안전 제거 (ID: ${item.id})`);
      }

      // 2. Delete orphaned stays
      for (const item of targetReport.orphanedStaysDocs) {
        await deleteDoc(doc(db, 'users', uid, 'stays', item.id));
        orphanedDeleted++;
        logs.push(`- [숙소] 고아 문서 안전 제거 (ID: ${item.id})`);
      }

      // 3. Delete orphaned flights
      for (const item of targetReport.orphanedFlightsDocs) {
        await deleteDoc(doc(db, 'users', uid, 'flights', item.id));
        orphanedDeleted++;
        logs.push(`- [항공] 고아 문서 안전 제거 (ID: ${item.id})`);
      }

      // 4. Delete orphaned transits
      for (const item of targetReport.orphanedTransitsDocs) {
        await deleteDoc(doc(db, 'users', uid, 'transits', item.id));
        orphanedDeleted++;
        logs.push(`- [교통] 고아 문서 안전 제거 (ID: ${item.id})`);
      }

      // 5. Clean deprecated subtitle field
      for (const item of targetReport.deprecatedSubtitleDocs) {
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
      for (const key of targetReport.obsoleteStorageKeys) {
        localStorage.removeItem(key);
        cacheCleaned++;
        logs.push(`- [로컬 캐시] 폐기된 임시 키 정리: ${key}`);
      }

      // 7. Clean and Optimize Magazine Moments
      if (targetReport.orphanedMagazineMoments.length > 0 || targetReport.outOfSyncMagazineMoments.length > 0) {
        const orphanedMomentIds = new Set(targetReport.orphanedMagazineMoments.map(m => m.momentId));
        
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

  /** TRASH 탭 통합: 스캔과 안전 정리를 원터치로 한 번에 실행 */
  const handleOneTouchOptimize = async () => {
    if (isScanning || isCleaning) return;
    setIsScanning(true);
    setCleanLog([`[${new Date().toLocaleTimeString()}] 🔍 데이터베이스 무결성 정밀 스캔 시작...`]);
    try {
      const report = await handleScanCleanup();
      if (!report) {
        setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ 스캔 중 오류가 발생했습니다.`]);
        return;
      }
      if (!report.isClean) {
        setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚠️ 정리 대상 발견: 고아 문서 및 캐시 자동 정리 진행...`]);
        await handleExecuteCleanup(report, true);
      } else {
        setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ 모든 데이터가 100% 정상 최적화 상태입니다 (정리할 찌꺼기 없음).`]);
      }
    } catch (err: any) {
      console.error('One-touch optimize error:', err);
      setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ 최적화 중 오류: ${err?.message || err}`]);
    } finally {
      setIsScanning(false);
      setIsCleaning(false);
    }
  };

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Selected Journey memo
  const selectedJourney = useMemo(() => {
    return localJourneys.find(j => j.id === selectedJourneyId);
  }, [localJourneys, selectedJourneyId]);

  // ── HOME Bottom Widgets Configuration State (Calendar & Weather) ──
  const [widgetShowCalendar, setWidgetShowCalendar] = useState<boolean>(true);
  const [widgetShowWeather, setWidgetShowWeather] = useState<boolean>(true);
  const [widgetOrder, setWidgetOrder] = useState<'calendar-first' | 'weather-first'>('calendar-first');
  const [widgetShowExchange, setWidgetShowExchange] = useState<boolean>(false);
  const [widgetShowDDay, setWidgetShowDDay] = useState<boolean>(false);
  const [widgetCities, setWidgetCities] = useState<CityWeatherConfig[]>([]);
  const [isAddingWeatherCity, setIsAddingWeatherCity] = useState<boolean>(false);
  const [newCitySearchQuery, setNewCitySearchQuery] = useState<string>('');
  const savedHomeWidgetsSnapshotRef = useRef<string>('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', 'public', 'settings', 'home_widgets'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as HomeWidgetConfig;
        setWidgetShowCalendar(data.showCalendarArchive ?? true);
        setWidgetShowWeather(data.showLiveWeather ?? true);
        setWidgetOrder(data.widgetOrder || 'calendar-first');
        setWidgetShowExchange(Boolean(data.showExchangeRates));
        setWidgetShowDDay(Boolean(data.showUpcomingDDay));
        const cities = Array.isArray(data.cities) ? data.cities : [];
        setWidgetCities(cities);
        savedHomeWidgetsSnapshotRef.current = JSON.stringify({
          showCalendarArchive: data.showCalendarArchive ?? true,
          showLiveWeather: data.showLiveWeather ?? true,
          widgetOrder: data.widgetOrder || 'calendar-first',
          showExchangeRates: Boolean(data.showExchangeRates),
          showUpcomingDDay: Boolean(data.showUpcomingDDay),
          cities
        });
      }
    }, (err) => {
      console.warn("ManageHub home_widgets fetch notice:", err);
    });
    return () => unsub();
  }, []);

  const handleAddHomeWeatherCity = (
    placeName: string, 
    coords: { lat: number; lng: number } | null, 
    address: string, 
    countryName?: string, 
    cityName?: string
  ) => {
    const finalName = cityName || placeName || '도시';
    const finalEn = (cityName || placeName || 'CITY').toUpperCase();
    const finalCountry = countryName || 'WORLD';
    const finalLat = coords ? coords.lat : 37.5665;
    const finalLng = coords ? coords.lng : 126.9780;
    
    let timezone = 'UTC';
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (_) {}

    const newCity: CityWeatherConfig = {
      name: finalName,
      nameEn: finalEn,
      country: finalCountry,
      lat: finalLat,
      lng: finalLng,
      timezone
    };

    const exists = widgetCities.some(c => c.nameEn.toUpperCase() === newCity.nameEn.toUpperCase());
    if (exists) {
      alert('이미 등록된 도시입니다.');
      return;
    }
    setWidgetCities(prev => [...prev, newCity]);
    setIsAddingWeatherCity(false);
    setNewCitySearchQuery('');
  };

  const handleRemoveHomeWeatherCity = (idx: number) => {
    setWidgetCities(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveHomeWeatherCity = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === widgetCities.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    setWidgetCities(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  // ── Snapshot References for instant and reliable Dirty tracking ──
  const savedHomeSnapshotRef = useRef({
    title: homeTitle || '',
    subtitle: homeSubtitle || '',
    homeJourneyLimit: parseInt(localStorage.getItem('home_journey_limit') || '4', 10),
    selectedHeroIds: JSON.stringify(heroJourneyIds || []),
    autoSlide: heroAutoSlide,
    slideDuration: heroSlideDuration || 6,
    mediaType: heroMediaType || 'image',
    showMarquee: marqueeShow,
    homeMarquee: marqueeMessage || '',
    homeSpeed: marqueeSpeed || 50,
    gradientEnabled: homeGradientEnabled ?? false,
    gradientFrom: homeGradientFrom || '#F7F2EB',
    gradientTo: homeGradientTo || '#E7DEC8',
    homeMagSectionId: homeMagazineSectionId || 'main',
    homeMagLimit: homeMagazineLimit || 6,
    landingHeroImage: landingHeroImage || '',
    landingHeroMedia: JSON.stringify(landingHeroMedia || []),
  });

  const savedArchiveSnapshotRef = useRef<Record<number, string>>({});

  // Saved sections snapshot reference to track magazine mutations accurately
  const savedSectionsJsonRef = useRef<string>(JSON.stringify(magazineSections && magazineSections.length > 0 ? magazineSections : sectionsList));

  const savedArchiveHubHeaderRef = useRef({
    mainTitle: archiveHubConfig?.mainTitle || 'A VISUAL CHRONICLE OF JOURNEYS & TRAVEL ARCHIVES',
    subtitle: archiveHubConfig?.subtitle || '발걸음이 닿았던 모든 도시와 찬란했던 시간의 기록. 엄선된 사진과 함께 지난 여정들을 다시 마주합니다.',
    badgeText: archiveHubConfig?.badgeText || 'JOURNEY ARCHIVE',
    volumeText: archiveHubConfig?.volumeText || `VOL. ${new Date().getFullYear()}`,
  });

  const savedMagazineHubHeaderRef = useRef({
    mainTitle: magazineHubConfig?.mainTitle || 'A VISUAL ARCHIVE OF JOURNEYS, CURATED STORIES & MOMENTS',
    subtitle: magazineHubConfig?.subtitle || '여행의 찬란한 순간과 에피소드를 엄선하여 잡지 형식으로 기록한 매거진 컬렉션입니다. 이슈를 선택하여 전체 화보와 이야기를 감상하세요.',
    badgeText: magazineHubConfig?.badgeText || 'CURATED ARCHIVE',
    volumeText: magazineHubConfig?.volumeText || `VOL. ${new Date().getFullYear()}`,
  });

  // Helper to normalize journey data for reliable dirty tracking
  const getNormalizedJourneyData = (j: any) => {
    const isPlan = Boolean((j as any)?.isPlan || j?.tags?.includes('Plan') || j?.title?.includes('(Plan)'));
    const normalizedBadge = String(j?.statusBadge || (isPlan ? 'PLAN' : '')).trim();
    return {
      title: (j?.title || '').trim(),
      date: (j?.date || '').trim(),
      locationStr: (j?.locationStr || '').trim(),
      country: (j?.country || '').trim(),
      tags: Array.isArray(j?.tags) ? [...j.tags].map(t => String(t).trim()).sort() : [],
      img: (j?.img || '').trim(),
      videoUrl: (j?.videoUrl || '').trim(),
      heroImg: (j?.heroImg || '').trim(),
      heroVideoUrl: (j?.heroVideoUrl || '').trim(),
      statusBadge: normalizedBadge,
    };
  };

  const [saveRevision, setSaveRevision] = useState(0);

  // Dirty tracking for HOME Bottom Widgets
  const isHomeWidgetsDirty = useMemo(() => {
    if (!savedHomeWidgetsSnapshotRef.current) return false;
    const currentStr = JSON.stringify({
      showCalendarArchive: widgetShowCalendar,
      showLiveWeather: widgetShowWeather,
      widgetOrder,
      showExchangeRates: widgetShowExchange,
      showUpcomingDDay: widgetShowDDay,
      cities: widgetCities
    });
    return currentStr !== savedHomeWidgetsSnapshotRef.current;
  }, [widgetShowCalendar, widgetShowWeather, widgetOrder, widgetShowExchange, widgetShowDDay, widgetCities, saveRevision]);

  // Dirty tracking for HOME configuration
  const isHomeDirty = useMemo(() => {
    const snap = savedHomeSnapshotRef.current;
    if (!snap) return false;

    let snapHeroIdsStr = '[]';
    try {
      const parsed = JSON.parse(snap.selectedHeroIds || '[]');
      snapHeroIdsStr = JSON.stringify(Array.isArray(parsed) ? [...parsed].sort() : []);
    } catch (_) {
      snapHeroIdsStr = '[]';
    }
    const currentHeroIdsStr = JSON.stringify(Array.isArray(selectedHeroIds) ? [...selectedHeroIds].sort() : []);
    const currentLandingMediaStr = JSON.stringify(localLandingHeroMedia || []);

    return (
      (title || '').trim() !== (snap.title || '').trim() ||
      (subtitle || '').trim() !== (snap.subtitle || '').trim() ||
      homeJourneyLimit !== snap.homeJourneyLimit ||
      currentHeroIdsStr !== snapHeroIdsStr ||
      autoSlide !== snap.autoSlide ||
      slideDuration !== snap.slideDuration ||
      mediaType !== snap.mediaType ||
      showMarquee !== snap.showMarquee ||
      (homeMarquee || '').trim() !== (snap.homeMarquee || '').trim() ||
      homeSpeed !== snap.homeSpeed ||
      gradientEnabled !== snap.gradientEnabled ||
      gradientFrom !== snap.gradientFrom ||
      gradientTo !== snap.gradientTo ||
      homeMagSectionId !== snap.homeMagSectionId ||
      homeMagLimit !== snap.homeMagLimit ||
      (localLandingHeroImage || '').trim() !== (snap.landingHeroImage || '').trim() ||
      currentLandingMediaStr !== (snap.landingHeroMedia || '[]') ||
      isHomeWidgetsDirty
    );
  }, [title, subtitle, homeJourneyLimit, selectedHeroIds, autoSlide, slideDuration, mediaType, showMarquee, homeMarquee, homeSpeed, gradientEnabled, gradientFrom, gradientTo, homeMagSectionId, homeMagLimit, localLandingHeroImage, localLandingHeroMedia, isHomeWidgetsDirty, saveRevision]);

  // Snapshot ref for trip ordering in ARCHIVE
  const savedTripOrderRef = useRef<string>('');

  // Dirty tracking for Trip order in ARCHIVE
  const isTripOrderDirty = useMemo(() => {
    if (!savedTripOrderRef.current || localJourneys.length === 0) return false;
    const currentOrder = JSON.stringify(localJourneys.map(j => j.id));
    return savedTripOrderRef.current !== currentOrder;
  }, [localJourneys, saveRevision]);

  // Dirty tracking for currently selected journey in ARCHIVE mode
  const isArchiveDirty = useMemo(() => {
    if (!selectedJourney) return false;
    const snapStr = savedArchiveSnapshotRef.current[selectedJourney.id];
    if (!snapStr) return false;
    const currentData = getNormalizedJourneyData({
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
    return JSON.stringify(currentData) !== snapStr;
  }, [selectedJourney, editTitle, editDate, editLocation, editCountry, editTags, editImg, editVideoUrl, editHeroImg, editHeroVideoUrl, editStatusBadge, saveRevision]);

  // Dirty tracking for MAGAZINE sections & moments
  const isMagazineDirty = useMemo(() => {
    return (savedSectionsJsonRef.current || '[]') !== JSON.stringify(sectionsList);
  }, [sectionsList, saveRevision]);

  // Dirty tracking for Archive & Magazine Hub Headers
  const isArchiveHubHeaderDirty = useMemo(() => {
    const snap = savedArchiveHubHeaderRef.current;
    return (
      archiveHubMainTitle !== snap.mainTitle ||
      archiveHubSubtitle !== snap.subtitle ||
      archiveHubBadgeText !== snap.badgeText ||
      archiveHubVolumeText !== snap.volumeText
    );
  }, [archiveHubMainTitle, archiveHubSubtitle, archiveHubBadgeText, archiveHubVolumeText, saveRevision]);

  const isMagazineHubHeaderDirty = useMemo(() => {
    const snap = savedMagazineHubHeaderRef.current;
    return (
      hubMainTitle !== snap.mainTitle ||
      hubSubtitle !== snap.subtitle ||
      hubBadgeText !== snap.badgeText ||
      hubVolumeText !== snap.volumeText
    );
  }, [hubMainTitle, hubSubtitle, hubBadgeText, hubVolumeText, saveRevision]);

  // Dirty tracking for BGM playlist & options
  const isBgmDirty = useMemo(() => {
    const snap = savedBgmSnapshotRef.current;
    return (
      (snap.tracksJson || '[]') !== JSON.stringify(bgmTracks) ||
      snap.autoplay !== bgmAutoplay ||
      snap.defaultVolume !== bgmDefaultVolume ||
      snap.shuffle !== bgmShuffle ||
      snap.interval !== slideshowInterval
    );
  }, [bgmTracks, bgmAutoplay, bgmDefaultVolume, bgmShuffle, slideshowInterval, saveRevision]);

  // Dirty tracking for PRESETS list
  const isPresetsDirty = useMemo(() => {
    return (savedPresetsSnapshotRef.current || '[]') !== JSON.stringify(presetsList);
  }, [presetsList, saveRevision]);

  // Dirty tracking for CALENDAR weather cities list
  const isCalendarDirty = useMemo(() => {
    return (savedCalendarCitiesSnapshotRef.current || '[]') !== JSON.stringify(calendarWeatherCities);
  }, [calendarWeatherCities, saveRevision]);

  // Synchronize all snapshot references to current state so isAnyDirty becomes immediately false
  const syncAllSnapshotsToCurrent = () => {
    savedSectionsJsonRef.current = JSON.stringify(sectionsList);
    savedBgmSnapshotRef.current = {
      tracksJson: JSON.stringify(bgmTracks),
      autoplay: bgmAutoplay,
      defaultVolume: bgmDefaultVolume,
      shuffle: bgmShuffle,
      interval: slideshowInterval,
    };
    savedPresetsSnapshotRef.current = JSON.stringify(presetsList);
    savedCalendarCitiesSnapshotRef.current = JSON.stringify(calendarWeatherCities);
    savedMagazineHubHeaderRef.current = {
      mainTitle: hubMainTitle,
      subtitle: hubSubtitle,
      badgeText: hubBadgeText,
      volumeText: hubVolumeText,
    };
    savedHomeSnapshotRef.current = {
      title,
      subtitle,
      homeJourneyLimit,
      selectedHeroIds: JSON.stringify(Array.isArray(selectedHeroIds) ? [...selectedHeroIds].sort() : []),
      autoSlide,
      slideDuration,
      mediaType,
      showMarquee,
      homeMarquee,
      homeSpeed,
      gradientEnabled,
      gradientFrom,
      gradientTo,
      homeMagSectionId,
      homeMagLimit,
      landingHeroImage: localLandingHeroImage,
      landingHeroMedia: JSON.stringify(localLandingHeroMedia || []),
    };
    savedArchiveHubHeaderRef.current = {
      mainTitle: archiveHubMainTitle,
      subtitle: archiveHubSubtitle,
      badgeText: archiveHubBadgeText,
      volumeText: archiveHubVolumeText,
    };
    savedHomeWidgetsSnapshotRef.current = JSON.stringify({
      showCalendarArchive: widgetShowCalendar,
      showLiveWeather: widgetShowWeather,
      widgetOrder,
      showExchangeRates: widgetShowExchange,
      showUpcomingDDay: widgetShowDDay,
      cities: widgetCities
    });
    if (selectedJourney) {
      savedArchiveSnapshotRef.current[selectedJourney.id] = JSON.stringify(getNormalizedJourneyData({
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
      }));
    }
    savedTripOrderRef.current = JSON.stringify(localJourneys.map(j => j.id));
    setSaveRevision(prev => prev + 1);
    if (onDirtyChange) onDirtyChange(false);
  };

  // Unified global dirty state across all management tabs & sub-settings
  const isAnyDirty = isHomeDirty || isArchiveDirty || isTripOrderDirty || isMagazineDirty || isArchiveHubHeaderDirty || isMagazineHubHeaderDirty || isBgmDirty || isPresetsDirty || isCalendarDirty;

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isAnyDirty);
    }
  }, [isAnyDirty, onDirtyChange]);

  // Reset all edited state back to saved snapshots
  const handleResetAllState = () => {
    const homeSnap = savedHomeSnapshotRef.current;
    setTitle(homeSnap.title);
    setSubtitle(homeSnap.subtitle);
    try {
      setSelectedHeroIds(JSON.parse(homeSnap.selectedHeroIds));
    } catch (_) {
      setSelectedHeroIds([]);
    }
    setAutoSlide(homeSnap.autoSlide);
    setSlideDuration(homeSnap.slideDuration);
    setMediaType(homeSnap.mediaType);
    setShowMarquee(homeSnap.showMarquee);
    setHomeMarquee(homeSnap.homeMarquee);
    setHomeSpeed(homeSnap.homeSpeed);
    setGradientEnabled(homeSnap.gradientEnabled);
    setGradientFrom(homeSnap.gradientFrom);
    setGradientTo(homeSnap.gradientTo);
    setHomeMagSectionId(homeSnap.homeMagSectionId);
    setHomeMagLimit(homeSnap.homeMagLimit);
    setHomeJourneyLimit(homeSnap.homeJourneyLimit);
    setLocalLandingHeroImage(homeSnap.landingHeroImage || '');
    try {
      setLocalLandingHeroMedia(JSON.parse(homeSnap.landingHeroMedia || '[]'));
    } catch (_) {
      setLocalLandingHeroMedia([]);
    }

    if (selectedJourney) {
      const snapStr = savedArchiveSnapshotRef.current[selectedJourney.id];
      if (snapStr) {
        try {
          const d = JSON.parse(snapStr);
          setEditTitle(d.title || '');
          setEditDate(d.date || '');
          setEditLocation(d.locationStr || '');
          setEditCountry(d.country || '');
          setEditTags(d.tags || []);
          setEditImg(d.img || '');
          setEditVideoUrl(d.videoUrl || '');
          setEditHeroImg(d.heroImg || '');
          setEditHeroVideoUrl(d.heroVideoUrl || '');
          setEditStatusBadge(d.statusBadge || '');
        } catch (_) {}
      } else {
        setEditTitle(selectedJourney.title || '');
        setEditDate(selectedJourney.date || '');
        setEditLocation(selectedJourney.locationStr || '');
        setEditCountry(selectedJourney.country || '');
        setEditTags(selectedJourney.tags || []);
        setEditImg(selectedJourney.img || '');
        setEditVideoUrl(selectedJourney.videoUrl || '');
        setEditHeroImg(selectedJourney.heroImg || '');
        setEditHeroVideoUrl(selectedJourney.heroVideoUrl || '');
        setEditStatusBadge(selectedJourney.statusBadge || ((selectedJourney as any).isPlan || selectedJourney.tags?.includes('Plan') ? 'PLAN' : ''));
      }
    }

    if (savedSectionsJsonRef.current) {
      try {
        setSectionsList(JSON.parse(savedSectionsJsonRef.current));
      } catch (_) {}
    }

    const archSnap = savedArchiveHubHeaderRef.current;
    setArchiveHubMainTitle(archSnap.mainTitle);
    setArchiveHubSubtitle(archSnap.subtitle);
    setArchiveHubBadgeText(archSnap.badgeText);
    setArchiveHubVolumeText(archSnap.volumeText);

    const magSnap = savedMagazineHubHeaderRef.current;
    setHubMainTitle(magSnap.mainTitle);
    setHubSubtitle(magSnap.subtitle);
    setHubBadgeText(magSnap.badgeText);
    setHubVolumeText(magSnap.volumeText);

    const bgmSnap = savedBgmSnapshotRef.current;
    if (bgmSnap.tracksJson) {
      try {
        setBgmTracks(JSON.parse(bgmSnap.tracksJson));
      } catch (_) {}
    }
    setBgmAutoplay(bgmSnap.autoplay);

    if (savedPresetsSnapshotRef.current) {
      try {
        setPresetsList(JSON.parse(savedPresetsSnapshotRef.current));
      } catch (_) {}
    }

    if (savedCalendarCitiesSnapshotRef.current) {
      try {
        setCalendarWeatherCities(JSON.parse(savedCalendarCitiesSnapshotRef.current));
      } catch (_) {}
    }

    if (savedHomeWidgetsSnapshotRef.current) {
      try {
        const wSnap = JSON.parse(savedHomeWidgetsSnapshotRef.current);
        setWidgetShowCalendar(wSnap.showCalendarArchive ?? true);
        setWidgetShowWeather(wSnap.showLiveWeather ?? true);
        setWidgetOrder(wSnap.widgetOrder || 'calendar-first');
        setWidgetShowExchange(Boolean(wSnap.showExchangeRates));
        setWidgetShowDDay(Boolean(wSnap.showUpcomingDDay));
        setWidgetCities(wSnap.cities || []);
      } catch (_) {}
    }

    if (savedTripOrderRef.current) {
      try {
        const orderIds: (string | number)[] = JSON.parse(savedTripOrderRef.current);
        setLocalJourneys(prev => {
          const map = new Map(prev.map(j => [String(j.id), j]));
          const reordered = orderIds.map(id => map.get(String(id))).filter(Boolean) as (Trip | Plan)[];
          const missing = prev.filter(j => !orderIds.map(String).includes(String(j.id)));
          return [...reordered, ...missing];
        });
      } catch (_) {}
    }

    setSaveRevision(prev => prev + 1);
    if (onDirtyChange) onDirtyChange(false);
  };

  // Safe navigation helper that explicitly clears dirty flag and passes force=true to App.tsx
  const navigateSafely = (view: string, tripId: number | null = null) => {
    if (onDirtyChange) onDirtyChange(false);
    onNavigate(view, tripId, true, null, true);
  };

  // Guarded navigation execution helper
  const executeWithGuard = (action: () => void) => {
    if (isAnyDirty) {
      setPendingAction(() => action);
      setShowUnsavedModal(true);
    } else {
      action();
    }
  };

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
    const combined = sortJourneysByOrder([...tripsClean, ...plansWithFlag]);

    setLocalJourneys(combined);
    if (!savedTripOrderRef.current && combined.length > 0) {
      savedTripOrderRef.current = JSON.stringify(combined.map(j => j.id));
    }
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
      const isPlan = (selectedJourney as any).isPlan || selectedJourney.tags?.includes('Plan') || selectedJourney.title?.includes('(Plan)');
      const initialStatusBadge = selectedJourney.statusBadge || (isPlan ? 'PLAN' : '');
      setEditStatusBadge(initialStatusBadge);
      setTripSaveSuccess(false);

      savedArchiveSnapshotRef.current[selectedJourney.id] = JSON.stringify(getNormalizedJourneyData({
        ...selectedJourney,
        heroVideoUrl: selectedJourney.heroVideoUrl || '',
        statusBadge: initialStatusBadge
      }));
    }
  }, [selectedJourneyId, selectedJourney]);

  // Order shift handlers (▲ / ▼)
  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    if (!isLoggedIn) return alert('로그인 후 순서를 변경할 수 있습니다.');
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localJourneys.length) return;

    const newArr = [...localJourneys];
    const [moved] = newArr.splice(index, 1);
    newArr.splice(targetIndex, 0, moved);

    setLocalJourneys(newArr);
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

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newArr = [...localJourneys];
    const [moved] = newArr.splice(draggedIndex, 1);
    newArr.splice(dropIndex, 0, moved);

    setDraggedIndex(null);
    setLocalJourneys(newArr);
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

      setLocalJourneys(prev => prev.map(j => {
        if (j.id === selectedJourney.id) {
          return {
            ...j,
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
          };
        }
        return j;
      }));

      if (isTripOrderDirty) {
        try {
          await onReorderTrips(localJourneys.map(j => j.id));
        } catch (oErr) {
          console.warn('Failed to update trip order during save trip:', oErr);
        }
      }

      savedArchiveSnapshotRef.current[selectedJourney.id] = JSON.stringify(getNormalizedJourneyData({
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
      }));

      syncAllSnapshotsToCurrent();
      setTripSaveSuccess(true);
      if (onDirtyChange) onDirtyChange(false);
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
        homeMagLimit,
        sectionsList,
        localLandingHeroImage,
        localLandingHeroMedia
      );

      // Save Bottom Widgets (Calendar & Weather) settings to Firestore
      const widgetConfigData: HomeWidgetConfig = {
        showCalendarArchive: widgetShowCalendar,
        showLiveWeather: widgetShowWeather,
        widgetOrder,
        showExchangeRates: widgetShowExchange,
        showUpcomingDDay: widgetShowDDay,
        cities: widgetCities
      };
      await setDoc(doc(db, 'users', 'public', 'settings', 'home_widgets'), widgetConfigData, { merge: true });
      await setDoc(doc(db, 'users', 'public', 'settings', 'home'), { homeWidgets: widgetConfigData }, { merge: true });
      savedHomeWidgetsSnapshotRef.current = JSON.stringify(widgetConfigData);

      savedHomeSnapshotRef.current = {
        title,
        subtitle,
        homeJourneyLimit,
        selectedHeroIds: JSON.stringify(selectedHeroIds),
        autoSlide,
        slideDuration,
        mediaType,
        showMarquee,
        homeMarquee,
        homeSpeed,
        gradientEnabled,
        gradientFrom,
        gradientTo,
        homeMagSectionId,
        homeMagLimit,
        landingHeroImage: localLandingHeroImage,
        landingHeroMedia: JSON.stringify(localLandingHeroMedia || []),
      };
      syncAllSnapshotsToCurrent();
      setHomeSaveSuccess(true);
      if (onDirtyChange) onDirtyChange(false);
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
        e.stopPropagation();
        if (showUnsavedModal) {
          return;
        }
        if (activeMode === 'HOME') handleSaveHome();
        else if (activeMode === 'ARCHIVE') handleSaveJourney();
        else if (activeMode === 'MAGAZINE') handleSaveMagazine();
        else handleSaveAllChanges(true);
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

  // Section Management Handlers
  const handleAddSection = async () => {
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
    const updated = [...sectionsList, newSection];
    setSectionsList(updated);
    setActiveMagSectionId(newId);
    sessionStorage.setItem('lastMagazineSectionId', newId);
    setNewSectionTitle('');
    setNewSectionSubtitle('');
    setShowAddSectionModal(false);

    if (onUpdateMagazineSections) {
      onUpdateMagazineSections(updated);
    }
    try {
      localStorage.setItem('cached_magazine_sections', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleAutoGenerateSectionFromTrip = async (tripId: number) => {
    const targetTrip = localJourneys.find(j => Number(j.id) === Number(tripId)) || trips.find(t => Number(t.id) === Number(tripId)) || plans.find(p => Number(p.id) === Number(tripId));
    if (!targetTrip) {
      alert('여정을 찾을 수 없습니다.');
      return;
    }

    pushMagazineSnapshot();

    // 날짜 문자열(예: "2024.03.15", "2024. 3. 15.", "2024-03-15")에서 정수 YYYYMMDD 추출
    const parseDateToNumber = (dateStr: string): number => {
      if (!dateStr) return 0;
      const nums = dateStr.match(/\d+/g);
      if (!nums || nums.length < 2) return 0;
      let y = parseInt(nums[0], 10);
      let m = parseInt(nums[1], 10);
      let d = nums.length >= 3 ? parseInt(nums[2], 10) : 1;
      if (y < 100) y += 2000;
      return y * 10000 + m * 100 + d;
    };

    // 시간 문자열(예: "10:00 AM", "오후 1:30", "14:00")에서 0~1439 절대 분 추출
    const parseTimeToMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const clean = timeStr.trim();
      const isPM = /pm|오후/i.test(clean);
      const isAM = /am|오전/i.test(clean);
      const nums = clean.match(/\d+/g);
      if (!nums || nums.length < 1) return 0;
      let h = parseInt(nums[0], 10);
      const min = nums.length >= 2 ? parseInt(nums[1], 10) : 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return h * 60 + min;
    };

    const uniqueCandidates: {
      img: string;
      date: string;
      time: string;
      displayOrder: number;
      title: string;
      placeName: string;
      location: string;
      caption: string;
      timelineItemId?: number;
      sourcePriority: number; // 0 for timeline, 1 for gallery, 2 for cover
    }[] = [];
    const seenImages = new Set<string>();

    // 1. 해당 여정에 속한 모든 타임라인 아이템 수집 (어떤 날짜 키에 있든 100% 전수 수집)
    const tripTimelineItems: TimelineItem[] = [];
    Object.values(timelineData || {}).forEach(dayItems => {
      if (Array.isArray(dayItems)) {
        dayItems.forEach(tItem => {
          if (Number(tItem.tripId) === Number(targetTrip.id) && tItem.img && tItem.img.trim()) {
            tripTimelineItems.push(tItem);
          }
        });
      }
    });

    // 2. 타임라인 엄격한 시간순 정렬: 날짜 수치(YYYYMMDD) -> displayOrder -> 시간 분(0~1439) -> id
    tripTimelineItems.sort((a, b) => {
      const dateA = safeStr(a.date) || targetTrip.date || '';
      const dateB = safeStr(b.date) || targetTrip.date || '';
      const numA = parseDateToNumber(dateA);
      const numB = parseDateToNumber(dateB);
      if (numA !== numB) {
        if (numA > 0 && numB > 0) return numA - numB;
        if (numA > 0) return -1;
        if (numB > 0) return 1;
      }

      // 같은 날짜 내: displayOrder 우선 (사용자가 타임라인 상세에서 지정한 순서)
      const hasOrderA = typeof (a as any).displayOrder === 'number';
      const hasOrderB = typeof (b as any).displayOrder === 'number';
      if (hasOrderA && hasOrderB && (a as any).displayOrder !== (b as any).displayOrder) {
        return (a as any).displayOrder - (b as any).displayOrder;
      }

      // 시간(분) 수치 비교: 오전 10시가 오후 1시보다 먼저 오도록 완벽 보장
      const timeA = safeStr(a.time) || safeStr((a as any).startTime) || '';
      const timeB = safeStr(b.time) || safeStr((b as any).startTime) || '';
      const minA = parseTimeToMinutes(timeA);
      const minB = parseTimeToMinutes(timeB);
      if (minA !== minB) {
        if (minA > 0 && minB > 0) return minA - minB;
        if (minA > 0) return -1;
        if (minB > 0) return 1;
      }

      return (a.id || 0) - (b.id || 0);
    });

    // 3. 중복 사진 제거하며 1순위로 uniqueCandidates에 등록
    tripTimelineItems.forEach((tItem, tIdx) => {
      const cleanUrl = (tItem.img || '').trim();
      if (cleanUrl && !seenImages.has(cleanUrl)) {
        seenImages.add(cleanUrl);
        const pName = safeStr(tItem.place);
        const jTitle = targetTrip.title.replace(/\s*\(Plan\)$/i, '');
        const displayTitle = pName || jTitle || 'MOMENT';
        const itemDate = safeStr(tItem.date) || targetTrip.date || '';
        const itemTime = safeStr(tItem.time) || safeStr((tItem as any).startTime) || '';
        const orderNum = typeof (tItem as any).displayOrder === 'number' ? (tItem as any).displayOrder : tIdx;

        uniqueCandidates.push({
          img: cleanUrl,
          date: itemDate,
          time: itemTime,
          displayOrder: orderNum,
          title: displayTitle,
          placeName: pName || targetTrip.locationStr || '',
          location: targetTrip.locationStr || targetTrip.country || '',
          caption: safeStr(tItem.memo),
          timelineItemId: tItem.id,
          sourcePriority: 0,
        });
      }
    });

    // 4. Gallery photos (타임라인 사진이 전혀 없는 경우에만 폴백으로 보충)
    if (uniqueCandidates.length === 0 && targetTrip.gallery && Array.isArray(targetTrip.gallery)) {
      targetTrip.gallery.forEach((g: any, gIdx) => {
        const rawUrl = typeof g === 'string' ? g : g?.url;
        const url = (rawUrl || '').trim();
        if (url && !seenImages.has(url)) {
          seenImages.add(url);
          const gTitle = (typeof g === 'object' && g?.place) ? g.place : `${targetTrip.title.replace(/\s*\(Plan\)$/i, '')} #${gIdx + 1}`;
          const gDate = (typeof g === 'object' && g?.date) ? g.date : targetTrip.date || '';
          const gTime = (typeof g === 'object' && g?.time) ? g.time : '';
          const gLoc = (typeof g === 'object' && g?.place) ? g.place : targetTrip.locationStr || '';
          const gMemo = typeof g === 'object' ? g?.imgNote || '' : '';

          uniqueCandidates.push({
            img: url,
            date: gDate,
            time: gTime,
            displayOrder: 1000 + gIdx,
            title: gTitle,
            placeName: gLoc,
            location: targetTrip.locationStr || targetTrip.country || '',
            caption: gMemo,
            sourcePriority: 1,
          });
        }
      });
    }

    // 5. Cover photo (타임라인 및 갤러리 사진이 전혀 없는 경우에만 단독 폴백 보충)
    if (uniqueCandidates.length === 0) {
      const coverUrl = (targetTrip.heroImg || targetTrip.img || '').trim();
      if (coverUrl && !seenImages.has(coverUrl)) {
        seenImages.add(coverUrl);
        uniqueCandidates.push({
          img: coverUrl,
          date: targetTrip.date || '',
          time: '',
          displayOrder: 0,
          title: targetTrip.title.replace(/\s*\(Plan\)$/i, ''),
          placeName: (targetTrip.locations && targetTrip.locations[0]?.name) || targetTrip.locationStr || '',
          location: targetTrip.locationStr || targetTrip.country || '',
          caption: '',
          sourcePriority: 2,
        });
      }
    }

    const totalCount = uniqueCandidates.length;

    // 6. 에디토리얼 행(Row) 기반 레이아웃 배치 계산
    const assignedLayoutTypes = computeEditorialLayoutTypes(totalCount);

    // 7. MagazineItem 목록 생성
    const tripItems: MagazineItem[] = uniqueCandidates.map((cand, idx) => ({
      id: `auto-${targetTrip.id}-${cand.timelineItemId || idx}-${Date.now()}-${idx}`,
      tripId: Number(targetTrip.id),
      timelineItemId: cand.timelineItemId,
      title: cand.title,
      date: cand.date,
      placeName: cand.placeName,
      location: cand.location,
      caption: cand.caption,
      img: cand.img,
      layoutType: assignedLayoutTypes[idx] || 'portrait',
      order: idx,
    }));

    // 8. 히어로 카드 무작위(랜덤) 자동 선택 (섹션 내부 카드 사진 중 1장) 및 타임라인 메타데이터 완벽 일치
    const randomHeroCard = tripItems.length > 0
      ? tripItems[Math.floor(Math.random() * tripItems.length)]
      : null;

    const newSectionId = `trip-section-${targetTrip.id}-${Date.now()}`;

    // 9. 기존 매거진 섹션 100% 보존 - 기존 어떤 섹션도 임의 삭제/덮어쓰지 않고 맨 뒤에 순수 추가
    const newSection: MagazineSection = {
      id: newSectionId,
      title: targetTrip.title.replace(/\s*\(Plan\)$/i, '').toUpperCase(),
      subtitle: `${targetTrip.date} · ${targetTrip.locationStr || targetTrip.country || 'JOURNEY'}`,
      heroImg: randomHeroCard?.img || targetTrip.heroImg || targetTrip.img || '',
      heroTitle: targetTrip.title.replace(/\s*\(Plan\)$/i, ''),
      heroDate: randomHeroCard?.date || targetTrip.date || '',
      heroLocation: randomHeroCard?.placeName || randomHeroCard?.location || targetTrip.locationStr || targetTrip.country || '',
      heroTripId: Number(targetTrip.id),
      items: tripItems,
      order: sectionsList.length,
      isDefault: false,
    };

    const updated = [...sectionsList, newSection].map((sec, idx) => ({ ...sec, order: idx }));

    setSectionsList(updated);
    setActiveMagSectionId(newSectionId);
    sessionStorage.setItem('lastMagazineSectionId', newSectionId);
    setShowAutoGenerateModal(false);
    setSelectedTripForAutoGenerate(null);

    // 주의: 강제 DB 저장은 절대 하지 않고, 오직 상위 상태 갱신 및 캐시만 보관하여 사용자가 SAVE 버튼을 눌렀을 때만 DB에 영구 반영되도록 보호
    if (onUpdateMagazineSections) {
      onUpdateMagazineSections(updated);
    }
    try {
      localStorage.setItem('cached_magazine_sections', JSON.stringify(updated));
    } catch (_) {}
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
        try {
          localStorage.setItem('cached_magazine_sections', JSON.stringify(reordered));
        } catch (_) {}
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
    if (selectedMagCardId === itemId) {
      setSelectedMagCardId(null);
    }
    if (inlineAddMenuCardId === itemId) {
      setInlineAddMenuCardId(null);
    }
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
      pushMagazineSnapshot();

      // Gather all timeline items across all dates with dateKey preserved + gallery photos
      const allTimelineItems: TimelineItem[] = [];
      Object.entries(timelineData || {}).forEach(([dateKey, dayItems]) => {
        if (Array.isArray(dayItems)) {
          dayItems.forEach(item => {
            allTimelineItems.push({
              ...item,
              date: item.date || dateKey,
            });
          });
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

      // 1. Identify if this section is linked to a specific journey
      const linkedTripId = currentMagSection.heroTripId || (
        currentMagSection.id.startsWith('trip-section-') ? Number(currentMagSection.id.split('-')[2]) : undefined
      ) || (
        currentMagSection.id.startsWith('section-') ? Number(currentMagSection.id.split('-')[1]) : undefined
      ) || currentMagSection.items?.find(i => i.tripId)?.tripId;

      const targetTrip = linkedTripId !== undefined 
        ? localJourneys.find(j => Number(j.id) === Number(linkedTripId))
        : undefined;

      const candidateTimeline = linkedTripId !== undefined
        ? allTimelineItems.filter(t => Number(t.tripId) === Number(linkedTripId))
        : allTimelineItems;

      // 2. Run robust chronological synchronization
      const { syncedItems, changesCount, addedCount } = syncSectionItemsWithTimeline(
        currentMagSection.items || [],
        candidateTimeline,
        targetTrip
      );

      const updatedSections = sectionsList.map(s => {
        if (s.id === currentMagSection.id) {
          return { 
            ...s, 
            heroTripId: s.heroTripId || (linkedTripId ? Number(linkedTripId) : undefined),
            items: syncedItems 
          };
        }
        return s;
      });

      setSectionsList(updatedSections);
      if (onSaveMagazineSections) {
        await onSaveMagazineSections(updatedSections);
      }
      try {
        localStorage.setItem('cached_magazine_sections', JSON.stringify(updatedSections));
      } catch (_) {}

      if (addedCount > 0 && changesCount > 0) {
        alert(`타임라인 기준 매거진 동기화가 완료되었습니다.\n(${changesCount}개 기존 항목 최신화 및 ${addedCount}개 신규 타임라인 항목 추가/시간순 정렬 완료)`);
      } else if (addedCount > 0) {
        alert(`타임라인 기준 매거진 동기화가 완료되었습니다.\n(${addedCount}개 신규 타임라인 항목 추가 및 시간순 정렬 완료)`);
      } else if (changesCount > 0) {
        alert(`타임라인 기준 매거진 동기화가 완료되었습니다.\n(${changesCount}개 항목 최신화 완료)`);
      } else {
        alert('모든 매거진 카드가 이미 타임라인 최신 데이터와 일치합니다.');
      }
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
      savedSectionsJsonRef.current = JSON.stringify(sectionsList);
      savedMagazineHubHeaderRef.current = {
        mainTitle: hubMainTitle,
        subtitle: hubSubtitle,
        badgeText: hubBadgeText,
        volumeText: hubVolumeText,
      };
      syncAllSnapshotsToCurrent();
      setMagazineSaveSuccess(true);
      if (onDirtyChange) onDirtyChange(false);
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
          homeMagLimit,
          sectionsList,
          localLandingHeroImage,
          localLandingHeroMedia
        );
      } catch (homeErr) {
        console.warn('Home settings save notice in saveAll:', homeErr);
      }

      // Save Bottom Widgets (Calendar & Weather) settings to Firestore
      try {
        const widgetConfigData: HomeWidgetConfig = {
          showCalendarArchive: widgetShowCalendar,
          showLiveWeather: widgetShowWeather,
          widgetOrder,
          showExchangeRates: widgetShowExchange,
          showUpcomingDDay: widgetShowDDay,
          cities: widgetCities
        };
        await setDoc(doc(db, 'users', 'public', 'settings', 'home_widgets'), widgetConfigData, { merge: true });
        await setDoc(doc(db, 'users', 'public', 'settings', 'home'), { homeWidgets: widgetConfigData }, { merge: true });
        savedHomeWidgetsSnapshotRef.current = JSON.stringify(widgetConfigData);
      } catch (widgetErr) {
        console.warn('Home widgets save notice in saveAll:', widgetErr);
      }

      // 2. Save Journey if currently editing one
      if (selectedJourney) {
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
          setLocalJourneys(prev => prev.map(j => {
            if (j.id === selectedJourney.id) {
              return {
                ...j,
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
              };
            }
            return j;
          }));
          savedArchiveSnapshotRef.current[selectedJourney.id] = JSON.stringify(getNormalizedJourneyData({
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
          }));
        } catch (tripErr) {
          console.error('Trip save error in saveAll:', tripErr);
        }
      }

      // 3. Save Journey Hub Header if configured
      if (onSaveArchiveHubConfig) {
        try {
          await onSaveArchiveHubConfig({
            mainTitle: archiveHubMainTitle,
            subtitle: archiveHubSubtitle,
            badgeText: archiveHubBadgeText,
            volumeText: archiveHubVolumeText,
          });
          savedArchiveHubHeaderRef.current = {
            mainTitle: archiveHubMainTitle,
            subtitle: archiveHubSubtitle,
            badgeText: archiveHubBadgeText,
            volumeText: archiveHubVolumeText,
          };
        } catch (err) {
          console.warn('Archive hub header save notice:', err);
        }
      }

      // 4. Save Magazine Hub Header if configured
      if (onSaveMagazineHubConfig) {
        try {
          await onSaveMagazineHubConfig({
            mainTitle: hubMainTitle,
            subtitle: hubSubtitle,
            badgeText: hubBadgeText,
            volumeText: hubVolumeText,
          });
          savedMagazineHubHeaderRef.current = {
            mainTitle: hubMainTitle,
            subtitle: hubSubtitle,
            badgeText: hubBadgeText,
            volumeText: hubVolumeText,
          };
        } catch (err) {
          console.warn('Magazine hub header save notice:', err);
        }
      }

      // 5. Save Magazine Sections
      try {
        if (onSaveMagazineSections) {
          await onSaveMagazineSections(sectionsList);
        } else if (onSaveMagazineMoments) {
          const mainSec = sectionsList.find(s => s.id === 'main') || sectionsList[0];
          await onSaveMagazineMoments(mainSec?.items || []);
        }
      } catch (err) {
        console.warn('Magazine sections save notice:', err);
      }

      // 6. Save BGM settings to Firestore & localStorage
      try {
        saveStoredBgmTracks(bgmTracks);
        saveStoredBgmAutoplay(bgmAutoplay);
        saveStoredBgmDefaultVolume(bgmDefaultVolume);
        saveStoredBgmShuffle(bgmShuffle);
        saveStoredSlideshowInterval(slideshowInterval);
        bgmPlayer.setVolumePercent(bgmDefaultVolume);
        bgmPlayer.setShuffle(bgmShuffle);

        if (onSaveBgmSettings) {
          await onSaveBgmSettings(bgmTracks, bgmAutoplay, bgmDefaultVolume, bgmShuffle, slideshowInterval);
        }
      } catch (err) {
        console.warn('BGM save notice:', err);
      }

      // 7. Save Presets settings to Firestore & localStorage
      try {
        saveAllPresets(presetsList);
        await setDoc(doc(db, 'users', 'public', 'settings', 'presets'), {
          presets: presetsList,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {
        console.warn('Firestore presets sync notice:', fErr);
      }
      setPresetsSaveSuccess(true);

      // 8. Save Calendar weather cities to Firestore & localStorage
      try {
        localStorage.setItem('cached_calendar_weather_cities', JSON.stringify(calendarWeatherCities));
        await setDoc(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'), { cities: calendarWeatherCities }, { merge: true });
      } catch (cErr) {
        console.warn('Firestore calendar weather cities sync notice:', cErr);
      }
      setCalendarSaveSuccess(true);

      // 9. Save Trip Order if dirty
      if (isTripOrderDirty) {
        try {
          await onReorderTrips(localJourneys.map(j => j.id));
          savedTripOrderRef.current = JSON.stringify(localJourneys.map(j => j.id));
        } catch (oErr) {
          console.warn('Trip order reorder notice in saveAllSettings:', oErr);
        }
      }

      // 9. Update all snapshot refs to ensure isAnyDirty is 100% false immediately
      savedHomeSnapshotRef.current = {
        title,
        subtitle,
        homeJourneyLimit,
        selectedHeroIds: JSON.stringify(selectedHeroIds),
        autoSlide,
        slideDuration,
        mediaType,
        showMarquee,
        homeMarquee,
        homeSpeed,
        gradientEnabled,
        gradientFrom,
        gradientTo,
        homeMagSectionId,
        homeMagLimit,
        landingHeroImage: localLandingHeroImage,
        landingHeroMedia: JSON.stringify(localLandingHeroMedia || []),
      };
      savedSectionsJsonRef.current = JSON.stringify(sectionsList);
      if (selectedJourney) {
        savedArchiveSnapshotRef.current[selectedJourney.id] = JSON.stringify(getNormalizedJourneyData({
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
        }));
      }
      savedArchiveHubHeaderRef.current = {
        mainTitle: archiveHubMainTitle,
        subtitle: archiveHubSubtitle,
        badgeText: archiveHubBadgeText,
        volumeText: archiveHubVolumeText,
      };
      savedMagazineHubHeaderRef.current = {
        mainTitle: hubMainTitle,
        subtitle: hubSubtitle,
        badgeText: hubBadgeText,
        volumeText: hubVolumeText,
      };

      syncAllSnapshotsToCurrent();
      setSaveAllSuccess(true);
      setHomeSaveSuccess(true);
      setTripSaveSuccess(true);
      setMagazineSaveSuccess(true);
      setArchiveHubHeaderSaveSuccess(true);
      setHubHeaderSaveSuccess(true);
      if (onDirtyChange) onDirtyChange(false);
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
        setCalendarSaveSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to save all management changes:', err);
      alert('설정 저장 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsSavingAll(false);
    }
  };

  // Smart save handler targeting active mode first, then other dirty domains
  const saveActiveOrAllSettings = async (showModal: boolean = false) => {
    try {
      if (isTripOrderDirty) {
        try {
          await onReorderTrips(localJourneys.map(j => j.id));
          savedTripOrderRef.current = JSON.stringify(localJourneys.map(j => j.id));
        } catch (oErr) {
          console.warn('Trip order reorder notice in saveActiveOrAllSettings:', oErr);
        }
      }

      if (activeMode === 'ARCHIVE') {
        await handleSaveJourney(showModal);
        if (isHomeDirty) {
          try { await handleSaveHome(false); } catch (e) { console.warn('Background home save notice:', e); }
        }
        if (isMagazineDirty) {
          try { await handleSaveMagazine(false); } catch (e) { console.warn('Background mag save notice:', e); }
        }
      } else if (activeMode === 'HOME') {
        await handleSaveHome(showModal);
        if (isArchiveDirty && selectedJourney) {
          try { await handleSaveJourney(false); } catch (e) { console.warn('Background trip save notice:', e); }
        }
        if (isMagazineDirty) {
          try { await handleSaveMagazine(false); } catch (e) { console.warn('Background mag save notice:', e); }
        }
      } else if (activeMode === 'MAGAZINE') {
        await handleSaveMagazine(showModal);
        if (isArchiveDirty && selectedJourney) {
          try { await handleSaveJourney(false); } catch (e) { console.warn('Background trip save notice:', e); }
        }
      } else {
        await handleSaveAllChanges(showModal);
      }
      syncAllSnapshotsToCurrent();
    } catch (err) {
      console.error('saveActiveOrAllSettings failed:', err);
      try {
        await handleSaveAllChanges(showModal);
      } catch (_) {}
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
      console.error('Failed to load Firestore magazine sections:', err);
      alert('Firestore 매거진 섹션 로드 실패: ' + (err?.message || err));
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

  // Sync saveRef with the unified save handler so any unsaved state across all tabs gets saved before navigating away
  useEffect(() => {
    if (saveRef) {
      saveRef.current = () => saveActiveOrAllSettings(false);
    }
  }, [saveRef, saveActiveOrAllSettings]);

  const isSelectedPlan = Boolean(
    selectedJourney && (
      (selectedJourney as any).isPlan ||
      (plans && plans.some(p => String(p.id) === String(selectedJourney.id))) ||
      selectedJourney.tags?.includes('Plan') ||
      selectedJourney.title?.includes('(Plan)')
    )
  );

  const getReturnView = () => {
    try {
      const savedLast = sessionStorage.getItem('lastNonManageView');
      if (savedLast && ['home', 'archive', 'magazine', 'calendar', 'map', 'pocket', 'detail'].includes(savedLast)) {
        return savedLast;
      }
    } catch (_) {}

    switch (activeMode) {
      case 'MAGAZINE':
        return 'magazine';
      case 'ARCHIVE':
        return 'archive';
      case 'UTIL':
        return 'util';
      case 'USERS':
        return 'users';
      case 'HOME':
      default:
        return 'home';
    }
  };

  return {
    trips, plans, onNavigate, onSaveTrip, onDeleteTrip, onCloneTrip, onMoveToPlans, onMoveToArchive,
    onReorderTrips, homeTitle, homeSubtitle, heroJourneyIds, heroAutoSlide, heroMediaType,
    heroSlideDuration, marqueeShow, marqueeMessage, marqueeSpeed, homeGradientEnabled,
    homeGradientFrom, homeGradientTo, homeMagazineSectionId, homeMagazineLimit, landingHeroImage,
    landingHeroMedia, currentUserProfile, isSuperAdmin, onSaveAllHomeSettings, trashedJourneys,
    trashedSections, onRestoreJourney, onPermanentDeleteJourney, onDeleteMagazineSection,
    onRestoreMagazineSection, onPermanentDeleteMagazineSection, onBatchPermanentDelete, isLoggedIn,
    isDarkMode, magazineMoments, magazineSections, magazineHubConfig, onSaveMagazineHubConfig,
    archiveHubConfig, onSaveArchiveHubConfig, timelineData, onSaveMagazineMoments,
    onSaveMagazineSections, onUpdateMagazineSections, onDirtyChange, saveRef, onSaveBgmSettings,
    hubMainTitle, setHubMainTitle, hubSubtitle, setHubSubtitle, hubBadgeText, setHubBadgeText,
    hubVolumeText, setHubVolumeText, isHubHeaderOpen, setIsHubHeaderOpen, isSavingHubHeader,
    setIsSavingHubHeader, hubHeaderSaveSuccess, setHubHeaderSaveSuccess, handleSaveHubHeader,
    archiveHubMainTitle, setArchiveHubMainTitle, archiveHubSubtitle, setArchiveHubSubtitle,
    archiveHubBadgeText, setArchiveHubBadgeText, archiveHubVolumeText, setArchiveHubVolumeText,
    isArchiveHubHeaderOpen, setIsArchiveHubHeaderOpen, isSavingArchiveHubHeader,
    setIsSavingArchiveHubHeader, archiveHubHeaderSaveSuccess, setArchiveHubHeaderSaveSuccess,
    handleSaveArchiveHubHeader, activeMode, setActiveMode, calendarWeatherCities,
    setCalendarWeatherCities, searchCalendarCityQuery, setSearchCalendarCityQuery,
    calendarCityMovedEn, setCalendarCityMovedEn, calendarCityMovedTimerRef, isSavingCalendar,
    setIsSavingCalendar, calendarSaveSuccess, setCalendarSaveSuccess, savedCalendarCitiesSnapshotRef,
    handleAddCalendarWeatherCity, handleMoveCalendarWeatherCity, handleRemoveCalendarWeatherCity,
    handleSaveCalendarSettings, utilSubTab, setUtilSubTab, presetsList, setPresetsList,
    presetSearchQuery, setPresetSearchQuery, presetThemeFilter, setPresetThemeFilter, editingPreset,
    setEditingPreset, isPresetModalOpen, setIsPresetModalOpen, presetToDelete, setPresetToDelete,
    isSavingPresets, setIsSavingPresets, presetsSaveSuccess, setPresetsSaveSuccess,
    showRestorePresetsConfirm, setShowRestorePresetsConfirm, savedPresetsSnapshotRef,
    localLandingHeroImage, setLocalLandingHeroImage, localLandingHeroMedia, setLocalLandingHeroMedia,
    isUploadingLandingHero, setIsUploadingLandingHero, isDraggingLandingHero,
    setIsDraggingLandingHero, replacingLandingHeroIndex, setReplacingLandingHeroIndex,
    dragOverLandingHeroIndex, setDragOverLandingHeroIndex, isHeroJourneysAccordionOpen,
    setIsHeroJourneysAccordionOpen, handleLandingHeroUpload, handleReplaceLandingHeroMedia,
    handleRemoveLandingHeroMedia, handleMoveLandingHeroMedia, usersList, setUsersList,
    userSearchQuery, setUserSearchQuery, editingUser, setEditingUser, isUserEditModalOpen,
    setIsUserEditModalOpen, delegatingUser, setDelegatingUser, isDelegatingModalOpen,
    setIsDelegatingModalOpen, userActionToast, setUserActionToast, currentAdminEmail,
    setCurrentAdminEmail, newAdminEmailInput, setNewAdminEmailInput, adminEmailSaving,
    setAdminEmailSaving, userFilterStatus, setUserFilterStatus, userCurrentPage, setUserCurrentPage,
    USERS_PER_PAGE, pendingUsersCount, setPendingUsersCount, isTargetAdminAccount,
    handleUpdateAdminEmail, handleApproveUser, handleRejectUser, handleDeleteUserByAdmin,
    passwordResetTarget, setPasswordResetTarget, handleSendPasswordReset,
    handleToggleUserPermission, handleSaveUserEdit, handleToggleTripAllowedEditor, bgmTracks,
    setBgmTracks, bgmAutoplay, setBgmAutoplay, bgmDefaultVolume, setBgmDefaultVolume, bgmShuffle,
    setBgmShuffle, slideshowInterval, setSlideshowInterval, isUploadingBgm, setIsUploadingBgm,
    previewTrackId, setPreviewTrackId, isDraggingBgmFile, setIsDraggingBgmFile, previewAudioRef,
    bgmFileInputRef, savedBgmSnapshotRef, handleToggleBgmTrack, handleMoveBgmTrack,
    handleDeleteBgmTrack, handleRestoreDefaultBgm, handleToggleBgmAutoplay, handleTogglePreviewTrack,
    handleBgmFileUpload, handleOpenNewPreset, handleOpenEditPreset, handleSavePresetModal,
    handleDeletePresetClick, handleConfirmDeletePreset, handleConfirmRestorePresets,
    handleMoveHeroOrder, handleToggleHero, mobileArchiveTab, setMobileArchiveTab, selectedMagCardId,
    setSelectedMagCardId, gradientEnabled, setGradientEnabled, gradientFrom, setGradientFrom,
    gradientTo, setGradientTo, localJourneys, setLocalJourneys, selectedJourneyId,
    setSelectedJourneyId, sectionsList, setSectionsList, activeMagSectionId, setActiveMagSectionId,
    momentsList, setMomentsList, selectedTripForMoments, setSelectedTripForMoments,
    momentSearchQuery, setMomentSearchQuery, isSavingMagazine, setIsSavingMagazine,
    magazineSaveSuccess, setMagazineSaveSuccess, showAddSectionModal, setShowAddSectionModal,
    newSectionTitle, setNewSectionTitle, newSectionSubtitle, setNewSectionSubtitle,
    showAutoGenerateModal, setShowAutoGenerateModal, selectedTripForAutoGenerate,
    setSelectedTripForAutoGenerate, existingTripIds, magUndoStack, setMagUndoStack, magRedoStack,
    setMagRedoStack, showRestoreModal, setShowRestoreModal, availableBackups, setAvailableBackups,
    handleOpenRestoreModal, handleRestoreDefaultSections, handleApplyBackup, firestoreMagSections,
    setFirestoreMagSections, isLoadingFirestoreMag, setIsLoadingFirestoreMag, firestoreMagLoadedAt,
    setFirestoreMagLoadedAt, isLocalEditingRef, currentMagSection, title, setTitle, subtitle,
    setSubtitle, selectedHeroIds, setSelectedHeroIds, autoSlide, setAutoSlide, slideDuration,
    setSlideDuration, mediaType, setMediaType, showMarquee, setShowMarquee, homeMarquee,
    setHomeMarquee, homeSpeed, setHomeSpeed, playVideoOnActivate, setPlayVideoOnActivate,
    isSavingHome, setIsSavingHome, homeSaveSuccess, setHomeSaveSuccess, heroSearchQuery,
    setHeroSearchQuery, homeMagSectionId, setHomeMagSectionId, homeMagLimit, setHomeMagLimit,
    mapTileStyle, setMapTileStyle, editTitle, setEditTitle, editDate, setEditDate, editLocation,
    setEditLocation, editCountry, setEditCountry, editTags, setEditTags, newTagInput, setNewTagInput,
    editImg, setEditImg, editVideoUrl, setEditVideoUrl, editHeroImg, setEditHeroImg,
    editHeroVideoUrl, setEditHeroVideoUrl, editStatusBadge, setEditStatusBadge, archiveMediaTab,
    setArchiveMediaTab, isCountryDropdownOpen, setIsCountryDropdownOpen, countryDropdownRef,
    matchedCountries, parsedDateInputs, handleStartDateChange, handleEndDateChange, homeJourneyLimit,
    setHomeJourneyLimit, isSavingTrip, setIsSavingTrip, tripSaveSuccess, setTripSaveSuccess,
    isUploading, setIsUploading, isMainDragActive, setIsMainDragActive, isHeroDragActive,
    setIsHeroDragActive, showUnsavedModal, setShowUnsavedModal, pendingJourneyId,
    setPendingJourneyId, pendingAction, setPendingAction, showSaveSuccessModal,
    setShowSaveSuccessModal, showQuickPhotoPicker, setShowQuickPhotoPicker, inlineAddMenuCardId,
    setInlineAddMenuCardId, showScrollTop, setShowScrollTop, activeScrollContainerRef,
    handleContainerScroll, scrollToTop, selectedTrashJourneyIds, setSelectedTrashJourneyIds,
    selectedTrashSectionIds, setSelectedTrashSectionIds, isDeletingTrash, setIsDeletingTrash,
    trashDeleteModal, setTrashDeleteModal, handleToggleSelectAllTrash, handleToggleTrashJourney,
    handleToggleTrashSection, requestPermanentDeleteSingleJourney,
    requestPermanentDeleteSingleSection, handleBatchRestoreSelectedTrash, requestBatchDeleteSelected,
    diagReport, setDiagReport, isScanning, setIsScanning, isCleaning, setIsCleaning, cleanLog,
    setCleanLog, showCleanSuccessModal, setShowCleanSuccessModal, cleanupSummary, setCleanupSummary,
    handleScanCleanup, handleExecuteCleanup, handleOneTouchOptimize, draggedIndex, setDraggedIndex,
    selectedJourney, widgetShowCalendar, setWidgetShowCalendar, widgetShowWeather,
    setWidgetShowWeather, widgetOrder, setWidgetOrder, widgetShowExchange, setWidgetShowExchange,
    widgetShowDDay, setWidgetShowDDay, widgetCities, setWidgetCities, isAddingWeatherCity,
    setIsAddingWeatherCity, newCitySearchQuery, setNewCitySearchQuery, savedHomeWidgetsSnapshotRef,
    handleAddHomeWeatherCity, handleRemoveHomeWeatherCity, handleMoveHomeWeatherCity,
    savedHomeSnapshotRef, savedArchiveSnapshotRef, savedSectionsJsonRef, savedArchiveHubHeaderRef,
    savedMagazineHubHeaderRef, getNormalizedJourneyData, saveRevision, setSaveRevision,
    isHomeWidgetsDirty, isHomeDirty, savedTripOrderRef, isTripOrderDirty, isArchiveDirty,
    isMagazineDirty, isArchiveHubHeaderDirty, isMagazineHubHeaderDirty, isBgmDirty, isPresetsDirty,
    isCalendarDirty, syncAllSnapshotsToCurrent, isAnyDirty, handleResetAllState, navigateSafely,
    executeWithGuard, handleMoveOrder, handleDragStart, handleDragOver, handleDrop,
    handleSaveJourney, handleFileUpload, handleAddTag, handleRemoveTag, handleSaveHome,
    pushMagazineSnapshot, handleMagazineUndo, handleMagazineRedo, filteredHeroCandidates, safeStr,
    candidateTimelineItems, handleAddSection, handleAutoGenerateSectionFromTrip, handleDeleteSection,
    handleMoveSection, handleUpdateSectionField, handleAddItemToCurrentSection,
    handleAddTextCardToCurrentSection, handleRemoveItemFromCurrentSection,
    handleMoveItemInCurrentSection, handleUpdateItemInCurrentSection, handleSetAsHeroFromItem,
    isSyncingMagazine, setIsSyncingMagazine, handleRefreshAndSyncMagazine, handleSaveMagazine,
    isSavingAll, setIsSavingAll, saveAllSuccess, setSaveAllSuccess, handleSaveAllChanges,
    saveActiveOrAllSettings, handleLoadFirestoreMagazineSections,
    handleForceRestoreSectionsFromFirestore, isSelectedPlan, getReturnView
  };
}

export type ManageHubState = ReturnType<typeof useManageHubState>;
