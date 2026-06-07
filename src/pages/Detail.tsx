import React, { useState, useRef, useEffect } from 'react';
import { 
  Clock, Plane, Bed, Train, Bus, User, Edit2, Trash2, 
  Image as ImageIcon, ChevronUp, ChevronDown, MapPin, Map, Plus, Loader2, Search, ArrowLeft,
  ExternalLink, MapPinOff
} from 'lucide-react';
import { MapArea } from '../components/MapArea';
import { ImageEditOverlay } from '../components/ImageEditOverlay';
import { FlightCard } from '../components/FlightCard';
import { StayCard } from '../components/StayCard';
import { TransitCard } from '../components/TransitCard';
import { Lightbox, LightboxImageMeta } from '../components/Lightbox';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Footer } from '../components/Footer';
import { 
  Trip, 
  TimelineItem, 
  TimelineData, 
  FlightItem, 
  StayItem, 
  TransitItem 
} from '../types';
import { fetchCoordinates, fetchPlacePredictions, fetchCoordinatesByPlaceId } from '../utils/googleMapsHelper';
import { fetchAddressFromCoords } from '../utils/googleMapsHelper';
import { readExif } from '../utils/exifHelper';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage, db } from '../firebase';
import { compressImage } from '../utils/imageHelper';
import { doc, setDoc } from 'firebase/firestore';

interface JourneyDetailPageProps {
  isLoggedIn: boolean;
  trip: Trip | undefined;
  timelineData: TimelineData;
  flights: FlightItem[];
  stays: StayItem[];
  transits: TransitItem[];
  onSave: (
    tripId: number,
    updatedTrip: Trip,
    updatedTimeline: TimelineItem[],
    updatedFlights: FlightItem[],
    updatedStays: StayItem[],
    updatedTransits: TransitItem[]
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isDarkMode: boolean;
  onNavigate: (view: string, tripId?: number | null) => void;
  searchFocusItemId?: number | null;
  searchFocusTab?: string | null;
  onClearSearchFocus?: () => void;
  onEditModeChange?: (editing: boolean) => void;
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

type TabType = 'timeline' | 'flights' | 'stays' | 'transit' | 'gallery';

const airportCoords: { [code: string]: { lat: number; lng: number } } = {
  ICN: { lat: 37.4602, lng: 126.4407 },
  GMP: { lat: 37.5583, lng: 126.7906 },
  NRT: { lat: 35.7720, lng: 140.3929 },
  HND: { lat: 35.5494, lng: 139.7798 },
  KIX: { lat: 34.4320, lng: 135.2304 },
  ITM: { lat: 34.7895, lng: 135.4382 },
  CTS: { lat: 42.7752, lng: 141.6923 },
  FUK: { lat: 33.5860, lng: 130.4507 },
  LAX: { lat: 33.9416, lng: -118.4085 },
  JFK: { lat: 40.6413, lng: -73.7781 },
  CDG: { lat: 49.0097, lng: 2.5479 },
  TPE: { lat: 25.0797, lng: 121.2342 },
  OKA: { lat: 26.1958, lng: 127.6458 },
  BKK: { lat: 13.6900, lng: 100.7501 },
  CXR: { lat: 11.9981, lng: 109.2194 },
  DAD: { lat: 16.0439, lng: 108.1994 },
  SGN: { lat: 10.8188, lng: 106.6519 },
  HAN: { lat: 21.2212, lng: 105.8072 },
  SIN: { lat: 1.3644, lng: 103.9915 },
  HKG: { lat: 22.3080, lng: 113.9185 },
  CEB: { lat: 10.3075, lng: 123.9794 },
  DPS: { lat: -8.7481, lng: 115.1672 },
  NGO: { lat: 34.8584, lng: 136.8054 },
  KOJ: { lat: 31.8007, lng: 130.7196 },
  OKJ: { lat: 34.7567, lng: 133.8549 },
  MYJ: { lat: 33.8272, lng: 132.6997 },
  TAK: { lat: 34.2141, lng: 134.0156 },
  OIT: { lat: 33.4794, lng: 131.7375 },
  KMJ: { lat: 32.8372, lng: 130.8550 },
  KUV: { lat: 35.9264, lng: 126.6153 },
  CJU: { lat: 33.5113, lng: 126.4930 },
  PUS: { lat: 35.1796, lng: 128.9382 },
  TAE: { lat: 35.8939, lng: 128.6589 },
  USN: { lat: 35.5936, lng: 129.3517 },
  YNY: { lat: 38.0611, lng: 128.6692 },
  MWX: { lat: 34.9814, lng: 126.3833 },
  LHR: { lat: 51.4700, lng: -0.4543 },
  FCO: { lat: 41.8003, lng: 12.2389 },
  MXP: { lat: 45.6301, lng: 8.7259 },
  MAD: { lat: 40.4839, lng: -3.5680 },
  BCN: { lat: 41.2974, lng: 2.0833 },
  MUC: { lat: 48.3537, lng: 11.7860 },
  FRA: { lat: 50.0379, lng: 8.5622 },
  AMS: { lat: 52.3105, lng: 4.7683 },
  ZRH: { lat: 47.4582, lng: 8.5555 },
  VIE: { lat: 48.1103, lng: 16.5697 },
  SYD: { lat: -33.9461, lng: 151.1772 },
  MEL: { lat: -37.6690, lng: 144.8410 },
  BNE: { lat: -27.3842, lng: 153.1175 },
  YVR: { lat: 49.1967, lng: -123.1815 },
  YYZ: { lat: 43.6777, lng: -79.6248 },
  SFO: { lat: 37.6213, lng: -122.3790 },
  SEA: { lat: 47.4502, lng: -122.3088 },
  ORD: { lat: 41.9742, lng: -87.9073 },
  DFW: { lat: 32.8998, lng: -97.0403 },
  ATL: { lat: 33.6407, lng: -84.4277 },
  HNL: { lat: 21.3245, lng: -157.9251 },
  GUM: { lat: 13.4839, lng: 144.7961 },
  SPN: { lat: 15.1190, lng: 145.7290 },
};

function calculateLayoverTime(arrDate: string, arrTime: string, depDate: string, depTime: string): string {
  try {
    const parseDate = (dStr: string) => dStr.replace(/\./g, '-');
    
    const parseTimeTo24 = (tStr: string) => {
      let [time, modifier] = tStr.split(' ');
      if (!modifier) {
        const match = tStr.match(/([0-9:]+)\s*(AM|PM)/i);
        if (match) {
          time = match[1];
          modifier = match[2];
        }
      }
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
      }
      if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      return { hours, minutes };
    };

    const arr = parseTimeTo24(arrTime);
    const dep = parseTimeTo24(depTime);

    const arrD = new Date(parseDate(arrDate));
    arrD.setHours(arr.hours, arr.minutes, 0, 0);

    const depD = new Date(parseDate(depDate));
    depD.setHours(dep.hours, dep.minutes, 0, 0);

    const diffMs = depD.getTime() - arrD.getTime();
    if (diffMs <= 0) return '';

    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m layover`;
    }
    return `${mins}m layover`;
  } catch (e) {
    return '';
  }
}

// Parse dateRange: 'YYYY.MM.DD - YYYY.MM.DD'
function generateDateList(dateRangeStr: string): string[] {
  if (!dateRangeStr) return [];
  const parts = dateRangeStr.split(' - ');
  if (parts.length < 2) return [];
  
  const startStr = parts[0].trim().replace(/\./g, '-');
  const rawEndStr = parts[1].trim().replace(/\./g, '-');
  const startYear = startStr.split('-')[0];
  const endStr = rawEndStr.split('-').length < 3 ? `${startYear}-${rawEndStr}` : rawEndStr;
  
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return [];
  }
  
  if (endDate < startDate) {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const list: string[] = [];
  const cursor = new Date(startDate);
  
  for (let i = 0; i < 100 && cursor <= endDate; i++) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    list.push(`${yyyy}.${mm}.${dd}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  
  return list;
}

// Convert total minutes from midnight to "HH:MM AM/PM" format
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

// Convert "10:30 AM" or "15:30" into total minutes from midnight for sorting
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

// Autocomplete Input component using google.maps.places.Autocomplete widget
interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectPlace: (placeName: string, coords: { lat: number; lng: number } | null, address: string) => void;
  className?: string;
  placeholder?: string;
  onBlur?: () => void;
}

function PlaceAutocompleteInput({
  value,
  onChange,
  onSelectPlace,
  className,
  placeholder,
  onBlur
}: PlaceAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    const google = (window as any).google;
    if (!google || !google.maps || !google.maps.places || !inputRef.current) {
      return;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address']
    });
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const name = place.name || place.formatted_address || '';
        const address = place.formatted_address || name;
        onSelectPlace(name, { lat, lng }, address);
      }
    });

    return () => {
      if (google && google.maps && google.maps.event && listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [onSelectPlace]);

  useEffect(() => {
    if (inputRef.current && value !== undefined && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={className}
          placeholder={placeholder}
        />
        <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-35" />
      </div>
    </div>
  );
}

export function JourneyDetailPage({
  isLoggedIn,
  trip,
  timelineData,
  flights,
  stays,
  transits,
  onSave,
  onDelete,
  isDarkMode,
  onNavigate,
  searchFocusItemId,
  searchFocusTab,
  onClearSearchFocus,
  onEditModeChange,
  saveRef,
}: JourneyDetailPageProps) {
  // All hooks must be called before conditional return
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Edit / Draft state
  const [isEditing, setIsEditing] = useState(false);
  const [draftTrip, setDraftTrip] = useState<Trip | null>(null);
  const [draftTimeline, setDraftTimeline] = useState<TimelineItem[]>([]);
  const [draftFlights, setDraftFlights] = useState<FlightItem[]>([]);
  const [draftStays, setDraftStays] = useState<StayItem[]>([]);
  const [draftTransits, setDraftTransits] = useState<TransitItem[]>([]);

  // Lightbox & Gallery state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);

  // Multi-select & map visibilities state
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [hiddenMapItemIds, setHiddenMapItemIds] = useState<number[]>([]);
  const [stayCoords, setStayCoords] = useState<{ [stayId: number]: { lat: number; lng: number } }>({});
  const [transitFocusType, setTransitFocusType] = useState<'depart' | 'arrive' | 'boarding' | null>(null);

  const tripToUse = isEditing ? draftTrip : trip;
  const generatedDates = generateDateList(tripToUse?.date || '');
  const [airportGeocodedCoords, setAirportGeocodedCoords] = useState<{ [code: string]: { lat: number; lng: number } }>({});

  useEffect(() => {
    if (!isEditing) {
      setSelectedItemIds([]);
    }
  }, [isEditing]);

  // Geocode stay addresses
  useEffect(() => {
    if (activeTab === 'stays') {
      const staysToUse = isEditing ? draftStays : stays;
      staysToUse.forEach(async (stay) => {
        if (stay.address && !stayCoords[stay.id]) {
          try {
            const coords = await fetchCoordinates(stay.address);
            if (coords) {
              setStayCoords(prev => ({
                ...prev,
                [stay.id]: coords
              }));
            }
          } catch (e) {
            console.error("Geocoding stay failed:", e);
          }
        }
      });
    }
  }, [activeTab, draftStays, stays, isEditing]);

  // Geocode airports
  useEffect(() => {
    if (activeTab === 'flights') {
      const flightsToUse = isEditing ? draftFlights : flights;
      flightsToUse.forEach((f) => {
        ['fromCode', 'toCode'].forEach(async (key) => {
          const code = (f as any)[key];
          if (code && !airportCoords[code] && !airportGeocodedCoords[code]) {
            try {
              const coords = await fetchCoordinates(`${code} Airport`);
              if (coords) {
                setAirportGeocodedCoords(prev => ({
                  ...prev,
                  [code]: coords
                }));
              }
            } catch (e) {
              console.error(`Geocoding airport ${code} failed:`, e);
            }
          }
        });
      });
    }
  }, [activeTab, draftFlights, flights, isEditing]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const dateBarRef = useRef<HTMLDivElement>(null);

  // Deep-linking search focus effect
  useEffect(() => {
    if (searchFocusTab) {
      setActiveTab(searchFocusTab as TabType);
      
      if (searchFocusTab === 'timeline' && searchFocusItemId) {
        const rawTimeline = Object.entries(timelineData || {}).flatMap(([d, list]) => 
          (list || []).map(item => ({ ...item, date: item.date || d }))
        );
        const item = rawTimeline.find(x => x.id === searchFocusItemId);
        if (item && item.date) {
          setSelectedDate(item.date);
        } else {
          setSelectedDate('ALL');
        }
      } else {
        setSelectedDate('ALL');
      }

      if (searchFocusItemId) {
        setExpandedItemId(searchFocusItemId);
        setTimeout(() => {
          if (itemRefs.current[searchFocusItemId]) {
            itemRefs.current[searchFocusItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
      
      if (onClearSearchFocus) {
        onClearSearchFocus();
      }
    }
  }, [searchFocusTab, searchFocusItemId, timelineData, onClearSearchFocus]);

  // Auto-healing date mismatch in Firestore on page load
  useEffect(() => {
    if (!isLoggedIn || !trip || !timelineData || generatedDates.length === 0) return;
    const rawTimeline = Object.entries(timelineData).flatMap(([d, list]) => 
      (list || []).map(item => ({ ...item, date: item.date || d }))
    );
    const hasMismatch = rawTimeline.some(item => !generatedDates.includes(item.date || ''));
    if (hasMismatch) {
      console.log("Auto-healing timeline date mismatches in Firestore...");
      const healedTimeline = rawTimeline.map(item => {
        const itemDate = item.date || '';
        if (!generatedDates.includes(itemDate)) {
          return { ...item, date: generatedDates[0] };
        }
        return item;
      });
      onSave(trip.id, trip, healedTimeline, flights, stays, transits)
        .then(() => console.log("Auto-healed timeline dates saved to Firestore."))
        .catch(err => console.error("Failed to auto-heal timeline dates in Firestore:", err));
    }
  }, [trip, timelineData, generatedDates, isLoggedIn]);

  // Date range picker parsing and formatting helpers
  const parseDateRange = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return { start: '', end: '' };
    const parts = dateStr.split('-').map(p => p.trim());
    if (parts.length < 2) return { start: '', end: '' };
    
    const formatToInputDate = (d: string, yearFallback?: string) => {
      let normalized = d.replace(/\./g, '-');
      if (normalized.length === 5 && yearFallback) {
        normalized = `${yearFallback}-${normalized}`;
      }
      return normalized;
    };

    const startRaw = parts[0];
    const startYear = startRaw.slice(0, 4);
    const start = formatToInputDate(startRaw);
    const end = formatToInputDate(parts[1], startYear);
    return { start, end };
  };

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    if (!draftTrip) return;
    const { start, end } = parseDateRange(draftTrip.date);
    
    const newStart = type === 'start' ? val : start;
    const newEnd = type === 'end' ? val : end;
    
    const formatFromInputDate = (d: string) => d.replace(/-/g, '.');
    
    if (newStart && newEnd) {
      const formattedStart = formatFromInputDate(newStart);
      let formattedEnd = formatFromInputDate(newEnd);
      
      const startYear = newStart.slice(0, 4);
      const endYear = newEnd.slice(0, 4);
      if (startYear === endYear && formattedEnd.startsWith(startYear + '.')) {
        formattedEnd = formattedEnd.slice(5); // removes "YYYY."
      }
      
      const oldDates = generateDateList(draftTrip.date);
      const newDateStr = `${formattedStart} - ${formattedEnd}`;

      setDraftTrip({
        ...draftTrip,
        date: newDateStr
      });

      const newDates = generateDateList(newDateStr);

      if (oldDates.length > 0 && newDates.length > 0) {
        setDraftTimeline(prev => 
          prev.map(item => {
            if (!item.date) return item;
            const idx = oldDates.indexOf(item.date);
            if (idx !== -1) {
              const newDateVal = newDates[Math.min(idx, newDates.length - 1)];
              return { ...item, date: newDateVal };
            }
            return item;
          })
        );
      }
    }
  };

  // Drag and Drop reorder helper
  const handleDropTimelineItem = (targetId: number) => {
    if (draggedItemId === null || draggedItemId === targetId) return;

    const flatTimeline = [...draftTimeline];
    const draggedIndex = flatTimeline.findIndex(item => item.id === draggedItemId);
    const targetIndex = flatTimeline.findIndex(item => item.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove item and insert at target
    const [draggedItem] = flatTimeline.splice(draggedIndex, 1);
    flatTimeline.splice(targetIndex, 0, draggedItem);

    // Recompute time for dragged item based on its new neighbors
    const prevItem = targetIndex > 0 ? flatTimeline[targetIndex - 1] : null;
    const nextItem = targetIndex < flatTimeline.length - 1 ? flatTimeline[targetIndex + 1] : null;

    let newTime = draggedItem.time;

    if (prevItem && nextItem) {
      const prevMin = parseTimeToMinutes(prevItem.time);
      const nextMin = parseTimeToMinutes(nextItem.time);
      let midMin = Math.round((prevMin + nextMin) / 2);
      if (Math.abs(prevMin - nextMin) <= 1) {
        midMin = prevMin + 5;
      }
      newTime = minutesToTimeStr(midMin);
    } else if (prevItem) {
      const prevMin = parseTimeToMinutes(prevItem.time);
      newTime = minutesToTimeStr(prevMin + 60);
    } else if (nextItem) {
      const nextMin = parseTimeToMinutes(nextItem.time);
      newTime = minutesToTimeStr(Math.max(0, nextMin - 60));
    }

    draggedItem.time = newTime;
    
    // Ensure it belongs to the target item's date context
    const targetItem = flatTimeline.find(item => item.id === targetId);
    if (targetItem) {
      draggedItem.date = targetItem.date;
    }

    setDraftTimeline(flatTimeline);
    setDraggedItemId(null);
  };

  // Generate default timeline template for the entire journey duration
  const handleGenerateDefaultTemplate = () => {
    if (!draftTrip) return;
    if (draftTimeline.length > 0) {
      if (!window.confirm("기존의 모든 타임라인 일정이 초기화되고 기본 템플릿으로 대체됩니다. 진행하시겠습니까?")) {
        return;
      }
    }

    const dates = generatedDates;
    const totalDays = dates.length;
    const cityDisplay = (draftTrip.locationStr || '').split(',')[0].trim().toUpperCase() || 'CITY';

    const items: TimelineItem[] = [];
    dates.forEach((date, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === totalDays - 1;
      const baseId = Date.now() + idx * 100 + 1;

      let dayItems: any[] = [];
      if (isFirst && totalDays === 1) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
          { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
          { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착`,     cost: '-',   memo: '입국 심사 및 현지 이동', date },
          { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 관람`,     cost: '-',   memo: '현지 관광 일정', date },
          { id: baseId + 4, time: '07:00 PM', type: 'transit',  place: '귀국 공항 이동',           cost: '-',   memo: '공항 이동 및 탑승수속', date },
          { id: baseId + 5, time: '09:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
        ];
      } else if (isFirst) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
          { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
          { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착·입국`, cost: '-',   memo: '입국 심사 후 시내 이동', date },
          { id: baseId + 3, time: '02:00 PM', type: 'transit',  place: '시내 교통 이동',           cost: '-',   memo: '숙소까지 이동', date },
          { id: baseId + 4, time: '04:00 PM', type: 'stay',     place: '숙소 체크인',             cost: '-',   memo: '짐 풀고 휴식', date },
          { id: baseId + 5, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 식당 탐방', date },
        ];
      } else if (isLast) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 근처 카페', date },
          { id: baseId + 1, time: '10:00 AM', type: 'stay',     place: '숙소 체크아웃',           cost: '-',   memo: '체크아웃 후 짐 보관', date },
          { id: baseId + 2, time: '11:00 AM', type: 'activity', place: '출발 전 마지막 일정',      cost: '-',   memo: '기념품 구입 등', date },
          { id: baseId + 3, time: '01:00 PM', type: 'transit',  place: '공항 이동',               cost: '-',   memo: '공항 셔틀 또는 대중교통', date },
          { id: baseId + 4, time: '03:00 PM', type: 'transit',  place: '귀국 탑승수속·출국심사',  cost: '-',   memo: '면세점 쇼핑', date },
          { id: baseId + 5, time: '06:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
        ];
      } else {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 인근 카페', date },
          { id: baseId + 1, time: '10:00 AM', type: 'activity', place: `${cityDisplay} 오전 관람`, cost: '-',   memo: '주요 명소 방문', date },
          { id: baseId + 2, time: '12:30 PM', type: 'dining',   place: '점심 식사',               cost: '-',   memo: '현지 맛집 방문', date },
          { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 오후 일정`, cost: '-',   memo: '쇼핑, 카페, 문화 체험 등', date },
          { id: baseId + 4, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 레스토랑 저녁', date },
          { id: baseId + 5, time: '09:30 PM', type: 'stay',     place: '숙소 복귀',               cost: '-',   memo: '숙소 휴식', date },
        ];
      }

      dayItems.forEach(di => {
        items.push({ ...di, tripId: draftTrip.id });
      });
    });

    setDraftTimeline(items);
  };

  // Set draft state when entering edit mode
  const handleStartEditing = () => {
    if (!trip) return;
    setDraftTrip({ ...trip });
    // Flatten current timelineData
    const flatTimeline = Object.entries(timelineData || {}).flatMap(([d, list]) => 
      (list || []).map(item => ({ ...item, date: item.date || d }))
    );
    const healedTimeline = flatTimeline.map(item => {
      const itemDate = item.date || '';
      if (generatedDates.length > 0 && !generatedDates.includes(itemDate)) {
        return { ...item, date: generatedDates[0] };
      }
      return item;
    });
    setDraftTimeline(healedTimeline);
    setDraftFlights([...flights]);
    setDraftStays([...stays]);
    setDraftTransits([...transits]);
    setIsEditing(true);
    onEditModeChange?.(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    onEditModeChange?.(false);
    setDraftTrip(null);
    setDraftTimeline([]);
    setDraftFlights([]);
    setDraftStays([]);
    setDraftTransits([]);
  };

  const handleSave = async () => {
    if (!trip || !draftTrip) return;
    setSaving(true);
    try {
      // Geocode empty coordinates before saving
      const resolvedTimeline = await Promise.all(
        draftTimeline.map(async (item) => {
          if (
            (item.lat === undefined || item.lng === undefined || item.lat === null || item.lng === null) &&
            item.location && item.location.trim() !== ''
          ) {
            try {
              const coords = await fetchCoordinates(item.location);
              if (coords) {
                return { ...item, lat: coords.lat, lng: coords.lng };
              }
            } catch (e) {
              console.error(`Geocoding failed for ${item.location} during save:`, e);
            }
          }
          return item;
        })
      );

      // Update draftTimeline with resolved coords so map pins show immediately
      setDraftTimeline(resolvedTimeline);

      await onSave(
        trip.id,
        draftTrip,
        resolvedTimeline,
        draftFlights,
        draftStays,
        draftTransits
      );
      setIsEditing(false);
      onEditModeChange?.(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (saveRef) {
      saveRef.current = handleSave;
      return () => {
        saveRef.current = null;
      };
    }
  }, [handleSave, saveRef]);



  const dynamicDates = [
    { id: 'all', date: 'ALL', label: 'Overall' },
    ...generatedDates.map((d, index) => ({
      id: d,
      date: d,
      label: `Day ${index + 1}`
    }))
  ];

  // Determine current timeline items (original or draft) with date healing
  const baseTimeline = (() => {
    const rawTimeline = isEditing
      ? draftTimeline
      : Object.entries(timelineData || {}).flatMap(([d, list]) => 
          (list || []).map(item => ({ ...item, date: item.date || d }))
        );
    if (generatedDates.length > 0) {
      return rawTimeline.map(item => {
        const itemDate = item.date || '';
        if (!generatedDates.includes(itemDate)) {
          return { ...item, date: generatedDates[0] };
        }
        return item;
      });
    }
    return rawTimeline;
  })();

  const filteredTimeline = selectedDate === 'ALL'
    ? baseTimeline
    : baseTimeline.filter(item => item.date === selectedDate);

  // Sort chronologically: by date, then by parsed time
  const currentTimeline = [...filteredTimeline].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.id - b.id;
  });

  const mapPoints = (() => {
    if (activeTab === 'timeline') {
      return currentTimeline
        .filter(item => !item.excludeFromMap)
        .map(item => ({
          ...item,
          lat: item.lat !== undefined && item.lat !== null ? Number(item.lat) : undefined,
          lng: item.lng !== undefined && item.lng !== null ? Number(item.lng) : undefined
        }));
    } else if (activeTab === 'flights') {
      const flightsToUse = isEditing ? draftFlights : flights;
      const flightPoints: any[] = [];
      flightsToUse.forEach(f => {
        const fromVal = airportCoords[f.fromCode] || airportGeocodedCoords[f.fromCode];
        const toVal = airportCoords[f.toCode] || airportGeocodedCoords[f.toCode];
        
        if (fromVal) {
          flightPoints.push({
            id: f.id * 10,
            place: f.fromCode,
            lat: fromVal.lat,
            lng: fromVal.lng,
            time: f.fromTime,
            memo: `${f.flightNo} Departure from ${f.fromCode}`
          });
        }
        if (toVal) {
          flightPoints.push({
            id: f.id * 10 + 1,
            place: f.toCode,
            lat: toVal.lat,
            lng: toVal.lng,
            time: f.toTime,
            memo: `${f.flightNo} Arrival at ${f.toCode}`
          });
        }
      });
      return flightPoints;
    } else if (activeTab === 'stays') {
      const staysToUse = isEditing ? draftStays : stays;
      const stayPoints: any[] = [];
      staysToUse.forEach(s => {
        const coords = stayCoords[s.id];
        if (coords) {
          stayPoints.push({
            id: s.id,
            place: s.title,
            lat: coords.lat,
            lng: coords.lng,
            time: '',
            memo: s.address
          });
        }
      });
      return stayPoints;
    } else if (activeTab === 'transit') {
      const transitsToUse = isEditing ? draftTransits : transits;
      const transitPoints: any[] = [];
      transitsToUse.forEach(t => {
        if (t.departLat !== undefined && t.departLng !== undefined) {
          transitPoints.push({
            id: t.id * 10,
            place: t.departPlace || 'Departure',
            lat: t.departLat,
            lng: t.departLng,
            time: t.time || '',
            memo: `${t.title || 'Transit'} - Departure from ${t.departPlace || ''}`,
            type: 'transit_depart',
            transitId: t.id
          });
        }
        if (t.arriveLat !== undefined && t.arriveLng !== undefined) {
          transitPoints.push({
            id: t.id * 10 + 1,
            place: t.arrivePlace || 'Arrival',
            lat: t.arriveLat,
            lng: t.arriveLng,
            time: '',
            memo: `${t.title || 'Transit'} - Arrival at ${t.arrivePlace || ''}`,
            type: 'transit_arrive',
            transitId: t.id
          });
        }
        if (t.boardingLat !== undefined && t.boardingLng !== undefined) {
          transitPoints.push({
            id: t.id * 10 + 2,
            place: t.boardingPlace || 'Boarding Place',
            lat: t.boardingLat,
            lng: t.boardingLng,
            time: '',
            memo: `${t.title || 'Transit'} - Boarding point at ${t.boardingPlace || ''}`,
            type: 'transit_boarding',
            transitId: t.id
          });
        }
      });
      return transitPoints;
    }
    return [];
  })();

  useEffect(() => {
    if (!dateBarRef.current) return;
    const activeBtn = dateBarRef.current.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedDate]);

  // Early Return (conditional render)
  if (!trip) {
    return (
      <div className="flex-grow flex items-center justify-center bg-[#F9F8F6] dark:bg-[#111111] h-[80vh] text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
        Loading Journey Details...
      </div>
    );
  }

  const handleItemToggle = (id: number) => {
    let targetId = id;
    if (activeTab === 'flights' || activeTab === 'transit') {
      targetId = Math.floor(id / 10);
    }
    setExpandedItemId(prevId => prevId === targetId ? null : targetId);
    if (expandedItemId !== targetId && itemRefs.current[targetId]) {
      setTimeout(() => {
        itemRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleAddTimelineItemRelativeTo = (relativeId: number, position: 'above' | 'below') => {
    const sorted = [...currentTimeline];
    const targetIdx = sorted.findIndex(item => item.id === relativeId);
    if (targetIdx === -1) return;
    const targetItem = sorted[targetIdx];

    const targetMin = parseTimeToMinutes(targetItem.time);
    let newMin = targetMin;

    if (position === 'above') {
      const prevSameDay = targetIdx > 0 && sorted[targetIdx - 1].date === targetItem.date ? sorted[targetIdx - 1] : null;
      if (prevSameDay) {
        const prevMin = parseTimeToMinutes(prevSameDay.time);
        newMin = Math.round((prevMin + targetMin) / 2);
        if (Math.abs(prevMin - targetMin) <= 1) {
          newMin = targetMin - 5;
        }
      } else {
        newMin = targetMin - 30;
      }
    } else {
      const nextSameDay = targetIdx < sorted.length - 1 && sorted[targetIdx + 1].date === targetItem.date ? sorted[targetIdx + 1] : null;
      if (nextSameDay) {
        const nextMin = parseTimeToMinutes(nextSameDay.time);
        newMin = Math.round((targetMin + nextMin) / 2);
        if (Math.abs(targetMin - nextMin) <= 1) {
          newMin = targetMin + 5;
        }
      } else {
        newMin = targetMin + 60;
      }
    }

    newMin = Math.max(0, Math.min(1439, newMin));
    const newTimeStr = minutesToTimeStr(newMin);

    const newId = Date.now();
    const newItem: TimelineItem = {
      id: newId,
      time: newTimeStr,
      type: 'activity',
      place: '새로운 장소',
      cost: '-',
      memo: '메모를 입력하세요',
      x: 50,
      y: 50,
      date: targetItem.date,
      tripId: trip.id
    };

    setDraftTimeline(prev => {
      const copy = [...prev];
      const targetDraftIdx = copy.findIndex(item => item.id === relativeId);
      if (targetDraftIdx !== -1) {
        const insertIdx = position === 'above' ? targetDraftIdx : targetDraftIdx + 1;
        copy.splice(insertIdx, 0, newItem);
      } else {
        copy.push(newItem);
      }
      return copy;
    });

    setExpandedItemId(newId);

    setTimeout(() => {
      if (itemRefs.current[newId]) {
        itemRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputEl = document.getElementById(`title-input-${newId}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 250);
  };

  // Draft update helpers
  const updateTimelineItem = (id: number, field: keyof TimelineItem, value: any) => {
    setDraftTimeline(prev => 
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  // Atomic multi-field update — avoids race condition when calling updateTimelineItem multiple times
  const updateTimelineItemFields = (id: number, fields: Partial<TimelineItem>) => {
    setDraftTimeline(prev =>
      prev.map(item => item.id === id ? { ...item, ...fields } : item)
    );
  };

  const handleToggleExcludeFromMap = async (item: TimelineItem) => {
    const newExclude = !item.excludeFromMap;
    if (isEditing) {
      updateTimelineItem(item.id, 'excludeFromMap', newExclude);
    } else {
      if (!isLoggedIn) {
        alert('로그인 후 지도의 표시 상태를 변경할 수 있습니다.');
        return;
      }
      try {
        const itemRef = doc(db, 'users', 'public', 'timeline', String(item.id));
        await setDoc(itemRef, { excludeFromMap: newExclude }, { merge: true });
      } catch (err) {
        console.error("Failed to update excludeFromMap in Firestore:", err);
      }
    }
  };

  const handleAddTimelineItem = (date: string) => {
    const newId = Date.now();
    const newItem: TimelineItem = {
      id: newId,
      time: '12:00 PM',
      type: 'activity',
      place: '새로운 장소',
      cost: '-',
      memo: '메모를 입력하세요',
      x: 50,
      y: 50,
      date: date,
      tripId: trip.id
    };
    setDraftTimeline(prev => [...prev, newItem]);
    setExpandedItemId(newId);

    // Scroll and focus newly added item
    setTimeout(() => {
      if (itemRefs.current[newId]) {
        itemRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputEl = document.getElementById(`title-input-${newId}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 250);
  };

  const handleDeleteTimelineItem = (id: number) => {
    setDraftTimeline(prev => prev.filter(item => item.id !== id));
  };

  const handleScrollToDateSection = (direction: 'up' | 'down') => {
    const sections = Array.from(document.querySelectorAll('[data-date-section]')) as HTMLElement[];
    if (sections.length === 0) return;

    const container = dateBarRef.current?.closest('.overflow-y-auto') || window;
    const containerTop = container === window ? 0 : (container as HTMLElement).getBoundingClientRect().top;

    let targetSection: HTMLElement | null = null;

    if (direction === 'down') {
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        if (relativeTop > 10) {
          targetSection = section;
          break;
        }
      }
    } else {
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const rect = section.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        if (relativeTop < -10) {
          targetSection = section;
          break;
        }
      }
    }

    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Draft updates for custom cards
  const updateFlight = (id: number, field: keyof FlightItem, val: string) => {
    setDraftFlights(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };
  const deleteFlight = (id: number) => {
    setDraftFlights(prev => prev.filter(f => f.id !== id));
  };
  const handleAddFlight = (title: string) => {
    const newFlight: FlightItem = {
      id: Date.now(),
      title: title,
      date: 'YYYY.MM.DD',
      fromCode: 'ICN',
      fromTerminal: 'TERMINAL T1',
      fromTime: '08:00 AM',
      toCode: 'KIX',
      toTerminal: 'TERMINAL T1',
      toTime: '10:00 AM',
      flightNo: 'KE000',
      seat: '00A',
      pnr: '000000',
    };
    setDraftFlights(prev => [...prev, newFlight]);
  };

  const updateStay = (id: number, field: keyof StayItem, val: string) => {
    setDraftStays(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };
  const deleteStay = (id: number) => {
    setDraftStays(prev => prev.filter(s => s.id !== id));
  };
  const handleAddStay = () => {
    const newStay: StayItem = {
      id: Date.now(),
      status: 'BOOKING CONFIRMED',
      title: '새로운 숙소',
      dateRange: 'YYYY.MM.DD - YYYY.MM.DD (0 Nights)',
      address: '숙소 주소를 입력하세요',
      memo: '메모를 입력하세요',
      confNo: 'HTL-0000',
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop',
    };
    setDraftStays(prev => [...prev, newStay]);
  };

  const updateTransit = (id: number, field: keyof TransitItem, val: string) => {
    setDraftTransits(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));
  };
  const deleteTransit = (id: number) => {
    setDraftTransits(prev => prev.filter(t => t.id !== id));
  };
  const handleAddTransit = () => {
    const newTransit: TransitItem = {
      id: Date.now(),
      ticketType: 'TRAIN TICKET',
      date: 'YYYY.MM.DD',
      title: '열차/이동 수단 이름',
      route: '출발지 → 도착지',
      time: '12:00 PM',
      seat: 'Car 0, 00A',
      bookingRef: 'TRN-000',
    };
    setDraftTransits(prev => [...prev, newTransit]);
  };

  // Gallery actions with image compression + EXIF metadata extraction
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return alert("로그인 상태에서만 업로드할 수 있습니다.");

    setUploadingImage(true);
    try {
      // 1. Extract EXIF BEFORE compressing (canvas strips metadata)
      const exif = await readExif(file);
      let exifDate: string | undefined;
      let exifPlace: string | undefined;

      if (exif.dateTime) {
        // Format YYYY:MM:DD HH:MM:SS → YYYY.MM.DD
        exifDate = exif.dateTime.slice(0, 10).replace(/:/g, '.');
      }
      if (exif.latitude !== undefined && exif.longitude !== undefined) {
        try {
          const addr = await fetchAddressFromCoords(exif.latitude, exif.longitude);
          if (addr) exifPlace = addr;
        } catch (_) {/* silently ignore geocoding errors */}
      }

      // 2. Compress and upload
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `users/public/gallery/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);

      // 3. Build GalleryImageMeta if we have metadata
      const newEntry = (exifDate || exifPlace)
        ? { url, date: exifDate, place: exifPlace }
        : url;
      
      if (isEditing && draftTrip) {
        const currentGallery = draftTrip.gallery || [];
        setDraftTrip({ ...draftTrip, gallery: [...currentGallery, newEntry] });
      } else {
        const currentGallery = trip.gallery || [];
        const updatedGallery = [...currentGallery, newEntry];
        await onSave(
          trip.id,
          { ...trip, gallery: updatedGallery },
          baseTimeline,
          flights,
          stays,
          transits
        );
      }
    } catch (error) {
      console.error("Gallery image upload failed:", error);
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Update imgNote on a gallery (non-timeline) image
  const handleUpdateGalleryImageNote = (imageUrl: string, newNote: string) => {
    const updateGallery = (gallery: (string | any)[]): (string | any)[] =>
      gallery.map(item => {
        if (typeof item === 'string') return item === imageUrl ? { url: item, imgNote: newNote } : item;
        return item.url === imageUrl ? { ...item, imgNote: newNote } : item;
      });

    if (isEditing && draftTrip) {
      setDraftTrip({ ...draftTrip, gallery: updateGallery(draftTrip.gallery || []) });
    }
  };

  const handleRemoveGalleryImage = async (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("이 이미지를 갤러리에서 삭제하시겠습니까?")) return;

    if (isEditing && draftTrip) {
      const currentGallery = draftTrip.gallery || [];
      setDraftTrip({ ...draftTrip, gallery: currentGallery.filter(url => url !== imageUrl) });
    } else {
      const currentGallery = trip.gallery || [];
      const updatedGallery = currentGallery.filter(url => url !== imageUrl);
      await onSave(
        trip.id,
        { ...trip, gallery: updatedGallery },
        baseTimeline,
        flights,
        stays,
        transits
      );
    }
  };

  // Separate gallery: metadata gallery (from trip.gallery) and timeline images (from timeline items)
  // Normalize gallery entries: string → { url } object
  const rawGalleryEntries = tripToUse?.gallery || [];
  const galleryMetaImages: { url: string; date?: string; place?: string; imgNote?: string }[] = rawGalleryEntries.map(entry =>
    typeof entry === 'string' ? { url: entry } : entry as any
  );
  const timelineImages = baseTimeline
    .filter(item => item.img)
    .map(item => ({
      url: item.img as string,
      place: item.place,
      date: item.date || '',
      memo: item.memo,
      imgNote: item.imgNote || '',
      type: 'timeline' as const,
    }));

  // Combined LightboxImageMeta array: gallery photos first, then timeline photos
  const galleryMetaMetas: LightboxImageMeta[] = galleryMetaImages.map(g => ({ url: g.url, type: 'gallery' as const }));
  const timelineMetas: LightboxImageMeta[] = timelineImages.map(t => ({
    url: t.url,
    place: t.place,
    date: t.date,
    memo: t.memo,
    imgNote: t.imgNote,
    type: 'timeline' as const,
  }));
  // Deduplicate by url
  const seenUrls = new Set<string>();
  const galleryAllMeta: LightboxImageMeta[] = [...galleryMetaMetas, ...timelineMetas].filter(m => {
    if (seenUrls.has(m.url)) return false;
    seenUrls.add(m.url);
    return true;
  });
  // Keep backward compat
  const galleryAllUnique = galleryAllMeta.map(m => m.url);

  return (
    <main className="animate-in slide-in-from-right-8 duration-500 flex flex-col md:flex-row h-auto md:h-[calc(100vh-73px)] w-full overflow-y-visible md:overflow-hidden">
      
      {/* Left: Map & Info Section */}
      <section className={`w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-black/20 dark:border-white/20 relative transition-colors duration-300 ${isEditing ? 'h-[65vh]' : 'h-[48vh]'} md:h-full shrink-0`}>
        <div className="p-4 md:p-8 border-b border-black/20 dark:border-white/20 z-10 bg-[#F9F8F6] dark:bg-[#111111] transition-colors shrink-0">
          
          {/* Back to hub button */}
          <button
            onClick={() => {
              const isPlan = trip?.tags.includes('Plan') || trip?.title.includes('(Plan)');
              onNavigate(isPlan ? 'plan' : 'archive');
            }}
            className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors mb-3"
            title="Go back to Hub"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to { (trip?.tags.includes('Plan') || trip?.title.includes('(Plan)')) ? 'Plans' : 'Archive' }
          </button>

          {/* Header metadata area (date and location) */}
          <div className="flex justify-between items-start gap-4 mb-3 md:mb-4">
            <div className="flex items-center space-x-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50 transition-colors w-full">
              {isEditing && draftTrip ? (
                <div className="flex items-center gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={parseDateRange(draftTrip.date).start}
                      onChange={(e) => handleDateChange('start', e.target.value)}
                      className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10"
                    />
                    <span>—</span>
                    <input
                      type="date"
                      value={parseDateRange(draftTrip.date).end}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                      className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10"
                    />
                  </div>
                  <span>—</span>
                  <div className="w-48">
                    <PlaceAutocompleteInput
                      value={draftTrip.locationStr}
                      onChange={(val) => setDraftTrip({ ...draftTrip, locationStr: val })}
                      onSelectPlace={(name, coords) => {
                        setDraftTrip(prev => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            locationStr: name,
                            lat: coords?.lat ?? prev.lat,
                            lng: coords?.lng ?? prev.lng
                          };
                        });
                      }}
                      className="bg-[#EAE8E3] dark:bg-white/10 px-2 py-1 outline-none text-[10px] md:text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
                      placeholder="Default Map City"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <span>{trip.date}</span>
                  <span>—</span>
                  <span>{trip.locationStr}</span>
                </>
              )}
            </div>

            {/* Edit controls */}
            {isLoggedIn && (
              <div className="shrink-0 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all text-black/60 dark:text-white/60"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartEditing}
                    className="px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-[10px] font-black uppercase tracking-widest rounded-sm transition-all"
                  >
                    Edit Journey
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Trip Title */}
          {isEditing && draftTrip ? (
            <input
              type="text"
              value={draftTrip.title}
              onChange={(e) => setDraftTrip({ ...draftTrip, title: e.target.value })}
              className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none bg-[#EAE8E3] dark:bg-white/10 border border-black/10 dark:border-white/10 p-2 outline-none w-full text-black dark:text-white"
              placeholder="JOURNEY TITLE"
            />
          ) : (
            <h1 
              className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none break-keep"
              style={{ wordBreak: 'keep-all' }}
            >
              {(trip.title || '').replace(' (Plan)', '')}
            </h1>
          )}
          
          <div className="mt-4 md:mt-6 flex flex-wrap gap-2">
            {(tripToUse?.tags || []).slice(0, 2).map(tag => (
               <span key={tag} className="text-[9px] md:text-[10px] font-bold border border-black/20 dark:border-white/20 px-2 py-1 uppercase rounded-full">
                 {tag}
               </span>
            ))}
          </div>
        </div>
        
        {/* Dynamic Map Area */}
        <ErrorBoundary fallback={
          <div className="flex-grow flex flex-col items-center justify-center bg-[#EAE8E3] dark:bg-[#1A1A1A] text-black/40 dark:text-white/40 p-6 relative">
            <span className="text-[10px] uppercase tracking-widest font-bold z-10 mb-2">Map Temporary Unavailable</span>
            <img src={tripToUse?.mapImg || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop'} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
          </div>
        }>
          <MapArea 
            trip={tripToUse!}
            isEditMode={isEditing}
            mapPoints={mapPoints}
            expandedItemId={expandedItemId}
            handleItemToggle={handleItemToggle}
            selectedDate={selectedDate}
            isDarkMode={isDarkMode}
            activeTab={activeTab}
            transitFocusType={transitFocusType}
          />
        </ErrorBoundary>
      </section>
      
      {/* Right: Record / Tabs Section */}
      <section className="w-full md:w-1/2 flex flex-col bg-[#F9F8F6] dark:bg-[#111111] transition-colors duration-300 flex-grow h-auto md:h-full md:overflow-hidden">
        
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
        <div className="flex-grow flex flex-col relative overflow-y-visible md:overflow-y-auto overflow-x-hidden w-full h-auto md:h-full">
          
          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="animate-in fade-in duration-300 h-auto flex flex-col w-full relative">
              {/* Day filter selector bar */}
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

              {isLoggedIn && !isEditing && (
                <div className="bg-black/5 dark:bg-white/10 px-4 py-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-center flex items-center justify-center gap-2 shrink-0 w-full">
                  <Edit2 className="w-3 h-3 shrink-0 text-red-600 dark:text-red-400" /> <span className="truncate text-red-600 dark:text-red-400">우측 상단 'Edit Journey' 버튼을 클릭하면 편집이 시작됩니다.</span>
                </div>
              )}

              {/* Timeline Items List */}
              <div className="flex flex-col pb-20 w-full relative">
                {isEditing && (
                  <div className="flex flex-col shrink-0 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 relative">
                    <div className="flex justify-between items-center py-3 px-4 md:px-6 flex-wrap gap-2">
                      <button
                        onClick={handleGenerateDefaultTemplate}
                        className="text-[10px] font-black uppercase tracking-widest border border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 transition-colors flex items-center gap-1.5"
                      >
                        Generate Default Template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedItemIds.length === currentTimeline.length) {
                            setSelectedItemIds([]);
                          } else {
                            setSelectedItemIds(currentTimeline.map(item => item.id));
                          }
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 px-3 py-1.5 transition-colors"
                      >
                        {selectedItemIds.length === currentTimeline.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {selectedItemIds.length > 0 && (
                      <div className="sticky top-0 z-20 flex justify-between items-center py-3 px-4 md:px-6 bg-red-600 text-white shadow-md transition-all animate-in slide-in-from-top duration-300">
                        <div className="text-xs font-bold uppercase tracking-widest">
                          {selectedItemIds.length} items selected
                        </div>
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Move to:</span>
                          <select
                            onChange={(e) => {
                              const targetDate = e.target.value;
                              if (!targetDate) return;
                              
                              setDraftTimeline(prev => 
                                prev.map(item => {
                                  if (selectedItemIds.includes(item.id)) {
                                    return { ...item, date: targetDate };
                                  }
                                  return item;
                                })
                              );
                              
                              setSelectedItemIds([]);
                              setSelectedDate(targetDate);
                            }}
                            className="bg-white text-black text-[10px] font-bold p-1 outline-none border border-white/20 rounded-none w-28"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Day</option>
                            {generatedDates.map((d, index) => (
                              <option key={d} value={d}>Day {index + 1} ({d.slice(5).replace('.', '/')})</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setSelectedItemIds([])}
                            className="text-[10px] font-bold uppercase tracking-widest hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {currentTimeline.length === 0 ? (
                  <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                    해당 날짜에 등록된 일정이 없습니다.
                  </div>
                ) : (
                  currentTimeline.map((item, idx) => {
                    const isActive = expandedItemId === item.id;
                    const showDivider = selectedDate === 'ALL' && (idx === 0 || currentTimeline[idx - 1].date !== item.date);
                    const dayIndex = item.date ? generatedDates.indexOf(item.date) + 1 : 0;
                    const isExcluded = !!item.excludeFromMap;
                    return (
                      <div key={item.id} className="w-full flex flex-col">
                        {showDivider && (
                          <div 
                            id={`date-section-${item.date}`}
                            data-date-section={item.date}
                            className="bg-[#EAE8E3]/60 dark:bg-white/5 py-2 px-4 md:px-6 border-b border-t border-black/10 dark:border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50 flex items-center justify-between"
                          >
                            <span>Day {dayIndex} — {item.date}</span>
                          </div>
                        )}
                        <div 
                          ref={el => { itemRefs.current[item.id] = el; }} 
                          className={`flex flex-col border-b border-black/10 dark:border-white/10 transition-colors w-full ${isActive ? 'bg-red-500/[0.02] dark:bg-red-500/[0.02] border-l-2 border-l-red-600 dark:border-l-red-400' : 'border-l-2 border-l-transparent'} ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''} ${isExcluded ? 'opacity-60' : 'opacity-100'}`}
                          draggable={isEditing}
                          onDragStart={() => setDraggedItemId(item.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropTimelineItem(item.id)}
                        >
                          <div 
                            className="group flex flex-row items-start py-4 px-4 md:py-5 md:px-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer relative w-full" 
                            onClick={() => handleItemToggle(item.id)}
                          >
                            {/* Checkbox for batch select */}
                            {isEditing && (
                              <div className="mr-3 mt-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedItemIds.includes(item.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedItemIds(prev => [...prev, item.id]);
                                    } else {
                                      setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                                />
                              </div>
                            )}
                            {/* Time */}
                            <div className={`shrink-0 text-[10px] md:text-xs font-bold tracking-widest mt-1 transition-colors ${isActive ? 'text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60'} ${isEditing ? 'w-20 md:w-44 flex flex-col gap-1' : 'w-16 md:w-24 flex flex-col gap-1.5'}`}>
                              <div>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={item.time}
                                    onChange={(e) => updateTimelineItem(item.id, 'time', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none font-bold text-[10px] md:text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
                                  />
                                ) : (
                                  <span>{item.time}</span>
                                )}
                              </div>
                              <div className={`flex ${isEditing ? 'flex-row items-center gap-1.5 mt-0.5' : 'flex-col mt-0.5'}`} onClick={(e) => e.stopPropagation()}>
                                {isEditing ? (
                                  <>
                                    <select
                                      value={item.date}
                                      onChange={(e) => {
                                        const newDate = e.target.value;
                                        updateTimelineItem(item.id, 'date', newDate);
                                        setSelectedDate(newDate);
                                      }}
                                      className="bg-[#EAE8E3] dark:bg-white/10 border border-black/10 dark:border-white/10 text-[9px] font-bold p-0.5 pr-2 outline-none text-black dark:text-white rounded-none w-20 flex-shrink-0"
                                    >
                                      {generatedDates.map(d => (
                                        <option key={d} value={d}>{d.slice(5).replace('.', '/')}</option>
                                      ))}
                                    </select>
                                    
                                    {/* Map Pin visibility toggle inline */}
                                    {(item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) && (
                                      <button
                                        onClick={() => handleToggleExcludeFromMap(item)}
                                        className={`flex items-center justify-center p-1 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                                          isExcluded
                                            ? 'text-black/20 dark:text-white/20'
                                            : 'text-red-600 dark:text-red-400'
                                        }`}
                                        title={isExcluded ? "지도에 표시하기" : "지도에서 제외하기"}
                                      >
                                        {isExcluded ? <MapPinOff className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {selectedDate === 'ALL' && (
                                      <span className="text-[9px] text-black/40 dark:text-white/40 block font-normal leading-none mt-0.5">
                                        {item.date ? item.date.slice(5) : ''}
                                      </span>
                                    )}
                                    
                                    {/* Map Pin visibility toggle in view mode */}
                                    {(item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) && (
                                      <button
                                        onClick={() => handleToggleExcludeFromMap(item)}
                                        className={`flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest transition-colors mt-1.5 ${
                                          isExcluded
                                            ? 'text-black/20 dark:text-white/20 hover:text-black/45 dark:hover:text-white/45'
                                            : 'text-red-600 dark:text-red-400 hover:opacity-80'
                                        }`}
                                        title={isExcluded ? "지도에 표시하기" : "지도에서 제외하기"}
                                      >
                                        {isExcluded ? (
                                          <>
                                            <MapPinOff className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                                            <span className="text-black/30 dark:text-white/30 text-[7px] md:text-[8px]">OFF</span>
                                          </>
                                        ) : (
                                          <>
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="text-[7px] md:text-[8px]">ON</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                          {/* Details */}
                          <div className="flex-grow pr-2 md:pr-4 min-w-0">
                            <div className={`font-bold tracking-tight text-sm md:text-base flex items-center gap-2 flex-wrap ${isActive ? 'text-red-600 dark:text-red-400' : ''}`}>
                              {isEditing ? (
                                <div className="w-full" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    id={`title-input-${item.id}`}
                                    type="text"
                                    value={item.place}
                                    onChange={(e) => updateTimelineItem(item.id, 'place', e.target.value)}
                                    className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none font-bold text-sm md:text-base text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
                                    placeholder="일정 이름"
                                  />
                                </div>
                              ) : (
                                <span>{item.place}</span>
                              )}
                              {isActive ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4 text-current shrink-0" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-black/40 dark:text-white/40 shrink-0" />}
                            </div>
                            
                            <div className="mt-1">
                              {isEditing ? (
                                <textarea
                                  value={item.memo}
                                  onChange={(e) => updateTimelineItem(item.id, 'memo', e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-[#EAE8E3] dark:bg-white/10 p-1 outline-none text-xs md:text-sm text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full resize-none"
                                  rows={item.memo ? Math.max(1, item.memo.split('\n').length) : 1}
                                  placeholder="Memo"
                                />
                              ) : (
                                <div className="text-xs md:text-sm text-black/60 dark:text-white/60 break-words w-full whitespace-pre-wrap">{item.memo}</div>
                              )}
                            </div>


                            {/* Actions (Edit mode) */}
                            {isEditing && isActive && (
                              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>
                                 <button 
                                   type="button"
                                   className="flex items-center gap-1 text-black dark:text-white hover:opacity-75 transition-opacity" 
                                   onClick={() => handleAddTimelineItemRelativeTo(item.id, 'above')}
                                 >
                                   <Plus className="w-3 h-3"/> Add Above
                                 </button>
                                 <button 
                                   type="button"
                                   className="flex items-center gap-1 text-black dark:text-white hover:opacity-75 transition-opacity" 
                                   onClick={() => handleAddTimelineItemRelativeTo(item.id, 'below')}
                                 >
                                   <Plus className="w-3 h-3"/> Add Below
                                 </button>
                                 <button 
                                   type="button"
                                   className="flex items-center gap-1 text-red-600 hover:text-red-400 transition-colors ml-auto" 
                                   onClick={() => handleDeleteTimelineItem(item.id)}
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
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.cost}
                                  onChange={(e) => updateTimelineItem(item.id, 'cost', e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none font-bold text-[9px] md:text-[10px] text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-16"
                                />
                              ) : (
                                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest bg-black/10 dark:bg-white/10 px-2 py-0.5 md:py-1 rounded-sm whitespace-nowrap block">
                                  {item.cost}
                                </span>
                              )}
                            </div>
                            
                            {/* Card thumbnail (strictly preview, image is uploadable) */}
                            {item.img ? (
                              <div 
                                className={`w-10 h-10 md:w-12 md:h-12 overflow-hidden border transition-all relative ${isActive ? 'border-red-600 dark:border-red-400 scale-110 origin-right' : 'border-black/20 dark:border-white/20'}`}
                                onClick={(e) => {
                                  if (!isEditing) {
                                    e.stopPropagation();
                                    const imgIdx = galleryAllUnique.indexOf(item.img!);
                                    if (imgIdx !== -1) {
                                      setLightboxIndex(imgIdx);
                                      setIsLightboxOpen(true);
                                    } else {
                                      // Fallback
                                      setLightboxIndex(0);
                                      setIsLightboxOpen(true);
                                    }
                                  }
                                }}
                              >
                                <img src={item.img} alt={item.place} className={`w-full h-full object-cover transition-all ${isActive ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} />
                                {/* Red dot badge: mark as timeline-attached photo */}
                                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-600 rounded-full border border-white dark:border-black shadow z-10" />
                                <ImageEditOverlay 
                                  isEditMode={isEditing} 
                                  onImageUploaded={(url, gps) => {
                                    if (gps) {
                                      updateTimelineItemFields(item.id, { img: url, lat: gps.lat, lng: gps.lng });
                                    } else {
                                      updateTimelineItemFields(item.id, { img: url });
                                    }
                                  }} 
                                />
                              </div>
                            ) : (
                              <div className={`w-10 h-10 md:w-12 md:h-12 border bg-black/5 dark:bg-white/5 flex items-center justify-center transition-colors relative ${isActive ? 'border-red-600 dark:border-red-400 text-red-600 scale-110 origin-right' : 'border-black/10 dark:border-white/10 text-black/30 dark:text-white/30'}`}>
                                <ImageIcon className="w-3 h-3 md:w-4 md:h-4" />
                                <ImageEditOverlay 
                                  isEditMode={isEditing} 
                                  onImageUploaded={(url, gps) => {
                                    if (gps) {
                                      updateTimelineItemFields(item.id, { img: url, lat: gps.lat, lng: gps.lng });
                                    } else {
                                      updateTimelineItemFields(item.id, { img: url });
                                    }
                                  }} 
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded Section Details */}
                        {isActive && (
                          <div className="px-4 md:px-6 pb-4 md:pb-6 pt-1 md:pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="bg-white/80 dark:bg-black/40 border border-black/10 dark:border-white/10 p-3 md:p-4 flex flex-col gap-3 text-xs md:text-sm transition-colors shadow-inner">
                              
                              {/* Address Input */}
                              <div className="flex items-start gap-3 group/copy w-full">
                                <Map className="w-3.5 h-3.5 md:w-4 md:h-4 mt-1.5 text-black/60 dark:text-white/60 shrink-0" />
                                {isEditing ? (
                                  <div className="w-full" onClick={(e) => e.stopPropagation()}>
                                    <PlaceAutocompleteInput
                                      value={item.location || ''}
                                      onChange={(val) => updateTimelineItemFields(item.id, { location: val, lat: undefined, lng: undefined })}
                                      onBlur={async () => {
                                        // Only geocode if no coords yet (don't override Places API selection)
                                        if (
                                          item.location &&
                                          item.location.trim() !== '' &&
                                          (item.lat === undefined || item.lat === null || item.lng === undefined || item.lng === null)
                                        ) {
                                          const coords = await fetchCoordinates(item.location);
                                          if (coords) {
                                            updateTimelineItemFields(item.id, {
                                              lat: coords.lat,
                                              lng: coords.lng,
                                            });
                                          }
                                        }
                                      }}
                                      onSelectPlace={(name, coords, address) => {
                                        // Atomic update: location + lat + lng in one setState
                                        updateTimelineItemFields(item.id, {
                                          location: address || name,
                                          lat: coords?.lat ?? item.lat,
                                          lng: coords?.lng ?? item.lng,
                                        });
                                      }}
                                      className="bg-[#EAE8E3] dark:bg-white/10 px-2 py-1 outline-none text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
                                      placeholder="위치 지정 (예: 나리타공항)"
                                    />
                                  </div>
                                ) : (
                                  <span className="flex-grow text-black/80 dark:text-white/80 font-medium break-words">
                                    {item.location ? (
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {item.location}
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </a>
                                    ) : (
                                      '위치 정보 없음'
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Hours Input */}
                              <div className="flex items-center gap-3 text-black/80 dark:text-white/80">
                                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-black/60 dark:text-white/60 shrink-0" />
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={item.hours || ''}
                                    onChange={(e) => updateTimelineItem(item.id, 'hours', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#EAE8E3] dark:bg-white/10 px-2 py-1 outline-none text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
                                    placeholder="Hours e.g. 09:00 AM - 18:00 PM"
                                  />
                                ) : (
                                  <span className="font-medium">
                                    {item.hours || '영업시간 정보 없음'}
                                  </span>
                                )}
                              </div>

                              {/* Photo Note Input (only shown if photo exists) */}
                              {item.img && (
                                <div className="flex items-start gap-3">
                                  <ImageIcon className="w-3.5 h-3.5 md:w-4 md:h-4 mt-0.5 text-black/60 dark:text-white/60 shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={item.imgNote || ''}
                                      onChange={(e) => updateTimelineItem(item.id, 'imgNote', e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-[#EAE8E3] dark:bg-white/10 px-2 py-1 outline-none text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
                                      placeholder="사진 메모 (갤러리에 표시됩니다)"
                                    />
                                  ) : (
                                    <span className="flex-grow text-black/60 dark:text-white/60 italic break-words">
                                      {item.imgNote || '사진 메모 없음'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    );
                  })
                )}

                {/* Add Timeline item button */}
                {isEditing && (
                  <div className="p-6 flex justify-center w-full">
                    <button 
                      onClick={() => handleAddTimelineItem(selectedDate === 'ALL' ? generatedDates[0] || '2025.04.12' : selectedDate)}
                      className="text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Timeline Event
                    </button>
                  </div>
                )}

                {selectedDate === 'ALL' && currentTimeline.length > 0 && (
                  <>
                    <button
                      onClick={() => handleScrollToDateSection('up')}
                      className="sticky top-2 right-2 ml-auto z-40 p-1.5 bg-black/80 hover:bg-black text-white dark:bg-white/80 dark:hover:bg-white dark:text-black rounded-full shadow-md transition-colors duration-200 pointer-events-auto shrink-0 w-8 h-8 flex items-center justify-center"
                      style={{ marginBottom: '-32px' }}
                      title="Scroll to Previous Day"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleScrollToDateSection('down')}
                      className="sticky bottom-2 right-2 ml-auto mt-auto z-40 p-1.5 bg-black/80 hover:bg-black text-white dark:bg-white/80 dark:hover:bg-white dark:text-black rounded-full shadow-md transition-colors duration-200 pointer-events-auto shrink-0 w-8 h-8 flex items-center justify-center"
                      style={{ marginTop: '-32px' }}
                      title="Scroll to Next Day"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* FLIGHTS TAB */}
          {activeTab === 'flights' && (
            <div className="p-4 md:p-6 animate-in fade-in duration-300">
              {(() => {
                const flightsToUse = isEditing ? draftFlights : flights;
                if (flightsToUse.length === 0) {
                  return (
                    <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                      등록된 항공편이 없습니다.
                    </div>
                  );
                }
                
                const sorted = [...flightsToUse].sort((a, b) => {
                  const dateCompare = (a.date || '').localeCompare(b.date || '');
                  if (dateCompare !== 0) return dateCompare;
                  return (a.fromTime || '').localeCompare(b.fromTime || '');
                });

                const outbound = sorted.filter(f => f.title.toUpperCase().includes('OUTBOUND'));
                const inbound = sorted.filter(f => f.title.toUpperCase().includes('INBOUND'));
                const other = sorted.filter(f => !f.title.toUpperCase().includes('OUTBOUND') && !f.title.toUpperCase().includes('INBOUND'));

                const renderGroup = (groupFlights: FlightItem[], groupLabel: string) => {
                  if (groupFlights.length === 0) return null;
                  return (
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-red-600 dark:text-red-400 shrink-0 font-bold">
                          {groupLabel} ({groupFlights.length})
                        </span>
                        <div className="h-[1px] flex-grow bg-red-600/20 dark:bg-red-400/20" />
                      </div>
                      
                      {groupFlights.map((flight, idx) => {
                        const prevFlight = idx > 0 ? groupFlights[idx - 1] : null;
                        const layoverTimeStr = prevFlight 
                          ? calculateLayoverTime(prevFlight.date, prevFlight.toTime, flight.date, flight.fromTime)
                          : '';
                        
                        return (
                          <div 
                            ref={el => { itemRefs.current[flight.id] = el; }} 
                            key={flight.id}
                            className="w-full flex flex-col"
                          >
                            {prevFlight && layoverTimeStr && (
                              <div className="my-4 flex items-center justify-center relative w-full" onClick={(e) => e.stopPropagation()}>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                  <div className="w-full border-t border-dashed border-red-500/30 dark:border-red-400/30" />
                                </div>
                                <div className="relative flex justify-center text-[9px] font-black uppercase tracking-widest bg-[#F9F8F6] dark:bg-[#111111] px-3 text-red-600 dark:text-red-400 border border-red-500/20 py-1 rounded-full">
                                  ✈️ Layover at {prevFlight.toCode} : {layoverTimeStr}
                                </div>
                              </div>
                            )}
                            <FlightCard 
                              flight={flight} 
                              isEditMode={isEditing} 
                              onUpdate={updateFlight} 
                              onDelete={deleteFlight} 
                              isActive={expandedItemId === flight.id}
                              onClick={() => {
                                setExpandedItemId(prev => prev === flight.id ? null : flight.id);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                };

                return (
                  <div className="flex flex-col">
                    {renderGroup(outbound, 'Outbound Flights')}
                    {renderGroup(inbound, 'Inbound Flights')}
                    {renderGroup(other, 'Other Flights')}
                  </div>
                );
              })()}
              
              {/* Add Flight controls */}
              {isEditing && (
                <div className="flex gap-4 justify-center mt-6">
                  <button 
                    onClick={() => handleAddFlight('OUTBOUND FLIGHT')} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Outbound Flight
                  </button>
                  <button 
                    onClick={() => handleAddFlight('INBOUND FLIGHT')} 
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
              {(isEditing ? draftStays : stays).length === 0 ? (
                <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 숙소 정보가 없습니다.
                </div>
              ) : (
                (isEditing ? draftStays : stays).map(stay => (
                  <div ref={el => { itemRefs.current[stay.id] = el; }} key={stay.id}>
                    <StayCard 
                      stay={stay} 
                      isEditMode={isEditing} 
                      onUpdate={updateStay} 
                      onDelete={deleteStay} 
                      isActive={expandedItemId === stay.id}
                      onClick={() => {
                        setExpandedItemId(prev => prev === stay.id ? null : stay.id);
                      }}
                    />
                  </div>
                ))
              )}

              {/* Add Stay control */}
              {isEditing && (
                <div className="flex justify-center mt-6">
                  <button 
                    onClick={handleAddStay} 
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
              {(() => {
                const transitList = isEditing ? draftTransits : transits;
                if (transitList.length === 0) {
                  return (
                    <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                      등록된 교통편이 없습니다.
                    </div>
                  );
                }

                const trains = transitList.filter(t => t.transitType !== 'bus');
                const buses = transitList.filter(t => t.transitType === 'bus');

                const renderGroup = (items: TransitItem[], label: string, IconComponent: any) => {
                  if (items.length === 0) return null;
                  return (
                    <div className="mb-8 last:mb-0">
                      <div className="flex items-center gap-2 mb-4">
                        <IconComponent className="w-4 h-4 text-black/55 dark:text-white/55" />
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black/55 dark:text-white/55">
                          {label} ({items.length})
                        </span>
                        <div className="h-[1px] flex-grow bg-black/10 dark:bg-white/10" />
                      </div>
                      <div className="space-y-4">
                        {items.map(transit => (
                          <div ref={el => { itemRefs.current[transit.id] = el; }} key={transit.id}>
                            <TransitCard 
                              transit={transit} 
                              isEditMode={isEditing} 
                              onUpdate={updateTransit} 
                              onDelete={deleteTransit} 
                              isActive={expandedItemId === transit.id}
                              onClick={() => {
                                setExpandedItemId(prev => prev === transit.id ? null : transit.id);
                                setTransitFocusType(null);
                              }}
                              onFocusPlace={(type) => {
                                setExpandedItemId(transit.id);
                                setTransitFocusType(type);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="flex flex-col">
                    {renderGroup(trains, 'Train Tickets', Train)}
                    {renderGroup(buses, 'Bus Tickets', Bus)}
                  </div>
                );
              })()}

              {/* Add Transit control */}
              {isEditing && (
                <div className="flex justify-center mt-6">
                  <button 
                    onClick={handleAddTransit} 
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
            <div className="p-4 md:p-6 animate-in fade-in duration-300 flex flex-col h-auto">
              
              {/* Add Gallery Image Area */}
              {isLoggedIn && (
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

              {/* ── Section: Gallery Photos ── */}
              {galleryMetaImages.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-grow bg-black/10 dark:bg-white/10" />
                    <span className="text-[9px] uppercase font-black tracking-widest text-black/40 dark:text-white/40 shrink-0">Gallery Photos</span>
                    <div className="h-px flex-grow bg-black/10 dark:bg-white/10" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-8">
                    {galleryMetaImages.map((imgMeta, idx) => (
                      <div 
                        key={`meta-${imgMeta.url}-${idx}`}
                        className="flex flex-col group/gallery"
                      >
                        {/* Film-photo styled clickable image */}
                        <div
                          className="relative overflow-hidden border border-black/10 dark:border-white/10 cursor-pointer aspect-[4/3]"
                          onClick={() => {
                            setLightboxIndex(idx);
                            setIsLightboxOpen(true);
                          }}
                        >
                          <img 
                            src={imgMeta.url} 
                            alt={`Gallery ${idx + 1}`} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/gallery:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/gallery:bg-black/10 transition-colors pointer-events-none" />
                          
                          {/* EXIF metadata overlay (top-left) */}
                          {(imgMeta.date || imgMeta.place) && (
                            <div className="absolute top-2 left-2 flex flex-col gap-0.5 z-10 pointer-events-none">
                              {imgMeta.date && (
                                <div className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
                                  <span className="text-[8px] text-amber-300 font-mono font-bold tracking-widest leading-none">
                                    {imgMeta.date.replace(/\./g, '/')}
                                  </span>
                                </div>
                              )}
                              {imgMeta.place && (
                                <div className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
                                  <span className="text-[8px] text-amber-300 font-mono font-bold tracking-widest leading-none truncate block max-w-[160px]">
                                    📍 {imgMeta.place}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Delete image button */}
                          {isLoggedIn && (
                            <button
                              onClick={(e) => handleRemoveGalleryImage(imgMeta.url, e)}
                              className="absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-red-600 text-white transition-colors opacity-0 group-hover/gallery:opacity-100 z-10 rounded-sm"
                              title="Remove Image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Photo note / description area below image */}
                        <div className="bg-black/3 dark:bg-white/3 border border-t-0 border-black/10 dark:border-white/10 px-3 py-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={imgMeta.imgNote || ''}
                              onChange={(e) => handleUpdateGalleryImageNote(imgMeta.url, e.target.value)}
                              placeholder="사진 설명 추가..."
                              className="w-full bg-transparent outline-none text-[10px] text-black/70 dark:text-white/70 placeholder-black/25 dark:placeholder-white/25"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : imgMeta.imgNote ? (
                            <p className="text-[10px] text-black/60 dark:text-white/60 italic leading-relaxed">{imgMeta.imgNote}</p>
                          ) : (
                            <p className="text-[10px] text-black/20 dark:text-white/20 italic">메모 없음</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Section: Timeline Photos ── */}
              {timelineImages.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-grow bg-black/10 dark:bg-white/10" />
                    <span className="text-[9px] uppercase font-black tracking-widest text-black/40 dark:text-white/40 shrink-0">Timeline Photos</span>
                    <div className="h-px flex-grow bg-black/10 dark:bg-white/10" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 pb-12">
                    {timelineImages.map((imgItem, idx) => (
                      <div key={`timeline-${imgItem.url}-${idx}`} className="flex flex-col group/gallery">
                        {/* Film-photo styled image */}
                        <div
                          className="relative overflow-hidden border border-black/10 dark:border-white/10 cursor-pointer aspect-[4/3]"
                          onClick={() => {
                            const globalIdx = galleryAllUnique.indexOf(imgItem.url);
                            setLightboxIndex(globalIdx !== -1 ? globalIdx : 0);
                            setIsLightboxOpen(true);
                          }}
                        >
                          <img
                            src={imgItem.url}
                            alt={imgItem.place}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/gallery:scale-105"
                          />
                          {/* Film stamp overlay (top-left) */}
                          <div className="absolute top-2 left-2 flex flex-col gap-0.5 z-10 pointer-events-none">
                            {imgItem.date && (
                              <div className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
                                <span className="text-[8px] text-amber-300 font-mono font-bold tracking-widest leading-none">
                                  {imgItem.date.replace(/\./g, '/')}
                                </span>
                              </div>
                            )}
                            {imgItem.place && (
                              <div className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
                                <span className="text-[8px] text-amber-300 font-mono font-bold tracking-widest leading-none truncate block max-w-[160px]">
                                  📍 {imgItem.place}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* TIMELINE badge overlay (top-right) */}
                          <div className="absolute top-2 right-2 z-10 pointer-events-none">
                            <span className="bg-red-600/85 backdrop-blur-sm text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 leading-none">
                              🗓️ TIMELINE
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover/gallery:bg-black/10 transition-colors pointer-events-none" />
                        </div>

                        {/* Memo & note section below the image */}
                        <div className="bg-black/3 dark:bg-white/3 border border-t-0 border-black/10 dark:border-white/10 px-3 py-2 flex flex-col gap-1">
                          {imgItem.memo && (
                            <p className="text-[10px] text-black/70 dark:text-white/70 font-medium leading-relaxed">
                              {imgItem.memo}
                            </p>
                          )}
                          {imgItem.imgNote && (
                            <p className="text-[10px] text-black/50 dark:text-white/50 italic leading-relaxed border-t border-black/5 dark:border-white/5 pt-1">
                              {imgItem.imgNote}
                            </p>
                          )}
                          {!imgItem.memo && !imgItem.imgNote && (
                            <p className="text-[10px] text-black/30 dark:text-white/30 italic">
                              메모 없음
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {galleryMetaImages.length === 0 && timelineImages.length === 0 && (
                <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 갤러리 사진이 없습니다.
                </div>
              )}
            </div>
          )}

          {/* Footer inside Detail scroll container */}
          <div className="w-full shrink-0 pb-16 pt-8 mt-12 border-t border-black/5 dark:border-white/5">
            <Footer />
          </div>
        </div>
      </section>

      {/* Fullscreen Lightbox component */}
      <Lightbox 
        isOpen={isLightboxOpen}
        images={galleryAllMeta}
        currentIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </main>
  );
}
