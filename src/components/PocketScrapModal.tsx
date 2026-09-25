import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Check, ExternalLink, Image as ImageIcon,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Upload, Sparkles, Layers,
  ScanText, Loader2, Link2, ChevronLeft, ChevronRight, Clipboard, FileText, ZoomIn
} from 'lucide-react';
import { ScrapedSpotData, ScrapedSpotCandidate } from '../utils/snsScraper';
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
  const [imagesList, setImagesList] = useState<string[]>(scrapedData.allImages || []);
  const [city, setCity] = useState(scrapedData.city || '');
  const [country, setCountry] = useState(scrapedData.country || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number | null>(
    scrapedData.targetImgIndex ? scrapedData.targetImgIndex - 1 : null
  );

  // Full-size Lightbox modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Per-slide OCR cache & state
  const [ocrCache, setOcrCache] = useState<Record<string, { candidates: string[]; descriptionText: string }>>({});
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrCandidates, setOcrCandidates] = useState<string[]>([]);
  const [ocrDescription, setOcrDescription] = useState<string>('');
  const [ocrError, setOcrError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(scrapedData.title);
    setCategory(scrapedData.category);
    setMemo(scrapedData.memo);
    setSelectedImage(scrapedData.thumbnailUrl);
    setImagesList(scrapedData.allImages || (scrapedData.thumbnailUrl ? [scrapedData.thumbnailUrl] : []));
    setCity(scrapedData.city || '');
    setCountry(scrapedData.country || '');
    setActiveCandidateIndex(scrapedData.targetImgIndex ? scrapedData.targetImgIndex - 1 : null);
    setOcrCandidates([]);
    setOcrDescription('');
    setOcrError(null);
    setOcrCache({});
    setIsLightboxOpen(false);
  }, [scrapedData]);

  // Current image index in carousel
  const currentImageIdx = imagesList.findIndex(img => img === selectedImage);

  // Dedicated OCR runner for any target image URL
  const runOcrForImage = useCallback(async (targetImg: string, autoApply: boolean = false) => {
    if (!targetImg) return;

    // Check cache first for instant retrieval
    const cached = ocrCache[targetImg];
    if (cached) {
      setOcrCandidates(cached.candidates);
      setOcrDescription(cached.descriptionText);
      setOcrError(null);

      if (autoApply) {
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

      if (autoApply) {
        if (candidates.length > 0) {
          setTitle(candidates[0]);
        }
        if (descriptionText) {
          setMemo(descriptionText);
        }
      }
    } catch (err: any) {
      console.warn('[PocketScrapModal] OCR error:', err);
      setOcrError('이미지 텍스트 인식 중 통신 오류가 발생했습니다.');
    } finally {
      setIsOcrRunning(false);
    }
  }, [ocrCache]);

  const handleSelectImage = useCallback((newImg: string) => {
    setSelectedImage(newImg);
    const cached = ocrCache[newImg];
    if (cached) {
      setOcrCandidates(cached.candidates);
      setOcrDescription(cached.descriptionText);
      setOcrError(null);
    } else {
      setOcrCandidates([]);
      setOcrDescription('');
      setOcrError(null);
    }
  }, [ocrCache]);

  const handlePrevImage = useCallback(() => {
    if (imagesList.length <= 1) return;
    const nextIdx = currentImageIdx <= 0 ? imagesList.length - 1 : currentImageIdx - 1;
    handleSelectImage(imagesList[nextIdx]);
  }, [imagesList, currentImageIdx, handleSelectImage]);

  const handleNextImage = useCallback(() => {
    if (imagesList.length <= 1) return;
    const nextIdx = currentImageIdx >= imagesList.length - 1 ? 0 : currentImageIdx + 1;
    handleSelectImage(imagesList[nextIdx]);
  }, [imagesList, currentImageIdx, handleSelectImage]);

  // Clipboard Paste handler (Ctrl+V) for instant image scraping/replacement
  const processImageFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      const compressed = await compressImage(file, 1200, 1200, 0.85);
      const publicUrl = await uploadFileToR2(compressed, `pocket_scraps/${Date.now()}_${file.name}`);
      setSelectedImage(publicUrl);
      setImagesList(prev => [publicUrl, ...prev.filter(u => u !== publicUrl)]);
      setOcrCandidates([]);
      setOcrDescription('');
      setOcrError(null);
    } catch (err) {
      console.error('[PocketScrapModal] Image upload failed:', err);
      alert('이미지 업로드/붙여넣기에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Global ESC & Paste & Arrow keys listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          handlePrevImage();
        }
      } else if (e.key === 'ArrowRight') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          handleNextImage();
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
  }, [isOpen, isLightboxOpen, onClose, handlePrevImage, handleNextImage, processImageFile]);

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
    try {
      setIsUploading(true);
      const compressed = await compressImage(file, 1200, 1200, 0.85);
      const publicUrl = await uploadFileToR2(compressed, `pocket_scraps/${Date.now()}_${file.name}`);
      setSelectedImage(publicUrl);
    } catch (err) {
      console.error('[PocketScrapModal] Image upload failed:', err);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
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
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#121214] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-xs font-black tracking-widest uppercase text-black dark:text-white">
              POCKET QUICK SCRAP
            </span>
            {renderPlatformBadge(scrapedData.platform)}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors cursor-pointer"
            title="닫기 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[78vh]">
          {/* Multi-spot Candidates (If feed contains multiple recommendations like Best 5) */}
          {scrapedData.candidates && scrapedData.candidates.length > 0 && (
            <div className="p-3 bg-red-600/[0.04] dark:bg-red-500/[0.06] border border-red-500/20 rounded-none flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  피드 내 {scrapedData.candidates.length}개 장소 감지됨 (터치하여 선택):
                </span>
                {scrapedData.targetImgIndex && (
                  <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                    인스타 {scrapedData.targetImgIndex}번 슬라이드
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {scrapedData.candidates.map((cand, idx) => {
                  const isSelected = activeCandidateIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCandidate(cand, idx)}
                      className={`px-2.5 py-1 text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-xs scale-102'
                          : 'bg-white dark:bg-[#1A1A1C] border-black/15 dark:border-white/15 text-black/80 dark:text-white/80 hover:border-black'
                      }`}
                    >
                      {cand.index && <span className="opacity-60 text-[10px]">#{cand.index}</span>}
                      <span>{cand.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Thumbnail Preview & Carousel Image Selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span>피드 이미지</span>
                {imagesList.length > 1 && (
                  <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/10 text-black dark:text-white border border-black/15 dark:border-white/15 text-[9px] font-mono font-bold">
                    {currentImageIdx >= 0 ? currentImageIdx + 1 : 1} / {imagesList.length}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Fullsize image zoom trigger */}
                {selectedImage && (
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="text-[10px] font-mono text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                    title="클릭하여 원본 크기로 크게 확대해 봅니다"
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>원본 확대</span>
                  </button>
                )}

                <label className="text-[10px] font-mono text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:underline cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>{isUploading ? '업로드 중...' : '사진 교체'}</span>
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

            {/* Main Image Frame (Full Aspect Ratio Preserved, No Crop) */}
            <div 
              className="relative w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/15 dark:border-white/15 overflow-hidden group cursor-zoom-in"
              onClick={() => setIsLightboxOpen(true)}
              title="클릭하여 원본 크기로 확대 보기"
            >
              {selectedImage ? (
                <img 
                  src={selectedImage} 
                  alt={title} 
                  className="block w-full h-auto max-h-[72vh] object-contain select-none transition-transform duration-200 group-hover:scale-[1.01]" 
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-black/30 dark:text-white/30 font-mono text-xs py-16">
                  <ImageIcon className="w-8 h-8" />
                  <span>이미지 없음 (사진 업로드 또는 Ctrl+V 붙여넣기)</span>
                </div>
              )}

              {/* Carousel Left / Right Arrow Controls */}
              {imagesList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer opacity-90 sm:opacity-0 group-hover:opacity-100 shadow-lg border border-white/20 z-10"
                    title="이전 사진 (좌측 방향키)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer opacity-90 sm:opacity-0 group-hover:opacity-100 shadow-lg border border-white/20 z-10"
                    title="다음 사진 (우측 방향키)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Slide Counter Overlay Badge */}
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold tracking-wider border border-white/20 pointer-events-none z-10">
                    {currentImageIdx >= 0 ? currentImageIdx + 1 : 1} / {imagesList.length}
                  </div>
                </>
              )}

              {/* Zoom & Paste helper badges */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-2 pointer-events-none z-10">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-black/65 backdrop-blur-xs text-white/90 text-[9.5px] font-mono border border-white/15">
                  <ZoomIn className="w-2.5 h-2.5" />
                  <span>클릭 시 원본 확대</span>
                </span>
                <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-black/65 backdrop-blur-xs text-white/90 text-[9.5px] font-mono border border-white/15">
                  <Clipboard className="w-2.5 h-2.5" />
                  <span>Ctrl+V 붙여넣기</span>
                </span>
              </div>
            </div>

            {/* Smart Slide OCR Action: Extract Title & Note for the CURRENT Slide */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleRunOcr(true)}
                disabled={isOcrRunning || !selectedImage}
                className="flex-1 py-1.5 px-3 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity font-mono text-[11px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                title="현재 선택된 사진에서 장소명과 설명 텍스트를 읽어 제목과 메모에 즉시 반영합니다"
              >
                {isOcrRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>사진 분석 중...</span>
                  </>
                ) : (
                  <>
                    <ScanText className="w-3.5 h-3.5 text-red-500" />
                    <span>현재 사진에서 타이틀 & 노트 읽기 (OCR 자동 추출)</span>
                  </>
                )}
              </button>
            </div>

            {/* OCR Detected Candidate Chips & Description Overwrite */}
            {(ocrCandidates.length > 0 || ocrDescription) && (
              <div className="p-3 bg-black/[0.03] dark:bg-white/[0.03] border border-black/15 dark:border-white/15 flex flex-col gap-2.5 animate-in fade-in duration-150">
                {/* Title Candidates */}
                {ocrCandidates.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-black/60 dark:text-white/60 flex items-center gap-1">
                      <ScanText className="w-3 h-3 text-red-600 dark:text-red-400" />
                      인식된 장소명 후보 (터치하여 제목에 적용):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {ocrCandidates.map((cand, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTitle(cand)}
                          className={`px-2 py-0.5 text-[11px] font-mono border transition-all cursor-pointer ${
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

                {/* Description Extraction Card */}
                {ocrDescription && (
                  <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-black/70 dark:text-white/70 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        사진 속 설명 텍스트 감지됨 ({ocrDescription.length}자):
                      </span>
                      <button
                        type="button"
                        onClick={handleApplyDescriptionToMemo}
                        className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-mono font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                        title="기존 메모를 지우고 사진에서 읽은 설명으로 채웁니다"
                      >
                        <Check className="w-3 h-3" />
                        <span>설명 메모에 덮어쓰기</span>
                      </button>
                    </div>
                    <p className="text-[10.5px] font-sans text-black/60 dark:text-white/60 line-clamp-3 bg-white dark:bg-[#1A1A1C] p-2 border border-black/10 dark:border-white/10 leading-relaxed font-normal">
                      {ocrDescription}
                    </p>
                  </div>
                )}
              </div>
            )}
            {ocrError && (
              <div className="text-[10px] font-mono text-black/50 dark:text-white/50 px-1">
                {ocrError}
              </div>
            )}

            {/* Carousel images strip if multiple images found */}
            {imagesList.length > 1 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-black/60 dark:text-white/60">
                  <span className="flex items-center gap-1 font-bold">
                    <Layers className="w-3 h-3 text-red-600 dark:text-red-400" />
                    슬라이드 사진 선택 ({imagesList.length}장):
                  </span>
                  <span>클릭 시 해당 사진 선택 (선택된 1장만 저장)</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  {imagesList.map((imgUrl, imgIdx) => {
                    const isPicked = selectedImage === imgUrl;
                    return (
                      <button
                        key={imgIdx}
                        type="button"
                        onClick={() => handleSelectImage(imgUrl)}
                        className={`relative w-16 h-16 shrink-0 border-2 transition-all cursor-pointer overflow-hidden group ${
                          isPicked 
                            ? 'border-red-600 shadow-md ring-1 ring-red-600/30' 
                            : 'border-black/15 dark:border-white/15 opacity-60 hover:opacity-100 hover:border-black/40'
                        }`}
                        title={`${imgIdx + 1}번째 슬라이드`}
                      >
                        <img src={imgUrl} alt={`Slide ${imgIdx + 1}`} className="w-full h-full object-contain bg-black/5 dark:bg-white/5" />
                        <span className={`absolute bottom-0 right-0 font-mono text-[9px] px-1 font-bold ${
                          isPicked ? 'bg-red-600 text-white' : 'bg-black/80 text-white'
                        }`}>
                          #{imgIdx + 1}
                        </span>
                        {isPicked && (
                          <div className="absolute top-0 left-0 bg-red-600 text-white p-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Title Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                장소명 (제목) *
              </label>
              <button
                type="button"
                onClick={() => handleRunOcr(false)}
                disabled={isOcrRunning || !selectedImage}
                className="text-[10px] font-mono text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ScanText className="w-3 h-3 text-red-600 dark:text-red-400" />
                <span>사진 글씨 읽기</span>
              </button>
            </div>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 멘야무사시 신주쿠 본점"
              required
              className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-[#1A1A1C] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
            />
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
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-mono font-bold tracking-wider uppercase bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '보관 중...' : '포켓에 담기'}</span>
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
                ORIGINAL FULL-RES IMAGE {imagesList.length > 1 && `(${currentImageIdx + 1} / ${imagesList.length})`}
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
    </div>
  );
}
