import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Clock, Plane, Bed, Train, Bus, Car, User, Edit2, Trash2, 
  Image as ImageIcon, ChevronUp, ChevronDown, MapPin, Map, Plus, Loader2, Search, ArrowLeft,
  ExternalLink, MapPinOff, Maximize2, Star, ChevronLeft, ChevronRight, ArrowUp, ArrowDown
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
const dayColors = [
  '#dc2626', // Day 1: Red
  '#2563eb', // Day 2: Blue
  '#16a34a', // Day 3: Green
  '#d97706', // Day 4: Orange/Amber
  '#7c3aed', // Day 5: Purple
  '#db2777', // Day 6: Pink
  '#0891b2', // Day 7: Cyan
  '#4b5563', // Day 8: Gray
];



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
  onNavigate: (view: string, tripId?: number | null, pushHistory?: boolean, tagFilter?: string | null) => void;
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

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
      try {
        const place = autocomplete.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const name = place.name || place.formatted_address || '';
          const address = place.formatted_address || name;
          onSelectPlaceRef.current(name, { lat, lng }, address);
        }
      } catch (err) {
        console.error("Autocomplete select failed:", err);
      }
    });

    return () => {
      if (google && google.maps && google.maps.event && listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, []);

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
          onKeyDown={handleKeyDown}
          className={className}
          placeholder={placeholder}
        />
        <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-35" />
      </div>
    </div>
  );
}

// Date range picker parsing and formatting helpers
const parseDateRange = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('-')) return { start: '', end: '' };
  const parts = dateStr.split('-').map(p => p.trim());
  if (parts.length < 2) return { start: '', end: '' };
  
  const formatToInputDate = (d: string, yearFallback?: string) => {
    let normalized = d.replace(/\./g, '-').replace(/\s+/g, '');
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
  const [collapsedDays, setCollapsedDays] = useState<string[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Edit / Draft state
  const [isEditing, setIsEditing] = useState(false);
  const [draftTrip, setDraftTrip] = useState<Trip | null>(null);
  const [draftTimeline, setDraftTimeline] = useState<TimelineItem[]>([]);
  const [draftFlights, setDraftFlights] = useState<FlightItem[]>([]);
  const [draftStays, setDraftStays] = useState<StayItem[]>([]);
  const [draftTransits, setDraftTransits] = useState<TransitItem[]>([]);
  const [transitSortType, setTransitSortType] = useState<'time' | 'type'>('time');
  const [mapConfirm, setMapConfirm] = useState<{ placeName: string; url: string } | null>(null);

  // Lightbox & Gallery state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGalleryDragActive, setIsGalleryDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [galleryViewMode, setGalleryViewMode] = useState<'grid' | 'accordion'>('grid');
  const [collapsedGalleryDays, setCollapsedGalleryDays] = useState<string[]>([]);

  // Multi-select & map visibilities state
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [hiddenMapItemIds, setHiddenMapItemIds] = useState<number[]>([]);
  const [stayCoords, setStayCoords] = useState<{ [stayId: number]: { lat: number; lng: number } }>({});
  const [transitFocusType, setTransitFocusType] = useState<'depart' | 'arrive' | 'boarding' | null>(null);

  // Frequent places states
  const [frequentPlaces, setFrequentPlaces] = useState<{place: string, location: string, hours: string, lat: number, lng: number}[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('frequentPlaces') || '[]');
    } catch (_) {
      return [];
    }
  });
  const [activePlaceInputId, setActivePlaceInputId] = useState<number | null>(null);

  const tripToUse = isEditing ? draftTrip : trip;
  const generatedDates = generateDateList(tripToUse?.date || '');
  const { start: minDate, end: maxDate } = parseDateRange(tripToUse?.date || '');
  const [airportGeocodedCoords, setAirportGeocodedCoords] = useState<{ [code: string]: { lat: number; lng: number } }>({});
  const tabContentRef = useRef<HTMLDivElement | null>(null);



  // Scroll window and tab container to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (tabContentRef.current) {
      tabContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMapConfirm(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setSelectedItemIds([]);
    }
  }, [isEditing]);

  // Geocode stay addresses & restore from DB
  useEffect(() => {
    if (activeTab === 'stays') {
      const staysToUse = isEditing ? draftStays : stays;
      staysToUse.forEach(async (stay) => {
        // If DB has coordinates, restore immediately
        if (stay.lat !== undefined && stay.lng !== undefined && stay.lat !== null && stay.lng !== null) {
          setStayCoords(prev => {
            if (prev[stay.id] && prev[stay.id].lat === stay.lat && prev[stay.id].lng === stay.lng) {
              return prev;
            }
            return {
              ...prev,
              [stay.id]: { lat: stay.lat!, lng: stay.lng! }
            };
          });
        } else if (stay.address && !stayCoords[stay.id] && stay.address !== '숙소 주소를 입력하세요') {
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
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dateBarRef.current) return;
    isDown.current = true;
    startX.current = e.pageX - dateBarRef.current.offsetLeft;
    scrollLeftRef.current = dateBarRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown.current = false;
  };

  const handleMouseUp = () => {
    isDown.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !dateBarRef.current) return;
    e.preventDefault();
    const x = e.pageX - dateBarRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    dateBarRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const scrollDays = (direction: 'left' | 'right') => {
    const container = dateBarRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    if (direction === 'right') {
      const nextChild = children.find(child => child.offsetLeft > container.scrollLeft + container.clientWidth - 5);
      if (nextChild) {
        container.scrollTo({ left: nextChild.offsetLeft, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
      }
    } else {
      const prevChildren = children.filter(child => child.offsetLeft < container.scrollLeft - 5);
      if (prevChildren.length > 0) {
        const prevChild = prevChildren[prevChildren.length - 1];
        container.scrollTo({ left: prevChild.offsetLeft, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -container.clientWidth * 0.8, behavior: 'smooth' });
      }
    }
  };

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
    if (isEditing) return; // Skip auto-healing when editing to prevent auto-saves during editing
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
  }, [trip, timelineData, generatedDates, isLoggedIn, isEditing]);



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

  // Separate gallery: metadata gallery (from trip.gallery) and timeline images (from timeline items)
  // Normalize gallery entries: string → { url } object
  const galleryMetaImages = useMemo(() => {
    const rawGalleryEntries = tripToUse?.gallery || [];
    return rawGalleryEntries.map(entry =>
      typeof entry === 'string' ? { url: entry } : entry as any
    ) as { url: string; date?: string; time?: string; place?: string; imgNote?: string; lat?: number | null; lng?: number | null; excludeFromMap?: boolean }[];
  }, [tripToUse?.gallery]);

  const timelineImages = useMemo(() => {
    return baseTimeline
      .filter(item => item.img)
      .map(item => ({
        url: item.img as string,
        place: item.place,
        date: item.date || '',
        time: item.time || '',
        memo: item.memo,
        imgNote: item.imgNote || '',
        type: 'timeline' as const,
        itemId: item.id,
        lat: item.lat,
        lng: item.lng,
      }));
  }, [baseTimeline]);

  const allGalleryImages = useMemo(() => {
    const metas = galleryMetaImages.map((g, idx) => ({
      ...g,
      type: 'gallery' as const,
      id: 500000 + idx,
      time: g.time || ''
    }));

    const tls = timelineImages.map((t) => ({
      url: t.url,
      place: t.place,
      date: t.date,
      imgNote: t.imgNote || t.memo || '',
      type: 'timeline' as const,
      id: 600000000 + t.itemId,
      lat: t.lat,
      lng: t.lng,
      time: t.time || '',
      itemId: t.itemId,
      excludeFromMap: false
    }));

    const combined = [...metas, ...tls];
    const seenUrls = new Set<string>();
    const unique = combined.filter(item => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    unique.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      
      if (dateA === dateB) {
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        return timeA - timeB;
      }
      
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      const normalizedA = dateA.replace(/\./g, '-');
      const normalizedB = dateB.replace(/\./g, '-');
      return normalizedA.localeCompare(normalizedB);
    });

    return unique;
  }, [galleryMetaImages, timelineImages]);

  // Combined LightboxImageMeta array matching allGalleryImages sorting
  const galleryAllMeta = useMemo(() => {
    return allGalleryImages.map(item => ({
      url: item.url,
      place: item.place,
      date: item.date,
      imgNote: item.imgNote || '',
      type: item.type,
      memo: item.type === 'timeline' ? (item as any).memo : undefined
    }));
  }, [allGalleryImages]);

  const galleryGroups = useMemo(() => {
    const groups: { [date: string]: typeof allGalleryImages } = {};
    generatedDates.forEach(d => {
      groups[d] = [];
    });
    groups['NO_DATE'] = [];

    allGalleryImages.forEach(img => {
      const dVal = img.date || '';
      if (dVal && groups[dVal]) {
        groups[dVal].push(img);
      } else {
        groups['NO_DATE'].push(img);
      }
    });
    return groups;
  }, [allGalleryImages, generatedDates]);

  // Keep backward compat
  const galleryAllUnique = useMemo(() => {
    return galleryAllMeta.map(m => m.url);
  }, [galleryAllMeta]);

  const timelinePhotoPoints = useMemo(() => {
    const points: any[] = [];
    baseTimeline.forEach((item) => {
      if (item.img && item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) {
        const dayIndex = item.date ? generatedDates.indexOf(item.date) + 1 : 0;
        points.push({
          id: 600000000 + item.id, // unique ID offset for timeline photo pins
          place: item.place || '일정 사진 위치',
          lat: Number(item.lat),
          lng: Number(item.lng),
          time: item.time || '12:00 PM',
          date: item.date || '',
          memo: item.imgNote || item.memo || '일정 사진',
          isPhoto: true,
          photoUrl: item.img,
          dayIndex
        });
      }
    });
    return points;
  }, [baseTimeline, generatedDates]);



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
    // Collect gallery photo points that have valid coordinates
    const galleryMetaImages = (tripToUse?.gallery || []).map(img => {
      if (typeof img === 'string') return { url: img };
      return img;
    });

    const photoPoints: any[] = [];
    galleryMetaImages.forEach((imgMeta, idx) => {
      if (imgMeta.lat !== undefined && imgMeta.lng !== undefined && imgMeta.lat !== null && imgMeta.lng !== null) {
        if (imgMeta.excludeFromMap) return;
        const dayIndex = imgMeta.date ? generatedDates.indexOf(imgMeta.date) + 1 : 0;
        photoPoints.push({
          id: 500000 + idx, // unique ID offset for photo pins
          place: imgMeta.place || '사진 위치',
          lat: Number(imgMeta.lat),
          lng: Number(imgMeta.lng),
          time: imgMeta.time || '12:00 PM', // Fallback time if none
          date: imgMeta.date || '',
          memo: imgMeta.imgNote || '갤러리 사진',
          isPhoto: true,
          photoUrl: imgMeta.url,
          dayIndex
        });
      }
    });

    if (activeTab === 'timeline') {
      const timelinePoints = currentTimeline
        .filter(item => !item.excludeFromMap)
        .map(item => {
          const dayIndex = item.date ? generatedDates.indexOf(item.date) + 1 : 0;
          return {
            ...item,
            lat: item.lat !== undefined && item.lat !== null ? Number(item.lat) : undefined,
            lng: item.lng !== undefined && item.lng !== null ? Number(item.lng) : undefined,
            dayIndex
          };
        });

      // Add photo points if they match the selectedDate (or ALL)
      const visiblePhotoPoints = photoPoints.filter(p => {
        if (selectedDate === 'ALL') return true;
        return p.date === selectedDate;
      });

      // Combine and sort by date first, then by time
      const combined = [...timelinePoints, ...visiblePhotoPoints];
      combined.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });
      return combined;
    } else if (activeTab === 'gallery') {
      // Use the outer timelinePhotoPoints (which contains all photo points unfiltered)
      const allPhotoPoints = [...photoPoints, ...timelinePhotoPoints];
      // Do NOT filter by selectedDate. Keep "View All" on the map consistently.
      // Sort photos by date first, then by time to construct chronological photo paths
      allPhotoPoints.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });
      return allPhotoPoints;
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
            transitId: t.id,
            transitType: t.transitType || 'train'
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
            transitId: t.id,
            transitType: t.transitType || 'train'
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

    // Check if it's a gallery photo click or timeline photo click from the map
    if (targetId >= 500000 && targetId < 600000) {
      setActiveTab('gallery');
    } else if (targetId >= 600000000 && targetId < 700000000) {
      setActiveTab('gallery');
    }

    setExpandedItemId(prevId => prevId === targetId ? null : targetId);
    if (expandedItemId !== targetId && itemRefs.current[targetId]) {
      setTimeout(() => {
        itemRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleJumpToTimelineItem = (itemId: number, date: string) => {
    setActiveTab('timeline');
    if (date) {
      setSelectedDate(date);
    } else {
      setSelectedDate('ALL');
    }
    setExpandedItemId(itemId);
    setTimeout(() => {
      const el = itemRefs.current[itemId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
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

  // Frequent places helpers
  const toggleFrequentPlace = (item: TimelineItem) => {
    const exists = frequentPlaces.some(p => p.place === item.place);
    let updated;
    if (exists) {
      updated = frequentPlaces.filter(p => p.place !== item.place);
    } else {
      updated = [
        ...frequentPlaces,
        {
          place: item.place,
          location: item.location || '',
          hours: item.hours || '',
          lat: item.lat !== undefined ? Number(item.lat) : 0,
          lng: item.lng !== undefined ? Number(item.lng) : 0
        }
      ];
    }
    setFrequentPlaces(updated);
    localStorage.setItem('frequentPlaces', JSON.stringify(updated));
  };

  const isFrequent = (place: string) => {
    return frequentPlaces.some(p => p.place === place);
  };

  const handleSelectFrequent = (item: TimelineItem, fp: typeof frequentPlaces[0]) => {
    updateTimelineItemFields(item.id, {
      place: fp.place,
      location: fp.location || '',
      hours: fp.hours || '',
      lat: fp.lat,
      lng: fp.lng
    });
    setActivePlaceInputId(null);
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

    // 해당 날짜의 기존 일정 중에서 가장 늦은 시간 계산하여 10분 뒤로 기본 지정
    const sameDateItems = (isEditing ? draftTimeline : baseTimeline).filter(item => item.date === date);
    let defaultTime = '12:00 PM';
    if (sameDateItems.length > 0) {
      const sortedTimes = sameDateItems
        .map(item => parseTimeToMinutes(item.time))
        .sort((a, b) => b - a); // 내림차순 정렬
      const maxMinutes = sortedTimes[0];
      const newMinutes = Math.min(1439, maxMinutes + 10);
      defaultTime = minutesToTimeStr(newMinutes);
    }

    const newItem: TimelineItem = {
      id: newId,
      time: defaultTime,
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
    let defaultFrom = 'ICN';
    let defaultTo = 'KIX';
    let defaultFromTerminal = 'TERMINAL T1';
    let defaultToTerminal = 'TERMINAL T1';
    let defaultPnr = '000000';

    const outbound = draftFlights.find(f => f.title.toUpperCase().includes('OUTBOUND') || f.fromCode !== 'ICN');

    if (title.toUpperCase().includes('INBOUND') && outbound) {
      defaultFrom = outbound.toCode || 'KIX';
      defaultTo = outbound.fromCode || 'ICN';
      defaultFromTerminal = outbound.toTerminal || 'TERMINAL T1';
      defaultToTerminal = outbound.fromTerminal || 'TERMINAL T1';
      defaultPnr = outbound.pnr || '000000';
    } else if (title.toUpperCase().includes('OUTBOUND') && draftFlights.length > 0) {
      const inbound = draftFlights.find(f => f.title.toUpperCase().includes('INBOUND'));
      if (inbound) {
        defaultFrom = inbound.toCode || 'ICN';
        defaultTo = inbound.fromCode || 'KIX';
        defaultFromTerminal = inbound.toTerminal || 'TERMINAL T1';
        defaultToTerminal = inbound.fromTerminal || 'TERMINAL T1';
        defaultPnr = inbound.pnr || '000000';
      }
    } else if (title.toUpperCase().includes('LAYOVER') && draftFlights.length > 0) {
      // Chaining layover flight
      const sortedExisting = [...draftFlights].sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '');
        if (dComp !== 0) return dComp;
        return (a.fromTime || '').localeCompare(b.fromTime || '');
      });
      const lastFlight = sortedExisting[sortedExisting.length - 1];
      defaultFrom = lastFlight.toCode || 'ICN';
      defaultTo = lastFlight.fromCode || 'ICN';
      defaultFromTerminal = lastFlight.toTerminal || 'TERMINAL T1';
      defaultToTerminal = lastFlight.fromTerminal || 'TERMINAL T1';
      defaultPnr = lastFlight.pnr || '000000';
    }

    const newFlight: FlightItem = {
      id: Date.now(),
      title: title,
      date: 'YYYY.MM.DD',
      fromCode: defaultFrom,
      fromTerminal: defaultFromTerminal,
      fromTime: '08:00 AM',
      toCode: defaultTo,
      toTerminal: defaultToTerminal,
      toTime: '10:00 AM',
      flightNo: 'KE000',
      seat: '00A',
      pnr: defaultPnr,
      tripId: trip.id
    };
    setDraftFlights(prev => [...prev, newFlight]);
  };

  const updateStay = (id: number, field: keyof StayItem, val: any) => {
    setDraftStays(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };
  const updateStayPlace = (id: number, address: string, coords: { lat: number; lng: number } | null) => {
    setDraftStays(prev => prev.map(s => s.id === id ? { 
      ...s, 
      address,
      lat: coords ? coords.lat : undefined,
      lng: coords ? coords.lng : undefined
    } : s));
    if (coords) {
      setStayCoords(prev => ({
        ...prev,
        [id]: coords
      }));
    }
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

  const updateTransit = (id: number, fieldOrFields: keyof TransitItem | Partial<TransitItem>, val?: any) => {
    setDraftTransits(prev => prev.map(t => {
      if (t.id === id) {
        let updated = { ...t };
        if (typeof fieldOrFields === 'object') {
          updated = { ...updated, ...fieldOrFields };
        } else {
          updated = { ...updated, [fieldOrFields]: val };
        }
        
        // Sync ticketType and transitType
        if (typeof fieldOrFields === 'string') {
          if (fieldOrFields === 'ticketType') {
            const typeUpper = (val || '').toUpperCase();
            if (typeUpper.includes('BUS')) {
              updated.transitType = 'bus';
            } else if (typeUpper.includes('TAXI') || typeUpper.includes('CAR')) {
              updated.transitType = 'taxi';
            } else {
              updated.transitType = 'train';
            }
          }
        } else {
          if ('ticketType' in fieldOrFields) {
            const typeUpper = (fieldOrFields.ticketType || '').toUpperCase();
            if (typeUpper.includes('BUS')) {
              updated.transitType = 'bus';
            } else if (typeUpper.includes('TAXI') || typeUpper.includes('CAR')) {
              updated.transitType = 'taxi';
            } else {
              updated.transitType = 'train';
            }
          }
        }
        return updated;
      }
      return t;
    }));
  };
  const deleteTransit = (id: number) => {
    setDraftTransits(prev => prev.filter(t => t.id !== id));
  };
  const handleAddTransit = (type: 'train' | 'bus' | 'taxi') => {
    const ticketType = type === 'train' ? 'TRAIN TICKET' : type === 'bus' ? 'BUS TICKET' : 'TAXI TICKET';
    const title = type === 'train' ? 'Train' : type === 'bus' ? 'Bus' : 'Taxi';
    const route = type === 'taxi' ? '출발지 → 도착지' : '출발역 → 도착역';
    const bookingRef = type === 'train' ? 'TRN-000' : type === 'bus' ? 'BUS-000' : 'TX-000';
    const seat = type === 'taxi' ? 'N/A' : 'Car 0, 00A';

    const newTransit: TransitItem = {
      id: Date.now(),
      ticketType,
      transitType: type,
      date: 'YYYY.MM.DD',
      title,
      route,
      time: '12:00 PM',
      seat,
      bookingRef,
      memo: '',
    };
    setDraftTransits(prev => [...prev, newTransit]);
  };

  // Gallery actions with image compression + EXIF metadata extraction
  const processGalleryFiles = async (files: FileList | File[]) => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인 상태에서만 업로드할 수 있습니다.");
      return;
    }

    setUploadingImage(true);
    try {
      const newEntries: (string | { url: string; date?: string; place?: string })[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // 1. Extract EXIF BEFORE compressing (canvas strips metadata)
        const exif = await readExif(file);
        let exifDate: string | undefined;
        let exifTime: string | undefined;
        let exifPlace: string | undefined;

        if (exif.dateTime) {
          // Format YYYY:MM:DD HH:MM:SS → YYYY.MM.DD
          exifDate = exif.dateTime.slice(0, 10).replace(/:/g, '.');
          exifTime = exif.dateTime.slice(11, 16); // "HH:MM"
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

        // 3. Build GalleryImageMeta
        const defaultDate = generatedDates[0] || '';
        const finalDate = (exifDate && generatedDates.includes(exifDate)) ? exifDate : defaultDate;

        const newEntry = {
          url,
          date: finalDate,
          time: exifTime || '12:00 PM',
          place: exifPlace || '',
          lat: exif.latitude !== undefined ? exif.latitude : null,
          lng: exif.longitude !== undefined ? exif.longitude : null,
          imgNote: ''
        };
        
        newEntries.push(newEntry);
      }

      if (newEntries.length === 0) return;

      if (isEditing && draftTrip) {
        const currentGallery = draftTrip.gallery || [];
        setDraftTrip({ ...draftTrip, gallery: [...currentGallery, ...newEntries] });
      } else {
        const currentGallery = trip.gallery || [];
        const updatedGallery = [...currentGallery, ...newEntries];
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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processGalleryFiles(e.target.files);
    }
  };

  const handleGalleryDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggedIn) {
      setIsGalleryDragActive(true);
    }
  };

  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggedIn) {
      setIsGalleryDragActive(true);
    }
  };

  const handleGalleryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGalleryDragActive(false);
  };

  const handleGalleryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGalleryDragActive(false);

    if (isLoggedIn && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (filesArray.length > 0) {
        await processGalleryFiles(filesArray);
      } else {
        alert("이미지 파일만 업로드할 수 있습니다.");
      }
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

    const filterGallery = (gallery: (string | any)[]) =>
      gallery.filter(item => {
        const itemUrl = typeof item === 'string' ? item : item.url;
        return itemUrl !== imageUrl;
      });

    if (isEditing && draftTrip) {
      const currentGallery = draftTrip.gallery || [];
      setDraftTrip({ ...draftTrip, gallery: filterGallery(currentGallery) });
    } else {
      const currentGallery = trip.gallery || [];
      const updatedGallery = filterGallery(currentGallery);
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

  const handleToggleGalleryImagePin = async (imageUrl: string, exclude: boolean) => {
    const updateGallery = (gallery: (string | any)[]): (string | any)[] =>
      gallery.map(item => {
        if (typeof item === 'string') return { url: item, excludeFromMap: exclude };
        return item.url === imageUrl ? { ...item, excludeFromMap: exclude } : item;
      });

    if (isEditing && draftTrip) {
      setDraftTrip({ ...draftTrip, gallery: updateGallery(draftTrip.gallery || []) });
    } else {
      const currentGallery = trip.gallery || [];
      const updatedGallery = updateGallery(currentGallery);
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

  // galleryMetaImages, timelineImages, galleryAllMeta, galleryAllUnique variables are now declared at the top of the component.

  // Render Info Header helper function to avoid duplicating code between desktop and mobile layouts
  const renderInfoHeader = (isMobile: boolean) => (
    <div className={`p-3 md:py-4 md:px-6 border-b border-black/20 dark:border-white/20 z-10 bg-[#F9F8F6] dark:bg-[#111111] transition-colors shrink-0 ${isMobile ? 'block md:hidden' : 'hidden md:block'}`}>
      
      {/* Back to hub & Metadata row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <button
          onClick={() => {
            const isPlan = trip?.tags.includes('Plan') || trip?.title.includes('(Plan)');
            onNavigate(isPlan ? 'plan' : 'archive');
          }}
          className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          title="Go back to Hub"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to { (trip?.tags.includes('Plan') || trip?.title.includes('(Plan)')) ? 'Plans' : 'Archive' }
        </button>
        
        <div className="flex items-center space-x-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 transition-colors">
          {isEditing && draftTrip ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={parseDateRange(draftTrip.date).start}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-[9px] md:text-[10px] text-black dark:text-white rounded-none border border-black/10 dark:border-white/10"
                />
                <span>—</span>
                <input
                  type="date"
                  value={parseDateRange(draftTrip.date).end}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-[9px] md:text-[10px] text-black dark:text-white rounded-none border border-black/10 dark:border-white/10"
                />
              </div>
              <span>—</span>
              <div className="w-32 md:w-40">
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
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[9px] md:text-[10px] text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
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
      </div>
      
      {/* Journey Title & Edit controls row */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-grow">
          {isEditing && draftTrip ? (
            <input
              type="text"
              value={draftTrip.title}
              onChange={(e) => setDraftTrip({ ...draftTrip, title: e.target.value })}
              className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none bg-[#EAE8E3] dark:bg-white/10 border border-black/10 dark:border-white/10 p-1.5 outline-none w-full text-black dark:text-white"
              placeholder="JOURNEY TITLE"
            />
          ) : (
            <h1 
              className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none break-keep"
              style={{ wordBreak: 'keep-all' }}
            >
              {(trip.title || '').replace(' (Plan)', '')}
            </h1>
          )}
        </div>
        
        {isLoggedIn && (
          <div className="shrink-0 flex items-center gap-1.5">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-2.5 py-1.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all text-black/60 dark:text-white/60 cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEditing}
                className="px-2.5 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-[9px] font-black uppercase tracking-widest rounded-sm transition-all cursor-pointer"
              >
                Edit Journey
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Tags row */}
      {isEditing && draftTrip ? (
        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
          {(draftTrip.tags || []).filter(t => t !== 'Personal').map(tag => (
            <span
              key={tag}
              className="text-[8px] md:text-[9px] font-bold border border-orange-500/50 dark:border-orange-400/50 px-2.5 py-0.5 uppercase rounded-full flex items-center gap-1 bg-orange-500/5 dark:bg-orange-400/5 text-orange-600 dark:text-orange-400 shadow-sm"
            >
              #{tag}
              <button
                type="button"
                onClick={() => {
                  const updatedTags = draftTrip.tags.filter(t => t !== tag);
                  setDraftTrip({ ...draftTrip, tags: updatedTags });
                }}
                className="hover:text-red-500 transition-colors font-bold text-[9px] px-0.5 shrink-0 cursor-pointer"
                title="태그 삭제"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="+ Tag"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const val = e.currentTarget.value.trim().replace(/#/g, '');
                if (val && !draftTrip.tags.includes(val)) {
                  const updatedTags = [...draftTrip.tags, val];
                  setDraftTrip({ ...draftTrip, tags: updatedTags });
                  e.currentTarget.value = '';
                }
              }
            }}
            className="text-[8px] md:text-[9px] font-bold border border-black/20 dark:border-white/20 px-2.5 py-0.5 rounded-full bg-transparent outline-none w-16 focus:w-24 focus:border-orange-500 transition-all duration-200 text-black dark:text-white"
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(tripToUse?.tags || []).filter(t => t !== 'Personal').map(tag => {
            const isPlan = trip?.tags.includes('Plan') || trip?.title.includes('(Plan)');
            return (
              <button
                key={tag}
                onClick={() => onNavigate(isPlan ? 'plan' : 'archive', null, true, tag)}
                className="text-[8px] md:text-[9px] font-bold border border-black/20 dark:border-white/20 px-2 py-0.5 uppercase rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:border-black dark:hover:border-white transition-all duration-200 cursor-pointer shadow-sm"
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <main className="animate-in slide-in-from-right-8 duration-500 flex flex-col md:flex-row h-full w-full overflow-hidden">
      
      {/* Left: Map & Info Section */}
      <section className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-black/20 dark:border-white/20 relative transition-colors duration-300 md:h-full max-md:h-[35dvh] shrink-0">
        {renderInfoHeader(false)}
        
        {/* Dynamic Map Area */}
        <div className="w-full relative md:pb-6 flex flex-col flex-grow h-full">
          <ErrorBoundary fallback={
            <div className="flex-grow flex flex-col items-center justify-center bg-[#EAE8E3] dark:bg-[#1A1A1A] text-black/40 dark:text-white/40 p-6 relative h-full w-full">
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
              selectedDate={activeTab === 'gallery' ? 'ALL' : selectedDate}
              isDarkMode={isDarkMode}
              activeTab={activeTab}
              transitFocusType={transitFocusType}
              transits={isEditing ? draftTransits : transits}
            />
          </ErrorBoundary>
        </div>
      </section>
      
      {/* Right: Record / Tabs Section */}
      <section className="w-full md:w-1/2 flex flex-col bg-[#F9F8F6] dark:bg-[#111111] transition-colors duration-300 flex-grow md:h-full overflow-hidden">
        
        {/* Tab Headers */}
        <div className="flex overflow-x-auto hide-scrollbar flex-nowrap border-b border-black/20 dark:border-white/20 bg-[#F9F8F6] dark:bg-[#111111] transition-colors shrink-0 w-full">
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
              className={`flex-1 min-w-[75px] sm:min-w-0 py-2.5 px-0.5 sm:px-2 md:py-4 md:px-4 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 md:gap-2 text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider md:tracking-widest border-r border-black/20 dark:border-white/20 last:border-r-0 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white'}`}
            >
              <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 shrink-0" /> 
              <span className="text-center truncate sm:overflow-visible">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div 
          ref={tabContentRef}
          className="flex-grow flex flex-col relative overflow-y-auto overflow-x-hidden w-full h-full bg-[#F9F8F6] dark:bg-[#111111]"
        >
          {renderInfoHeader(true)}
          
          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="animate-in fade-in duration-300 h-auto flex flex-col w-full relative">
              {/* Day filter selector bar */}
              <div className="relative border-b border-black/20 dark:border-white/20 bg-[#F9F8F6] dark:bg-[#111111] transition-colors shrink-0 w-full flex items-center">
                {/* Scroll buttons for desktop/web */}
                <button 
                  onClick={() => scrollDays('left')}
                  className="absolute left-0 top-0 bottom-0 px-2 bg-gradient-to-r from-[#F9F8F6] via-[#F9F8F6] to-transparent dark:from-[#111111] dark:via-[#111111] z-10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div 
                  ref={dateBarRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  className="flex overflow-x-auto hide-scrollbar w-full scroll-smooth select-none cursor-grab active:cursor-grabbing px-6"
                >
                  {dynamicDates.map((d) => (
                    <button 
                      key={d.id} 
                      data-active={selectedDate === d.date}
                      onClick={() => { setSelectedDate(d.date); setExpandedItemId(null); }} 
                      className={`flex-1 min-w-[90px] md:min-w-[110px] py-2.5 md:py-3.5 px-3 md:px-4 flex flex-col items-center justify-center border-r border-black/20 dark:border-white/20 last:border-r-0 transition-all whitespace-nowrap ${selectedDate === d.date ? 'bg-black text-[#F9F8F6] dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white'}`}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
                        {d.label}
                      </span>
                      <span className="text-[11px] md:text-xs font-black tracking-tighter">{d.date === 'ALL' ? 'VIEW ALL' : d.date.slice(5).replace('.', '/')}</span>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => scrollDays('right')}
                  className="absolute right-0 top-0 bottom-0 px-2 bg-gradient-to-l from-[#F9F8F6] via-[#F9F8F6] to-transparent dark:from-[#111111] dark:via-[#111111] z-10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {!isLoggedIn && (
                <div className="bg-black/5 dark:bg-white/10 px-4 py-1.5 text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-center flex items-center justify-center gap-2 shrink-0 w-full">
                  <User className="w-3 h-3 shrink-0" /> <span className="truncate">로그인 후 기록을 수정하거나 새 일정을 추가할 수 있습니다.</span>
                </div>
              )}

              {/* Timeline Items List */}
              <div className="flex flex-col pb-20 w-full relative">
                {selectedDate === 'ALL' && currentTimeline.length > 0 && (
                  <div className="flex justify-end px-4 md:px-6 py-2 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 shrink-0 select-none">
                    <button
                      onClick={() => {
                        if (collapsedDays.length === generatedDates.length) {
                          setCollapsedDays([]);
                        } else {
                          setCollapsedDays([...generatedDates]);
                        }
                      }}
                      className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      {collapsedDays.length === generatedDates.length ? '▼ EXPAND ALL DAYS' : '▲ COLLAPSE ALL DAYS'}
                    </button>
                  </div>
                )}
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
                    const dayColor = dayIndex > 0 ? dayColors[(dayIndex - 1) % dayColors.length] : undefined;
                    return (
                      <div key={item.id} className="w-full flex flex-col">
                        {showDivider && (
                          <div 
                            id={`date-section-${item.date}`}
                            data-date-section={item.date}
                            onClick={() => {
                              const dVal = item.date || '';
                              if (collapsedDays.includes(dVal)) {
                                setCollapsedDays(prev => prev.filter(d => d !== dVal));
                              } else {
                                setCollapsedDays(prev => [...prev, dVal]);
                              }
                            }}
                            className="bg-[#EAE8E3]/60 dark:bg-white/5 py-2.5 px-4 md:px-6 border-b border-t border-black/10 dark:border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-widest text-black/60 dark:text-white/60 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none"
                          >
                            <span>Day {dayIndex} — {item.date}</span>
                            <span className="text-[8px] md:text-[9px] font-black text-black/40 dark:text-white/40 flex items-center gap-1">
                              {collapsedDays.includes(item.date || '') ? '▼ EXPAND' : '▲ COLLAPSE'}
                            </span>
                          </div>
                        )}
                        <div 
                          ref={el => { itemRefs.current[item.id] = el; }} 
                          className={`flex flex-col border-b border-black/10 dark:border-white/10 transition-all w-full ${isActive ? 'bg-red-500/[0.02] dark:bg-red-500/[0.02] border-l-2 border-l-red-600 dark:border-l-red-400' : 'border-l-2 border-l-transparent'} ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''} ${collapsedDays.includes(item.date || '') && selectedDate === 'ALL' ? 'hidden' : ''}`}
                          draggable={isEditing}
                          onDragStart={() => setDraggedItemId(item.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropTimelineItem(item.id)}
                        >
                          <div 
                            className="group flex flex-row items-start py-4 px-4 md:py-5 md:px-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer relative w-full" 
                            onClick={() => handleItemToggle(item.id)}
                          >
                            {/* Checkbox for batch select & Delete button */}
                            {isEditing && (
                              <div className="mr-3 mt-1.5 shrink-0 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
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
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTimelineItem(item.id)}
                                  className="text-red-500 hover:text-red-700 p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                  title="일정 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            {/* Time */}
                            <div className={`shrink-0 text-[10px] md:text-xs font-bold tracking-widest mt-1 transition-colors ${isActive ? 'text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60'} ${isEditing ? 'w-24 md:w-28 flex flex-col gap-1' : 'w-16 md:w-24 flex flex-col gap-1.5'}`}>
                              {isEditing ? (
                                <div className="flex flex-col gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="time"
                                    value={timeStrTo24h(item.time)}
                                    onChange={(e) => {
                                      const val24h = e.target.value;
                                      if (!val24h) return;
                                      updateTimelineItem(item.id, 'time', time24hTo12h(val24h));
                                    }}
                                    className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none font-bold text-[9px] md:text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full text-center animate-in fade-in duration-300"
                                  />
                                  <select
                                    value={item.date}
                                    onChange={(e) => {
                                      const newDate = e.target.value;
                                      updateTimelineItem(item.id, 'date', newDate);
                                      setSelectedDate(newDate);
                                    }}
                                    className="bg-[#EAE8E3] dark:bg-white/10 border border-black/10 dark:border-white/10 text-[9px] md:text-xs font-bold p-0.5 outline-none text-black dark:text-white rounded-none w-full text-center animate-in fade-in duration-300"
                                  >
                                    {generatedDates.map(d => (
                                      <option key={d} value={d}>{d.slice(5).replace('.', '/')}</option>
                                    ))}
                                  </select>
                                  
                                  {/* Map Pin visibility toggle inline */}
                                  {(item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) && (
                                    <button
                                      onClick={() => handleToggleExcludeFromMap(item)}
                                      className={`flex items-center justify-center py-0.5 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full mt-0.5 ${
                                        isExcluded
                                          ? 'text-black/20 dark:text-white/20'
                                          : 'hover:opacity-80'
                                      }`}
                                      style={!isExcluded && dayColor ? { color: dayColor, borderColor: dayColor } : undefined}
                                      title={isExcluded ? "지도에 표시하기" : "지도에서 제외하기"}
                                    >
                                      {isExcluded ? <MapPinOff className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" style={dayColor ? { color: dayColor } : undefined} />}
                                      <span className="text-[7px] md:text-[8px] font-bold ml-1">{isExcluded ? "OFF" : "ON"}</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <span>{item.time}</span>
                                  </div>
                                  <div className="flex flex-col mt-0.5" onClick={(e) => e.stopPropagation()}>
                                    {selectedDate === 'ALL' && (
                                      <span className="text-[9px] block font-bold leading-none mt-0.5" style={{ color: dayColor || 'inherit' }}>
                                        D{dayIndex} {item.date ? item.date.slice(5).replace('.', '/') : ''}
                                      </span>
                                    )}
                                    
                                    {/* Map Pin visibility toggle in view mode */}
                                    {(item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) && (
                                      <button
                                        onClick={() => handleToggleExcludeFromMap(item)}
                                        className={`flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest transition-colors mt-1.5 ${
                                          isExcluded
                                            ? 'text-black/20 dark:text-white/20 hover:text-black/45 dark:hover:text-white/45'
                                            : 'hover:opacity-80'
                                        }`}
                                        style={!isExcluded && dayColor ? { color: dayColor } : undefined}
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
                                  </div>
                                </>
                              )}
                            </div>

                          {/* Details */}
                          <div className="flex-grow pr-2 md:pr-4 min-w-0">
                            <div className={`font-bold tracking-tight text-sm md:text-base flex items-center gap-2 flex-wrap ${isActive ? 'text-red-600 dark:text-red-400' : ''}`}>
                              {isEditing ? (
                                <TimelineItemPlaceInput
                                  itemId={item.id}
                                  initialValue={item.place}
                                  onUpdatePlace={(id, val) => updateTimelineItem(id, 'place', val)}
                                  frequentPlaces={frequentPlaces}
                                  onSelectFrequent={handleSelectFrequent}
                                  toggleFrequentPlace={toggleFrequentPlace}
                                  isFrequent={isFrequent}
                                  item={item}
                                />
                              ) : (
                                <span>{item.place}</span>
                              )}
                              {isActive ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4 text-current shrink-0" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-black/40 dark:text-white/40 shrink-0" />}
                            </div>
                            
                            <div className="mt-1">
                              {isEditing ? (
                                <textarea
                                  key={`memo-${item.id}-${item.memo || ''}`}
                                  defaultValue={item.memo}
                                  onBlur={(e) => updateTimelineItem(item.id, 'memo', e.target.value)}
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
                              <div className="flex items-center gap-3.5 mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-[10px] md:text-xs font-bold uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>
                                 <button 
                                   type="button"
                                   className="flex items-center gap-1 text-black dark:text-white hover:opacity-75 transition-opacity" 
                                   onClick={() => handleAddTimelineItemRelativeTo(item.id, 'above')}
                                 >
                                   <ArrowUp className="w-3.5 h-3.5"/> Add
                                 </button>
                                 <button 
                                   type="button"
                                   className="flex items-center gap-1 text-black dark:text-white hover:opacity-75 transition-opacity" 
                                   onClick={() => handleAddTimelineItemRelativeTo(item.id, 'below')}
                                 >
                                   <ArrowDown className="w-3.5 h-3.5"/> Add
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
                                  key={`cost-${item.id}-${item.cost}`}
                                  type="text"
                                  defaultValue={item.cost}
                                  onBlur={(e) => updateTimelineItem(item.id, 'cost', e.target.value)}
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
                                    setActiveTab('gallery');
                                    setExpandedItemId(600000000 + item.id);
                                    setTimeout(() => {
                                      const el = itemRefs.current[600000000 + item.id];
                                      if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                    }, 300);
                                  }
                                }}
                              >
                                <img src={item.img} alt={item.place} className={`w-full h-full object-cover transition-all ${isActive ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} />
                                {/* Red dot badge: mark as timeline-attached photo */}
                                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-600 rounded-full border border-white dark:border-black shadow z-10" />
                                <ImageEditOverlay 
                                  isEditMode={isEditing} 
                                  hasImage={true}
                                  onImageRemoved={() => {
                                    updateTimelineItemFields(item.id, { img: '' });
                                  }}
                                  onImageUploaded={async (url, gps) => {
                                    if (gps) {
                                      let addr = '';
                                      try {
                                        addr = await fetchAddressFromCoords(gps.lat, gps.lng) || '';
                                      } catch (e) {
                                        console.warn(e);
                                      }
                                      updateTimelineItemFields(item.id, { 
                                        img: url, 
                                        lat: gps.lat, 
                                        lng: gps.lng,
                                        location: addr || item.location,
                                        place: addr ? addr.split(',')[0].trim() : item.place
                                      });
                                    } else {
                                      updateTimelineItemFields(item.id, { img: url });
                                    }
                                  }} 
                                />
                              </div>
                            ) : (
                              <div className={`w-10 h-10 md:w-12 md:h-12 border bg-black/5 dark:bg-white/5 flex items-center justify-center transition-colors relative ${isActive ? 'border-red-600 dark:border-red-400 text-red-600 scale-110 origin-right' : 'border-black/10 dark:border-white/10'}`}>
                                <ImageIcon className="w-3 h-3 md:w-4 md:h-4" />
                                <ImageEditOverlay 
                                  isEditMode={isEditing} 
                                  hasImage={false}
                                  onImageUploaded={async (url, gps) => {
                                    if (gps) {
                                      let addr = '';
                                      try {
                                        addr = await fetchAddressFromCoords(gps.lat, gps.lng) || '';
                                      } catch (e) {
                                        console.warn(e);
                                      }
                                      updateTimelineItemFields(item.id, { 
                                        img: url, 
                                        lat: gps.lat, 
                                        lng: gps.lng,
                                        location: addr || item.location,
                                        place: addr ? addr.split(',')[0].trim() : item.place
                                      });
                                    } else {
                                      updateTimelineItemFields(item.id, { img: url });
                                    }
                                  }} 
                                />
                              </div>
                            )
                           }
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
                                        // Use a small delay to let onSelectPlace write coords first if a place was selected
                                        setTimeout(async () => {
                                          const currentItem = (isEditing ? draftTimeline : baseTimeline).find((t: any) => t.id === item.id);
                                          if (!currentItem) return;

                                          if (
                                            currentItem.location &&
                                            currentItem.location.trim() !== '' &&
                                            (currentItem.lat === undefined || currentItem.lat === null || currentItem.lng === undefined || currentItem.lng === null)
                                          ) {
                                            const coords = await fetchCoordinates(currentItem.location);
                                            if (coords) {
                                              updateTimelineItemFields(currentItem.id, {
                                                lat: coords.lat,
                                                lng: coords.lng,
                                              });
                                            }
                                          }
                                        }, 200);
                                      }}
                                      onSelectPlace={(name, coords, address) => {
                                        // Atomic update: location (name) + lat + lng in one setState
                                        updateTimelineItemFields(item.id, {
                                          location: name || address,
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
                                      <button
                                        type="button"
                                        className="text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1 text-left cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location || '')}`;
                                          setMapConfirm({ placeName: item.location || '', url });
                                        }}
                                      >
                                        {item.location}
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </button>
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
                                    key={`hours-${item.id}-${item.hours || ''}`}
                                    type="text"
                                    defaultValue={item.hours || ''}
                                    onBlur={(e) => updateTimelineItem(item.id, 'hours', e.target.value)}
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
                                      key={`imgnote-${item.id}-${item.imgNote || ''}`}
                                      type="text"
                                      defaultValue={item.imgNote || ''}
                                      onBlur={(e) => updateTimelineItem(item.id, 'imgNote', e.target.value)}
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

                const getFlightGroup = (f: FlightItem): 'outbound' | 'inbound' => {
                  const fTitle = f.title.toUpperCase();
                  if (fTitle.includes('OUTBOUND')) return 'outbound';
                  if (fTitle.includes('INBOUND')) return 'inbound';
                  
                  if (minDate && maxDate && f.date && f.date !== 'YYYY.MM.DD') {
                    const startMs = new Date(minDate).getTime();
                    const endMs = new Date(maxDate).getTime();
                    const fDateStr = f.date.replace(/\./g, '-');
                    const fMs = new Date(fDateStr).getTime();
                    if (!isNaN(startMs) && !isNaN(endMs) && !isNaN(fMs)) {
                      const midMs = (startMs + endMs) / 2;
                      return fMs <= midMs ? 'outbound' : 'inbound';
                    }
                  }
                  return 'outbound';
                };

                const outbound = sorted.filter(f => getFlightGroup(f) === 'outbound');
                const inbound = sorted.filter(f => getFlightGroup(f) === 'inbound');

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
                              minDate={minDate}
                              maxDate={maxDate}
                              onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
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
                    onClick={() => handleAddFlight('LAYOVER FLIGHT')} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Layover Flight
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
                      onSelectPlace={updateStayPlace}
                      onDelete={deleteStay} 
                      isActive={expandedItemId === stay.id}
                      minDate={minDate}
                      maxDate={maxDate}
                      onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
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
              {/* Sort Type Control */}
              <div className="flex justify-end gap-2 mb-4 text-[9px] md:text-[10px] font-bold uppercase tracking-widest select-none">
                <button 
                  onClick={() => setTransitSortType('time')} 
                  className={`px-2.5 py-1 border transition-colors rounded-sm ${transitSortType === 'time' ? 'bg-black text-[#F9F8F6] dark:bg-white dark:text-black border-black dark:border-white' : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'}`}
                >
                  탑승시간순
                </button>
                <button 
                  onClick={() => setTransitSortType('type')} 
                  className={`px-2.5 py-1 border transition-colors rounded-sm ${transitSortType === 'type' ? 'bg-black text-[#F9F8F6] dark:bg-white dark:text-black border-black dark:border-white' : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'}`}
                >
                  탑승종류순
                </button>
              </div>

              {(() => {
                const rawTransitList = isEditing ? draftTransits : transits;
                if (rawTransitList.length === 0) {
                  return (
                    <div className="text-center py-12 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                      등록된 교통편이 없습니다.
                    </div>
                  );
                }

                // YYYY.MM.DD 기본값인 티켓은 정렬 시 맨 하단으로 미는 정렬 헬퍼
                const sortTransits = (list: TransitItem[]) => {
                  return [...list].sort((a, b) => {
                    const isBasicA = !a.date || a.date === 'YYYY.MM.DD';
                    const isBasicB = !b.date || b.date === 'YYYY.MM.DD';
                    if (isBasicA && !isBasicB) return 1;
                    if (!isBasicA && isBasicB) return -1;
                    if (isBasicA && isBasicB) return a.id - b.id; // 생성순 (ID)

                    const dateA = a.date || '';
                    const dateB = b.date || '';
                    if (dateA !== dateB) {
                      return dateA.localeCompare(dateB);
                    }
                    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
                  });
                };

                const transitList = sortTransits(rawTransitList);

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
                              minDate={minDate}
                              maxDate={maxDate}
                              onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
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

                if (transitSortType === 'time') {
                  // 탑승시간순 정렬: Train/Bus/Taxi 묶지 않고 시간순으로 정렬된 전체 리스트를 하나의 그룹으로 렌더링
                  return (
                    <div className="flex flex-col text-left">
                      {renderGroup(transitList, 'Transit Schedule', Train)}
                    </div>
                  );
                } else {
                  // 탑승종류순 정렬: 기존과 같이 Train / Bus / Taxi 분류
                  const trains = transitList.filter(t => t.transitType === 'train' || (!t.transitType || (t.transitType !== 'bus' && t.transitType !== 'taxi')));
                  const buses = transitList.filter(t => t.transitType === 'bus');
                  const taxis = transitList.filter(t => t.transitType === 'taxi');
                  return (
                    <div className="flex flex-col text-left">
                      {renderGroup(trains, 'Train Tickets', Train)}
                      {renderGroup(buses, 'Bus Tickets', Bus)}
                      {renderGroup(taxis, 'Taxi/Car Tickets', Car)}
                    </div>
                  );
                }
              })()}

              {/* Add Transit control */}
              {isEditing && (
                <div className="flex flex-col items-center mt-6 gap-2">
                  <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-black tracking-widest">Add Transit Ticket (교통 티켓 추가)</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={() => handleAddTransit('train')} 
                      className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Train
                    </button>
                    <button 
                      onClick={() => handleAddTransit('bus')} 
                      className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Bus
                    </button>
                    <button 
                      onClick={() => handleAddTransit('taxi')} 
                      className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Taxi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GALLERY TAB */}
          {activeTab === 'gallery' && (() => {
            // Helper function to render a single gallery item
            const renderGalleryItem = (imgItem: typeof allGalleryImages[0], idx: number) => {
              const isPhotoActive = expandedItemId === imgItem.id;
              
              return (
                <div 
                  ref={el => { itemRefs.current[imgItem.id] = el; }}
                  key={`${imgItem.type}-${imgItem.url}-${idx}`} 
                  className="flex flex-col group/gallery"
                >
                  {/* Film-photo styled image container */}
                  <div
                    className={`relative overflow-hidden border transition-all duration-300 cursor-pointer aspect-[4/3] group ${isPhotoActive ? 'border-orange-500 scale-[1.02] shadow-md ring-2 ring-orange-500/30' : 'border-black/10 dark:border-white/10'}`}
                    onClick={() => {
                      setExpandedItemId(imgItem.id);
                    }}
                  >
                    <img
                      src={imgItem.url}
                      alt={imgItem.place || 'Gallery Photo'}
                      data-pin-nopin="true"
                      data-pin-no-hover="true"
                      draggable="false"
                      onDragStart={(e) => e.preventDefault()}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/gallery:scale-105"
                    />

                    {/* RED POINT icon to navigate to timeline (only for timeline type) */}
                    {imgItem.type === 'timeline' && (imgItem as any).itemId !== undefined && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToTimelineItem((imgItem as any).itemId, imgItem.date);
                        }}
                        className="absolute top-2 left-2 z-10 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white border border-white/20 shadow-md transition-all hover:scale-110 active:scale-95 animate-in fade-in duration-300"
                        title="일정으로 이동"
                      >
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping absolute" />
                        <span className="w-1.5 h-1.5 bg-white rounded-full relative" />
                      </button>
                    )}

                    {/* Delete image button (only for gallery type) */}
                    {isLoggedIn && imgItem.type === 'gallery' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveGalleryImage(imgItem.url, e);
                        }}
                        className={`absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-red-600 text-white transition-colors z-10 rounded-sm ${isPhotoActive ? 'opacity-100' : 'opacity-0 group-hover/gallery:opacity-100'}`}
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Map Pin Toggle Button (only for gallery type if coords exist) */}
                    {imgItem.type === 'gallery' && imgItem.lat !== undefined && imgItem.lng !== undefined && imgItem.lat !== null && imgItem.lng !== null && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newExclude = !imgItem.excludeFromMap;
                          await handleToggleGalleryImagePin(imgItem.url, newExclude);
                          if (!newExclude) {
                            setExpandedItemId(imgItem.id);
                          }
                        }}
                        className={`absolute top-2 ${isLoggedIn ? 'right-9' : 'right-2'} p-1.5 transition-colors z-10 rounded-sm ${!imgItem.excludeFromMap ? 'bg-orange-500 hover:bg-orange-600 text-white opacity-100' : (isPhotoActive ? 'bg-black/75 hover:bg-black text-white/50 hover:text-white opacity-100' : 'bg-black/75 hover:bg-black text-white/50 hover:text-white opacity-0 group-hover/gallery:opacity-100 focus:opacity-100')}`}
                        title={imgItem.excludeFromMap ? "지도에 핀 표시하기" : "지도에서 핀 숨기기"}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Maximize / Expand button to trigger lightbox (bottom-right) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const globalIdx = galleryAllMeta.findIndex(m => m.url === imgItem.url);
                        setLightboxIndex(globalIdx !== -1 ? globalIdx : 0);
                        setIsLightboxOpen(true);
                      }}
                      className={`absolute bottom-2 right-2 p-1.5 bg-black/75 hover:bg-black text-white transition-colors z-10 rounded-sm ${isPhotoActive ? 'opacity-100' : 'opacity-0 group-hover/gallery:opacity-100 focus:opacity-100'}`}
                      title="전체화면"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="absolute inset-0 bg-black/0 group-hover/gallery:bg-black/10 transition-colors pointer-events-none" />
                  </div>

                  {/* Note / description area below image */}
                  <div className="bg-black/3 dark:bg-white/3 border border-t-0 border-black/10 dark:border-white/10 px-3 py-2 flex flex-col gap-1">
                    {(imgItem.date || imgItem.place) && (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] font-bold uppercase tracking-wider text-black/55 dark:text-white/55 mb-0.5">
                        {imgItem.date && (
                          <span className="text-amber-600 dark:text-amber-400">
                            📅 {imgItem.date} {imgItem.time && `(${imgItem.time})`}
                          </span>
                        )}
                        {imgItem.place && (
                          <span className="text-amber-600 dark:text-amber-400">
                            📍 {imgItem.place}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex-1 min-w-0">
                        {imgItem.type === 'timeline' && (imgItem as any).memo && (
                          <p className="text-[10px] text-black/70 dark:text-white/70 font-medium leading-relaxed mt-0.5">{(imgItem as any).memo}</p>
                        )}
                        {imgItem.type === 'timeline' && imgItem.imgNote && (
                          <p className="text-[10px] text-black/50 dark:text-white/50 italic leading-relaxed border-t border-black/5 dark:border-white/5 pt-1 mt-0.5 truncate">{imgItem.imgNote}</p>
                        )}
                        {imgItem.type === 'gallery' && (
                          isEditing ? (
                            <input
                              type="text"
                              value={imgItem.imgNote || ''}
                              onChange={(e) => handleUpdateGalleryImageNote(imgItem.url, e.target.value)}
                              placeholder="사진 설명 추가..."
                              className="w-full bg-transparent outline-none text-[10px] text-black/70 dark:text-white/70 placeholder-black/25 dark:placeholder-white/25 mt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : imgItem.imgNote ? (
                            <p className="text-[10px] text-black/60 dark:text-white/60 italic leading-relaxed truncate">{imgItem.imgNote}</p>
                          ) : (
                            <p className="text-[10px] text-black/20 dark:text-white/20 italic">메모 없음</p>
                          )
                        )}
                        {imgItem.type === 'timeline' && !(imgItem as any).memo && !imgItem.imgNote && (
                          <p className="text-[10px] text-black/20 dark:text-white/20 italic">메모 없음</p>
                        )}
                      </div>
                      {imgItem.lat !== undefined && imgItem.lng !== undefined && imgItem.lat !== null && imgItem.lng !== null && (
                        <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div 
                className="p-4 md:p-6 relative min-h-[400px] animate-in fade-in duration-300"
                onDragOver={handleGalleryDragOver}
                onDragLeave={handleGalleryDragLeave}
                onDrop={handleGalleryDrop}
              >
                {/* Drag & Drop Visual Overlay */}
                {isGalleryDragActive && isLoggedIn && (
                  <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center border-4 border-dashed border-red-600 m-2 transition-all">
                    <div className="text-white flex flex-col items-center gap-3">
                      <Plus className="w-12 h-12 animate-bounce text-red-500" />
                      <p className="text-sm md:text-base font-black tracking-widest uppercase text-center">
                        Drop images here to add to gallery
                      </p>
                      <p className="text-xs text-white/60">
                        이미지를 여기에 놓으면 갤러리에 즉시 추가됩니다
                      </p>
                    </div>
                  </div>
                )}
                
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

                {/* Gallery View Mode Toggle */}
                {allGalleryImages.length > 0 && (
                  <div className="flex justify-end mb-6">
                    <div className="flex rounded-none border border-black/10 dark:border-white/10 p-0.5 bg-black/5 dark:bg-white/5">
                      <button
                        onClick={() => setGalleryViewMode('grid')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          galleryViewMode === 'grid'
                            ? 'bg-white dark:bg-[#1a1a1a] text-black dark:text-white shadow-sm'
                            : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        Timeline Grid
                      </button>
                      <button
                        onClick={() => setGalleryViewMode('accordion')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          galleryViewMode === 'accordion'
                            ? 'bg-white dark:bg-[#1a1a1a] text-black dark:text-white shadow-sm'
                            : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        Accordion by Date
                      </button>
                    </div>
                  </div>
                )}

                {allGalleryImages.length === 0 ? (
                  <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                    등록된 갤러리 사진이 없습니다.
                  </div>
                ) : galleryViewMode === 'accordion' ? (
                  <div className="flex flex-col gap-3">
                    {/* Date Accordions */}
                    {generatedDates.map((date, idx) => {
                      const items = galleryGroups[date] || [];
                      const isCollapsed = collapsedGalleryDays.includes(date);
                      if (items.length === 0) return null;

                      return (
                        <div key={date} className="border border-black/10 dark:border-white/10">
                          <button
                            onClick={() => {
                              if (isCollapsed) {
                                setCollapsedGalleryDays(prev => prev.filter(d => d !== date));
                              } else {
                                setCollapsedGalleryDays(prev => [...prev, date]);
                              }
                            }}
                            className="w-full flex items-center justify-between py-2.5 px-4 bg-black/3 dark:bg-white/3 text-[10px] md:text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <span>Day {idx + 1} — {date} ({items.length} Photos)</span>
                            <span className="text-[8px] md:text-[9px] text-black/45 dark:text-white/45">
                              {isCollapsed ? '▼ EXPAND' : '▲ COLLAPSE'}
                            </span>
                          </button>
                          {!isCollapsed && (
                            <div className="p-3 md:p-5 grid grid-cols-2 gap-3 md:gap-5 border-t border-black/10 dark:border-white/10">
                              {items.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* No Date Accordion */}
                    {galleryGroups['NO_DATE'] && galleryGroups['NO_DATE'].length > 0 && (() => {
                      const items = galleryGroups['NO_DATE'];
                      const isCollapsed = collapsedGalleryDays.includes('NO_DATE');
                      return (
                        <div className="border border-black/10 dark:border-white/10">
                          <button
                            onClick={() => {
                              if (isCollapsed) {
                                setCollapsedGalleryDays(prev => prev.filter(d => d !== 'NO_DATE'));
                              } else {
                                setCollapsedGalleryDays(prev => [...prev, 'NO_DATE']);
                              }
                            }}
                            className="w-full flex items-center justify-between py-2.5 px-4 bg-black/3 dark:bg-white/3 text-[10px] md:text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <span>No Date ({items.length} Photos)</span>
                            <span className="text-[8px] md:text-[9px] text-black/45 dark:text-white/45">
                              {isCollapsed ? '▼ EXPAND' : '▲ COLLAPSE'}
                            </span>
                          </button>
                          {!isCollapsed && (
                            <div className="p-3 md:p-5 grid grid-cols-2 gap-3 md:gap-5 border-t border-black/10 dark:border-white/10">
                              {items.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Timeline Grid View */
                  <div className="grid grid-cols-2 gap-3 md:gap-5">
                    {allGalleryImages.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Footer inside Detail scroll container */}
          {activeTab !== 'gallery' && (
            <div className="w-full shrink-0 pb-16 pt-8 mt-16 border-t border-black/5 dark:border-white/5">
              <Footer />
            </div>
          )}
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

      {/* Google Maps Confirmation Modal */}
      {mapConfirm && (
        <div 
          onClick={() => setMapConfirm(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F9F8F6] dark:bg-[#161616] border border-black/20 dark:border-white/20 p-6 md:p-8 w-full max-w-sm text-center shadow-2xl rounded-none text-black dark:text-white"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <Map className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">구글 지도 이동</h3>
            <p className="text-sm font-black tracking-tight mb-6 leading-relaxed break-keep" style={{ wordBreak: 'keep-all' }}>
              '{mapConfirm.placeName}' 위치를 확인하기 위해 구글 지도로 이동하시겠습니까?
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={mapConfirm.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMapConfirm(null)}
                className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[10px] font-black uppercase tracking-widest rounded-none transition-all cursor-pointer block text-center"
              >
                이동
              </a>
              <button
                onClick={() => setMapConfirm(null)}
                className="w-full py-2.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-none transition-all cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

interface TimelineItemPlaceInputProps {
  itemId: number;
  initialValue: string;
  onUpdatePlace: (id: number, val: string) => void;
  frequentPlaces: any[];
  onSelectFrequent: (item: any, fp: any) => void;
  toggleFrequentPlace: (item: any) => void;
  isFrequent: (place: string) => boolean;
  item: any;
}

function TimelineItemPlaceInput({
  itemId,
  initialValue,
  onUpdatePlace,
  frequentPlaces,
  onSelectFrequent,
  toggleFrequentPlace,
  isFrequent,
  item,
}: TimelineItemPlaceInputProps) {
  const [localVal, setLocalVal] = useState(initialValue);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setLocalVal(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    onUpdatePlace(itemId, localVal);
    setTimeout(() => setShowDropdown(false), 250);
  };

  const handleSelect = (fp: any) => {
    setLocalVal(fp.place);
    onSelectFrequent(item, fp);
    setShowDropdown(false);
  };

  const filteredFrequent = frequentPlaces.filter(fp =>
    fp.place.toLowerCase().includes(localVal.toLowerCase())
  );

  return (
    <div className="w-full relative" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 w-full relative">
        <input
          id={`title-input-${itemId}`}
          type="text"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={handleBlur}
          className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none font-bold text-sm md:text-base text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
          placeholder="일정 이름"
        />
        <button 
          type="button"
          onClick={() => toggleFrequentPlace(item)}
          className="p-1 hover:text-yellow-500 text-black/30 dark:text-white/30 transition-colors shrink-0"
          title={isFrequent(localVal) ? "자주 가는 장소 등록 해제" : "자주 가는 장소로 등록"}
        >
          <Star className={`w-3.5 h-3.5 ${isFrequent(localVal) ? 'fill-yellow-400 text-yellow-500' : ''}`} />
        </button>
      </div>

      {/* Frequent Places Auto-complete Dropdown */}
      {showDropdown && filteredFrequent.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#222222] border border-black/20 dark:border-white/20 shadow-xl z-50 max-h-40 overflow-y-auto rounded-none" onClick={(e) => e.stopPropagation()}>
          <div className="px-2 py-1 text-[8px] font-bold text-black/40 dark:text-white/40 border-b border-black/5 dark:border-white/5 uppercase tracking-widest">
            자주 사용하는 장소
          </div>
          {filteredFrequent.map((fp, idx) => (
            <div 
              key={idx}
              onMouseDown={() => handleSelect(fp)}
              className="px-2.5 py-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left border-b border-black/5 dark:border-white/5 last:border-b-0 text-xs font-bold text-black dark:text-white"
            >
              <div className="font-bold flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-red-500" />
                {fp.place}
              </div>
              {fp.location && <div className="text-[10px] text-black/50 dark:text-white/50 truncate pl-4.5">{fp.location}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
