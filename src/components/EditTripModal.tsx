import React, { useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, ClipboardPaste, ImagePlus, Loader2, MapPin, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { Trip } from '../types';
import { uploadFileToR2, getEffectiveImageUrl } from '../utils/storageHelper';
import { compressImage } from '../utils/imageHelper';
import { inspectAndPrepareVideo } from '../utils/videoHelper';
import { cardCoverUrl } from '../utils/journeyThumbs';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { ConfirmModal } from './ConfirmModal';
import { Sheet } from './Sheet';
import { Segment } from './ui/Segment';
import { Chip } from './ui/Chip';
import { notify, confirmDialog } from '../utils/feedback';
import { currentUid } from '../utils/ownership';
import { useBackToClose } from '../utils/overlayHistory';
import { useFriends } from './friends/useFriends';
import { UserProfileAvatar } from './UserProfileAvatar';
import type { MemberLink } from '../utils/memberLinks';

// Journey edit sheet (v1.3.8): the same rounded sheet as every other panel. Four short tabs keep each one on a
// single screen (basics, places and tags, people, covers); the footer with 취소 and 저장 stays in place.

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | undefined;
  /** extra.renames: member names replaced by a friend's name (old → new), for "paid by" on items */
  onSave: (tripId: number, updatedData: Partial<Trip>, extra?: { renames?: Record<string, string> }) => Promise<void>;
  isLoggedIn: boolean;
  existingTags: string[];
  onMoveToPlans?: (trip: Trip) => Promise<void> | void;
  onMoveToArchive?: (plan: any) => Promise<void> | void;
}

function extractCountry(address: string): string {
  if (!address) return '';
  const clean = address.trim().toLowerCase();

  const countries = [
    { name: 'JAPAN', keys: ['japan', '일본', 'nihon', 'nippon', '日本', 'jp'] },
    { name: 'SOUTH KOREA', keys: ['korea', '대한민국', '한국', 'south korea', 'kr', 'seoul'] },
    { name: 'VIETNAM', keys: ['vietnam', '베트남', 'việt nam', 'viet nam', 'vn'] },
    { name: 'TAIWAN', keys: ['taiwan', '대만', '타이완', 'tai wan', '台灣', '臺灣', 'tw'] },
    { name: 'THAILAND', keys: ['thailand', '태국', 'ประเทศไทย', 'thai', 'th'] },
    { name: 'SINGAPORE', keys: ['singapore', '싱가포르', '싱가폴', 'sg'] },
    { name: 'USA', keys: ['usa', '미국', 'united states', 'america', 'us'] },
    { name: 'FRANCE', keys: ['france', '프랑스', 'french', 'fr'] },
    { name: 'ITALY', keys: ['italy', '이탈리아', '이태리', 'italia', 'it'] },
    { name: 'UNITED KINGDOM', keys: ['uk', 'united kingdom', '영국', 'great britain', 'england', 'gb'] },
    { name: 'GERMANY', keys: ['germany', '독일', 'deutschland', 'de'] },
    { name: 'SPAIN', keys: ['spain', '스페인', 'españa', 'espana', 'es'] },
    { name: 'CHINA', keys: ['china', '중국', '中国', 'cn'] },
    { name: 'HONG KONG', keys: ['hong kong', '홍콩', 'hk'] },
    { name: 'MACAU', keys: ['macau', '마카오', 'mo'] },
    { name: 'PHILIPPINES', keys: ['philippines', '필리핀', 'ph'] },
    { name: 'MALAYSIA', keys: ['malaysia', '말레이시아', 'my'] },
    { name: 'INDONESIA', keys: ['indonesia', '인도네시아', '발리', 'bali', 'id'] },
    { name: 'AUSTRALIA', keys: ['australia', '호주', 'au'] },
    { name: 'NEW ZEALAND', keys: ['new zealand', '뉴질랜드', 'nz'] },
    { name: 'SWITZERLAND', keys: ['switzerland', '스위스', 'ch'] },
    { name: 'AUSTRIA', keys: ['austria', '오스트리아', 'at'] },
    { name: 'CZECHIA', keys: ['czechia', 'czech', '체코', 'cz'] },
    { name: 'HUNGARY', keys: ['hungary', '헝가리', 'hu'] },
  ];

  for (const c of countries) {
    for (const key of c.keys) {
      if (clean.includes(key)) return c.name;
    }
  }

  const parts = address.split(',');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim().toUpperCase();
    for (const c of countries) {
      for (const key of c.keys) {
        if (lastPart.toLowerCase() === key) return c.name;
      }
    }
    return lastPart;
  }

  return address.trim().toUpperCase();
}

const parseDateRange = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('-')) return { start: '', end: '' };
  const parts = dateStr.split('-').map(p => p.trim());
  if (parts.length < 2) return { start: '', end: '' };
  const toInput = (d: string, yearFallback?: string) => {
    let normalized = d.replace(/\./g, '-');
    if (normalized.length === 5 && yearFallback) normalized = `${yearFallback}-${normalized}`;
    return normalized;
  };
  const startRaw = parts[0];
  return { start: toInput(startRaw), end: toInput(parts[1], startRaw.slice(0, 4)) };
};

const isVideoUrl = (v: string) => /\.(mp4|webm|mov)(\?.*)?$/i.test(v);

type EditTab = 'basic' | 'places' | 'people' | 'cover';
type Media = { img: string; video: string };

// Shared looks: inputs are the only bordered pills; labels are small meta lines
const field = 'h-11 w-full min-w-0 rounded-full px-4 bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-[14px] font-bold text-ink dark:text-ink-dark outline-none placeholder:font-medium placeholder:text-black/35 dark:placeholder:text-white/35 focus:border-red-600 dark:focus:border-red-400 transition-colors';
const lbl = 'font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55';
const pillBox = 'flex flex-wrap gap-1.5';

/** A removable pill (place, tag, person) */
function Tag({ children, onRemove, removeLabel, lead }: { children: React.ReactNode; onRemove?: () => void; removeLabel: string; lead?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-full bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-meta font-bold max-w-full">
      {lead}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel} className="tap-target w-6 h-6 rounded-full grid place-items-center text-black/50 dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/10 hover:text-red-600 transition-colors">
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

export function EditTripModal(props: EditTripModalProps) {
  if (!props.isOpen || !props.trip) return null;
  // Keyed by journey: the form starts from that journey's values each time it opens
  return <EditSheet key={props.trip.id} {...props} trip={props.trip} />;
}

function EditSheet({ onClose, trip, onSave, isLoggedIn, existingTags, onMoveToPlans, onMoveToArchive }: EditTripModalProps & { trip: Trip }) {
  const isPlanJourney = Boolean((trip as any).isPlan || trip.tags?.includes('Plan') || trip.title?.includes('(Plan)'));
  const initialBadge: 'NEW' | 'EDITING' | '' = trip.statusBadge === 'NEW' || trip.statusBadge === 'EDITING' ? trip.statusBadge : '';

  const [tab, setTab] = useState<EditTab>('basic');
  const [title, setTitle] = useState(trip.title);
  const [date, setDate] = useState(trip.date);
  const [kind, setKind] = useState<'log' | 'plan'>(isPlanJourney ? 'plan' : 'log');
  const [badge, setBadge] = useState<'NEW' | 'EDITING' | ''>(initialBadge);
  const [country, setCountry] = useState(trip.country || '');
  const [locations, setLocations] = useState<{ name: string; lat?: number; lng?: number; country?: string }[]>(
    trip.locations && Array.isArray(trip.locations) ? trip.locations : trip.locationStr ? [{ name: trip.locationStr, lat: trip.lat, lng: trip.lng }] : []
  );
  const [locationInput, setLocationInput] = useState('');
  const [tags, setTags] = useState<string[]>(trip.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [members, setMembers] = useState<string[]>(trip.members || []);
  const [memberInput, setMemberInput] = useState('');
  // Members linked to friend accounts (v1.3.6 5-c); only the owner links, since linking shares
  const [memberLinks, setMemberLinks] = useState<MemberLink[]>(trip.memberLinks || []);
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [card, setCard] = useState<Media>({ img: trip.img, video: trip.videoUrl || '' });
  const [hero, setHero] = useState<Media>({ img: trip.heroImg || '', video: trip.heroVideoUrl || '' });
  const [coverTab, setCoverTab] = useState<'card' | 'hero'>('card');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uid = currentUid();
  const isOwner = Boolean(uid && (!trip.ownerId || trip.ownerId === uid));
  const { friends } = useFriends(isOwner ? uid : null);

  const cur = coverTab === 'card' ? card : hero;
  const setCur = coverTab === 'card' ? setCard : setHero;

  const isDirty =
    title !== trip.title ||
    date !== trip.date ||
    kind !== (isPlanJourney ? 'plan' : 'log') ||
    badge !== initialBadge ||
    country !== (trip.country || '') ||
    card.img !== trip.img || card.video !== (trip.videoUrl || '') ||
    hero.img !== (trip.heroImg || '') || hero.video !== (trip.heroVideoUrl || '') ||
    JSON.stringify(locations) !== JSON.stringify(trip.locations && Array.isArray(trip.locations) ? trip.locations : trip.locationStr ? [{ name: trip.locationStr, lat: trip.lat, lng: trip.lng }] : []) ||
    JSON.stringify(tags) !== JSON.stringify(trip.tags || []) ||
    JSON.stringify(members) !== JSON.stringify(trip.members || []) ||
    JSON.stringify(memberLinks) !== JSON.stringify(trip.memberLinks || []);

  // Closing with edits asks first; the back gesture asks too instead of dropping them
  useBackToClose(true, () => { if (isDirty) setShowUnsaved(true); else onClose(); });
  const confirmClose = () => {
    if (!isDirty) return true;
    setShowUnsaved(true);
    return false;
  };

  // ── Basics ──
  const handleDateChange = (type: 'start' | 'end', val: string) => {
    const { start, end } = parseDateRange(date);
    const newStart = type === 'start' ? val : start;
    const newEnd = type === 'end' ? val : end;
    if (newStart && newEnd) {
      const formattedStart = newStart.replace(/-/g, '.');
      let formattedEnd = newEnd.replace(/-/g, '.');
      // Same year: the end shows only month and day
      if (newStart.slice(0, 4) === newEnd.slice(0, 4) && formattedEnd.startsWith(newStart.slice(0, 4) + '.')) formattedEnd = formattedEnd.slice(5);
      setDate(`${formattedStart} - ${formattedEnd}`);
    }
  };

  // ── Tags ──
  const addTag = (text: string) => {
    const clean = text.trim().replace(/,/g, '');
    if (clean && !tags.includes(clean)) setTags(prev => [...prev, clean]);
    setTagInput('');
  };
  const suggestions = useMemo(
    () => (tagInput.trim() ? existingTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)).slice(0, 6) : []),
    [tagInput, existingTags, tags]
  );

  // ── People ──
  const addMember = () => {
    const name = memberInput.trim();
    if (!name) return;
    if (members.includes(name)) { notify('이미 등록된 인원입니다.'); return; }
    setMembers(prev => [...prev, name]);
    setMemberInput('');
  };
  const removeMember = async (m: string) => {
    if (!(await confirmDialog(`'${m}' 인원을 뺄까요?`))) return;
    setMembers(prev => prev.filter(x => x !== m));
    setMemberLinks(prev => prev.filter(l => l.name !== m));
    if (linkTarget === m) setLinkTarget(null);
  };
  const freeFriends = friends.filter(f => !memberLinks.some(l => l.uid === f.uid));
  const pickFriend = (f: typeof friends[0]) => {
    if (linkTarget) {
      const old = linkTarget;
      if (old !== f.name && members.includes(f.name)) { notify('같은 이름의 인원이 이미 있습니다.'); return; }
      setMembers(prev => prev.map(x => (x === old ? f.name : x)));
      // Chain renames so an item's "paid by" follows to the final name
      setRenames(prev => {
        const next: Record<string, string> = {};
        Object.entries(prev).forEach(([from, to]) => { next[from] = to === old ? f.name : to; });
        if (!Object.values(prev).includes(old) && old !== f.name) next[old] = f.name;
        return next;
      });
      setMemberLinks(prev => [...prev.filter(l => l.name !== old), { name: f.name, uid: f.uid }]);
      setLinkTarget(null);
    } else {
      if (members.includes(f.name)) { notify('같은 이름의 인원이 이미 있습니다. 그 이름 옆 연결 버튼을 눌러 주세요.'); return; }
      setMembers(prev => [...prev, f.name]);
      setMemberLinks(prev => [...prev, { name: f.name, uid: f.uid }]);
    }
  };

  // ── Covers: one set of controls for the card's and the hero's media ──
  const setMedia = (which: 'card' | 'hero', url: string, video: boolean) => {
    const set = which === 'card' ? setCard : setHero;
    set(video ? { img: '', video: url } : { img: url, video: '' });
  };

  const uploadMedia = async (file: File, which: 'card' | 'hero') => {
    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > 30 * 1024 * 1024) {
      notify('모바일에서 끊기지 않도록 30MB 이하의 동영상만 올릴 수 있습니다.');
      return;
    }
    if (!isVideo && !file.type.startsWith('image/')) {
      notify('사진이나 동영상 파일만 올릴 수 있습니다.');
      return;
    }
    setUploading(true);
    try {
      if (isVideo) {
        const inspection = await inspectAndPrepareVideo(file);
        if (!inspection.isCompatible) notify('이 동영상은 아이폰에서 재생되지 않는 형식일 수 있습니다. H.264 MP4를 권장합니다.');
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const body = isVideo ? file : await compressImage(file, 2560, 2560, 0.82);
      const url = await uploadFileToR2(body, `users/public/covers/${which === 'hero' ? 'hero_' : ''}${Date.now()}_${safeName}`);
      setMedia(which, url, isVideo);
    } catch (err) {
      console.error('Cover upload failed:', err);
      notify('올리지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const pasteMedia = async () => {
    try {
      if (navigator.clipboard?.read) {
        for (const item of await navigator.clipboard.read()) {
          const type = item.types.find(t => t.startsWith('image/'));
          if (type) {
            const blob = await item.getType(type);
            await uploadMedia(new File([blob], `pasted_${Date.now()}.${type.split('/')[1] || 'png'}`, { type }), coverTab);
            return;
          }
        }
      }
      const text = (await navigator.clipboard?.readText?.())?.trim();
      if (text) { setMedia(coverTab, text, isVideoUrl(text)); return; }
      notify('클립보드에 사진이나 주소가 없습니다.');
    } catch {
      notify('붙여넣기를 쓸 수 없습니다. 키보드의 Ctrl+V를 눌러 주세요.');
    }
  };

  // Ctrl+V anywhere on the sheet (outside a text field) pastes a picture into the open cover
  const handlePaste = async (e: React.ClipboardEvent) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const file = e.clipboardData?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      setTab('cover');
      await uploadMedia(file, coverTab);
    }
  };

  const copyToOther = () => {
    if (!cur.img && !cur.video) { notify('옮길 커버가 없습니다.'); return; }
    const other = coverTab === 'card' ? 'hero' : 'card';
    setMedia(other, cur.video || cur.img, !!cur.video);
    notify(other === 'hero' ? '히어로에도 같은 커버를 넣었습니다.' : '카드에도 같은 커버를 넣었습니다.', 'success');
  };

  // ── Save ──
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isLoggedIn || saving) return;
    const { start, end } = parseDateRange(date);
    if (!title.trim()) { setTab('basic'); notify('제목을 입력해 주세요.'); return; }
    if (!start || !end) { setTab('basic'); notify('기간을 정해 주세요.'); return; }
    const wantPlan = kind === 'plan';
    if (wantPlan !== isPlanJourney && !(await confirmDialog(wantPlan ? '이 여정을 계획으로 바꿀까요?' : '이 계획을 기록으로 바꿀까요?', { title: wantPlan ? 'TO PLAN' : 'TO LOG', confirmLabel: '바꾸기' }))) return;
    setSaving(true);

    const combinedLocationStr = locations.map(loc => loc.name).join(', ');
    const finalTags = wantPlan ? (tags.includes('Plan') ? tags : [...tags, 'Plan']) : tags.filter(t => t !== 'Plan');

    try {
      if (wantPlan && !isPlanJourney && onMoveToPlans) await onMoveToPlans(trip);
      else if (!wantPlan && isPlanJourney && onMoveToArchive) await onMoveToArchive(trip as any);

      await onSave(trip.id, {
        title: title.trim(),
        date,
        locationStr: combinedLocationStr,
        lat: locations[0]?.lat ?? trip.lat,
        lng: locations[0]?.lng ?? trip.lng,
        locations,
        country: country.trim(),
        videoUrl: card.video,
        img: card.img,
        heroImg: hero.img,
        heroVideoUrl: hero.video,
        tags: finalTags,
        members,
        memberLinks: memberLinks.filter(l => members.includes(l.name)),
        statusBadge: wantPlan ? 'PLAN' : badge,
      }, { renames });
      onClose();
    } catch (err) {
      console.error(err);
      notify('여정 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const range = parseDateRange(date);
  const coverFilled = (m: Media) => !!(m.img || m.video);

  return (
    <>
      <Sheet label="여정 편집" onClose={onClose} tone="paper" locked={saving} backToClose={false} confirmClose={confirmClose} panelClassName="sm:max-w-md h-[min(84dvh,620px)]">
        <form onSubmit={handleSubmit} onPaste={handlePaste} className="flex-1 min-h-0 flex flex-col">
          {/* Head: the cover, what this is, and which journey */}
          <div className="shrink-0 px-4 pt-1 pb-3 flex items-center gap-3">
            <img src={cardCoverUrl({ img: card.img || trip.img, imgSmall: trip.imgSmall, imgSmallSrc: trip.imgSmallSrc })} alt="" decoding="async" className="w-11 h-11 rounded-thumb object-cover bg-black/5 dark:bg-white/10 shrink-0" />
            <div className="min-w-0 flex flex-col">
              <span className="text-[17px] font-extrabold tracking-tight leading-tight">여정 편집</span>
              <span className="font-mono text-meta text-black/55 dark:text-white/55 truncate">{trip.title}</span>
            </div>
          </div>

          <div className="shrink-0 px-4 pb-3">
            <Segment<EditTab>
              block
              size="sm"
              ariaLabel="편집 구역"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'basic', label: '기본' },
                { value: 'places', label: '장소·태그' },
                { value: 'people', label: <span className="inline-flex items-center gap-1">인원{members.length > 0 && <span className="font-mono text-micro opacity-60 tabular-nums">{members.length}</span>}</span> },
                { value: 'cover', label: '커버' },
              ]}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-3 flex flex-col gap-4">
            {tab === 'basic' && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className={lbl}>제목</span>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="예) 도쿄 디즈니 여행" />
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className={lbl}>기간</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" aria-label="출발일" value={range.start} onChange={(e) => handleDateChange('start', e.target.value)} className={field} />
                    <input type="date" aria-label="도착일" value={range.end} min={range.start || undefined} onChange={(e) => handleDateChange('end', e.target.value)} className={field} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={lbl}>유형</span>
                  <Segment<'log' | 'plan'>
                    block
                    ariaLabel="여정 유형"
                    value={kind}
                    onChange={setKind}
                    options={[{ value: 'log', label: '기록' }, { value: 'plan', label: '계획' }]}
                  />
                </div>
                {kind === 'log' && (
                  <div className="flex flex-col gap-1.5">
                    <span className={lbl}>카드 뱃지</span>
                    <div className="flex gap-2">
                      <Chip selected={badge === 'NEW'} onClick={() => setBadge(b => (b === 'NEW' ? '' : 'NEW'))}>NEW</Chip>
                      <Chip selected={badge === 'EDITING'} onClick={() => setBadge(b => (b === 'EDITING' ? '' : 'EDITING'))}>EDITING</Chip>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'places' && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className={lbl}>국가</span>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={field} placeholder="JAPAN" />
                </label>
                <div className="flex flex-col gap-2">
                  <span className={lbl}>장소</span>
                  {locations.length > 0 && (
                    <div className={pillBox}>
                      {locations.map((loc, idx) => (
                        <Tag key={`${loc.name}-${idx}`} removeLabel={`${loc.name} 빼기`} onRemove={() => setLocations(prev => prev.filter((_, i) => i !== idx))}>{loc.name}</Tag>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 dark:text-white/45 z-10 pointer-events-none" aria-hidden />
                      <PlaceAutocompleteInput
                        value={locationInput}
                        onChange={setLocationInput}
                        onSelectPlace={(name, coords, address, countryName) => {
                          if (!name.trim()) return;
                          setLocations(prev => {
                            if (prev.some(loc => loc.name === name.trim())) return prev;
                            const resolved = countryName ? extractCountry(countryName) || countryName.toUpperCase() : extractCountry(address);
                            return [...prev, { name: name.trim(), lat: coords?.lat, lng: coords?.lng, country: resolved }];
                          });
                          setLocationInput('');
                        }}
                        className={`${field} pl-10`}
                        placeholder="도시 검색"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary shrink-0"
                      onClick={() => {
                        const clean = locationInput.trim();
                        if (!clean) return;
                        setLocations(prev => (prev.some(loc => loc.name === clean) ? prev : [...prev, { name: clean }]));
                        setLocationInput('');
                      }}
                    >
                      <Plus className="w-4 h-4" aria-hidden />추가
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className={lbl}>태그</span>
                  {tags.length > 0 && (
                    <div className={pillBox}>
                      {tags.map(tag => (
                        <Tag key={tag} removeLabel={`${tag} 빼기`} onRemove={() => setTags(prev => prev.filter(t => t !== tag))}>{tag}</Tag>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => (e.target.value.endsWith(',') ? addTag(e.target.value) : setTagInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                    }}
                    className={field}
                    placeholder="쉼표나 Enter로 구분"
                  />
                  {suggestions.length > 0 && (
                    <div className={pillBox}>
                      {suggestions.map(sug => <Chip key={sug} size="sm" onClick={() => addTag(sug)}>{sug}</Chip>)}
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'people' && (
              <>
                <div className="flex flex-col gap-2">
                  <span className={lbl}>함께한 사람</span>
                  {members.length === 0 ? (
                    <p className="text-meta text-black/55 dark:text-white/55">아직 없습니다. 이름을 넣거나 친구를 골라 주세요.</p>
                  ) : (
                    <div className={pillBox}>
                      {members.map(m => {
                        const link = memberLinks.find(l => l.name === m);
                        const friend = link && friends.find(f => f.uid === link.uid);
                        return (
                          <span key={m} className={`inline-flex items-center gap-1 ${linkTarget === m ? 'rounded-full ring-2 ring-red-600' : ''}`}>
                            <Tag
                              removeLabel={`${m} 빼기`}
                              onRemove={() => { void removeMember(m); }}
                              lead={link ? <UserProfileAvatar profile={friend || { uid: link.uid }} size="xs" fallbackName={m} className="-ml-1.5" /> : undefined}
                            >{m}</Tag>
                            {isOwner && !link && friends.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setLinkTarget(prev => (prev === m ? null : m))}
                                aria-label={`${m}을(를) 친구 계정과 연결`}
                                aria-pressed={linkTarget === m}
                                className={`tap-target w-8 h-8 rounded-full grid place-items-center border transition-colors ${linkTarget === m ? 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark border-transparent' : 'border-black/10 dark:border-white/10 text-black/55 dark:text-white/55 hover:bg-black/[0.05] dark:hover:bg-white/10'}`}
                              >
                                <UserPlus className="w-3.5 h-3.5" aria-hidden />
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addMember(); }
                      }}
                      className={field}
                      placeholder="이름을 쓰고 Enter"
                    />
                    <button type="button" className="btn btn-secondary shrink-0" onClick={addMember}><Plus className="w-4 h-4" aria-hidden />추가</button>
                  </div>
                </div>
                {isOwner && freeFriends.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className={lbl}>친구</span>
                    <p className="text-meta text-black/55 dark:text-white/55 break-keep">
                      {linkTarget ? `'${linkTarget}'을(를) 연결할 친구를 골라 주세요. 이름이 친구 이름으로 바뀌고 친구가 이 여정을 볼 수 있습니다.` : '친구를 넣으면 그 친구가 이 여정을 볼 수 있습니다.'}
                    </p>
                    <div className={pillBox}>
                      {freeFriends.map(f => (
                        <button
                          key={f.uid}
                          type="button"
                          onClick={() => pickFriend(f)}
                          className="h-9 pl-1.5 pr-3.5 inline-flex items-center gap-1.5 rounded-full border border-black/15 dark:border-white/15 text-meta font-bold hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                        >
                          <UserProfileAvatar profile={f} size="sm" fallbackName={f.name} />
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'cover' && (
              <>
                <Segment<'card' | 'hero'>
                  block
                  ariaLabel="커버 종류"
                  value={coverTab}
                  onChange={setCoverTab}
                  options={[
                    { value: 'card', label: <span className="inline-flex items-center gap-1.5">카드{coverFilled(card) && <span className="w-1.5 h-1.5 rounded-full bg-red-600" aria-hidden />}</span> },
                    { value: 'hero', label: <span className="inline-flex items-center gap-1.5">히어로{coverFilled(hero) && <span className="w-1.5 h-1.5 rounded-full bg-red-600" aria-hidden />}</span> },
                  ]}
                />
                <div
                  onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) await uploadMedia(f, coverTab);
                  }}
                  className={`relative w-full aspect-[16/9] rounded-card overflow-hidden bg-black/[0.05] dark:bg-white/[0.08] grid place-items-center transition-shadow ${dragOver ? 'ring-2 ring-red-600' : ''}`}
                >
                  {cur.video ? (
                    <video src={getEffectiveImageUrl(cur.video)} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                  ) : cur.img ? (
                    <img src={getEffectiveImageUrl(cur.img)} alt="" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-1.5 text-meta font-bold text-black/55 dark:text-white/55">
                      <ImagePlus className="w-6 h-6" aria-hidden />
                      {coverTab === 'hero' ? '비워 두면 카드 커버가 쓰입니다' : '사진이나 영상을 올려 주세요'}
                    </button>
                  )}
                  {uploading && (
                    <span className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="w-6 h-6 text-white animate-spin" aria-label="올리는 중" /></span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) await uploadMedia(f, coverTab);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}><ImagePlus className="w-3.5 h-3.5" aria-hidden />올리기</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { void pasteMedia(); }} disabled={uploading}><ClipboardPaste className="w-3.5 h-3.5" aria-hidden />붙여넣기</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={copyToOther} disabled={!coverFilled(cur)}><ArrowRightLeft className="w-3.5 h-3.5" aria-hidden />{coverTab === 'card' ? '히어로에도' : '카드에도'}</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCur({ img: '', video: '' })} disabled={!coverFilled(cur) || uploading}><Trash2 className="w-3.5 h-3.5" aria-hidden />비우기</button>
                </div>
                <input
                  type="text"
                  aria-label="사진이나 영상 주소"
                  value={cur.video || cur.img}
                  onChange={(e) => { const v = e.target.value; setCur(!v ? { img: '', video: '' } : isVideoUrl(v) ? { img: '', video: v } : { img: v, video: '' }); }}
                  className={`${field} h-10 font-mono text-meta`}
                  placeholder="주소로 넣기"
                />
              </>
            )}
          </div>

          <div className="shrink-0 px-4 py-3 flex items-center gap-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => { if (confirmClose()) onClose(); }} disabled={saving}>취소</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving || uploading || !title.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />저장 중</> : '저장'}
            </button>
          </div>
        </form>
      </Sheet>

      {/* Edits are open: save, throw them away, or keep editing */}
      <ConfirmModal
        isOpen={showUnsaved}
        title="UNSAVED CHANGES"
        message="저장하지 않은 변경이 있습니다."
        confirmLabel="Save (Y)"
        discardLabel="Discard (N)"
        cancelLabel="Skip (Esc)"
        onConfirm={async () => { setShowUnsaved(false); await handleSubmit(); }}
        onDiscard={() => { setShowUnsaved(false); onClose(); }}
        onCancel={() => setShowUnsaved(false)}
      />
    </>
  );
}
