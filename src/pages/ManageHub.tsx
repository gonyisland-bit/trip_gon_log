import {
  Save, RotateCcw, ArrowLeft, ArrowUp, Calendar, Check, X, Image as ImageIcon, Search, Eye, Layout,
  Edit, Users
} from 'lucide-react';
import { Trip, Plan } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { useManageHubState, type ManageHubPageProps } from './manage/useManageHubState';
import { HomeMode } from './manage/HomeMode';
import { ArchiveMode } from './manage/ArchiveMode';
import { CalendarMode } from './manage/CalendarMode';
import { MagazineMode } from './manage/MagazineMode';
import { UtilMode } from './manage/UtilMode';
import { UsersMode } from './manage/UsersMode';
import { notify } from '../utils/feedback';

export function ManageHubPage(props: ManageHubPageProps) {
  const s = useManageHubState(props);
  const {
    trips, plans, trashedJourneys, trashedSections, onDirtyChange, activeMode, setActiveMode,
    editingPreset, setEditingPreset, isPresetModalOpen, setIsPresetModalOpen, presetToDelete,
    setPresetToDelete, showRestorePresetsConfirm, setShowRestorePresetsConfirm, editingUser,
    setEditingUser, isUserEditModalOpen, setIsUserEditModalOpen, delegatingUser, setDelegatingUser,
    isDelegatingModalOpen, setIsDelegatingModalOpen, handleSaveUserEdit,
    handleToggleTripAllowedEditor, handleSavePresetModal, handleConfirmDeletePreset,
    handleConfirmRestorePresets, setMobileArchiveTab, localJourneys, setSelectedJourneyId,
    selectedTripForMoments, setSelectedTripForMoments, momentSearchQuery, setMomentSearchQuery,
    isSavingMagazine, magazineSaveSuccess, showRestoreModal, setShowRestoreModal, availableBackups,
    handleRestoreDefaultSections, handleApplyBackup, firestoreMagSections, isLoadingFirestoreMag,
    firestoreMagLoadedAt, currentMagSection, title, subtitle, isSavingHome, homeSaveSuccess,
    isSavingTrip, tripSaveSuccess, showUnsavedModal, setShowUnsavedModal, pendingJourneyId,
    setPendingJourneyId, pendingAction, setPendingAction, showSaveSuccessModal,
    setShowSaveSuccessModal, showQuickPhotoPicker, setShowQuickPhotoPicker, showScrollTop,
    scrollToTop, trashDeleteModal, setTrashDeleteModal, showCleanSuccessModal,
    setShowCleanSuccessModal, cleanupSummary, isCalendarDirty, syncAllSnapshotsToCurrent,
    handleResetAllState, navigateSafely, executeWithGuard, handleSaveJourney, handleSaveHome,
    safeStr, candidateTimelineItems, handleAddItemToCurrentSection, handleSaveMagazine, isSavingAll,
    saveAllSuccess, handleSaveAllChanges, saveActiveOrAllSettings,
    handleLoadFirestoreMagazineSections, handleForceRestoreSectionsFromFirestore, getReturnView
  } = s;

  return (
    <main className="min-h-screen w-full bg-paper dark:bg-paper-dark text-black dark:text-white flex flex-col font-sans select-none animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar with Swiss Minimal Mode Switcher */}
      <div className="border-b border-black/15 dark:border-white/15 px-3 sm:px-8 py-2.5 bg-surface dark:bg-surface-dark flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4 sticky top-0 z-30 relative">
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              executeWithGuard(() => navigateSafely(getReturnView()));
            }}
            className="tap-target p-1.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
            title="돌아가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-tight font-sans">
            MANAGEMENT HUB
          </h1>
        </div>

        {/* Mode Switcher: Centered on desktop, scrollable on mobile */}
        <div className="w-full md:w-auto max-w-full overflow-x-auto scrollbar-none border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 p-0.5 rounded-none shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2">
          <div className="flex items-center min-w-max md:min-w-0 pr-1 md:pr-0">
            {([
              { id: 'HOME', label: 'HOME' },
              // TRIP mode retired (v1.3.6 4-a): journeys are managed from their cards and inside the journey
              { id: 'CALENDAR', label: 'CALENDAR' },
              { id: 'MAGAZINE', label: 'MAGAZINE' },
              { id: 'UTIL', label: 'UTIL' },
              { id: 'USERS', label: 'USERS' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (activeMode === tab.id) return;
                  executeWithGuard(() => {
                    setActiveMode(tab.id);
                  });
                }}
                className={`flex-1 md:flex-none px-2.5 sm:px-4 py-1 sm:py-1.5 text-meta sm:text-xs font-mono font-bold uppercase tracking-tight cursor-pointer whitespace-nowrap text-center shrink-0 flex items-center justify-center gap-1 ${
                  activeMode === tab.id
                    ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'CALENDAR' && isCalendarDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                )}
                {tab.id === 'UTIL' && (trashedJourneys.length + trashedSections.length) > 0 && (
                  <span className="ml-1 text-micro font-mono px-1 py-0.5 bg-red-600 text-white font-bold leading-none inline-block">
                    {trashedJourneys.length + trashedSections.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Balance Spacer for centering */}
        <div className="hidden md:block w-28 shrink-0 pointer-events-none" />
      </div>

      {/* 2. Mode Content Container */}
      <div className="flex-1 flex flex-col w-full overflow-hidden">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: HOME (Full App & Home Settings Integration)                   */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'HOME' && <HomeMode s={s} />}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: ARCHIVE (Left: Detailed Edit Form, Right: Reorderable List)  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: ARCHIVE (Top: Header Config, Left: Edit Form, Right: List)    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'ARCHIVE' && <ArchiveMode s={s} />}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: CALENDAR (Calendar & Weather Cities Management)               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'CALENDAR' && <CalendarMode s={s} />}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: MAGAZINE (Sections, Hero, Layout & Moments Management)        */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'MAGAZINE' && <MagazineMode s={s} />}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: UTIL (System Utilities: Visuals, Audio, Map, Presets, Trash) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'UTIL' && <UtilMode s={s} />}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: USERS (Registered Users & Role/Permission Management)        */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'USERS' && <UsersMode s={s} />}

      </div>

      {/* User Info Edit Modal (Admin Mode with 1:1 Avatar, Username & Details) */}
      {isUserEditModalOpen && editingUser && (
        <ProfileEditModal
          isOpen={isUserEditModalOpen}
          user={editingUser}
          onClose={() => {
            setIsUserEditModalOpen(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUserEdit}
          isAdminEditing={true}
          title={`유저 정보 수정 (${editingUser.lastName} ${editingUser.firstName})`}
        />
      )}

      {/* User Trip Delegation Modal */}
      {isDelegatingModalOpen && delegatingUser && (
        <div 
          className="fixed inset-0 z-[650] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" 
          onClick={() => { setIsDelegatingModalOpen(false); setDelegatingUser(null); }}
        >
          <div 
            className="w-full max-w-lg bg-surface dark:bg-surface-dark border border-black dark:border-white p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <div>
                <span className="text-micro font-mono font-extrabold uppercase text-red-600 dark:text-red-500">
                  DELEGATE TRIP EDIT ACCESS
                </span>
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                  [{delegatingUser.lastName} {delegatingUser.firstName}] 여정 편집 권한 위임
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => { setIsDelegatingModalOpen(false); setDelegatingUser(null); }} 
                className="tap-target p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-black/60 dark:text-white/60">
              선택한 여정에 대해 이 유저에게 직접 편집 권한을 부여하거나 회수할 수 있습니다.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-72 border border-black/15 dark:border-white/15 p-2 bg-black/[0.01] dark:bg-white/[0.01]">
              {[...trips, ...plans].map((trip) => {
                const currentEditors = trip.allowedEditors || [];
                const hasAccess = currentEditors.includes(delegatingUser.uid) || currentEditors.includes(delegatingUser.email);

                return (
                  <div 
                    key={trip.id}
                    onClick={() => handleToggleTripAllowedEditor(trip.id, delegatingUser)}
                    className={`p-3 border flex items-center justify-between cursor-pointer transition-colors ${
                      hasAccess 
                        ? 'border-black dark:border-white bg-black/5 dark:bg-white/10' 
                        : 'border-black/10 dark:border-white/10 hover:border-black/30'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-xs font-extrabold uppercase text-black dark:text-white truncate">
                        {trip.title}
                      </div>
                      <div className="text-meta font-mono text-black/60 dark:text-white/60">
                        {trip.date} · {trip.locationStr || trip.country}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-meta font-mono font-extrabold uppercase shrink-0 ${
                      hasAccess
                        ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark'
                        : 'border border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
                    }`}>
                      {hasAccess ? 'ALLOWED (허용됨)' : 'DENIED (권한없음)'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-black/10 dark:border-white/10">
              <button 
                type="button"
                onClick={() => { setIsDelegatingModalOpen(false); setDelegatingUser(null); }}
                className="btn btn-primary"
              >
                DONE (완료)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating Bottom-Left Action Bar: Save & View Mode Buttons */}
      <div className="fixed bottom-6 left-6 z-[600] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
        {/* Floating Save Button */}
        <button
          type="button"
          onClick={async () => {
            if (activeMode === 'HOME') await handleSaveHome();
            else if (activeMode === 'ARCHIVE') await handleSaveJourney();
            else if (activeMode === 'MAGAZINE') await handleSaveMagazine();
            else await handleSaveAllChanges(true);
            syncAllSnapshotsToCurrent();
          }}
          disabled={activeMode === 'HOME' ? isSavingHome : (activeMode === 'ARCHIVE' ? isSavingTrip : (activeMode === 'MAGAZINE' ? isSavingMagazine : isSavingAll))}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer border ${
            (homeSaveSuccess || tripSaveSuccess || magazineSaveSuccess || saveAllSuccess)
              ? 'bg-emerald-600 text-white border-emerald-600 scale-105'
              : 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-white/20 dark:border-black/20 hover:scale-110 active:scale-95'
          }`}
          title="변경사항 저장 (단축키: Ctrl + S)"
        >
          {(homeSaveSuccess || tripSaveSuccess || magazineSaveSuccess || saveAllSuccess) ? (
            <Check className="w-5 h-5 animate-in zoom-in" />
          ) : (
            <Save className="w-5 h-5" />
          )}
        </button>

        {/* Floating View Mode Button (Eye icon) */}
        <button
          type="button"
          onClick={() => {
            executeWithGuard(() => navigateSafely(getReturnView()));
          }}
          className="tap-target w-12 h-12 rounded-full flex items-center justify-center shadow-2xl bg-surface dark:bg-surface-dark text-black dark:text-white border border-black/15 dark:border-white/15 hover:scale-110 active:scale-95 transition cursor-pointer"
          title="뷰 모드로 이동"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Scroll To Top Button (Right Bottom) */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="맨 위로 이동"
        title="맨 위로 이동 (TOP)"
        className={`tap-target fixed bottom-6 right-6 z-[600] w-12 h-12 rounded-full flex items-center justify-center shadow-2xl bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border border-white/20 dark:border-black/20 transition-all duration-300 cursor-pointer select-none group ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto hover:scale-110 active:scale-95'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform duration-200" />
      </button>

      {/* 4. Common Minimal Unsaved Changes Modal */}
      <ConfirmModal
        isOpen={showUnsavedModal}
        title="UNSAVED CHANGES"
        message="Are you sure you want to leave? Any unsaved changes will be lost."
        confirmLabel="Save (Y)"
        discardLabel="Discard (N)"
        cancelLabel="Skip (Esc)"
        onConfirm={async () => {
          setShowUnsavedModal(false);
          setShowSaveSuccessModal(false);
          if (onDirtyChange) onDirtyChange(false);
          const act = pendingAction;
          const targetJourneyId = pendingJourneyId;
          setPendingAction(null);
          setPendingJourneyId(null);

          try {
            await saveActiveOrAllSettings(false);
          } catch (e) {
            console.error("Auto save failed:", e);
          }

          if (act) {
            // Immediately execute navigation action (e.g. view mode) without showing modal
            act();
          } else if (targetJourneyId !== null) {
            setSelectedJourneyId(targetJourneyId);
            setMobileArchiveTab('EDIT');
          } else {
            setShowSaveSuccessModal(true);
          }
        }}
        onDiscard={() => {
          handleResetAllState();
          setShowUnsavedModal(false);
          if (onDirtyChange) onDirtyChange(false);
          const act = pendingAction;
          const targetJourneyId = pendingJourneyId;
          setPendingAction(null);
          setPendingJourneyId(null);
          if (act) {
            act();
          } else if (targetJourneyId !== null) {
            setSelectedJourneyId(targetJourneyId);
            setMobileArchiveTab('EDIT');
          }
        }}
        onCancel={() => {
          setShowUnsavedModal(false);
          setPendingAction(null);
          setPendingJourneyId(null);
        }}
      />

      {/* 5. Trash Bin Permanent Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={trashDeleteModal.isOpen}
        title={trashDeleteModal.title}
        message={trashDeleteModal.message}
        confirmLabel="Delete (Y)"
        cancelLabel="Cancel (N, Esc)"
        confirmVariant="danger"
        iconType="alert"
        onConfirm={async () => {
          const action = trashDeleteModal.onConfirm;
          setTrashDeleteModal(prev => ({ ...prev, isOpen: false }));
          await action();
        }}
        onCancel={() => {
          setTrashDeleteModal(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Quick Photo Picker Floating Modal */}
      {showQuickPhotoPicker && (
        <div 
          className="fixed inset-0 z-[650] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowQuickPhotoPicker(false)}
        >
          <div 
            className="w-full max-w-3xl max-h-[85vh] bg-surface dark:bg-surface-dark border border-black dark:border-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h3 className="text-xs sm:text-sm font-mono font-extrabold uppercase tracking-wider text-black dark:text-white">
                  QUICK PHOTO PICKER (+ INSERT AFTER SELECTED CARD)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickPhotoPicker(false)}
                className="tap-target p-1 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter / Search Bar */}
            <div className="p-3 border-b border-black/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-black/[0.01] dark:bg-white/[0.01]">
              <select
                value={selectedTripForMoments === null ? '' : selectedTripForMoments}
                onChange={e => setSelectedTripForMoments(e.target.value === '' ? null : Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-mono font-bold bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
              >
                <option value="">-- Select journey --</option>
                {localJourneys.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/60 dark:text-white/60" />
                <input
                  type="text"
                  value={momentSearchQuery}
                  onChange={e => setMomentSearchQuery(e.target.value)}
                  placeholder="장소, 메모, 날짜 검색..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                />
              </div>
            </div>

            {/* Photo Candidates Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {candidateTimelineItems.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-black/60 dark:text-white/60 font-mono text-xs">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                  <span>선택된 여정의 사진이 없거나 검색 결과가 없습니다. 상단에서 여정을 선택해주세요.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {candidateTimelineItems.map((photoItem, pIdx) => {
                    const pName = safeStr(photoItem.place);
                    const jTitle = safeStr(photoItem.journeyTitle);
                    const displayTitle = pName || jTitle || 'MOMENT';
                    const itemDate = safeStr(photoItem.date);

                    const isAttached = (currentMagSection?.items || []).some(m =>
                      (m.timelineItemId !== undefined && Number(m.timelineItemId) === Number(photoItem.id)) ||
                      (m.img && photoItem.img && (m.img === photoItem.img || m.img.split('?')[0] === photoItem.img.split('?')[0]))
                    );

                    return (
                      <div
                        key={`quick-picker-${photoItem.id || pIdx}-${pIdx}`}
                        onClick={() => {
                          if (isAttached) {
                            notify("이미 현재 매거진 섹션에 등록된 사진입니다.");
                            return;
                          }
                          handleAddItemToCurrentSection(photoItem);
                          setShowQuickPhotoPicker(false);
                        }}
                        className={`group relative aspect-[3/4] bg-black/5 dark:bg-white/5 border overflow-hidden flex flex-col justify-end transition-all select-none ${
                          isAttached
                            ? 'border-black/20 dark:border-white/20 opacity-40 grayscale cursor-not-allowed'
                            : 'border-black/15 dark:border-white/15 cursor-pointer active:scale-95 hover:border-black dark:hover:border-white shadow-xs'
                        }`}
                        title={isAttached ? '이미 등록된 사진' : '클릭하여 다음 위치에 삽입'}
                      >
                        <img
                          src={getEffectiveImageUrl(photoItem.img || '')}
                          alt={displayTitle}
                          loading="lazy"
                          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                            !isAttached ? 'group-hover:scale-105' : ''
                          }`}
                        />
                        {isAttached ? (
                          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-black/90 text-white dark:bg-white dark:text-black text-micro font-mono font-extrabold uppercase">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>ATTACHED</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-mono text-xs font-extrabold p-2 text-center z-10">
                            + INSERT HERE
                          </div>
                        )}

                        <div className="relative z-10 w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 pt-3 flex flex-col gap-0.5">
                          <span className="text-[11px] font-bold text-white truncate leading-tight">
                            {displayTitle}
                          </span>
                          {itemDate && (
                            <span className="text-micro font-mono text-white/70 truncate">
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

            {/* Modal Footer */}
            <div className="p-3 border-t border-black/15 dark:border-white/15 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-meta font-mono text-black/60 dark:text-white/60">
                * 사진을 클릭하면 현재 선택된 카드의 바로 다음 위치에 삽입됩니다.
              </span>
              <button
                type="button"
                onClick={() => setShowQuickPhotoPicker(false)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Auto-Dismiss Modal */}
      <ConfirmModal
        isOpen={showSaveSuccessModal}
        title="SAVED"
        message="All changes have been successfully saved."
        confirmLabel="OK"
        iconType="check"
        singleButton
        autoDismiss
        autoDismissDuration={1200}
        onConfirm={() => setShowSaveSuccessModal(false)}
        onCancel={() => setShowSaveSuccessModal(false)}
      />

      {/* Clean Success Modal */}
      <ConfirmModal
        isOpen={showCleanSuccessModal}
        title="OPTIMIZATION COMPLETE"
        message={`데이터베이스 최적화 및 안전 정리가 완료되었습니다.\n- 고아 문서/카드 정리: ${cleanupSummary?.orphanedDeleted ?? 0}건\n- 매거진 동기화 및 장소명 최적화: ${cleanupSummary?.magazineOptimized ?? 0}건\n- 폐기 속성(subtitle) 제거: ${cleanupSummary?.subtitleCleaned ?? 0}건\n- 로컬 임시 캐시 정리: ${cleanupSummary?.cacheCleaned ?? 0}건\n\n모든 활성 여정 및 타임라인 데이터는 100% 온전히 유지됩니다.`}
        confirmLabel="OK"
        iconType="check"
        singleButton
        onConfirm={() => setShowCleanSuccessModal(false)}
        onCancel={() => setShowCleanSuccessModal(false)}
      />

      {/* Preset Create/Edit Modal */}
      {isPresetModalOpen && editingPreset && (
        <div 
          className="fixed inset-0 z-[650] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" 
          onClick={() => { setIsPresetModalOpen(false); setEditingPreset(null); }}
        >
          <div 
            className="w-full max-w-lg bg-surface dark:bg-surface-dark border border-black dark:border-white p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                {editingPreset.isCustom && !editingPreset.title ? 'NEW PRESET' : 'EDIT PRESET'}
              </h3>
              <button 
                type="button" 
                onClick={() => { setIsPresetModalOpen(false); setEditingPreset(null); }} 
                className="tap-target p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePresetModal} className="space-y-3 text-xs">
              <div>
                <label className="block text-micro font-mono font-bold uppercase tracking-wider opacity-60 mb-1">TITLE</label>
                <input 
                  type="text" 
                  required 
                  value={editingPreset.title}
                  onChange={e => setEditingPreset({ ...editingPreset, title: e.target.value })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-sans"
                  placeholder="예: TOKYO COFFEE & DESIGN TOUR" 
                />
              </div>
              <div>
                <label className="block text-micro font-mono font-bold uppercase tracking-wider opacity-60 mb-1">SUBTITLE</label>
                <input 
                  type="text" 
                  value={editingPreset.subtitle || ''}
                  onChange={e => setEditingPreset({ ...editingPreset, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-sans"
                  placeholder="간단한 설명..." 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro font-mono font-bold uppercase tracking-wider opacity-60 mb-1">COUNTRY</label>
                  <input 
                    type="text" 
                    required 
                    value={editingPreset.country}
                    onChange={e => setEditingPreset({ ...editingPreset, country: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-mono uppercase"
                    placeholder="JAPAN" 
                  />
                </div>
                <div>
                  <label className="block text-micro font-mono font-bold uppercase tracking-wider opacity-60 mb-1">CITY</label>
                  <input 
                    type="text" 
                    required 
                    value={editingPreset.city}
                    onChange={e => setEditingPreset({ ...editingPreset, city: e.target.value })}
                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-sans"
                    placeholder="도쿄" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-micro font-mono font-bold uppercase tracking-wider opacity-60 mb-1">DURATION (DAYS)</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={30} 
                    value={editingPreset.durationDays}
                    onChange={e => setEditingPreset({ ...editingPreset, durationDays: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-micro font-mono font-bold uppercase tracking-wider opacity-60 mb-1">THEME</label>
                  <select 
                    value={editingPreset.theme}
                    onChange={e => setEditingPreset({ ...editingPreset, theme: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none text-xs font-mono"
                  >
                    <option value="culture">CULTURE</option>
                    <option value="shopping">SHOPPING</option>
                    <option value="food">FOOD</option>
                    <option value="nature">NATURE</option>
                    <option value="activity">ACTIVITY</option>
                    <option value="art">ART</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-micro font-mono font-bold uppercase tracking-wider opacity-60 mb-1">COVER IMAGE URL</label>
                <input 
                  type="text" 
                  value={editingPreset.coverImg}
                  onChange={e => setEditingPreset({ ...editingPreset, coverImg: e.target.value })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-mono"
                  placeholder="https://..." 
                />
              </div>
              <div>
                <label className="block text-micro font-mono font-bold uppercase tracking-wider opacity-60 mb-1">HIGHLIGHTS (쉼표 구분)</label>
                <input 
                  type="text" 
                  value={editingPreset.highlights?.join(', ') || ''}
                  onChange={e => setEditingPreset({ 
                    ...editingPreset, 
                    highlights: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none text-xs font-sans"
                  placeholder="오모테산도, 시부야 스카이, 긴자..." 
                />
              </div>
              <div className="flex gap-2 pt-3 border-t border-black/10 dark:border-white/10">
                <button 
                  type="button"
                  onClick={() => { setIsPresetModalOpen(false); setEditingPreset(null); }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  Save preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Delete Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(presetToDelete)}
        title="DELETE PRESET"
        message={`'${presetToDelete?.title}' 프리셋을 삭제하시겠습니까?\n기본 프리셋인 경우 목록에서 숨겨지며 언제든지 '기본 복구'를 통해 복원할 수 있습니다.`}
        confirmLabel="Delete"
        cancelLabel="취소"
        confirmVariant="danger"
        iconType="alert"
        onConfirm={handleConfirmDeletePreset}
        onCancel={() => setPresetToDelete(null)}
      />

      {/* Restore Default Presets Confirm Modal */}
      <ConfirmModal
        isOpen={showRestorePresetsConfirm}
        title="RESTORE DEFAULT PRESETS"
        message="모든 커스텀 프리셋을 초기화하고 시스템 기본 프리셋 목록으로 되돌리시겠습니까?"
        confirmLabel="Restore"
        cancelLabel="취소"
        confirmVariant="black"
        iconType="alert"
        onConfirm={handleConfirmRestorePresets}
        onCancel={() => setShowRestorePresetsConfirm(false)}
      />

      {/* Restore Magazine Sections Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" onClick={() => setShowRestoreModal(false)}>
          <div className="w-full max-w-lg bg-surface dark:bg-surface-dark border border-black dark:border-white p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-black/70 dark:text-white/70" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                  Restore magazine sections
                </h3>
              </div>
              <button type="button" onClick={() => setShowRestoreModal(false)} className="tap-target p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-black/70 dark:text-white/70 font-sans leading-relaxed">
              기존에 누락되었거나 실수로 지워진 매거진 섹션들을 안전하게 복구할 수 있습니다.
            </p>

            {/* Option 1: Restore Default Magazine Home */}
            <div className="p-3.5 border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-extrabold uppercase text-black dark:text-white">
                  1. 기본 매거진 홈 & 누락 섹션 복구
                </span>
                <button
                  type="button"
                  onClick={handleRestoreDefaultSections}
                  className="btn btn-primary btn-sm"
                >
                  기본 홈 복구 실행
                </button>
              </div>
              <span className="text-[11px] text-black/60 dark:text-white/60 leading-relaxed">
                메인 기본 매거진(MAGAZINE HOME) 및 주요 여정 섹션이 목록에서 누락된 경우 즉시 복원합니다.
              </span>
            </div>

            {/* Option 2: Local Backups */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-xs font-mono font-extrabold uppercase text-black dark:text-white">
                2. 로컬 백업 스냅샷에서 불러오기 ({availableBackups.length}개 발견)
              </span>
              {availableBackups.length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-black/60 dark:text-white/60 border border-dashed border-black/15 dark:border-white/15">
                  저장된 로컬 백업 스냅샷이 없습니다.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableBackups.map(b => (
                    <div key={b.key} className="p-2.5 border border-black/15 dark:border-white/15 flex items-center justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-black dark:text-white truncate">
                          {b.label}
                        </div>
                        <div className="text-meta font-mono text-black/60 dark:text-white/60 truncate">
                          섹션: {b.sections.map(s => s.title).join(', ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyBackup(b.sections)}
                        className="btn btn-secondary btn-sm shrink-0"
                      >
                        불러오기
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Option 3: Firestore Data Restore */}
            <div className="p-3.5 border border-black/20 dark:border-white/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-extrabold uppercase text-black dark:text-white">
                  3. 서버(Firestore) 저장본 확인 및 복원
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await handleLoadFirestoreMagazineSections();
                  }}
                  disabled={isLoadingFirestoreMag}
                  className="btn btn-primary btn-sm"
                >
                  {isLoadingFirestoreMag ? '조회 중...' : '서버 데이터 조회'}
                </button>
              </div>
              {firestoreMagSections && (
                <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                  <span className="text-micro font-mono text-black/70 dark:text-white/70">
                    서버 저장본: 총 {firestoreMagSections.length}개 섹션 ({firestoreMagLoadedAt})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleForceRestoreSectionsFromFirestore();
                      setShowRestoreModal(false);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    이 데이터로 복원
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-black/10 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
