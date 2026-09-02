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
  Image as ImageIcon
} from 'lucide-react';
import { Trip, Plan } from '../types';
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
    heroMediaTypeParam?: 'image' | 'video'
  ) => Promise<void>;
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
}: ManageHubPageProps) {
  // Top-level mode tabs: 'ARCHIVE' | 'HOME' | 'MAP' | 'TRASH'
  const [activeMode, setActiveMode] = useState<'ARCHIVE' | 'HOME' | 'MAP' | 'TRASH'>('ARCHIVE');

  // Combined Journeys for ARCHIVE management
  const [localJourneys, setLocalJourneys] = useState<(Trip | Plan)[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<number | null>(null);

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
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [tripSaveSuccess, setTripSaveSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Sync journeys from props
  useEffect(() => {
    const combined = [...trips, ...plans];
    setLocalJourneys(combined);
    if (combined.length > 0 && selectedJourneyId === null) {
      setSelectedJourneyId(combined[0].id);
    }
  }, [trips, plans]);

  // When selected journey changes, populate form
  const selectedJourney = useMemo(() => {
    return localJourneys.find(j => j.id === selectedJourneyId) || null;
  }, [localJourneys, selectedJourneyId]);

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
    try {
      await onReorderTrips(newArr.map(j => j.id));
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
      if (targetField === 'img') setEditImg(url);
      if (targetField === 'heroImg') setEditHeroImg(url);
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

  // Save Home Settings
  const handleSaveHome = async () => {
    setIsSavingHome(true);
    try {
      localStorage.setItem('playVideoOnActivate', String(playVideoOnActivate));
      await onSaveAllHomeSettings(
        title,
        subtitle,
        selectedHeroIds,
        autoSlide,
        showMarquee,
        homeMarquee,
        homeSpeed,
        mediaType
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

  // Save Map Settings
  const handleSaveMapSettings = () => {
    localStorage.setItem('mapTileStyle', mapTileStyle);
    alert('지도 스타일 설정이 저장되었습니다.');
  };

  const isSelectedPlan = selectedJourney?.tags?.includes('Plan') || selectedJourney?.title.includes('(Plan)');

  return (
    <main className="min-h-screen w-full bg-[#FAF9F6] dark:bg-[#0A0A0A] text-black dark:text-white flex flex-col font-sans select-none animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar with Swiss Minimal Mode Switcher */}
      <div className="border-b border-black/15 dark:border-white/15 px-4 sm:px-8 py-3.5 bg-white dark:bg-[#111111] flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('archive')}
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
              [수정·관리 전용 센터]
            </span>
          </div>
        </div>

        {/* Mode Switcher: ARCHIVE / HOME / MAP / TRASH */}
        <div className="flex items-center border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 p-0.5 rounded-none">
          {(['ARCHIVE', 'HOME', 'MAP', 'TRASH'] as const).map(mode => (
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
      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MODE: ARCHIVE (Left: Detailed Edit Form, Right: Reorderable List)  */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeMode === 'ARCHIVE' && (
          <>
            {/* Left: Journey Edit Form */}
            <div className="w-full lg:w-3/5 border-b lg:border-b-0 lg:border-r border-black/15 dark:border-white/15 p-4 sm:p-8 overflow-y-auto max-h-[calc(100vh-60px)]">
              {selectedJourney ? (
                <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                  
                  {/* Top Bar for Selected Journey */}
                  <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-4">
                    <div>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                        EDITING ID #{selectedJourney.id}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white truncate">
                        {editTitle || 'Untitled Journey'}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
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

                    {/* Main Cover Image */}
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                          Cover Image URL (카드 메인 커버)
                        </label>
                        <label className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>업로드</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleFileUpload(e, 'img')}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editImg}
                        onChange={e => setEditImg(e.target.value)}
                        className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none"
                      />
                      {editImg && (
                        <div className="w-32 h-20 border border-black/15 dark:border-white/15 overflow-hidden mt-1">
                          <img src={getEffectiveImageUrl(editImg)} alt="Cover preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Cover Video URL */}
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                        Cover Video URL (호버 시 재생 비디오)
                      </label>
                      <input
                        type="text"
                        value={editVideoUrl}
                        onChange={e => setEditVideoUrl(e.target.value)}
                        placeholder="https://..."
                        className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none"
                      />
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

            {/* Right: Reorderable Journey List with [▲] / [▼] buttons */}
            <div className="w-full lg:w-2/5 p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-60px)] bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/15 dark:border-white/15">
                <span className="text-xs font-black uppercase tracking-wider font-sans">
                  JOURNEYS ORDER & SELECTION ({localJourneys.length})
                </span>
                <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                  ▲ ▼ 클릭으로 순서 변경
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {localJourneys.map((journey, idx) => {
                  const isSelected = journey.id === selectedJourneyId;
                  const isPlan = journey.tags?.includes('Plan') || journey.title.includes('(Plan)');

                  return (
                    <div
                      key={journey.id}
                      onClick={() => setSelectedJourneyId(journey.id)}
                      className={`p-2.5 border transition-all flex items-center gap-3 cursor-pointer rounded-none ${
                        isSelected
                          ? 'bg-white dark:bg-[#181818] border-red-600 dark:border-red-500 shadow-md ring-1 ring-red-600/30'
                          : 'bg-white/60 dark:bg-[#141414]/60 border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40'
                      }`}
                    >
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
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

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

              {/* Marquee Banner Text */}
              <div className="flex flex-col gap-1.5 pt-4 border-t border-black/10 dark:border-white/10">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                    MARQUEE BANNER TEXT (전광판 롤링 문구)
                  </label>
                  <label className="text-[10px] font-bold text-black/60 dark:text-white/60 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMarquee}
                      onChange={e => setShowMarquee(e.target.checked)}
                      className="accent-black dark:accent-white"
                    />
                    <span>전광판 노출</span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={homeMarquee}
                  onChange={e => setHomeMarquee(e.target.value)}
                  placeholder="홈 상단에 흐르는 문구를 입력하세요..."
                  className="px-3.5 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none leading-relaxed"
                />
              </div>

              {/* Marquee Speed */}
              <div className="flex flex-col gap-2">
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

              {/* Hero Journeys Multi-Selection */}
              <div className="flex flex-col gap-2 pt-4 border-t border-black/10 dark:border-white/10">
                <label className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                  HERO JOURNEYS (히어로에 노출할 여정 선택)
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                  {localJourneys.map(j => {
                    const isSelected = selectedHeroIds.includes(j.id);
                    return (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedHeroIds(selectedHeroIds.filter(id => id !== j.id));
                          } else {
                            setSelectedHeroIds([...selectedHeroIds, j.id]);
                          }
                        }}
                        className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer border rounded-none ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 border-black/10'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {j.title.replace(' (Plan)', '')}
                      </button>
                    );
                  })}
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
    </main>
  );
}
