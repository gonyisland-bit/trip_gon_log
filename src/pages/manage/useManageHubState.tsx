import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, deleteField, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
// Journey content writes carry owner / access fields (v1.3.6)
import { setDoc, visibleContent } from '../../utils/ownership';
import { db } from '../../firebase';
import {
  Trip, Plan, MagazineMoment, MagazineSection, TimelineData, TimelineItem, TrashedMagazineSection,
  UserProfile, LandingHeroMediaItem, CityWeatherConfig
} from '../../types';
import { cleanAdministrativeDistricts } from '../../components/SummaryView';
import { uploadFileToR2 } from '../../utils/storageHelper';
import { compressImage } from '../../utils/imageHelper';
import { resolveTimelinePlaceName } from '../../utils/magazineHelper';
import { PresetTripPlan, getSavedPresets, restoreDefaultPresets, saveAllPresets } from '../../data/worldDestinations';
import { notify, confirmDialog } from '../../utils/feedback';
import { VERIFY_PROBLEM, deleteAuthAccount, verifyAuthAccount } from '../../utils/accountCleanup';
import { sendResetMail } from '../../utils/emailVerification';

// v1.3.7: the hub has two tabs, SYSTEM (landing, notice, starting setup, data) and USERS. The old
// HOME / ARCHIVE / MAGAZINE / UTIL editors and their saves went with them (P5-b3-2a).
export type ManageMode = 'SYSTEM' | 'USERS';

export interface ManageHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null, pushHistory?: boolean, tagFilter?: string | null, force?: boolean) => void;
  onSaveTrip: (tripId: number, updatedData: Partial<Trip>) => Promise<void>;
  // Landing (guest home) settings
  homeTitle: string;
  homeSubtitle: string;
  heroJourneyIds: number[];
  marqueeShow: boolean;
  marqueeMessage: string;
  marqueeSpeed: number;
  onSaveAllHomeSettings: (
    title: string,
    subtitle: string,
    heroIds: number[],
    autoSlide?: boolean,
    marqueeShow?: boolean,
    marqueeMsg?: string,
    marqueeSpd?: number,
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
  // Data cleanup reads and rewrites the magazine
  magazineSections?: MagazineSection[];
  timelineData?: TimelineData;
  onSaveMagazineSections?: (sections: MagazineSection[]) => Promise<void>;
  // Trash bin
  trashedJourneys: Trip[];
  trashedSections?: TrashedMagazineSection[];
  onRestoreJourney: (id: number) => Promise<void>;
  onPermanentDeleteJourney: (id: number) => Promise<void>;
  onRestoreMagazineSection?: (sectionId: string) => Promise<void>;
  onPermanentDeleteMagazineSection?: (sectionId: string) => Promise<void>;
  onBatchPermanentDelete?: (params: { journeyIds: number[]; sectionIds: string[] }) => Promise<void>;
  isLoggedIn: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  saveRef?: React.MutableRefObject<((showModal?: boolean) => Promise<void>) | null>;
}

export function useManageHubState(props: ManageHubPageProps) {
  const {
    trips, plans, onNavigate, onSaveTrip, homeTitle, homeSubtitle, heroJourneyIds, marqueeShow,
    marqueeMessage, marqueeSpeed, onSaveAllHomeSettings, landingHeroImage = '', landingHeroMedia = [],
    magazineSections = [], timelineData = {}, onSaveMagazineSections, trashedJourneys,
    trashedSections = [], onRestoreJourney, onPermanentDeleteJourney, onRestoreMagazineSection,
    onPermanentDeleteMagazineSection, onBatchPermanentDelete, isLoggedIn, onDirtyChange, saveRef,
  } = props;

  const [activeMode, setActiveMode] = useState<ManageMode>(() => {
    const fromSession = sessionStorage.getItem('initialManageTab');
    if (fromSession) sessionStorage.removeItem('initialManageTab');
    return fromSession === 'USERS' ? 'USERS' : 'SYSTEM';
  });
  // Bumped after a save so the dirty memos re-read their snapshot refs
  const [saveRevision, setSaveRevision] = useState(0);

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
      notify('이미 등록된 도시입니다.');
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
      notify('최소 1개 이상의 날씨 지역이 필요합니다.');
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
      notify('캘린더 날씨 도시 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingCalendar(false);
    }
  };


  // PRESETS Management State
  const [presetsList, setPresetsList] = useState<PresetTripPlan[]>(() => getSavedPresets());
  const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');
  const [presetThemeFilter, setPresetThemeFilter] = useState<string>('all');
  const [editingPreset, setEditingPreset] = useState<PresetTripPlan | null>(null);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [presetToDelete, setPresetToDelete] = useState<PresetTripPlan | null>(null);
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


  // Landing title and ticker (SYSTEM › landing · notice)
  const [title, setTitle] = useState(homeTitle || '');
  const [showMarquee, setShowMarquee] = useState(marqueeShow);
  const [homeMarquee, setHomeMarquee] = useState(marqueeMessage || '');
  const [homeSpeed, setHomeSpeed] = useState(marqueeSpeed || 50);
  const [isSavingHome, setIsSavingHome] = useState(false);
  const [homeSaveSuccess, setHomeSaveSuccess] = useState(false);

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
      notify('이미지 또는 동영상 파일만 업로드 가능합니다.');
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
      notify('게스트 랜딩 미디어 업로드에 실패했습니다.');
    } finally {
      setIsUploadingLandingHero(false);
    }
  };

  const handleReplaceLandingHeroMedia = async (index: number, file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (!isImage && !isVideo) {
      notify('이미지 또는 동영상 파일만 업로드 가능합니다.');
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
      notify('게스트 랜딩 미디어 교체에 실패했습니다.');
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
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState<boolean>(false);
  const [delegatingUser, setDelegatingUser] = useState<UserProfile | null>(null);
  const [isDelegatingModalOpen, setIsDelegatingModalOpen] = useState<boolean>(false);
  const [userActionToast, setUserActionToast] = useState<string | null>(null);

  // Admin Account Dynamic Management
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>(() => localStorage.getItem('cached_super_admin_email') || 'gonyisland@naver.com');
  const [newAdminEmailInput, setNewAdminEmailInput] = useState<string>('');
  const [adminEmailSaving, setAdminEmailSaving] = useState<boolean>(false);

  // Helper to determine if account is super admin or admin
  const isTargetAdminAccount = (email?: string, role?: string) => {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    return clean === 'gonyisland@naver.com' || clean === currentAdminEmail.toLowerCase().trim() || role === 'admin';
  };

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
      notify("유효한 이메일 주소를 입력해 주세요.");
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
      notify(`관리자 이메일 저장 실패: ${err?.message || err}`);
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
      setUserActionToast(`[${user.lastName} ${user.firstName}] 님의 이용 제한을 풀었습니다.`);
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to approve user:', err);
      notify('승인 처리 중 오류가 발생했습니다.');
    }
  };

  // A member stuck behind the verification mail: the operator marks the address verified
  const handleVerifyUser = async (user: UserProfile, confirmed = false) => {
    const fullName = `${user.lastName} ${user.firstName}`.trim() || user.username || user.email;
    if (!confirmed && !await confirmDialog(`[${fullName} (${user.email})] 님의 메일 인증을 운영자가 대신 처리할까요? 본인 주소가 맞는지 확인한 뒤 눌러 주세요.`, { title: 'VERIFY', confirmLabel: '인증 처리' })) return;
    const result = await verifyAuthAccount(user.uid);
    if (result !== 'verified') {
      notify(VERIFY_PROBLEM[result], 'error');
      return;
    }
    await Promise.allSettled([
      updateDoc(doc(db, 'users', user.uid), { status: 'approved', approvedAt: Date.now(), emailVerifiedAt: Date.now() }),
      setDoc(doc(db, 'users', 'public', 'users', user.uid), { status: 'approved', approvedAt: Date.now(), emailVerifiedAt: Date.now() }, { merge: true }),
    ]);
    setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'approved' } : u));
    setUserActionToast(`[${fullName}] 님의 메일 인증을 처리했습니다. 다음 접속부터 바로 이용할 수 있습니다.`);
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleRejectUser = async (user: UserProfile, confirmed = false) => {
    if (!confirmed && !await confirmDialog(`[${user.lastName} ${user.firstName}] 님의 이용을 제한할까요? 로그인하면 바로 로그아웃됩니다.`, { title: 'RESTRICT', confirmLabel: '이용 제한' })) return;
    try {
      await Promise.allSettled([
        updateDoc(doc(db, 'users', user.uid), { status: 'rejected', rejectedAt: Date.now() }),
        setDoc(doc(db, 'users', 'public', 'users', user.uid), { ...user, status: 'rejected', rejectedAt: Date.now() }, { merge: true }),
        deleteDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`))
      ]);
      setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'rejected' } : u));
      setUserActionToast(`[${user.lastName} ${user.firstName}] 님의 이용을 제한했습니다.`);
      setTimeout(() => setUserActionToast(null), 2500);
    } catch (err) {
      console.error('Failed to reject user:', err);
      notify('거절 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteUserByAdmin = async (user: UserProfile, confirmed = false) => {
    if (isTargetAdminAccount(user.email, user.role)) {
      notify("관리자 계정은 삭제할 수 없습니다.");
      return;
    }
    const fullName = `${user.lastName} ${user.firstName}`.trim() || user.username || user.email;
    if (!confirmed && !await confirmDialog(`정말로 회원 [${fullName} (${user.email})] 계정을 영구 삭제하시겠습니까?\n모든 프로필 데이터가 완전히 제거됩니다.`)) return;

    try {
      await Promise.allSettled([
        deleteDoc(doc(db, 'users', user.uid)),
        deleteDoc(doc(db, 'users', 'public', 'users', user.uid)),
        deleteDoc(doc(db, 'users', 'public', 'settings', `pendingApproval_${user.uid}`))
      ]);
      setUsersList(prev => prev.filter(u => u.uid !== user.uid));
      // The sign-in account goes too when the server has a service account; otherwise it removes
      // itself the next time it signs in (no empty profile is brought back)
      const account = await deleteAuthAccount(user.uid);
      setUserActionToast(account === 'deleted'
        ? `[${fullName}] 회원 계정을 삭제했습니다. 같은 이메일로 다시 가입할 수 있습니다.`
        : `[${fullName}] 회원 프로필을 삭제했습니다. 로그인 계정은 다음 로그인 때 정리됩니다.`);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      notify(`회원 삭제 중 오류가 발생했습니다: ${err?.message || err}`);
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
      await sendResetMail(user.email);
      setUserActionToast(`[${fullName}] 님에게 비밀번호 재설정 메일을 보냈습니다.`);
      setTimeout(() => setUserActionToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to send password reset email:', err);
      notify(`재설정 메일 발송 중 오류가 발생했습니다: ${err?.message || err}`);
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
      notify('유저 정보 수정에 실패했습니다.');
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

  // Unsaved changes guard and save feedback
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

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
    try {
      const validTripIds = new Set<string>();
      trips.forEach(t => validTripIds.add(String(t.id)));
      plans.forEach(p => validTripIds.add(String(p.id)));
      trashedJourneys.forEach(t => validTripIds.add(String(t.id)));

      const [timelineSnap, staysSnap, flightsSnap, transitsSnap, tripsSnap, plansSnap] = await Promise.all([
        getDocs(visibleContent('timeline')!),
        getDocs(visibleContent('stays')!),
        getDocs(visibleContent('flights')!),
        getDocs(visibleContent('transits')!),
        getDocs(visibleContent('trips')!),
        getDocs(visibleContent('plans')!)
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
      [...trips, ...plans].forEach(j => {
        if (j.gallery && Array.isArray(j.gallery)) {
          j.gallery.forEach((g: any) => {
            const url = typeof g === 'string' ? g : g?.url;
            if (url) galleryPhotoUrls.add(url);
          });
        }
      });

      magazineSections.forEach(section => {
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
      notify(`데이터베이스 진단 스캔 중 오류가 발생했습니다:\n${err?.message || err}`);
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecuteCleanup = async (reportParam?: DiagnosticReport, skipConfirm = false) => {
    const targetReport = reportParam || diagReport;
    if (!targetReport) return;
    if (!skipConfirm && !await confirmDialog('안전 최적화 및 찌꺼기 정리를 실행하시겠습니까?\n\n[안전 보장 원칙]\n- 현재 등록된 모든 활성 여정 및 타임라인 데이터는 100% 안전하게 온전히 보존됩니다.\n- 이미 삭제된 과거 여정의 고아(Orphaned) 문서와 폐기된 subtitle 속성만 선별 정리됩니다.\n- 매거진은 원본 타임라인 데이터를 기준으로 완벽하게 최적화 및 동기화됩니다.')) {
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
        localStorage.setItem(`cached_magazine_sections_backup_cleanup_${Date.now()}`, JSON.stringify(magazineSections));
      } catch (_) {}

      logs.push(`[${new Date().toLocaleTimeString()}] 데이터 최적화 및 클린화 작업 시작...`);

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
        const cleanedSections = magazineSections.map(sec => {
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
          if (onSaveMagazineSections) {
            await onSaveMagazineSections(cleanedSections);
          }
          logs.push(`- [매거진] 최적화된 매거진 섹션 데이터 Firestore에 안전 영구 반영 완료`);
        }
      }

      logs.push(`[${new Date().toLocaleTimeString()}] 모든 최적화 및 클린화 작업이 안전하게 완료되었습니다!`);
      setCleanLog(logs);
      setCleanupSummary({ orphanedDeleted, subtitleCleaned, cacheCleaned, magazineOptimized });
      setShowCleanSuccessModal(true);

      // Refresh scan
      await handleScanCleanup();
    } catch (err: any) {
      console.error('Execute cleanup error:', err);
      notify(`정리 작업 중 오류가 발생했습니다:\n${err?.message || err}`);
    } finally {
      setIsCleaning(false);
    }
  };

  /** TRASH 탭 통합: 스캔과 안전 정리를 원터치로 한 번에 실행 */
  const handleOneTouchOptimize = async () => {
    if (isScanning || isCleaning) return;
    setIsScanning(true);
    setCleanLog([`[${new Date().toLocaleTimeString()}] 데이터베이스 무결성 정밀 스캔 시작...`]);
    try {
      const report = await handleScanCleanup();
      if (!report) {
        setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 스캔 중 오류가 발생했습니다.`]);
        return;
      }
      if (!report.isClean) {
        setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 정리 대상 발견: 고아 문서 및 캐시 자동 정리 진행...`]);
        await handleExecuteCleanup(report, true);
      } else {
        setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 모든 데이터가 100% 정상 최적화 상태입니다 (정리할 찌꺼기 없음).`]);
      }
    } catch (err: any) {
      console.error('One-touch optimize error:', err);
      setCleanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 최적화 중 오류: ${err?.message || err}`]);
    } finally {
      setIsScanning(false);
      setIsCleaning(false);
    }
  };

  // ── Snapshots for dirty tracking ──
  const savedHomeSnapshotRef = useRef({
    title: homeTitle || '',
    showMarquee: marqueeShow,
    homeMarquee: marqueeMessage || '',
    homeSpeed: marqueeSpeed || 50,
    landingHeroImage: landingHeroImage || '',
    landingHeroMedia: JSON.stringify(landingHeroMedia || []),
  });

  const isHomeDirty = useMemo(() => {
    const snap = savedHomeSnapshotRef.current;
    return (
      (title || '').trim() !== (snap.title || '').trim() ||
      showMarquee !== snap.showMarquee ||
      (homeMarquee || '').trim() !== (snap.homeMarquee || '').trim() ||
      homeSpeed !== snap.homeSpeed ||
      (localLandingHeroImage || '').trim() !== (snap.landingHeroImage || '').trim() ||
      JSON.stringify(localLandingHeroMedia || []) !== (snap.landingHeroMedia || '[]')
    );
  }, [title, showMarquee, homeMarquee, homeSpeed, localLandingHeroImage, localLandingHeroMedia, saveRevision]);

  const isPresetsDirty = useMemo(() => {
    return (savedPresetsSnapshotRef.current || '[]') !== JSON.stringify(presetsList);
  }, [presetsList, saveRevision]);

  const isCalendarDirty = useMemo(() => {
    return (savedCalendarCitiesSnapshotRef.current || '[]') !== JSON.stringify(calendarWeatherCities);
  }, [calendarWeatherCities, saveRevision]);

  // Synchronize all snapshot references to current state so isAnyDirty becomes immediately false
  const syncAllSnapshotsToCurrent = () => {
    savedPresetsSnapshotRef.current = JSON.stringify(presetsList);
    savedCalendarCitiesSnapshotRef.current = JSON.stringify(calendarWeatherCities);
    savedHomeSnapshotRef.current = {
      title,
      showMarquee,
      homeMarquee,
      homeSpeed,
      landingHeroImage: localLandingHeroImage,
      landingHeroMedia: JSON.stringify(localLandingHeroMedia || []),
    };
    setSaveRevision(prev => prev + 1);
    if (onDirtyChange) onDirtyChange(false);
  };

  const isAnyDirty = isHomeDirty || isPresetsDirty || isCalendarDirty;

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isAnyDirty);
    }
  }, [isAnyDirty, onDirtyChange]);

  // Reset all edited state back to saved snapshots
  const handleResetAllState = () => {
    const homeSnap = savedHomeSnapshotRef.current;
    setTitle(homeSnap.title);
    setShowMarquee(homeSnap.showMarquee);
    setHomeMarquee(homeSnap.homeMarquee);
    setHomeSpeed(homeSnap.homeSpeed);
    setLocalLandingHeroImage(homeSnap.landingHeroImage || '');
    try {
      setLocalLandingHeroMedia(JSON.parse(homeSnap.landingHeroMedia || '[]'));
    } catch (_) {
      setLocalLandingHeroMedia([]);
    }

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


  // Landing save: only what the hub edits (title, ticker, landing media). Every other home field is
  // left undefined so App keeps its own current value, and the magazine is not touched.
  const saveLanding = () => onSaveAllHomeSettings(
    title,
    homeSubtitle || '',
    heroJourneyIds || [],
    undefined,
    showMarquee,
    homeMarquee,
    homeSpeed,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    localLandingHeroImage,
    localLandingHeroMedia
  );

  const handleSaveHome = async (showModal: boolean = true) => {
    setIsSavingHome(true);
    try {
      await saveLanding();
      syncAllSnapshotsToCurrent();
      setHomeSaveSuccess(true);
      if (showModal) {
        setShowSaveSuccessModal(true);
      }
      setTimeout(() => setHomeSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save home settings:', err);
      notify('홈 설정 저장에 실패했습니다.');
    } finally {
      setIsSavingHome(false);
    }
  };

  // Save every domain the hub edits
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllSuccess, setSaveAllSuccess] = useState(false);

  const handleSaveAllChanges = async (showModal: boolean = true) => {
    if (isSavingAll) return;
    setIsSavingAll(true);
    try {
      try {
        await saveLanding();
      } catch (homeErr) {
        console.warn('Home settings save notice in saveAll:', homeErr);
      }

      try {
        saveAllPresets(presetsList);
        await setDoc(doc(db, 'users', 'public', 'settings', 'presets'), {
          presets: presetsList,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {
        console.warn('Firestore presets sync notice:', fErr);
      }

      try {
        localStorage.setItem('cached_calendar_weather_cities', JSON.stringify(calendarWeatherCities));
        await setDoc(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'), { cities: calendarWeatherCities }, { merge: true });
      } catch (cErr) {
        console.warn('Firestore calendar weather cities sync notice:', cErr);
      }
      setCalendarSaveSuccess(true);

      syncAllSnapshotsToCurrent();
      setSaveAllSuccess(true);
      setHomeSaveSuccess(true);
      if (showModal) {
        setShowSaveSuccessModal(true);
      }
      setTimeout(() => {
        setSaveAllSuccess(false);
        setHomeSaveSuccess(false);
        setCalendarSaveSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to save all management changes:', err);
      notify('설정 저장 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsSavingAll(false);
    }
  };

  const saveActiveOrAllSettings = async (showModal: boolean = false) => {
    try {
      await handleSaveAllChanges(showModal);
    } catch (err) {
      console.error('saveActiveOrAllSettings failed:', err);
    }
  };

  // Ctrl+S / Cmd+S saves
  const saveShortcutRef = useRef(handleSaveAllChanges);
  saveShortcutRef.current = handleSaveAllChanges;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        if (showUnsavedModal) return;
        saveShortcutRef.current(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUnsavedModal]);

  // Sync saveRef with the unified save handler so any unsaved state gets saved before navigating away
  useEffect(() => {
    if (saveRef) {
      saveRef.current = () => saveActiveOrAllSettings(false);
    }
  }, [saveRef, saveActiveOrAllSettings]);

  const getReturnView = () => {
    try {
      const savedLast = sessionStorage.getItem('lastNonManageView');
      if (savedLast && ['home', 'archive', 'calendar', 'map', 'pocket', 'detail'].includes(savedLast)) {
        return savedLast;
      }
    } catch (_) {}
    return activeMode === 'USERS' ? 'users' : 'home';
  };

  return {
    trips, plans, trashedJourneys, trashedSections, onRestoreJourney, onRestoreMagazineSection, onDirtyChange,
    activeMode, setActiveMode,
    // calendar weather cities
    calendarWeatherCities, searchCalendarCityQuery, setSearchCalendarCityQuery, calendarCityMovedEn,
    isSavingCalendar, calendarSaveSuccess, handleAddCalendarWeatherCity, handleMoveCalendarWeatherCity,
    handleRemoveCalendarWeatherCity, handleSaveCalendarSettings, isCalendarDirty,
    // presets
    presetsList, presetSearchQuery, setPresetSearchQuery, presetThemeFilter, setPresetThemeFilter,
    editingPreset, setEditingPreset, isPresetModalOpen, setIsPresetModalOpen, presetToDelete, setPresetToDelete,
    showRestorePresetsConfirm, setShowRestorePresetsConfirm, handleOpenNewPreset, handleOpenEditPreset,
    handleSavePresetModal, handleDeletePresetClick, handleConfirmDeletePreset, handleConfirmRestorePresets,
    isPresetsDirty,
    // landing
    title, setTitle, showMarquee, setShowMarquee, homeMarquee, setHomeMarquee, homeSpeed, setHomeSpeed,
    isSavingHome, homeSaveSuccess, setLocalLandingHeroImage, localLandingHeroMedia, setLocalLandingHeroMedia,
    isUploadingLandingHero, isDraggingLandingHero, setIsDraggingLandingHero, replacingLandingHeroIndex,
    dragOverLandingHeroIndex, setDragOverLandingHeroIndex, handleLandingHeroUpload,
    handleReplaceLandingHeroMedia, handleRemoveLandingHeroMedia, handleMoveLandingHeroMedia,
    // members
    usersList, editingUser, setEditingUser, isUserEditModalOpen, setIsUserEditModalOpen, delegatingUser,
    setDelegatingUser, isDelegatingModalOpen, setIsDelegatingModalOpen, userActionToast, currentAdminEmail,
    newAdminEmailInput, setNewAdminEmailInput, adminEmailSaving, isTargetAdminAccount, handleUpdateAdminEmail,
    handleApproveUser, handleVerifyUser, handleRejectUser, handleDeleteUserByAdmin, passwordResetTarget,
    setPasswordResetTarget, handleSendPasswordReset, handleSaveUserEdit, handleToggleTripAllowedEditor,
    // trash & cleanup
    selectedTrashJourneyIds, selectedTrashSectionIds, isDeletingTrash, trashDeleteModal, setTrashDeleteModal,
    handleToggleSelectAllTrash, handleToggleTrashJourney, handleToggleTrashSection,
    requestPermanentDeleteSingleJourney, requestPermanentDeleteSingleSection, handleBatchRestoreSelectedTrash,
    requestBatchDeleteSelected, diagReport, isScanning, isCleaning, cleanLog, setCleanLog,
    showCleanSuccessModal, setShowCleanSuccessModal, cleanupSummary, handleOneTouchOptimize,
    // shell
    showScrollTop, scrollToTop, handleContainerScroll, showUnsavedModal, setShowUnsavedModal, pendingAction,
    setPendingAction, showSaveSuccessModal, setShowSaveSuccessModal, syncAllSnapshotsToCurrent,
    handleResetAllState, navigateSafely, executeWithGuard, handleSaveHome, isSavingAll, saveAllSuccess,
    handleSaveAllChanges, saveActiveOrAllSettings, getReturnView,
  };
}

export type ManageHubState = ReturnType<typeof useManageHubState>;
