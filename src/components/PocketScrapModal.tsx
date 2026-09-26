import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Check, ExternalLink, Image as ImageIcon,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Upload, Sparkles,
  ScanText, Loader2, Link2, Clipboard, FileText, ZoomIn, MapPin,
  Bookmark
} from 'lucide-react';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { ConfirmModal } from './ConfirmModal';
import { ScrapedSpotData, ScrapedSpotCandidate, scrapeSnsMetadata } from '../utils/snsScraper';
import { PocketCategory, SpotPocketItem, SpotPocketPlatform } from '../types';
import { compressImage } from '../utils/imageHelper';
import { uploadFileToR2 } from '../utils/storageHelper';
import { extractTextFromImageUrl } from '../utils/ocrHelper';

interface PocketScrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  scrapedData: ScrapedSpotData;
  onSave: (item: SpotPocketItem) => Promise<void>;
}

const CATEGORY_BUTTONS: { key: PocketCategory; label: string; icon: React.ElementType }[] = [
  { key: 'spot', label: 'SPOT', icon: Camera },
  { key: 'food', label: 'FOOD', icon: Utensils },
  { key: 'cafe', label: 'CAFE', icon: Coffee },
  { key: 'shopping', label: 'SHOPPING', icon: ShoppingBag },
  { key: 'tip', label: 'TIP', icon: Lightbulb },
];

const renderPlatformBadge = (platform: SpotPocketPlatform) => {
  const p = platform.toLowerCase();
  if (p === 'instagram') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none font-mono text-[10px] font-bold tracking-wider bg-gradient-to-r from-pink-500/15 via-red-500/15 to-amber-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30">
        INSTAGRAM
      </span>
    );
  }
  if (p === 'threads') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none font-mono text-[10px] font-bold tracking-wider bg-black/10 dark:bg-white/10 text-black dark:text-white border border-black/20 dark:border-white/20">
        THREADS
      </span>
    );
  }
  if (p === 'x') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none font-mono text-[10px] font-bold tracking-wider bg-black/10 dark:bg-white/10 text-black dark:text-white border border-black/20 dark:border-white/20">
        X / TWITTER
      </span>
    );
  }
  if (p === 'youtube') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none font-mono text-[10px] font-bold tracking-wider bg-red-600/15 text-red-600 dark:text-red-400 border border-red-600/30">
        YOUTUBE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none font-mono text-[10px] font-bold tracking-wider bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 border border-black/15 dark:border-white/15 uppercase">
      {platform}
    </span>
  );
};

export function PocketScrapModal({ isOpen, onClose, scrapedData, onSave }: PocketScrapModalProps) {
  const [title, setTitle] = useState(scrapedData.title);
  const [category, setCategory] = useState<PocketCategory>(scrapedData.category);
  const [memo, setMemo] = useState(scrapedData.memo);
  const [selectedImage, setSelectedImage] = useState(scrapedData.thumbnailUrl);
  const [city, setCity] = useState(scrapedData.city || '');
  const [country, setCountry] = useState(scrapedData.country || '');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [sourceUrlInput, setSourceUrlInput] = useState(scrapedData.sourceUrl || '');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number | null>(
    scrapedData.targetImgIndex ? scrapedData.targetImgIndex - 1 : null
  );

  // Full-size Lightbox modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // 2-step confirmation modal on discard/exit
  const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState<boolean>(false);

  // User manual edit tracker to prevent background OCR from overwriting user's typed title
  const [isUserEditedTitle, setIsUserEditedTitle] = useState(false);

  // Check if form has modified/unsaved content
  const isDirty = Boolean(title.trim() || memo.trim() || selectedImage || address.trim() || sourceUrlInput.trim());

  const handleAttemptClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirmModal(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // OCR cache & state
  const [ocrCache, setOcrCache] = useState<Record<string, { candidates: string[]; descriptionText: string }>>({});
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrCandidates, setOcrCandidates] = useState<string[]>([]);
  const [ocrDescription, setOcrDescription] = useState<string>('');
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Dedicated OCR runner for any target image URL
  const runOcrForImage = useCallback(async (targetImg: string, autoApply: boolean = false) => {
    if (!targetImg) return;

    // Check cache first for instant retrieval
    const cached = ocrCache[targetImg];
    if (cached) {
      setOcrCandidates(cached.candidates);
      setOcrDescription(cached.descriptionText);
      setOcrError(null);

      if (autoApply && !isUserEditedTitle) {
        if (cached.candidates.length > 0) {
          setTitle(cached.candidates[0]);
        }
        if (cached.descriptionText) {
          setMemo(cached.descriptionText);
        }
      }
      return;
    }

    try {
      setIsOcrRunning(true);
      setOcrError(null);
      const res = await extractTextFromImageUrl(targetImg, 'kor');
      const candidates = res.candidates || [];
      const descriptionText = res.descriptionText || '';

      setOcrCache(prev => ({
        ...prev,
        [targetImg]: { candidates, descriptionText }
      }));

      setOcrCandidates(candidates);
      setOcrDescription(descriptionText);

      if (candidates.length === 0 && !descriptionText) {
        setOcrError('이미지에서 인식 가능한 텍스트를 찾지 못했습니다.');
      }

      if (autoApply && !isUserEditedTitle) {
        if (candidates.length > 0) {
          setTitle(candidates[0]);
        }
        if (descriptionText) {
          setMemo(descriptionText);
        }
      }
    } catch (err: any) {
      console.warn('[PocketScrapModal] OCR error:', err);
      setOcrError('이미지 텍스트 인식 중 오류가 발생했습니다.');
    } finally {
      setIsOcrRunning(false);
    }
  }, [ocrCache, isUserEditedTitle]);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(scrapedData.title);
    setCategory(scrapedData.category);
    setMemo(scrapedData.memo);
    setSelectedImage(scrapedData.thumbnailUrl);
    setCity(scrapedData.city || '');
    setCountry(scrapedData.country || '');
    setAddress('');
    setLat(undefined);
    setLng(undefined);
    setActiveCandidateIndex(scrapedData.targetImgIndex ? scrapedData.targetImgIndex - 1 : null);
    setIsUserEditedTitle(false);

    // Initial candidates from scrapedData
    const initialCandidates = scrapedData.candidates?.map(c => c.title) || [];
    setOcrCandidates(initialCandidates);
    setOcrDescription('');
    setOcrError(null);
    setIsLightboxOpen(false);

    // If title is default generic and no candidates yet, run OCR once
    if (initialCandidates.length === 0 && scrapedData.thumbnailUrl && (!scrapedData.title || scrapedData.title === '스크린샷 스크랩' || scrapedData.title === '추천 여행 스팟')) {
      runOcrForImage(scrapedData.thumbnailUrl, true);
    }
  }, [isOpen, scrapedData.sourceUrl, scrapedData.thumbnailUrl]);

  // Fetch metadata directly from URL inside modal
  const handleFetchUrl = async () => {
    if (!sourceUrlInput.trim() || !/^https?:\/\//i.test(sourceUrlInput.trim())) {
      alert('유효한 웹/SNS 링크 URL(https://...)을 입력해주세요.');
      return;
    }
    try {
      setIsFetchingUrl(true);
      const res = await scrapeSnsMetadata(sourceUrlInput.trim());
      if (res.title) {
        setTitle(res.title);
        setIsUserEditedTitle(false);
      }
      if (res.category) setCategory(res.category);
      if (res.memo) setMemo(res.memo);
      if (res.city) setCity(res.city);
      if (res.country) setCountry(res.country);
      if (res.thumbnailUrl) {
        setSelectedImage(res.thumbnailUrl);
        await runOcrForImage(res.thumbnailUrl, false);
      }
      if (res.candidates && res.candidates.length > 0) {
        setOcrCandidates(res.candidates.map(c => c.title));
      }
    } catch (err) {
      console.warn('[PocketScrapModal] Fetch URL error:', err);
      alert('링크 정보를 불러오는데 실패했습니다. 스크린샷 이미지를 붙여넣어주세요.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Clipboard Paste handler (Ctrl+V) for instant image scraping/replacement
  const processImageFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      const compressed = await compressImage(file, 2560, 2560, 0.88);
      const publicUrl = await uploadFileToR2(compressed, `pocket_scraps/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
      setSelectedImage(publicUrl);
      setIsUserEditedTitle(false);
      // 업로드 즉시 OCR을 실행하여 제목과 메모 자동 반영!
      await runOcrForImage(publicUrl, true);
    } catch (err) {
      console.error('[PocketScrapModal] Image upload/OCR failed:', err);
      alert('이미지 업로드 및 글씨 인식에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [runOcrForImage]);

  // Global ESC & Paste listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          handleAttemptClose();
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, isLightboxOpen, handleAttemptClose, processImageFile]);

  // OCR handler: Extract text from selected thumbnail image
  const handleRunOcr = async (autoApply: boolean = false) => {
    if (!selectedImage) {
      alert('분석할 이미지가 없습니다.');
      return;
    }
    await runOcrForImage(selectedImage, autoApply);
  };

  // Replace memo with OCR description text
  const handleApplyDescriptionToMemo = () => {
    if (!ocrDescription) return;
    setMemo(ocrDescription);
  };

  if (!isOpen) return null;

  // Handle candidate chip selection
  const handleSelectCandidate = (candidate: ScrapedSpotCandidate, idx: number) => {
    setActiveCandidateIndex(idx);
    setTitle(candidate.title);
    setCategory(candidate.category);
    if (candidate.memo) {
      setMemo(candidate.memo);
    }
    if (candidate.city) setCity(candidate.city);
    if (candidate.country) setCountry(candidate.country);

    // If candidate has an index, also auto-pick image if available in allImages
    if (candidate.index && scrapedData.allImages[candidate.index - 1]) {
      setSelectedImage(scrapedData.allImages[candidate.index - 1]);
    }
  };

  // Image Upload handler
  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('장소명(제목)을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newPocketItem: SpotPocketItem = {
        id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: title.trim(),
        category,
        memo: memo.trim() || undefined,
        sourceUrl: scrapedData.sourceUrl,
        platform: scrapedData.platform,
        thumbnailUrl: selectedImage.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        address: address.trim() || undefined,
        lat,
        lng,
        createdAt: Date.now()
      };

      await onSave(newPocketItem);
      onClose();
    } catch (err) {
      console.error('[PocketScrapModal] Save failed:', err);
      alert('포켓 보관 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 pt-16 sm:pt-20 pb-8 overflow-y-auto"
      onClick={handleAttemptClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#121214] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-xs font-black tracking-widest uppercase text-black dark:text-white flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              POCKET SCRAP
            </span>
            {scrapedData.platform && renderPlatformBadge(scrapedData.platform)}
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors cursor-pointer"
            title="닫기 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[78vh]">
          {/* STEP 1: SOURCE LOADING (URL or Screenshot Image) */}
          <div className="flex flex-col gap-2 p-3 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10">
            <span className="text-[10px] font-mono font-bold tracking-widest text-black/50 dark:text-white/50 uppercase">
              01 SOURCE (링크 또는 이미지 불러오기)
            </span>

            {/* URL Input Row */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={sourceUrlInput}
                  onChange={(e) => setSourceUrlInput(e.target.value)}
                  placeholder="https://... (인스타그램, 유튜브, 블로그 등 링크)"
                  className="w-full pl-7 pr-3 py-1.5 text-xs font-mono bg-white dark:bg-[#1A1A1C] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors placeholder:text-black/30 dark:placeholder:text-white/30"
                />
                <Link2 className="w-3.5 h-3.5 text-black/40 dark:text-white/40 absolute left-2 top-2" />
              </div>
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isFetchingUrl || !sourceUrlInput.trim()}
                className="px-3 py-1.5 bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors shrink-0 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                {isFetchingUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                <span>{isFetchingUrl ? 'FETCHING' : 'FETCH'}</span>
              </button>
            </div>

            {/* Image Loading Options Bar */}
            <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-black/60 dark:text-white/60">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
                <span>스크린샷 이미지</span>
              </span>
              <div className="flex items-center gap-2">
                {selectedImage && (
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="text-[10px] font-mono text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>원본 확대</span>
                  </button>
                )}
                <label className="text-[10px] font-mono text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:underline cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>{isUploading ? '분석 중...' : '이미지 불러오기'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCustomImageUpload} 
                    disabled={isUploading} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {/* Image Frame Preview */}
            <div 
              className="relative w-full bg-black/[0.04] dark:bg-white/[0.04] border border-black/15 dark:border-white/15 overflow-hidden group cursor-zoom-in"
              onClick={() => selectedImage && setIsLightboxOpen(true)}
            >
              {selectedImage ? (
                <img 
                  src={selectedImage} 
                  alt={title} 
                  className="block w-full h-auto max-h-[60vh] object-contain select-none transition-transform duration-200 group-hover:scale-[1.01]" 
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 text-black/35 dark:text-white/35 font-mono text-xs py-12">
                  <ImageIcon className="w-7 h-7 stroke-1" />
                  <span>이미지 없음 (클립보드 스크린샷 Ctrl+V 붙여넣기 지원)</span>
                </div>
              )}
              {selectedImage && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none z-10">
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white/90 text-[9px] font-mono border border-white/15">
                    <Clipboard className="w-2.5 h-2.5" />
                    <span>Ctrl+V 붙여넣기 지원</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: EXTRACT & EDIT */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold tracking-widest text-black/50 dark:text-white/50 uppercase">
              02 EXTRACT & EDIT (장소명·노트 추출 및 편집)
            </span>

            {/* Unified Minimal OCR Extract Button */}
            {selectedImage && (
              <button
                type="button"
                onClick={() => handleRunOcr(true)}
                disabled={isOcrRunning || !selectedImage}
                className="w-full py-2 px-4 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                title="이미지에서 텍스트를 자동 인식하여 제목과 메모에 채웁니다"
              >
                {isOcrRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                    <span>EXTRACTING...</span>
                  </>
                ) : (
                  <>
                    <ScanText className="w-3.5 h-3.5 text-red-500" />
                    <span>EXTRACT (OCR 추출)</span>
                  </>
                )}
              </button>
            )}

            {/* Multi-spot Candidates (If feed contains multiple recommendations) */}
            {scrapedData.candidates && scrapedData.candidates.length > 0 && (
              <div className="p-2.5 bg-red-600/[0.04] dark:bg-red-500/[0.06] border border-red-500/20 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-red-600 dark:text-red-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    FEED SPOTS ({scrapedData.candidates.length})
                  </span>
                  {scrapedData.targetImgIndex && (
                    <span className="text-[9px] font-normal text-black/40 dark:text-white/40">
                      SLIDE #{scrapedData.targetImgIndex}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {scrapedData.candidates.map((cand, idx) => {
                    const isSelected = activeCandidateIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectCandidate(cand, idx)}
                        className={`px-2 py-0.5 text-[11px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-600 font-bold'
                            : 'bg-white dark:bg-[#1A1A1C] border-black/15 dark:border-white/15 text-black/80 dark:text-white/80 hover:border-black'
                        }`}
                      >
                        {cand.index && <span className="opacity-60 text-[9px]">#{cand.index}</span>}
                        <span>{cand.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detected Place Candidates Chips */}
            {ocrCandidates.length > 0 && (
              <div className="p-2.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex flex-col gap-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-black/60 dark:text-white/60">
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <ScanText className="w-3 h-3" />
                    DETECTED PLACES ({ocrCandidates.length})
                  </span>
                  <span className="text-[9px] font-normal text-black/40 dark:text-white/40">클릭 시 제목 적용</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {ocrCandidates.map((cand, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setTitle(cand); setIsUserEditedTitle(true); }}
                      className={`px-2.5 py-1 text-xs font-mono border transition-all cursor-pointer ${
                        title === cand
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                          : 'bg-white dark:bg-[#1A1A1C] border-black/15 dark:border-white/15 text-black/80 dark:text-white/80 hover:border-black'
                      }`}
                    >
                      {cand}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Detected Description Note */}
            {ocrDescription && (
              <div className="p-2.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex flex-col gap-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-black/60 dark:text-white/60 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-red-600 dark:text-red-400" />
                    DETECTED NOTE ({ocrDescription.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyDescriptionToMemo}
                    className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-mono font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-2.5 h-2.5" />
                    <span>APPLY TO MEMO</span>
                  </button>
                </div>
                <p className="text-[10.5px] font-sans text-black/60 dark:text-white/60 line-clamp-3 leading-relaxed">
                  {ocrDescription}
                </p>
              </div>
            )}
          </div>

          {/* Title Field & Candidate Chips */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                장소명 (제목) *
              </label>
              <button
                type="button"
                onClick={() => handleRunOcr(false)}
                disabled={isOcrRunning || !selectedImage}
                className="text-[10px] font-mono text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                title="사진에서 글씨를 다시 읽어 장소명 후보와 설명을 추출합니다"
              >
                {isOcrRunning ? (
                  <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                ) : (
                  <ScanText className="w-3 h-3 text-red-600 dark:text-red-400" />
                )}
                <span>사진 글씨 다시 읽기</span>
              </button>
            </div>

            <PlaceAutocompleteInput 
              value={title}
              onChange={(val) => {
                setTitle(val);
                setIsUserEditedTitle(true);
              }}
              onSelectPlace={(placeName, coords, fullAddress, countryName, cityName) => {
                if (placeName) setTitle(placeName);
                if (coords?.lat) setLat(coords.lat);
                if (coords?.lng) setLng(coords.lng);
                if (fullAddress) setAddress(fullAddress);
                if (countryName) setCountry(countryName);
                if (cityName) setCity(cityName);
                setIsUserEditedTitle(true);
              }}
              placeholder="장소 검색 (구글 자동완성) 또는 직접 입력"
              className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-[#1A1A1C] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
            />

            {/* Selected Address & Location Info Badge */}
            {address && (
              <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-black/60 dark:text-white/60 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1 border border-black/10 dark:border-white/10 animate-in fade-in duration-150">
                <MapPin className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                <span className="truncate">{address}</span>
              </div>
            )}

            {/* OCR Extracted Place Name Candidates (One-touch select) */}
            {ocrCandidates.length > 0 && (
              <div className="flex flex-col gap-1.5 p-2.5 bg-black/[0.025] dark:bg-white/[0.03] border border-black/15 dark:border-white/15 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-black/60 dark:text-white/60">
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <ScanText className="w-3 h-3" />
                    추천 장소명 후보 키워드 ({ocrCandidates.length}개):
                  </span>
                  <span className="text-[9px] font-normal text-black/40 dark:text-white/40">클릭 시 제목에 즉시 입력</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-0.5">
                  {ocrCandidates.map((cand, idx) => {
                    const isSelected = title === cand;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTitle(cand);
                          setIsUserEditedTitle(true);
                        }}
                        className={`px-2.5 py-1 text-xs font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold shadow-xs'
                            : 'bg-white dark:bg-[#1A1A1C] border-black/15 dark:border-white/15 text-black/80 dark:text-white/80 hover:border-black/50 dark:hover:border-white/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-red-500" />}
                        <span>{cand}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Category Pill Buttons */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
              카테고리 *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_BUTTONS.map((cat) => {
                const isSelected = category === cat.key;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                        : 'border-black/15 dark:border-white/15 text-black/65 dark:text-white/65 hover:border-black dark:hover:border-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* City & Country Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                도시 (City)
              </label>
              <input 
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="예: 도쿄, 서울"
                className="w-full px-3 py-2 text-xs font-mono font-medium bg-white dark:bg-[#1A1A1C] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                국가 (Country)
              </label>
              <input 
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="예: JAPAN, KOREA"
                className="w-full px-3 py-2 text-xs font-mono font-medium bg-white dark:bg-[#1A1A1C] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Memo / Notes */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                메모 및 꿀팁 (요약)
              </label>
              {ocrDescription && (
                <button
                  type="button"
                  onClick={handleApplyDescriptionToMemo}
                  className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="사진 속 설명 텍스트로 기존 메모를 대체합니다"
                >
                  <FileText className="w-3 h-3" />
                  <span>사진 설명 추출 덮어쓰기</span>
                </button>
              )}
            </div>
            <textarea 
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="추천 메뉴, 웨이팅 팁, 주의사항 등..."
              className="w-full px-3 py-2 text-xs font-sans font-medium leading-relaxed bg-white dark:bg-[#1A1A1C] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors resize-none"
            />
          </div>

          {/* Source Link Preview */}
          <div className="flex items-center justify-between text-[11px] font-mono text-black/50 dark:text-white/50 pt-1 border-t border-black/10 dark:border-white/10">
            <span className="truncate max-w-[320px] flex items-center gap-1">
              <Link2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{scrapedData.sourceUrl}</span>
            </span>
            <a 
              href={scrapedData.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white flex items-center gap-1 shrink-0 ml-2"
            >
              <span>원문 보기</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-mono font-bold tracking-wider uppercase bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-red-500" />
              <span>{isSubmitting ? 'SAVING...' : 'SAVE SPOT (포켓 저장)'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Full-size High-Res Image Lightbox Popup */}
      {isLightboxOpen && selectedImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-150"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between pb-2 text-white/80">
              <span className="text-[11px] font-mono tracking-widest uppercase">
                ORIGINAL FULL-RES IMAGE
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="닫기 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative max-h-[85vh] max-w-full overflow-hidden flex items-center justify-center border border-white/20 shadow-2xl bg-black">
              <img 
                src={selectedImage} 
                alt="Full resolution preview" 
                className="max-h-[84vh] max-w-full w-auto h-auto object-contain select-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2-Step Confirmation Modal on Unsaved Exit */}
      <ConfirmModal
        isOpen={showDiscardConfirmModal}
        onCancel={() => setShowDiscardConfirmModal(false)}
        onConfirm={() => {
          setShowDiscardConfirmModal(false);
          onClose();
        }}
        title="작성 취소"
        message="작성 중인 내용이 있습니다. 저장을 취소하고 닫으시겠습니까?"
        confirmLabel="저장 취소 (닫기)"
        cancelLabel="계속 작성"
        confirmVariant="danger"
      />
    </div>
  );
}
