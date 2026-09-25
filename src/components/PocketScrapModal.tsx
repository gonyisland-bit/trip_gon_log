import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Check, ExternalLink, Image as ImageIcon,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Upload, Sparkles, Layers,
  ScanText, Loader2, Link2, ChevronLeft, ChevronRight, Clipboard, FileText
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

  // OCR state for image text extraction
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
  }, [scrapedData]);

  // Current image index in carousel
  const currentImageIdx = imagesList.findIndex(img => img === selectedImage);

  const handlePrevImage = useCallback(() => {
    if (imagesList.length <= 1) return;
    const nextIdx = currentImageIdx <= 0 ? imagesList.length - 1 : currentImageIdx - 1;
    setSelectedImage(imagesList[nextIdx]);
    setOcrCandidates([]);
    setOcrDescription('');
    setOcrError(null);
  }, [imagesList, currentImageIdx]);

  const handleNextImage = useCallback(() => {
    if (imagesList.length <= 1) return;
    const nextIdx = currentImageIdx >= imagesList.length - 1 ? 0 : currentImageIdx + 1;
    setSelectedImage(imagesList[nextIdx]);
    setOcrCandidates([]);
    setOcrDescription('');
    setOcrError(null);
  }, [imagesList, currentImageIdx]);

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
        onClose();
      } else if (e.key === 'ArrowLeft') {
        // Only if not typing in input/textarea
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
  }, [isOpen, onClose, handlePrevImage, handleNextImage, processImageFile]);

  // OCR handler: Extract text from selected thumbnail image
  const handleRunOcr = async () => {
    if (!selectedImage) {
      alert('분석할 이미지가 없습니다.');
      return;
    }

    try {
      setIsOcrRunning(true);
      setOcrError(null);
      const res = await extractTextFromImageUrl(selectedImage, 'kor');
      if (res.candidates && res.candidates.length > 0) {
        setOcrCandidates(res.candidates);
        // If current title is default or empty, auto-pick first candidate
        if (!title.trim() || title === '추천 여행 스팟' || title.length < 3) {
          setTitle(res.candidates[0]);
        }
      } else {
        setOcrError('이미지에서 인식 가능한 제목 텍스트를 찾지 못했습니다.');
      }

      if (res.descriptionText) {
        setOcrDescription(res.descriptionText);
      }
    } catch (err: any) {
      console.warn('[PocketScrapModal] OCR error:', err);
      setOcrError('이미지 텍스트 인식 중 통신 오류가 발생했습니다. 직접 입력해주세요.');
    } finally {
      setIsOcrRunning(false);
    }
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
                <span>썸네일 이미지</span>
                {imagesList.length > 1 && (
                  <span className="px-1.5 py-0.2 bg-black/5 dark:bg-white/10 text-black dark:text-white border border-black/15 dark:border-white/15 text-[9px] font-mono font-bold">
                    {currentImageIdx >= 0 ? currentImageIdx + 1 : 1} / {imagesList.length}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 sm:gap-3">
                {/* OCR text extraction button */}
                <button
                  type="button"
                  onClick={handleRunOcr}
                  disabled={isOcrRunning || !selectedImage}
                  className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="사진 속 글씨(장소명/설명)를 자동으로 읽어옵니다"
                >
                  {isOcrRunning ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>텍스트 읽는 중...</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="w-3 h-3" />
                      <span>이미지 OCR 파밍</span>
                    </>
                  )}
                </button>
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

            {/* Main Image Frame with Carousel Arrows & Paste Indicator */}
            <div className="relative aspect-[16/9] w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 overflow-hidden flex items-center justify-center group">
              {selectedImage ? (
                <img 
                  src={selectedImage} 
                  alt={title} 
                  className="w-full h-full object-cover select-none" 
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-black/30 dark:text-white/30 font-mono text-xs">
                  <ImageIcon className="w-8 h-8" />
                  <span>썸네일 없음 (사진 업로드 또는 Ctrl+V 붙여넣기)</span>
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100 shadow-md border border-white/20"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100 shadow-md border border-white/20"
                    title="다음 사진 (우측 방향키)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Slide Counter Overlay Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold tracking-wider border border-white/20 pointer-events-none">
                    {currentImageIdx >= 0 ? currentImageIdx + 1 : 1} / {imagesList.length}
                  </div>
                </>
              )}

              {/* Paste notification helper badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white/80 text-[9.5px] font-mono border border-white/15 pointer-events-none">
                <Clipboard className="w-2.5 h-2.5" />
                <span>Ctrl+V 붙여넣기 지원</span>
              </div>
            </div>

            {/* OCR Detected Candidate Chips & Description Overwrite */}
            {(ocrCandidates.length > 0 || ocrDescription) && (
              <div className="p-3 bg-black/[0.03] dark:bg-white/[0.03] border border-black/15 dark:border-white/15 flex flex-col gap-2.5 animate-in fade-in duration-150">
                {/* Title Candidates */}
                {ocrCandidates.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-black/60 dark:text-white/60 flex items-center gap-1">
                      <ScanText className="w-3 h-3 text-red-600 dark:text-red-400" />
                      이미지에서 감지된 장소명 후보 (터치하여 제목에 적용):
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
                  <span>클릭 시 대표 썸네일 변경</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  {imagesList.map((imgUrl, imgIdx) => {
                    const isPicked = selectedImage === imgUrl;
                    return (
                      <button
                        key={imgIdx}
                        type="button"
                        onClick={() => {
                          setSelectedImage(imgUrl);
                          setOcrCandidates([]);
                          setOcrDescription('');
                          setOcrError(null);
                        }}
                        className={`relative w-16 h-16 shrink-0 border-2 transition-all cursor-pointer overflow-hidden group ${
                          isPicked 
                            ? 'border-red-600 shadow-md ring-1 ring-red-600/30' 
                            : 'border-black/15 dark:border-white/15 opacity-60 hover:opacity-100 hover:border-black/40'
                        }`}
                        title={`${imgIdx + 1}번째 슬라이드`}
                      >
                        <img src={imgUrl} alt={`Slide ${imgIdx + 1}`} className="w-full h-full object-cover" />
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
                onClick={handleRunOcr}
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
    </div>
  );
}
