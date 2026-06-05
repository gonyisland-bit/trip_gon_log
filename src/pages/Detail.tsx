import React, { useState, useRef, useEffect } from 'react';
import { 
  Clock, Plane, Bed, Train, User, Edit2, Trash2, 
  Image as ImageIcon, ChevronUp, ChevronDown, MapPin, Map, Plus, Loader2
} from 'lucide-react';
import { MapArea } from '../components/MapArea';
import { ImageEditOverlay } from '../components/ImageEditOverlay';
import { FlightCard } from '../components/FlightCard';
import { StayCard } from '../components/StayCard';
import { TransitCard } from '../components/TransitCard';
import { Lightbox } from '../components/Lightbox';
import { 
  Trip, 
  TimelineItem, 
  TimelineData, 
  FlightItem, 
  StayItem, 
  TransitItem 
} from '../types';
import { fetchCoordinates } from '../utils/googleMapsHelper';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';

interface JourneyDetailPageProps {
  isLoggedIn: boolean;
  trip: Trip | undefined;
  isEditMode: boolean;
  onUpdateTrip: (tripId: number, field: string, value: any) => void;
  
  timelineData: TimelineData;
  onUpdateTimelineItem: (date: string, itemId: number, field: keyof TimelineItem, value: string) => void;
  onDeleteTimelineItem: (date: string, itemId: number) => void;
  onAddTimelineItem: (date: string) => void;
  
  flights: FlightItem[];
  onUpdateFlight: (id: number, field: keyof FlightItem, val: string) => void;
  onDeleteFlight: (id: number) => void;
  onAddFlight: (title: string) => void;
  
  stays: StayItem[];
  onUpdateStay: (id: number, field: keyof StayItem, val: string) => void;
  onDeleteStay: (id: number) => void;
  onAddStay: () => void;
  
  transits: TransitItem[];
  onUpdateTransit: (id: number, field: keyof TransitItem, val: string) => void;
  onDeleteTransit: (id: number) => void;
  onAddTransit: () => void;
  
  isDarkMode: boolean;
}

type TabType = 'timeline' | 'flights' | 'stays' | 'transit' | 'gallery';

// 날짜 범위 파싱 및 하루 단위 날짜 배열 생성 헬퍼
const generateDateList = (dateRangeStr: string): string[] => {
  if (!dateRangeStr) return [];
  const dates = dateRangeStr.split(' - ');
  if (dates.length < 2) return [];
  
  const startStr = dates[0].replace(/\./g, '-');
  const endStr = dates[1].replace(/\./g, '-');
  
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }
  
  const list: string[] = [];
  let current = new Date(start);
  
  // 무한 루프 예방 (최대 100일 제한)
  let safetyCounter = 0;
  while (current <= end && safetyCounter < 100) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    list.push(`${yyyy}.${mm}.${dd}`);
    current.setDate(current.getDate() + 1);
    safetyCounter++;
  }
  
  return list;
};

export const JourneyDetailPage: React.FC<JourneyDetailPageProps> = ({
  isLoggedIn,
  trip,
  isEditMode,
  onUpdateTrip,
  
  timelineData,
  onUpdateTimelineItem,
  onDeleteTimelineItem,
  onAddTimelineItem,

  flights,
  onUpdateFlight,
  onDeleteFlight,
  onAddFlight,

  stays,
  onUpdateStay,
  onDeleteStay,
  onAddStay,

  transits,
  onUpdateTransit,
  onDeleteTransit,
  onAddTransit,
  
  isDarkMode,
}) => {
  // ── ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURN ──
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Lightbox & Gallery state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const dateBarRef = useRef<HTMLDivElement>(null);



  // 활성 탭 날짜가 선택되었을 때, 가로 날짜 바 중앙 정렬 처리
  useEffect(() => {
    if (!dateBarRef.current) return;
    const activeBtn = dateBarRef.current.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedDate]);

  // ── CONDITIONAL EARLY RETURN (after all hooks) ──
  // trip이 undefined일 때 로딩 스크린 표시 (모든 훅 호출 이후에 배치해야 Rules of Hooks 준수)
  if (!trip) {
    return (
      <div className="flex-grow flex items-center justify-center bg-[#F9F8F6] dark:bg-[#111111] h-[80vh] text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
        Loading Journey Details...
      </div>
    );
  }

  // --- 날짜 동적 계산 (안전 장치 추가) ---
  const generatedDates = generateDateList(trip?.date || '');
  const dynamicDates = [
    { id: 'all', date: 'ALL', label: 'Overall' },
    ...generatedDates.map((d, index) => ({
      id: d,
      date: d,
      label: `Day ${index + 1}`
    }))
  ];

  // 타임라인 선택 및 정렬 (안전 참조 처리)
  const currentTimeline = selectedDate === 'ALL' 
    ? Object.entries(timelineData || {}).flatMap(([d, list]) => 
        (list || []).map(item => ({ ...item, originDate: d }))
      ) 
    : ((timelineData || {})[selectedDate] || []).map(item => ({ ...item, originDate: selectedDate }));

  // 위경도 lat, lng 값을 가져올 때 string 또는 number 형식을 number로 안전하게 형변환
  const mapPoints = currentTimeline
    .filter(item => item.lat !== undefined && item.lng !== undefined)
    .map(item => ({
      ...item,
      lat: Number(item.lat),
      lng: Number(item.lng)
    }));



  const handleItemToggle = (id: number) => {
    setExpandedItemId(prevId => prevId === id ? null : id);
    if (expandedItemId !== id && itemRefs.current[id]) {
      setTimeout(() => {
        itemRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  // 장소(place) 텍스트 수정 시 Geocoding 연동
  const handleTimelinePlaceBlur = async (originDate: string, itemId: number, newPlace: string) => {
    if (!newPlace || newPlace.trim() === '') return;
    
    // 장소 텍스트 업데이트
    onUpdateTimelineItem(originDate, itemId, 'place', newPlace);
    
    // Geocoding 조회 후 좌표 업데이트
    const coords = await fetchCoordinates(newPlace);
    if (coords) {
      onUpdateTimelineItem(originDate, itemId, 'lat' as any, String(coords.lat));
      onUpdateTimelineItem(originDate, itemId, 'lng' as any, String(coords.lng));
    }
  };

  // 여행 대표 도시명 수정 시 Geocoding 연동
  const handleTripLocationBlur = async (newLocation: string) => {
    if (!newLocation || newLocation.trim() === '') return;
    onUpdateTrip(trip.id, 'locationStr', newLocation);
    
    const coords = await fetchCoordinates(newLocation);
    if (coords) {
      onUpdateTrip(trip.id, 'lat', coords.lat);
      onUpdateTrip(trip.id, 'lng', coords.lng);
    }
  };

  // --- Deletion prompts with confirmation checks ---
  const confirmDeleteTimeline = (originDate: string, id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("정말 이 타임라인 일정을 삭제하시겠습니까?")) {
      onDeleteTimelineItem(originDate, id);
    }
  };

  const confirmDeleteFlight = (id: number) => {
    if (window.confirm("정말 이 항공편 정보를 삭제하시겠습니까?")) {
      onDeleteFlight(id);
    }
  };

  const confirmDeleteStay = (id: number) => {
    if (window.confirm("정말 이 숙박 정보를 삭제하시겠습니까?")) {
      onDeleteStay(id);
    }
  };

  const confirmDeleteTransit = (id: number) => {
    if (window.confirm("정말 이 교통 편 정보를 삭제하시겠습니까?")) {
      onDeleteTransit(id);
    }
  };

  // 갤러리 이미지 업로드 핸들러
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return alert("로그인 상태에서만 업로드할 수 있습니다.");

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/gallery/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const currentGallery = trip.gallery || [];
      onUpdateTrip(trip.id, 'gallery', [...currentGallery, url]);
    } catch (error) {
      console.error("Gallery image upload failed:", error);
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 갤러리 이미지 삭제
  const handleRemoveGalleryImage = (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("이 이미지를 갤러리에서 삭제하시겠습니까?")) return;

    const currentGallery = trip.gallery || [];
    const updatedGallery = currentGallery.filter(url => url !== imageUrl);
    onUpdateTrip(trip.id, 'gallery', updatedGallery);
  };

  const textEditableClass = isEditMode 
    ? 'outline-dashed outline-1 outline-red-500/40 hover:bg-black/5 dark:hover:bg-white/5 cursor-text transition-all rounded px-1' 
    : '';

  const galleryImages = trip.gallery || [];

  return (
    <main className="animate-in slide-in-from-right-8 duration-500 flex flex-col md:flex-row h-[calc(100vh-73px)] w-full overflow-hidden">
      
      {/* Left: Map & Info Section */}
      <section className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-black/20 dark:border-white/20 relative transition-colors duration-300 h-[55vh] md:h-full shrink-0">
        <div className="p-4 md:p-8 border-b border-black/20 dark:border-white/20 z-10 bg-[#F9F8F6] dark:bg-[#111111] transition-colors shrink-0">
          <div className="flex items-center space-x-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-3 md:mb-4 transition-colors">
            <span 
              contentEditable={isEditMode} 
              suppressContentEditableWarning 
              onBlur={(e) => onUpdateTrip(trip.id, 'date', e.currentTarget.innerText)}
              className={textEditableClass}
            >
              {trip.date}
            </span>
            <span>—</span>
            <span 
              contentEditable={isEditMode}
              suppressContentEditableWarning
              onBlur={(e) => handleTripLocationBlur(e.currentTarget.innerText)}
              className={textEditableClass}
            >
              {trip.locationStr}
            </span>
          </div>
          
          <h1 
            contentEditable={isEditMode} 
            suppressContentEditableWarning 
            onBlur={(e) => onUpdateTrip(trip.id, 'title', e.currentTarget.innerText)}
            className={`text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none break-keep ${textEditableClass}`}
            style={{ wordBreak: 'keep-all' }}
          >
            {trip.title.replace(' (Plan)', '')}
          </h1>
          
          <div className="mt-4 md:mt-6 flex flex-wrap gap-2">
            {trip.tags.slice(0, 2).map(tag => (
               <span key={tag} className="text-[9px] md:text-[10px] font-bold border border-black/20 dark:border-white/20 px-2 py-1 uppercase rounded-full">
                 {tag}
               </span>
            ))}
          </div>
        </div>
        
        {/* Dynamic Map Area */}
        <MapArea 
          trip={trip}
          isEditMode={isEditMode}
          mapPoints={mapPoints}
          expandedItemId={expandedItemId}
          handleItemToggle={handleItemToggle}
          selectedDate={selectedDate}
          isDarkMode={isDarkMode}
        />
      </section>

      {/* Right: Record / Tabs Section */}
      <section className="w-full md:w-1/2 flex flex-col bg-[#F9F8F6] dark:bg-[#111111] transition-colors duration-300 flex-grow overflow-hidden">
        
        {/* Tab Headers */}
        <div className="flex border-b border-black/20 dark:border-white/20 bg-[#F9F8F6] dark:bg-[#111111] sticky top-0 z-30 overflow-x-auto hide-scrollbar transition-colors shrink-0 w-full">
          {[ 
            { id: 'timeline', label: 'Timeline', icon: Clock }, 
            { id: 'flights', label: 'Flights', icon: Plane }, 
            { id: 'stays', label: 'Stays', icon: Bed }, 
            { id: 'transit', label: 'Transit', icon: Train },
            { id: 'gallery', label: 'Gallery', icon: ImageIcon }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => { setActiveTab(tab.id as TabType); setExpandedItemId(null); }} 
              className={`flex-1 min-w-max py-3 px-4 md:py-4 flex items-center justify-center space-x-1.5 md:space-x-2 text-[10px] md:text-xs font-bold uppercase tracking-widest border-r border-black/20 dark:border-white/20 last:border-r-0 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white'}`}
            >
              <tab.icon className="w-3 h-3 md:w-4 md:h-4" /> <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-grow flex flex-col relative overflow-y-auto overflow-x-hidden w-full">
          
          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="animate-in fade-in duration-300 h-full flex flex-col w-full">
              {/* Day filter selector bar (Dynamic layout with fade overlays) */}
              <div className="relative border-b border-black/20 dark:border-white/20 bg-[#F9F8F6] dark:bg-[#111111] transition-colors shrink-0 w-full flex">
                <div 
                  ref={dateBarRef}
                  className="flex overflow-x-auto hide-scrollbar w-full scroll-smooth"
                >
                  {dynamicDates.map((d) => (
                    <button 
                      key={d.id} 
                      data-active={selectedDate === d.date}
                      onClick={() => { setSelectedDate(d.date); setExpandedItemId(null); }} 
                      className={`flex-1 min-w-[90px] md:min-w-[110px] py-2.5 md:py-3.5 px-3 md:px-4 flex flex-col items-center justify-center border-r border-black/20 dark:border-white/20 last:border-r-0 transition-all whitespace-nowrap ${selectedDate === d.date ? 'bg-black text-[#F9F8F6] dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white'}`}
                    >
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
                        {d.label}
                      </span>
                      <span className="text-[11px] md:text-xs font-black tracking-tighter">{d.date === 'ALL' ? 'VIEW ALL' : d.date.slice(5).replace('.', '/')}</span>
                    </button>
                  ))}
                </div>
                {/* Horizontal scroll indicators */}
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#F9F8F6] dark:from-[#111111] to-transparent pointer-events-none opacity-80" />
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#F9F8F6] dark:from-[#111111] to-transparent pointer-events-none opacity-80" />
              </div>

              {!isLoggedIn && (
                <div className="bg-black/5 dark:bg-white/10 px-4 py-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-center flex items-center justify-center gap-2 shrink-0 w-full">
                  <User className="w-3 h-3 shrink-0" /> <span className="truncate">로그인 후 기록을 수정하거나 새 일정을 추가할 수 있습니다.</span>
                </div>
              )}

              {/* Timeline Items List */}
              <div className="flex flex-col pb-20 w-full">
                {currentTimeline.length === 0 ? (
                  <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                    해당 날짜에 등록된 일정이 없습니다.
                  </div>
                ) : (
                  currentTimeline.map((item) => {
                    const isActive = expandedItemId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        ref={el => { itemRefs.current[item.id] = el; }} 
                        className={`flex flex-col border-b border-black/10 dark:border-white/10 transition-colors w-full ${isActive ? 'bg-black/5 dark:bg-white/5' : ''}`}
                      >
                        <div 
                          className="group flex flex-row items-start py-4 px-4 md:py-5 md:px-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer relative w-full" 
                          onClick={() => handleItemToggle(item.id)}
                        >
                          {/* Time */}
                          <div className={`w-16 md:w-24 shrink-0 text-[10px] md:text-xs font-bold tracking-widest mt-1 transition-colors ${isActive ? 'text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60'}`}>
                            <span 
                              contentEditable={isEditMode} 
                              suppressContentEditableWarning 
                              onBlur={(e) => onUpdateTimelineItem(item.originDate, item.id, 'time', e.currentTarget.innerText)}
                              onClick={(e) => isEditMode && e.stopPropagation()}
                              className={textEditableClass}
                            >
                              {item.time}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex-grow pr-2 md:pr-4 min-w-0">
                            <div className={`font-bold tracking-tight text-sm md:text-base flex items-center gap-2 flex-wrap ${isActive ? 'text-red-600 dark:text-red-400' : ''}`}>
                              <span 
                                contentEditable={isEditMode} 
                                suppressContentEditableWarning 
                                onBlur={(e) => handleTimelinePlaceBlur(item.originDate, item.id, e.currentTarget.innerText)}
                                onClick={(e) => isEditMode && e.stopPropagation()}
                                className={`break-words ${textEditableClass}`}
                              >
                                {item.place}
                              </span>
                              {isActive ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4 text-current shrink-0" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-black/40 dark:text-white/40 shrink-0" />}
                            </div>
                            
                            <div 
                              contentEditable={isEditMode} 
                              suppressContentEditableWarning 
                              onBlur={(e) => onUpdateTimelineItem(item.originDate, item.id, 'memo', e.currentTarget.innerText)}
                              onClick={(e) => isEditMode && e.stopPropagation()}
                              className={`text-xs md:text-sm text-black/60 dark:text-white/60 mt-1 transition-colors break-words w-full ${textEditableClass}`}
                            >
                              {item.memo}
                            </div>

                            {/* Delete Item Actions (Visible in Edit Mode / Logged In) */}
                            {isLoggedIn && isActive && (
                              <div className="flex gap-4 mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                                 <button 
                                   className="flex items-center gap-1 text-red-600 hover:text-red-400 transition-colors" 
                                   onClick={(e) => confirmDeleteTimeline(item.originDate, item.id, e)}
                                 >
                                   <Trash2 className="w-3 h-3"/> Delete
                                 </button>
                              </div>
                            )}
                          </div>

                          {/* Cost & Image */}
                          <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] opacity-40 uppercase font-bold tracking-widest">Cost</span>
                              <span 
                                contentEditable={isEditMode} 
                                suppressContentEditableWarning 
                                onBlur={(e) => onUpdateTimelineItem(item.originDate, item.id, 'cost', e.currentTarget.innerText)}
                                onClick={(e) => isEditMode && e.stopPropagation()}
                                className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest bg-black/10 dark:bg-white/10 px-2 py-0.5 md:py-1 rounded-sm whitespace-nowrap block ${textEditableClass}`}
                              >
                                {item.cost}
                              </span>
                            </div>
                            {item.img ? (
                              <div className={`w-10 h-10 md:w-12 md:h-12 overflow-hidden border transition-all relative ${isActive ? 'border-red-600 dark:border-red-400 scale-110 origin-right' : 'border-black/20 dark:border-white/20'}`}>
                                <img src={item.img} alt={item.place} className={`w-full h-full object-cover transition-all ${isActive ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} />
                                <ImageEditOverlay 
                                  isEditMode={isEditMode} 
                                  onImageUploaded={(url) => onUpdateTimelineItem(item.originDate, item.id, 'img', url)} 
                                />
                              </div>
                            ) : (
                              <div className={`w-10 h-10 md:w-12 md:h-12 border bg-black/5 dark:bg-white/5 flex items-center justify-center transition-colors relative ${isActive ? 'border-red-600 dark:border-red-400 text-red-600 scale-110 origin-right' : 'border-black/10 dark:border-white/10 text-black/30 dark:text-white/30'}`}>
                                <ImageIcon className="w-3 h-3 md:w-4 md:h-4" />
                                <ImageEditOverlay 
                                  isEditMode={isEditMode} 
                                  onImageUploaded={(url) => onUpdateTimelineItem(item.originDate, item.id, 'img', url)} 
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded Section Details */}
                        {isActive && (
                          <div className="px-4 md:px-6 pb-4 md:pb-6 pt-1 md:pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="bg-white/80 dark:bg-black/40 border border-black/10 dark:border-white/10 p-3 md:p-4 flex flex-col gap-3 text-xs md:text-sm transition-colors shadow-inner">
                              <div className="flex items-start gap-3 group/copy">
                                <Map className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 text-black/60 dark:text-white/60 shrink-0" />
                                <span 
                                  contentEditable={isEditMode} 
                                  suppressContentEditableWarning 
                                  onBlur={(e) => onUpdateTimelineItem(item.originDate, item.id, 'location', e.currentTarget.innerText)}
                                  className={`flex-grow text-black/80 dark:text-white/80 font-medium break-words ${textEditableClass}`}
                                >
                                  {item.location || '위치 정보 없음'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-black/80 dark:text-white/80">
                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-black/60 dark:text-white/60 shrink-0" />
                                <span 
                                  contentEditable={isEditMode} 
                                  suppressContentEditableWarning 
                                  onBlur={(e) => onUpdateTimelineItem(item.originDate, item.id, 'hours', e.currentTarget.innerText)}
                                  className={`font-medium ${textEditableClass}`}
                                >
                                  {item.hours || '영업시간 정보 없음'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Add Timeline item button */}
                {isEditMode && (
                  <div className="p-6 flex justify-center w-full">
                    <button 
                      onClick={() => onAddTimelineItem(selectedDate === 'ALL' ? generatedDates[0] || '2025.04.12' : selectedDate)}
                      className="text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Timeline Event
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FLIGHTS TAB */}
          {activeTab === 'flights' && (
            <div className="p-4 md:p-6 animate-in fade-in duration-300">
              {flights.length === 0 ? (
                <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 항공편이 없습니다.
                </div>
              ) : (
                flights.map(flight => (
                  <FlightCard 
                    key={flight.id} 
                    flight={flight} 
                    isEditMode={isEditMode} 
                    onUpdate={onUpdateFlight} 
                    onDelete={confirmDeleteFlight} 
                  />
                ))
              )}
              
              {/* Add Flight controls */}
              {isEditMode && (
                <div className="flex gap-4 justify-center mt-6">
                  <button 
                    onClick={() => onAddFlight('OUTBOUND FLIGHT')} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Outbound Flight
                  </button>
                  <button 
                    onClick={() => onAddFlight('INBOUND FLIGHT')} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Inbound Flight
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STAYS TAB */}
          {activeTab === 'stays' && (
            <div className="p-4 md:p-6 animate-in fade-in duration-300">
              {stays.length === 0 ? (
                <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 숙소 정보가 없습니다.
                </div>
              ) : (
                stays.map(stay => (
                  <StayCard 
                    key={stay.id} 
                    stay={stay} 
                    isEditMode={isEditMode} 
                    onUpdate={onUpdateStay} 
                    onDelete={confirmDeleteStay} 
                  />
                ))
              )}

              {/* Add Stay control */}
              {isEditMode && (
                <div className="flex justify-center mt-6">
                  <button 
                    onClick={onAddStay} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-6 py-2.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Accommodation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TRANSIT TAB */}
          {activeTab === 'transit' && (
            <div className="p-4 md:p-6 animate-in fade-in duration-300">
              {transits.length === 0 ? (
                <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 교통편이 없습니다.
                </div>
              ) : (
                transits.map(transit => (
                  <TransitCard 
                    key={transit.id} 
                    transit={transit} 
                    isEditMode={isEditMode} 
                    onUpdate={onUpdateTransit} 
                    onDelete={confirmDeleteTransit} 
                  />
                ))
              )}

              {/* Add Transit control */}
              {isEditMode && (
                <div className="flex justify-center mt-6">
                  <button 
                    onClick={onAddTransit} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-6 py-2.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Transit Ticket
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GALLERY TAB */}
          {activeTab === 'gallery' && (
            <div className="p-4 md:p-6 animate-in fade-in duration-300 flex flex-col h-full">
              
              {/* Add Gallery Image Area (Edit Mode) */}
              {isEditMode && (
                <div className="mb-6 flex justify-center">
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-6 py-2.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading Image...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Gallery Image
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Gallery Grid */}
              {galleryImages.length === 0 ? (
                <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 갤러리 사진이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 pb-12">
                  {galleryImages.map((imgUrl, idx) => (
                    <div 
                      key={`${imgUrl}-${idx}`}
                      className="group/gallery relative aspect-[4/3] overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 cursor-pointer shadow-sm"
                      onClick={() => {
                        setLightboxIndex(idx);
                        setIsLightboxOpen(true);
                      }}
                    >
                      <img 
                        src={imgUrl} 
                        alt={`Gallery ${idx + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/gallery:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/gallery:bg-black/10 transition-colors pointer-events-none" />
                      
                      {/* Delete image button (Edit Mode) */}
                      {isEditMode && (
                        <button
                          onClick={(e) => handleRemoveGalleryImage(imgUrl, e)}
                          className="absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-red-600 text-white transition-colors opacity-0 group-hover/gallery:opacity-100 z-10 rounded-sm"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* Fullscreen Lightbox component */}
      <Lightbox 
        isOpen={isLightboxOpen}
        images={galleryImages}
        currentIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </main>
  );
};
