import React, { useRef, useState, useEffect } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { Trip, TimelineItem } from '../types';
import { 
  latLngToPoint, 
  calculateMapBounds, 
  getStaticMapUrl, 
  Coordinates 
} from '../utils/googleMapsHelper';

interface MapAreaProps {
  trip: Trip;
  isEditMode: boolean;
  mapPoints: TimelineItem[];
  expandedItemId: number | null;
  handleItemToggle: (id: number) => void;
  selectedDate: string;
  isDarkMode: boolean;
}

export const MapArea: React.FC<MapAreaProps> = ({
  trip,
  isEditMode,
  mapPoints,
  expandedItemId,
  handleItemToggle,
  selectedDate,
  isDarkMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 1. 컴포넌트 마운트 및 리사이즈 시 지도 컨테이너 픽셀 크기 측정
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 600
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 2. 위/경도 좌표가 있는 마커 추출
  const validCoords: (Coordinates & { id: number; place: string })[] = mapPoints
    .filter(p => p.lat !== undefined && p.lng !== undefined)
    .map(p => ({
      lat: p.lat!,
      lng: p.lng!,
      id: p.id,
      place: p.place
    }));

  // 만약 개별 핀들의 위경도가 없다면 여행 중심(trip.lat, trip.lng)을 사용하거나 폴백 좌표 사용
  const baseCenter: Coordinates = trip.lat !== undefined && trip.lng !== undefined
    ? { lat: trip.lat, lng: trip.lng }
    : { lat: 35.0116, lng: 135.7681 }; // 기본 폴백: 교토

  // 3. 최적의 지도 중심 및 줌 레벨 계산
  let center: Coordinates = baseCenter;
  let zoom = 13;

  if (validCoords.length > 0) {
    const bounds = calculateMapBounds(validCoords, dimensions.width, dimensions.height);
    center = bounds.center;
    zoom = bounds.zoom;
  }

  // 4. 구글 정적 지도 이미지 URL 획득
  const staticMapUrl = getStaticMapUrl(
    center.lat,
    center.lng,
    zoom,
    dimensions.width,
    dimensions.height,
    isDarkMode,
    validCoords
  );

  // 5. 각 위경도를 정적 지도 크기 대비 화면상의 % (x, y) 좌표로 매핑
  const pinsWithXY = validCoords.map(c => {
    const point = latLngToPoint(
      c.lat,
      c.lng,
      center.lat,
      center.lng,
      zoom,
      dimensions.width,
      dimensions.height
    );
    return {
      ...c,
      x: point.x,
      y: point.y
    };
  });

  // 지도 클릭 시 외부 구글 맵으로 연결
  const handleMapClick = () => {
    if (isEditMode) return;
    const q = validCoords.length > 0 
      ? validCoords.map(c => c.place).join(' to ')
      : trip.locationStr;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
  };

  return (
    <div 
      ref={containerRef}
      className="flex-grow relative bg-[#EAE8E3] dark:bg-[#1A1A1A] overflow-hidden transition-colors duration-300 cursor-pointer group/map"
      onClick={handleMapClick}
    >
      {/* Dynamic Google Static Map Image */}
      <img 
        src={staticMapUrl} 
        alt="Dynamic Google Map" 
        className="absolute inset-0 w-full h-full object-cover opacity-90 dark:opacity-40 grayscale contrast-105 pointer-events-none transition-all duration-700 group-hover/map:scale-[1.02] group-hover/map:opacity-100 dark:group-hover/map:opacity-60"
      />
      <div className="absolute inset-0 opacity-10 dark:opacity-5 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] pointer-events-none"></div>

      {!isEditMode && (
        <div className="absolute inset-0 bg-black/0 group-hover/map:bg-black/5 dark:group-hover/map:bg-white/5 transition-colors z-0 flex items-center justify-center pointer-events-none">
          <div className="opacity-0 group-hover/map:opacity-100 bg-black text-white dark:bg-white dark:text-black px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all transform translate-y-4 group-hover/map:translate-y-0 duration-300 shadow-xl">
             <ExternalLink className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Open in</span> Google Maps
          </div>
        </div>
      )}
      
      {/* SVG Path Route Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none">
        {pinsWithXY.map((p, index) => {
          if (index === 0) return null;
          const prevPoint = pinsWithXY[index - 1];
          // 화면 영역 밖에 너무 나가는 선은 제외
          if (
            prevPoint.x < -10 || prevPoint.x > 110 || 
            prevPoint.y < -10 || prevPoint.y > 110 ||
            p.x < -10 || p.x > 110 || 
            p.y < -10 || p.y > 110
          ) return null;
          
          return (
            <line 
              key={`line-${p.id}`} 
              x1={`${prevPoint.x}%`} 
              y1={`${prevPoint.y}%`} 
              x2={`${p.x}%`} 
              y2={`${p.y}%`} 
              className="stroke-red-600/50 dark:stroke-red-400/50 stroke-[2px]" 
              strokeDasharray="4 4" 
            />
          );
        })}
      </svg>

      {/* Render map pins */}
      {pinsWithXY.map((pin) => {
        const isActive = expandedItemId === pin.id;
        // 화면 밖으로 크게 벗어난 핀은 그리지 않음
        if (pin.x < -5 || pin.x > 105 || pin.y < -5 || pin.y > 105) return null;

        return (
          <div 
            key={`pin-${pin.id}`} 
            className={`absolute z-20 flex flex-col items-center group cursor-pointer transition-all duration-300 ${isActive ? 'z-30' : ''}`} 
            style={{ top: `${pin.y}%`, left: `${pin.x}%`, transform: 'translate(-50%, -50%)' }}
            onClick={(e) => { e.stopPropagation(); handleItemToggle(pin.id); }}
          >
            <div className={`rounded-full border-2 border-[#F9F8F6] dark:border-[#111111] shadow-md transition-all duration-300 flex items-center justify-center
              ${isActive ? 'w-4 h-4 md:w-5 md:h-5 bg-red-600 border-white ring-4 ring-red-500/30' : 'w-3 h-3 md:w-3.5 md:h-3.5 bg-black dark:bg-white'}
            `}>
              {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
            </div>
            <div className={`mt-1 text-[9px] md:text-[10px] uppercase font-bold bg-[#F9F8F6] dark:bg-[#111111] text-black dark:text-white border border-black/10 dark:border-white/10 px-1.5 py-0.5 rounded shadow-sm transition-opacity pointer-events-none whitespace-nowrap
              ${isActive ? 'opacity-100 !text-red-600 dark:!text-red-400 !border-red-500/30' : 'opacity-0 group-hover:opacity-100'}
            `}>{pin.place}</div>
          </div>
        );
      })}
      
      {/* Overlay Status Bar */}
      <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 flex justify-between z-20 pointer-events-none">
        <div className="bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur border border-black/20 dark:border-white/20 px-2 py-1.5 md:px-3 md:py-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors pointer-events-auto">
          <MapPin className="w-3 h-3 md:w-4 md:h-4 text-red-600 dark:text-red-400" /> 
          <span className="hidden sm:inline">{trip.locationStr} : </span> 
          {selectedDate === 'ALL' ? 'Overall Routes' : 'Daily Route'}
        </div>
      </div>
    </div>
  );
};
