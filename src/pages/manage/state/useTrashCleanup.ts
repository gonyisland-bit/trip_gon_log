import { useState, useEffect } from 'react';
import { getDocs, doc, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';
import { visibleContent } from '../../../utils/ownership';
import { db } from '../../../firebase';
import { Trip, TimelineItem, TrashedMagazineSection } from '../../../types';
import { resolveTimelinePlaceName } from '../../../utils/magazineHelper';
import { notify, confirmDialog } from '../../../utils/feedback';
import type { ManageHubPageProps, ManageMode } from '../useManageHubState';

type TrashProps = Pick<ManageHubPageProps,
  'trips' | 'plans' | 'trashedJourneys' | 'trashedSections' | 'onRestoreJourney' | 'onPermanentDeleteJourney' |
  'onRestoreMagazineSection' | 'onPermanentDeleteMagazineSection' | 'onBatchPermanentDelete' | 'magazineSections' |
  'timelineData' | 'onSaveMagazineSections'> & { activeMode: ManageMode };

// SYSTEM › data: trash selection and permanent delete, plus the one-touch database scan and cleanup.
// Every action saves at once.
export function useTrashCleanup(props: TrashProps) {
  const {
    trips, plans, trashedJourneys, trashedSections = [], onRestoreJourney, onPermanentDeleteJourney,
    onRestoreMagazineSection, onPermanentDeleteMagazineSection, onBatchPermanentDelete,
    magazineSections = [], timelineData = {}, onSaveMagazineSections, activeMode,
  } = props;

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

  return {
    selectedTrashJourneyIds, selectedTrashSectionIds, isDeletingTrash, trashDeleteModal, setTrashDeleteModal,
    handleToggleSelectAllTrash, handleToggleTrashJourney, handleToggleTrashSection,
    requestPermanentDeleteSingleJourney, requestPermanentDeleteSingleSection, handleBatchRestoreSelectedTrash,
    requestBatchDeleteSelected, diagReport, isScanning, isCleaning, cleanLog, setCleanLog,
    showCleanSuccessModal, setShowCleanSuccessModal, cleanupSummary, handleOneTouchOptimize,
  };
}
