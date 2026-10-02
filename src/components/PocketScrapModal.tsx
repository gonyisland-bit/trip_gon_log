import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bookmark, Check, ClipboardPaste, ExternalLink, FileText, ImagePlus, Link2, Loader2, MapPin, ScanText, ZoomIn,
} from 'lucide-react';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { Sheet, useSheetClose } from './Sheet';
import { Chip } from './ui/Chip';
import { ImageViewer } from './ui/ImageViewer';
import { Art } from '../art/Art';
import { areaClass, fieldClass, labelClass } from './ui/formStyles';
import { CATEGORY_FORM_ORDER, CATEGORY_META } from './pocket/categoryMeta';
import { ScrapedSpotData, ScrapedSpotCandidate, scrapeSnsMetadata, extractAddressFromText, extractKeywordCandidates } from '../utils/snsScraper';
import { PocketCategory, SpotPocketItem } from '../types';
import { detectPlatform } from '../utils/pocketStorage';
import { compressImage } from '../utils/imageHelper';
import { uploadFileToR2 } from '../utils/storageHelper';
import { extractTextFromImageUrl } from '../utils/ocrHelper';
import { notify, confirmDialog } from '../utils/feedback';
import { useBackToClose } from '../utils/overlayHistory';

// Pocket scrap sheet (v1.3.8): the same rounded sheet as every other panel. One column, three parts: where the spot
// comes from (a link, or a picture pasted, dropped or picked), what was read from it (place names as chips, one
// note), and the fields to keep. The footer with 취소 and 저장 stays in place. A spot is kept only by 저장.
// It is also how a kept spot is edited (`editing`): the same fields, filled in, with nothing read automatically.

interface PocketScrapModalProps {
  onClose: () => void;
  scrapedData: ScrapedSpotData;
  /** A kept spot being edited: the sheet changes it instead of adding a new one */
  editing?: SpotPocketItem;
  onSave: (item: SpotPocketItem) => Promise<void>;
}

/** A kept spot as the sheet's starting point */
export function spotAsScrap(spot: SpotPocketItem): ScrapedSpotData {
  return {
    sourceUrl: spot.sourceUrl || '',
    platform: spot.platform || detectPlatform(spot.sourceUrl),
    title: spot.title,
    category: spot.category,
    memo: spot.memo || '',
    thumbnailUrl: spot.thumbnailUrl || '',
    allImages: spot.thumbnailUrl ? [spot.thumbnailUrl] : [],
    city: spot.city,
    country: spot.country,
    address: spot.address,
    candidates: [],
  };
}

const PLATFORM_LABEL: Record<string, string> = { instagram: 'INSTAGRAM', threads: 'THREADS', x: 'X / TWITTER', youtube: 'YOUTUBE', blog: 'BLOG', maps: 'MAPS' };

const isWebUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());

export function PocketScrapModal({ onClose, scrapedData, editing, onSave }: PocketScrapModalProps) {
  // The sheet asks before closing over typed work; the form below keeps `dirty` current
  const dirtyRef = useRef(false);
  const [viewing, setViewing] = useState(false);
  return (
    <Sheet
      label={editing ? '스팟 수정' : '포켓에 담기'}
      onClose={onClose}
      tone="paper"
      locked={viewing}
      backToClose={false}
      confirmClose={async () => !dirtyRef.current || confirmDialog(editing ? '수정한 내용이 있어요. 저장하지 않고 닫을까요?' : '작성 중인 내용이 있어요. 저장하지 않고 닫을까요?', { title: 'DISCARD', confirmLabel: '닫기', danger: true })}
      panelClassName="sm:max-w-lg h-[min(92dvh,780px)]"
    >
      <ScrapForm scrapedData={scrapedData} editing={editing} onSave={onSave} dirtyRef={dirtyRef} viewing={viewing} setViewing={setViewing} />
    </Sheet>
  );
}

function ScrapForm({ scrapedData, editing, onSave, dirtyRef, viewing, setViewing }: {
  scrapedData: ScrapedSpotData;
  editing?: SpotPocketItem;
  onSave: (item: SpotPocketItem) => Promise<void>;
  dirtyRef: React.MutableRefObject<boolean>;
  viewing: boolean;
  setViewing: (v: boolean) => void;
}) {
  const close = useSheetClose();
  const [title, setTitle] = useState(scrapedData.title);
  const [category, setCategory] = useState<PocketCategory>(scrapedData.category);
  const [memo, setMemo] = useState(scrapedData.memo);
  const [selectedImage, setSelectedImage] = useState(scrapedData.thumbnailUrl);
  const [city, setCity] = useState(scrapedData.city || '');
  const [country, setCountry] = useState(scrapedData.country || '');
  const [address, setAddress] = useState(scrapedData.address || extractAddressFromText(scrapedData.memo) || '');
  const [lat, setLat] = useState<number | undefined>(editing?.lat);
  const [lng, setLng] = useState<number | undefined>(editing?.lng);
  const [sourceUrlInput, setSourceUrlInput] = useState(scrapedData.sourceUrl && isWebUrl(scrapedData.sourceUrl) ? scrapedData.sourceUrl : '');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number | null>(
    scrapedData.targetImgIndex ? scrapedData.targetImgIndex - 1 : null
  );
  // Typing a title by hand keeps the background reading from overwriting it
  const [isUserEditedTitle, setIsUserEditedTitle] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Something worth asking about before it is thrown away: a new scrap holds work as soon as it has content; a spot
  // being edited only once something differs from what was kept
  dirtyRef.current = editing
    ? title !== editing.title || category !== editing.category || memo !== (editing.memo || '') || selectedImage !== (editing.thumbnailUrl || '')
      || city !== (editing.city || '') || country !== (editing.country || '') || address !== (editing.address || '') || sourceUrlInput.trim() !== (editing.sourceUrl || '')
    : Boolean(title.trim() || memo.trim() || selectedImage || address.trim() || sourceUrlInput.trim());
  // The back gesture asks the same way the backdrop and Escape do
  useBackToClose(true, () => { close(); });

  // What was read from the picture: place names, and the text around them as one note
  const [ocrCache, setOcrCache] = useState<Record<string, { candidates: string[]; descriptionText: string }>>({});
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState<string[]>([]);
  const [ocrDescription, setOcrDescription] = useState('');

  const runOcrForImage = useCallback(async (targetImg: string, autoApply = false, bypassCache = false) => {
    if (!targetImg) return;
    const apply = (candidates: string[], descriptionText: string) => {
      setOcrCandidates(candidates);
      setOcrDescription(descriptionText);
      if (autoApply && !isUserEditedTitle) {
        if (candidates.length > 0) setTitle(candidates[0]);
        if (descriptionText) setMemo(descriptionText);
      }
    };
    const cached = ocrCache[targetImg];
    if (cached && !bypassCache) { apply(cached.candidates, cached.descriptionText); return; }
    try {
      setIsOcrRunning(true);
      const res = await extractTextFromImageUrl(targetImg, 'kor');
      const candidates = res.candidates || [];
      const descriptionText = res.descriptionText || '';
      setOcrCache(prev => ({ ...prev, [targetImg]: { candidates, descriptionText } }));
      apply(candidates, descriptionText);
      if (candidates.length === 0 && !descriptionText) notify('사진에서 읽을 수 있는 글씨를 찾지 못했어요.');
    } catch (err) {
      console.warn('[PocketScrapModal] OCR error:', err);
      notify('사진의 글씨를 읽지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setIsOcrRunning(false);
    }
  }, [ocrCache, isUserEditedTitle]);

  // Start: read the picture when there is no real title yet, else offer keywords from the text
  useEffect(() => {
    if (editing) return;
    setActiveCandidateIndex(scrapedData.targetImgIndex ? scrapedData.targetImgIndex - 1 : null);
    const feed = scrapedData.candidates?.map(c => c.title) || [];
    setOcrCandidates(feed);
    const generic = !scrapedData.title || scrapedData.title === '스크린샷 스크랩' || scrapedData.title === '추천 여행 스팟';
    if (scrapedData.thumbnailUrl && (generic || feed.length === 0)) {
      void runOcrForImage(scrapedData.thumbnailUrl, generic);
    } else if (feed.length === 0 && (scrapedData.memo || scrapedData.title)) {
      const keywords = extractKeywordCandidates(`${scrapedData.title || ''} ${scrapedData.memo || ''}`);
      if (keywords.length > 0) setOcrCandidates(keywords);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrapedData.sourceUrl, scrapedData.thumbnailUrl]);

  // A link: read its title, picture, place and text into the form
  const fetchUrl = async (raw = sourceUrlInput) => {
    const url = raw.trim();
    if (!isWebUrl(url)) { notify('https://로 시작하는 링크를 넣어 주세요.'); return; }
    try {
      setIsFetchingUrl(true);
      const res = await scrapeSnsMetadata(url);
      if (res.title) { setTitle(res.title); setIsUserEditedTitle(false); }
      if (res.category) setCategory(res.category);
      if (res.memo) setMemo(res.memo);
      if (res.city) setCity(res.city);
      if (res.country) setCountry(res.country);
      const addr = res.address || (res.memo ? extractAddressFromText(res.memo) : '');
      if (addr) setAddress(addr);
      if (res.thumbnailUrl) {
        setSelectedImage(res.thumbnailUrl);
        await runOcrForImage(res.thumbnailUrl, false);
      }
      if (res.candidates && res.candidates.length > 0) {
        setOcrCandidates(res.candidates.map(c => c.title));
      } else if (res.memo || res.title) {
        const extracted = extractKeywordCandidates(`${res.title || ''} ${res.memo || ''}`);
        if (extracted.length > 0) setOcrCandidates(extracted);
      }
    } catch (err) {
      console.warn('[PocketScrapModal] Fetch URL error:', err);
      notify('링크 정보를 불러오지 못했어요. 스크린샷을 붙여넣어 주세요.', 'error');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // A picture (picked, dropped or pasted): uploaded, then read right away
  const processImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { notify('사진 파일만 올릴 수 있어요.'); return; }
    try {
      setIsUploading(true);
      const compressed = await compressImage(file, 2560, 2560, 0.88);
      const url = await uploadFileToR2(compressed, `pocket_scraps/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
      setSelectedImage(url);
      setIsUserEditedTitle(false);
      await runOcrForImage(url, true);
    } catch (err) {
      console.error('[PocketScrapModal] Image upload/OCR failed:', err);
      notify('사진을 올리거나 읽지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setIsUploading(false);
    }
  }, [runOcrForImage]);

  const pasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.read) {
        for (const item of await navigator.clipboard.read()) {
          const type = item.types.find(t => t.startsWith('image/'));
          if (type) {
            const blob = await item.getType(type);
            await processImageFile(new File([blob], `pasted_${Date.now()}.${type.split('/')[1] || 'png'}`, { type }));
            return;
          }
        }
      }
      const text = (await navigator.clipboard?.readText?.())?.trim();
      if (text && isWebUrl(text)) { setSourceUrlInput(text); await fetchUrl(text); return; }
      notify('클립보드에 사진이나 링크가 없어요.');
    } catch {
      notify('붙여넣기를 쓸 수 없어요. 키보드의 Ctrl+V를 눌러 주세요.');
    }
  };

  // Ctrl+V anywhere on the sheet (outside a text field): a picture is read, a link is loaded
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const inField = (e.target as HTMLElement | null)?.closest?.('input, textarea');
      const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
      if (file) { e.preventDefault(); void processImageFile(file); return; }
      const text = e.clipboardData?.getData('text')?.trim();
      if (!inField && text && isWebUrl(text)) { e.preventDefault(); setSourceUrlInput(text); void fetchUrl(text); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processImageFile]);

  // Place names to pick from: the feed's own spots first, then names read from the picture or text
  const feed = scrapedData.candidates || [];
  const feedTitles = new Set(feed.map(c => c.title));
  const readNames = ocrCandidates.filter(n => !feedTitles.has(n));

  const pickFeed = (candidate: ScrapedSpotCandidate, idx: number) => {
    setActiveCandidateIndex(idx);
    setTitle(candidate.title);
    setCategory(candidate.category);
    if (candidate.memo) setMemo(candidate.memo);
    if (candidate.city) setCity(candidate.city);
    if (candidate.country) setCountry(candidate.country);
    const addr = candidate.address || (candidate.memo ? extractAddressFromText(candidate.memo) : '');
    if (addr) setAddress(addr);
    if (candidate.index && scrapedData.allImages[candidate.index - 1]) setSelectedImage(scrapedData.allImages[candidate.index - 1]);
  };
  const pickName = (name: string) => { setActiveCandidateIndex(null); setTitle(name); setIsUserEditedTitle(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { notify('장소명을 입력해 주세요.'); return; }
    try {
      setIsSubmitting(true);
      // The link as it stands in the box is the one kept
      const link = isWebUrl(sourceUrlInput) ? sourceUrlInput.trim() : '';
      const fields = {
        title: title.trim(),
        category,
        memo: memo.trim() || undefined,
        sourceUrl: link || undefined,
        platform: link ? detectPlatform(link) : undefined,
        thumbnailUrl: selectedImage.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        address: address.trim() || undefined,
        lat,
        lng,
      };
      await onSave(editing
        ? { ...editing, ...fields }
        : { id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now(), ...fields });
      // Saved: nothing is left to ask about
      dirtyRef.current = false;
      close();
    } catch (err) {
      console.error('[PocketScrapModal] Save failed:', err);
      notify('포켓에 담지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkNow = isWebUrl(sourceUrlInput) ? sourceUrlInput.trim() : '';
  const platform = linkNow ? PLATFORM_LABEL[detectPlatform(linkNow)] : undefined;
  const reading = isUploading || isOcrRunning;

  return (
    <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
      {/* Head: what this is, and where the spot came from */}
      <div className="shrink-0 px-4 pt-1 pb-3 flex items-center gap-3">
        <span className="w-11 h-11 rounded-thumb bg-sage text-sage-ink dark:bg-sage-dark dark:text-sage grid place-items-center shrink-0">
          <Bookmark className="w-5 h-5" aria-hidden />
        </span>
        <div className="min-w-0 flex flex-col">
          <span className="text-[17px] font-extrabold tracking-tight leading-tight">{editing ? '스팟 수정' : '포켓에 담기'}</span>
          <span className="font-mono text-meta text-black/55 dark:text-white/55 truncate">{platform || (linkNow ? 'WEB' : editing ? '직접 입력한 스팟' : '직접 입력')}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 flex flex-col gap-4">
        {/* Source: a link, or a picture */}
        <section aria-label="불러오기" className="rounded-card bg-surface dark:bg-surface-dark p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 dark:text-white/45 pointer-events-none" aria-hidden />
              <input
                id="scrap-url"
                type="url"
                inputMode="url"
                value={sourceUrlInput}
                onChange={(e) => setSourceUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void fetchUrl(); } }}
                placeholder="링크 (인스타그램, 유튜브, 블로그)"
                aria-label="링크"
                className={`${fieldClass} pl-10 bg-paper dark:bg-paper-dark`}
              />
            </div>
            <button type="button" onClick={() => { void fetchUrl(); }} disabled={isFetchingUrl || !sourceUrlInput.trim()} className="btn btn-secondary shrink-0">
              {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}불러오기
            </button>
          </div>

          <div className="relative rounded-thumb overflow-hidden bg-black/[0.04] dark:bg-white/[0.06]">
            {selectedImage ? (
              <button type="button" onClick={() => setViewing(true)} aria-label="사진 크게 보기" className="block w-full cursor-zoom-in">
                <img src={selectedImage} alt="" className="block w-full h-auto max-h-[34dvh] object-contain mx-auto select-none" />
              </button>
            ) : (
              <div className="py-5 flex flex-col items-center gap-1.5 text-center px-4">
                <Art id="photo-add" className="h-20 w-auto" />
                <p className="text-meta text-black/55 dark:text-white/55 break-keep">스크린샷이나 사진을 붙여넣으세요 (Ctrl+V)</p>
              </div>
            )}
            {selectedImage && (
              <span className="absolute right-2 top-2 w-8 h-8 rounded-full bg-black/45 text-white grid place-items-center pointer-events-none"><ZoomIn className="w-4 h-4" aria-hidden /></span>
            )}
            {reading && (
              <span role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-paper/90 dark:bg-paper-dark/90">
                <Art id="uploading-photo" className="h-20 w-auto" />
                <span className="text-meta font-bold text-black/60 dark:text-white/60">{isUploading ? '올리는 중' : '글씨 읽는 중'}</span>
              </span>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void processImageFile(f); }}
          />
          <div className={`grid gap-2 ${selectedImage ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={reading}>
              <ImagePlus className="w-3.5 h-3.5 shrink-0" aria-hidden />올리기
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { void pasteFromClipboard(); }} disabled={reading}>
              <ClipboardPaste className="w-3.5 h-3.5 shrink-0" aria-hidden />붙여넣기
            </button>
            {selectedImage && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { void runOcrForImage(selectedImage, true, true); }} disabled={reading} title="사진 속 글씨를 읽어 장소명과 메모에 채웁니다">
                <ScanText className="w-3.5 h-3.5 shrink-0" aria-hidden />글씨 읽기
              </button>
            )}
          </div>
        </section>

        {/* Names found in the feed, the picture or the text: one tap puts one in the title */}
        {(feed.length > 0 || readNames.length > 0) && (
          <section aria-label="추천 장소명" className="flex flex-col gap-2">
            <span className={labelClass}>추천 장소명 · {feed.length + readNames.length}</span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto overscroll-contain">
              {feed.map((c, i) => (
                <Chip key={`f-${i}`} size="sm" selected={activeCandidateIndex === i} onClick={() => pickFeed(c, i)}>
                  {c.index ? <span className="opacity-60 tabular-nums">#{c.index}</span> : null}{c.title}
                </Chip>
              ))}
              {readNames.map((n, i) => (
                <Chip key={`r-${i}`} size="sm" selected={activeCandidateIndex === null && title === n} onClick={() => pickName(n)}>{n}</Chip>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>장소명</span>
          <PlaceAutocompleteInput
            value={title}
            onChange={(val) => { setTitle(val); setIsUserEditedTitle(true); setActiveCandidateIndex(null); }}
            onSelectPlace={(placeName, coords, fullAddress, countryName, cityName) => {
              if (placeName) setTitle(placeName);
              if (coords?.lat) setLat(coords.lat);
              if (coords?.lng) setLng(coords.lng);
              if (fullAddress) setAddress(fullAddress);
              if (countryName) setCountry(countryName);
              if (cityName) setCity(cityName);
              setIsUserEditedTitle(true);
            }}
            placeholder="장소 검색 또는 직접 입력"
            className={fieldClass}
          />
          {address && (
            <span className="flex items-center gap-1.5 text-meta text-black/55 dark:text-white/55 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="truncate">{address}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>분류</span>
          {/* One line at every width: compact chips (the label names the category, so a phone narrower than 390px drops the icons) */}
          <div className="flex gap-1 overflow-x-auto hide-scrollbar" role="group" aria-label="분류">
            {CATEGORY_FORM_ORDER.map(key => (
              <Chip key={key} size="sm" className="!flex-1 justify-center !px-2 !gap-1 [&_svg]:!w-3 [&_svg]:!h-3 max-[389px]:[&_svg]:hidden" icon={CATEGORY_META[key].icon} selected={category === key} onClick={() => setCategory(key)}>{CATEGORY_META[key].label}</Chip>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>도시</span>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="예) 도쿄" className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>국가</span>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="예) JAPAN" className={fieldClass} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5" htmlFor="scrap-memo">
          <span className="flex items-center justify-between gap-2">
            <span className={labelClass}>메모</span>
            {ocrDescription && ocrDescription !== memo && (
              <button type="button" onClick={() => setMemo(ocrDescription)} className="inline-flex items-center gap-1 text-meta font-bold text-red-600 dark:text-red-400 hover:underline" title="사진 속 글씨로 메모를 바꿉니다">
                <FileText className="w-3 h-3" aria-hidden />사진에서 읽은 글로 채우기
              </button>
            )}
          </span>
          <textarea
            id="scrap-memo"
            rows={4}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="추천 메뉴, 영업시간, 웨이팅 팁 등"
            className={`${areaClass} min-h-[96px]`}
          />
        </label>

        {linkNow && (
          <a href={linkNow} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-1.5 max-w-full text-meta font-bold text-black/55 dark:text-white/55 hover:text-ink dark:hover:text-ink-dark">
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span className="truncate">원문 보기</span>
          </a>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 flex items-center gap-2 border-t border-black/[0.06] dark:border-white/[0.08]">
        <button type="button" className="btn btn-secondary flex-1" onClick={close} disabled={isSubmitting}>취소</button>
        <button type="submit" className="btn btn-primary flex-1" disabled={isSubmitting || reading || !title.trim()}>
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />저장 중</> : <><Check className="w-4 h-4" aria-hidden />{editing ? '수정 저장' : '저장'}</>}
        </button>
      </div>

      {viewing && selectedImage && <ImageViewer src={selectedImage} onClose={() => setViewing(false)} />}
    </form>
  );
}
