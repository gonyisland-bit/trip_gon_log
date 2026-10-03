import React, { useState, useEffect, useRef } from 'react';
import {
  Trip, Plan, MagazineMoment, MagazineSection, TimelineData, TrashedMagazineSection, LandingHeroMediaItem
} from '../../types';
import { notify } from '../../utils/feedback';
import { useWeatherCitiesAdmin } from './state/useWeatherCitiesAdmin';
import { usePresetsAdmin } from './state/usePresetsAdmin';
import { useLandingSettings } from './state/useLandingSettings';
import { useMembersAdmin } from './state/useMembersAdmin';
import { useTrashCleanup } from './state/useTrashCleanup';
import type { DirtyDomain } from './state/dirtyDomain';

// v1.3.7: the hub has two tabs, SYSTEM (landing, notice, starting setup, data) and USERS. The old
// HOME / ARCHIVE / MAGAZINE / UTIL editors and their saves went with them (P5-b3-2a). Each part
// lives in its own hook under ./state; this shell holds the tab, scroll, leave guard and the
// combined save / reset over the parts that track changes (P5-b3-2b).
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
    trips, plans, onNavigate, trashedJourneys, trashedSections = [], onRestoreJourney, onRestoreMagazineSection,
    onDirtyChange, saveRef,
  } = props;

  const [activeMode, setActiveMode] = useState<ManageMode>(() => {
    const fromSession = sessionStorage.getItem('initialManageTab');
    if (fromSession) sessionStorage.removeItem('initialManageTab');
    return fromSession === 'USERS' ? 'USERS' : 'SYSTEM';
  });

  const weather = useWeatherCitiesAdmin();
  const presets = usePresetsAdmin();
  const landing = useLandingSettings(props);
  const members = useMembersAdmin({ ...props, activeMode });
  const trash = useTrashCleanup({ ...props, activeMode });
  // Saved together in this order by the floating save, Ctrl+S and the leave guard
  const domains: DirtyDomain[] = [landing.domain, presets.domain, weather.domain];

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

  const isAnyDirty = domains.some(d => d.isDirty);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isAnyDirty);
    }
  }, [isAnyDirty, onDirtyChange]);

  // Treat every part's current values as saved so isAnyDirty becomes immediately false
  const syncAllSnapshotsToCurrent = () => {
    domains.forEach(d => d.markSaved());
    if (onDirtyChange) onDirtyChange(false);
  };

  // Put every part back to its last saved values
  const handleResetAllState = () => {
    domains.forEach(d => d.reset());
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


  const [isSavingHome, setIsSavingHome] = useState(false);
  const [homeSaveSuccess, setHomeSaveSuccess] = useState(false);

  const handleSaveHome = async (showModal: boolean = true) => {
    setIsSavingHome(true);
    try {
      await landing.domain.save();
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

  // Save every part the hub edits
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllSuccess, setSaveAllSuccess] = useState(false);

  const handleSaveAllChanges = async (showModal: boolean = true) => {
    if (isSavingAll) return;
    setIsSavingAll(true);
    try {
      for (const d of domains) {
        try {
          await d.save();
        } catch (err) {
          console.warn('Manage hub save notice in saveAll:', err);
        }
      }
      syncAllSnapshotsToCurrent();
      setSaveAllSuccess(true);
      setHomeSaveSuccess(true);
      if (showModal) {
        setShowSaveSuccessModal(true);
      }
      setTimeout(() => {
        setSaveAllSuccess(false);
        setHomeSaveSuccess(false);
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
    ...weather.state,
    ...presets.state,
    ...landing.state,
    ...members,
    ...trash,
    isSavingHome, homeSaveSuccess,
    showScrollTop, scrollToTop, handleContainerScroll, showUnsavedModal, setShowUnsavedModal, pendingAction,
    setPendingAction, showSaveSuccessModal, setShowSaveSuccessModal, syncAllSnapshotsToCurrent,
    handleResetAllState, navigateSafely, executeWithGuard, handleSaveHome, isSavingAll, saveAllSuccess,
    handleSaveAllChanges, saveActiveOrAllSettings, getReturnView,
  };
}

export type ManageHubState = ReturnType<typeof useManageHubState>;
