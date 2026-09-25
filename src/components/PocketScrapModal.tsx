import React, { useState, useEffect } from 'react';
import { 
  X, Check, ExternalLink, Image as ImageIcon,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Upload, Sparkles, Layers,
  ScanText, Loader2, Link2
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
  const [ocrError, setOcrError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(scrapedData.title);
    setCategory(scrapedData.category);
    setMemo(scrapedData.memo);
    setSelectedImage(scrapedData.thumbnailUrl);
    setCity(scrapedData.city || '');
    setCountry(scrapedData.country || '');
    setActiveCandidateIndex(scrapedData.targetImgIndex ? scrapedData.targetImgIndex - 1 : null);
    setOcrCandidates([]);
    setOcrError(null);
  }, [scrapedData]);

  // Global ESC key listener to safely close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        setOcrError('이미지에서 인식 가능한 텍스트를 찾지 못했습니다.');
      }
    } catch (err: any) {
      console.warn('[PocketScrapModal] OCR error:', err);
      setOcrError('이미지 텍스트 인식 중 통신 오류가 발생했습니다. 직접 입력해주세요.');
    } finally {
      setIsOcrRunning(false);
    }
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
              <span>썸네일 이미지</span>
              <div className="flex items-center gap-3">
                {/* OCR text extraction button */}
                <button
                  type="button"
                  onClick={handleRunOcr}
                  disabled={isOcrRunning || !selectedImage}
                  className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="사진 속 글씨(장소명/간판)를 자동으로 읽어옵니다"
                >
                  {isOcrRunning ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>텍스트 읽는 중...</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="w-3 h-3" />
                      <span>이미지 텍스트 파밍 (OCR)</span>
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

            {/* Main Image Frame */}
            <div className="relative aspect-[16/9] w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 overflow-hidden flex items-center justify-center">
              {selectedImage ? (
                <img 
                  src={selectedImage} 
                  alt={title} 
                  className="w-full h-full object-cover" 
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-black/30 dark:text-white/30 font-mono text-xs">
                  <ImageIcon className="w-8 h-8" />
                  <span>썸네일 없음 (사진을 첨부할 수 있습니다)</span>
                </div>
              )}
            </div>

            {/* OCR Detected Candidate Chips */}
            {ocrCandidates.length > 0 && (
              <div className="p-2.5 bg-black/[0.03] dark:bg-white/[0.03] border border-black/15 dark:border-white/15 flex flex-col gap-1.5 animate-in fade-in duration-150">
                <span className="text-[10px] font-mono font-bold text-black/60 dark:text-white/60 flex items-center gap-1">
                  <ScanText className="w-3 h-3 text-red-600 dark:text-red-400" />
                  이미지에서 감지된 장소명 후보 (터치하여 제목에 적용):
                </span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {ocrCandidates.map((cand, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTitle(cand)}
                      className={`px-2 py-0.5 text-[11px] font-mono border transition-all cursor-pointer ${
                        title === cand
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'bg-white dark:bg-[#1A1A1C] border-black/15 dark:border-white/15 text-black/80 dark:text-white/80 hover:border-black'
                      }`}
                    >
                      {cand}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {ocrError && (
              <div className="text-[10px] font-mono text-black/50 dark:text-white/50 px-1">
                {ocrError}
              </div>
            )}

            {/* Carousel images strip if multiple images found */}
            {scrapedData.allImages && scrapedData.allImages.length > 1 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-black/60 dark:text-white/60">
                  <span className="flex items-center gap-1 font-bold">
                    <Layers className="w-3 h-3 text-red-600 dark:text-red-400" />
                    슬라이드 사진 선택 ({scrapedData.allImages.length}장):
                  </span>
                  <span>클릭 시 대표 썸네일 변경</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  {scrapedData.allImages.map((imgUrl, imgIdx) => {
                    const isPicked = selectedImage === imgUrl;
                    return (
                      <button
                        key={imgIdx}
                        type="button"
                        onClick={() => {
                          setSelectedImage(imgUrl);
                          setOcrCandidates([]);
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
            <label className="text-[11px] font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
              메모 및 꿀팁 (요약)
            </label>
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
