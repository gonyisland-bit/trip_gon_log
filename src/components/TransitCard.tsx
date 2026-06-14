import React, { useState, useRef, useEffect } from 'react';
import { Train, Bus, Car, Trash2, Image as ImageIcon, MapPin, ChevronDown, ChevronUp, Clock, Paperclip, Loader2, X, ExternalLink } from 'lucide-react';
import { TransitItem } from '../types';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { ImageEditOverlay } from './ImageEditOverlay';
import { SettlementExpenseInput } from './SettlementExpenseInput';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { Lightbox } from './Lightbox';

interface TransitCardProps {
  transit: TransitItem;
  isEditMode: boolean;
  onUpdate: (id: number, fieldOrFields: keyof TransitItem | Partial<TransitItem>, val?: any) => void;
  onDelete: (id: number) => void;
  isActive?: boolean;
  onClick?: () => void;
  onFocusPlace?: (type: 'depart' | 'arrive' | 'boarding') => void;
  minDate?: string;
  maxDate?: string;
  onOpenMapConfirm?: (placeName: string, url: string) => void;
  members?: string[];
  defaultCurrency?: string;
}

// Time conversion helpers
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function minutesToTimeStr(minutes: number): string {
  const positiveMin = Math.max(0, Math.min(1439, minutes));
  let hours = Math.floor(positiveMin / 60);
  const mins = positiveMin % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minsStr = String(mins).padStart(2, '0');
  return `${hours}:${minsStr} ${ampm}`;
}

function timeStrTo24h(timeStr: string): string {
  if (!timeStr) return '00:00';
  const minutes = parseTimeToMinutes(timeStr);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function time24hTo12h(val24h: string): string {
  if (!val24h) return '12:00 AM';
  const parts = val24h.split(':');
  const h24 = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return minutesToTimeStr(h24 * 60 + m);
}

export function TransitCard({
  transit,
  isEditMode,
  onUpdate,
  onDelete,
  isActive = false,
  onClick,
  onFocusPlace,
  minDate,
  maxDate,
  onOpenMapConfirm,
  members = [],
  defaultCurrency,
}: TransitCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const timeRef = useRef<HTMLInputElement>(null);

  // Local state to prevent typing lag
  const [localTitle, setLocalTitle] = useState(transit.title);
  const [localSeat, setLocalSeat] = useState(transit.seat);
  const [localBookingRef, setLocalBookingRef] = useState(transit.bookingRef);
  const [localMemo, setLocalMemo] = useState(transit.memo || '');

  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentLightboxOpen, setAttachmentLightboxOpen] = useState(false);
  const [attachmentLightboxIndex, setAttachmentLightboxIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    setUploadingAttachment(true);
    try {
      const storagePath = `users/public/transits/${transit.id}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const currentList = transit.attachments || [];
      const newList = [...currentList, downloadUrl];
      onUpdate(transit.id, 'attachments', newList);
    } catch (error) {
      console.error("Transit attachment upload failed:", error);
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        await uploadFile(file);
      }
    }
  };

  const removeAttachment = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    if (confirm("이 첨부파일을 삭제하시겠습니까?")) {
      const currentList = transit.attachments || [];
      const newList = currentList.filter((_, idx) => idx !== indexToRemove);
      onUpdate(transit.id, 'attachments', newList);
    }
  };

  const isPdf = (url: string) => url?.toLowerCase().includes('.pdf') || url?.toLowerCase().includes('application%2Fpdf');

  useEffect(() => {
    setLocalTitle(transit.title);
    setLocalSeat(transit.seat);
    setLocalBookingRef(transit.bookingRef);
    setLocalMemo(transit.memo || '');
  }, [transit]);

  const handlePlaceLinkClick = (e: React.MouseEvent, placeName: string) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
    if (onOpenMapConfirm) {
      onOpenMapConfirm(placeName, url);
    } else {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const mobileUrl = isMobile
        ? `comgooglemaps://?q=${encodeURIComponent(placeName)}`
        : url;
      if (isMobile) {
        window.location.href = mobileUrl;
        setTimeout(() => {
          window.open(url, '_blank');
        }, 500);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`border mb-6 font-sans text-black dark:text-white relative shadow-sm transition-all duration-300 ${
        !isEditMode ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        isActive 
          ? 'border-red-600 dark:border-red-400 ring-1 ring-red-600/30 bg-red-500/[0.01] dark:bg-red-400/[0.01] shadow-md' 
          : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a]'
      }`}
    >
      {/* Header bar */}
      <div className="bg-[#EAE8E3]/50 dark:bg-white/10 px-4 py-2 border-b border-black/10 dark:border-white/10 flex justify-between items-center text-[10px] md:text-xs font-bold tracking-widest text-black/60 dark:text-white/60 gap-4">
        <div className="flex items-center gap-2">
          {(() => {
            const typeUpper = (transit.ticketType || '').toUpperCase();
            if (typeUpper.includes('BUS')) return <Bus className="w-3.5 h-3.5 animate-in fade-in duration-300" />;
            if (typeUpper.includes('TAXI') || typeUpper.includes('CAR')) return <Car className="w-3.5 h-3.5 animate-in fade-in duration-300" />;
            return <Train className="w-3.5 h-3.5 animate-in fade-in duration-300" />;
          })()}
          {isEditMode ? (
            <select
              value={transit.ticketType || 'TRAIN TICKET'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate(transit.id, 'ticketType', val);
                const typeUpper = val.toUpperCase();
                if (typeUpper.includes('BUS')) {
                  onUpdate(transit.id, 'transitType', 'bus');
                } else if (typeUpper.includes('TAXI') || typeUpper.includes('CAR')) {
                  onUpdate(transit.id, 'transitType', 'taxi');
                } else {
                  onUpdate(transit.id, 'transitType', 'train');
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm uppercase w-32 cursor-pointer"
            >
              <option value="TRAIN TICKET">TRAIN TICKET</option>
              <option value="BUS TICKET">BUS TICKET</option>
              <option value="TAXI TICKET">TAXI TICKET</option>
            </select>
          ) : (
            <span className="uppercase">{transit.ticketType || 'TRAIN TICKET'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <input
              type="date"
              value={transit.date ? transit.date.replace(/\./g, '-') : ''}
              min={minDate}
              max={maxDate}
              onChange={(e) => onUpdate(transit.id, 'date', e.target.value.replace(/-/g, '.'))}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-36 text-right"
            />
          ) : (
            <span>{transit.date}</span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDetailExpanded(!isDetailExpanded);
            }}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors ml-1"
            title={isDetailExpanded ? "상세 닫기" : "상세 열기"}
          >
            {isDetailExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            )}
          </button>
        </div>
      </div>
      
      {/* Card Body */}
      <div className="p-4 md:p-6">
        <div className="flex flex-row items-center justify-between">
          <div className="flex-grow min-w-0 pr-4">
            {isEditMode ? (
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={() => onUpdate(transit.id, 'title', localTitle)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none font-black text-lg md:text-xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full uppercase"
                placeholder="TRANSIT TITLE"
              />
            ) : (
              <h3 className="text-lg md:text-xl font-black tracking-tight leading-snug uppercase truncate">
                {transit.title}
              </h3>
            )}
            {isEditMode ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 w-full relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex-1 min-w-0 relative">
                  <span className="text-[8px] uppercase font-bold tracking-widest opacity-40 block mb-0.5">DEPART</span>
                  <PlaceAutocompleteInput
                    value={transit.departPlace || ''}
                    onChange={(val) => {
                      onUpdate(transit.id, {
                        departPlace: val,
                        route: `${val} → ${transit.arrivePlace || ''}`
                      });
                    }}
                    onSelectPlace={(name, coords) => {
                      onUpdate(transit.id, {
                        departPlace: name,
                        route: `${name} → ${transit.arrivePlace || ''}`,
                        ...(coords ? { departLat: coords.lat, departLng: coords.lng } : {})
                      });
                    }}
                    className="w-full bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-xs text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm"
                    placeholder="Departure terminal/station..."
                  />
                </div>
                <span className="text-black/40 dark:text-white/40 self-end mb-1.5 hidden sm:inline">→</span>
                <div className="flex-1 min-w-0 relative">
                  <span className="text-[8px] uppercase font-bold tracking-widest opacity-40 block mb-0.5">ARRIVE</span>
                  <PlaceAutocompleteInput
                    value={transit.arrivePlace || ''}
                    onChange={(val) => {
                      onUpdate(transit.id, {
                        arrivePlace: val,
                        route: `${transit.departPlace || ''} → ${val}`
                      });
                    }}
                    onSelectPlace={(name, coords) => {
                      onUpdate(transit.id, {
                        arrivePlace: name,
                        route: `${transit.departPlace || ''} → ${name}`,
                        ...(coords ? { arriveLat: coords.lat, arriveLng: coords.lng } : {})
                      });
                    }}
                    className="w-full bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-xs text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm"
                    placeholder="Arrival terminal/station..."
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs md:text-sm text-black/50 dark:text-white/50 mt-1 block flex flex-wrap items-center gap-1">
                {transit.departPlace ? (
                  <span 
                    onClick={(e) => handlePlaceLinkClick(e, transit.departPlace!)}
                    className="hover:underline hover:text-red-600 transition-colors cursor-pointer font-medium underline decoration-dotted decoration-black/30 dark:decoration-white/30"
                  >
                    {transit.departPlace}
                  </span>
                ) : (
                  <span>출발지</span>
                )}
                <span className="mx-1 opacity-60">→</span>
                {transit.arrivePlace ? (
                  <span 
                    onClick={(e) => handlePlaceLinkClick(e, transit.arrivePlace!)}
                    className="hover:underline hover:text-red-600 transition-colors cursor-pointer font-medium underline decoration-dotted decoration-black/30 dark:decoration-white/30"
                  >
                    {transit.arrivePlace}
                  </span>
                ) : (
                  <span>도착지</span>
                )}
              </p>
            )}
            {isEditMode ? (
              <div className="flex items-center gap-1.5 mt-4" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={timeRef}
                  type="time"
                  value={timeStrTo24h(transit.time)}
                  onChange={(e) => onUpdate(transit.id, 'time', time24hTo12h(e.target.value))}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-2 py-0.5 outline-none font-black text-xl md:text-2xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-36 md:w-40 text-center [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      timeRef.current?.showPicker();
                    } catch (err) {
                      console.warn(err);
                    }
                  }}
                  className="p-1.5 md:p-2 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10 rounded-sm bg-[#EAE8E3] dark:bg-white/10 cursor-pointer flex items-center justify-center"
                  title="시간 선택"
                >
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-black/60 dark:text-white/60" />
                </button>
              </div>
            ) : (
              <div className="text-2xl md:text-4xl font-black mt-4 tracking-tighter leading-none">
                {transit.time}
              </div>
            )}
          </div>
          
          {/* Right Side: Seat & Booking Ref Box */}
          <div className="border border-black/10 dark:border-white/10 p-3 md:p-4 text-left w-28 md:w-36 shrink-0 bg-white/30 dark:bg-black/10">
            <div className="mb-3">
              <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">SEAT</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={localSeat}
                  onChange={(e) => setLocalSeat(e.target.value)}
                  onBlur={() => onUpdate(transit.id, 'seat', localSeat)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full"
                  placeholder="Car 0, 00A"
                />
              ) : (
                <span className="text-xs md:text-sm font-bold text-black/80 dark:text-white/80 block">
                  {transit.seat}
                </span>
              )}
            </div>
            <div>
              <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">BOOKING REF</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={localBookingRef}
                  onChange={(e) => setLocalBookingRef(e.target.value)}
                  onBlur={() => onUpdate(transit.id, 'bookingRef', localBookingRef)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full uppercase"
                  placeholder="TRN-000"
                />
              ) : (
                <span className="text-xs md:text-sm font-bold text-black/80 dark:text-white/80 tracking-wider block">
                  {transit.bookingRef}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Expanded details section (Shown if active) */}
        {isDetailExpanded && (
          <div className="mt-4 pt-4 border-t border-black/15 dark:border-white/15 space-y-4 text-xs md:text-sm animate-in slide-in-from-top duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Transit Type Selector - Only shown in edit mode */}
            {isEditMode && (
              <div>
                <label className="text-[9px] text-black/40 dark:text-white/40 uppercase font-black tracking-widest block mb-2">Transit Type (교통 종류)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate(transit.id, 'transitType', 'train');
                      onUpdate(transit.id, 'ticketType', 'TRAIN TICKET');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                      transit.transitType === 'train' || (!transit.transitType || (transit.transitType !== 'bus' && transit.transitType !== 'taxi'))
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Train className="w-3.5 h-3.5" /> Train
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate(transit.id, 'transitType', 'bus');
                      onUpdate(transit.id, 'ticketType', 'BUS TICKET');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                      transit.transitType === 'bus'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Bus className="w-3.5 h-3.5" /> Bus
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate(transit.id, 'transitType', 'taxi');
                      onUpdate(transit.id, 'ticketType', 'TAXI TICKET');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                      transit.transitType === 'taxi'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> Taxi
                  </button>
                </div>
              </div>
            )}

            {/* Memo Field */}
            {(isEditMode || transit.memo) && (
              <div className="flex flex-col gap-1">
                <span className="font-bold shrink-0 text-[10px] tracking-widest uppercase opacity-60 block">
                  MEMO:
                </span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={localMemo}
                    onChange={(e) => setLocalMemo(e.target.value)}
                    onBlur={() => onUpdate(transit.id, 'memo', localMemo)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent border-b border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none py-1 text-xs md:text-sm text-black dark:text-white w-full"
                    placeholder="Enter notes (platform, transfer directions, etc.)..."
                  />
                ) : (
                  <span className="ml-5 block text-xs opacity-80">{transit.memo}</span>
                )}
              </div>
            )}

            {/* Boarding Image Thumbnail */}
            {(isEditMode || transit.boardingImg) && (
              <div className="flex flex-col gap-1">
                <span className="font-bold shrink-0 text-[10px] tracking-widest uppercase opacity-60 block">Boarding Photo:</span>
                <div className="flex items-center gap-3 ml-5 mt-1">
                  <div className="relative w-20 h-20 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 overflow-hidden group flex items-center justify-center shrink-0">
                    {transit.boardingImg ? (
                      <img 
                        src={transit.boardingImg} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                        alt="Boarding reference" 
                        onClick={(e) => { if (!isEditMode) { e.stopPropagation(); setLightboxOpen(true); } }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-black/30 dark:text-white/30 text-[8px] text-center p-1">
                        <ImageIcon className="w-4 h-4 opacity-40 mb-0.5" />
                        <span>NO PHOTO</span>
                      </div>
                    )}
                    {isEditMode && (
                      <ImageEditOverlay
                        isEditMode={isEditMode}
                        onImageUploaded={(url) => onUpdate(transit.id, 'boardingImg', url)}
                        hasImage={!!transit.boardingImg}
                        onImageRemoved={() => onUpdate(transit.id, 'boardingImg', null)}
                      />
                    )}
                  </div>
                  {isEditMode ? (
                    <span className="text-[9px] text-black/40 dark:text-white/40 italic">Drag & Drop or click overlay to add photo</span>
                  ) : (
                    <span className="text-[9px] text-black/40 dark:text-white/40 italic">Click image to enlarge</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settlement Section */}
        {(isEditMode || (transit.cost && transit.cost !== '-')) && (
          <div className={`mt-4 pt-3 border-t border-dashed border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 ${isEditMode ? 'pr-8' : ''}`}>
            <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest">EXPENSE (정산)</span>
            <SettlementExpenseInput
              cost={transit.cost}
              currency={transit.currency}
              paidBy={transit.paidBy}
              members={members}
              isEditMode={isEditMode}
              onUpdate={(updates) => {
                if (updates.cost !== undefined) onUpdate(transit.id, 'cost', updates.cost);
                if (updates.currency !== undefined) onUpdate(transit.id, 'currency', updates.currency);
                if (updates.paidBy !== undefined) onUpdate(transit.id, 'paidBy', updates.paidBy);
              }}
              defaultCurrency={defaultCurrency}
            />
          </div>
        )}
      </div>
      
      {/* Attachments Section */}
      <div className="px-4 pb-4 md:px-6 md:pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="pt-3 border-t border-dashed border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest flex items-center gap-1">
              <Paperclip className="w-3 h-3" /> ATTACHMENTS (첨부파일)
            </span>
            {isEditMode && (
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="text-[9px] md:text-[10px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-2 py-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-bold uppercase rounded-sm flex items-center gap-1 cursor-pointer text-black dark:text-white"
                >
                  {uploadingAttachment ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                      <span>UPLOADING...</span>
                    </>
                  ) : (
                    <span>ADD FILE</span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  multiple
                />
              </div>
            )}
          </div>

          {/* Attachment List */}
          {(!transit.attachments || transit.attachments.length === 0) ? (
            <div className="text-[9px] text-black/30 dark:text-white/30 italic py-1">
              첨부된 파일이 없습니다.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transit.attachments.map((url, idx) => {
                const pdfMode = isPdf(url);
                return (
                  <div key={idx} className="relative group">
                    {pdfMode ? (
                      <button
                        type="button"
                        onClick={() => window.open(url, '_blank')}
                        className="w-12 h-12 md:w-16 md:h-16 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col items-center justify-center text-red-500 dark:text-red-400 hover:opacity-80 transition-opacity rounded-sm cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 mb-1" />
                        <span className="text-[8px] font-bold">PDF</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentLightboxIndex(idx);
                          setAttachmentLightboxOpen(true);
                        }}
                        className="w-12 h-12 md:w-16 md:h-16 rounded-sm overflow-hidden border border-black/10 dark:border-white/10 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <img src={url} alt={`attachment-${idx}`} className="w-full h-full object-cover" />
                      </button>
                    )}
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={(e) => removeAttachment(e, idx)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] cursor-pointer"
                        title="첨부파일 삭제"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete button in edit mode */}
      {isEditMode && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(transit.id); }}
          className="absolute bottom-2 right-2 p-1 text-red-500 hover:text-red-700 transition-colors z-10"
          title="Delete Transit"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Lightbox Modal for enlarged image */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
        >
          <img 
            src={transit.boardingImg || ''} 
            alt="Boarding point reference full size" 
            className="max-w-full max-h-[90vh] object-contain shadow-2xl border border-white/10"
          />
          <button 
            className="absolute top-4 right-4 text-white hover:text-red-500 font-bold text-lg p-2"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Lightbox for Image Attachments */}
      {attachmentLightboxOpen && (
        <Lightbox
          isOpen={attachmentLightboxOpen}
          images={(transit.attachments || []).map(url => ({ url }))}
          currentIndex={attachmentLightboxIndex}
          onClose={() => setAttachmentLightboxOpen(false)}
          onNavigate={(idx) => setAttachmentLightboxIndex(idx)}
        />
      )}
    </div>
  );
}
