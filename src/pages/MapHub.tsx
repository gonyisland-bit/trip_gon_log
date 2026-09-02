import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight, Calendar } from 'lucide-react';
import { Trip, Plan } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../components/SummaryView';

interface CountryInfo {
  code: string;
  name: string;
  nameKo: string;
  currency: string;
  currencySymbol: string;
  rateToKRW: number;
  cities: string[];
  center: [number, number]; // [lat, lng]
  zoom: number;
}

const COUNTRIES_DATA: CountryInfo[] = [
  {
    code: 'JP',
    name: 'JAPAN',
    nameKo: '일본',
    currency: 'JPY',
    currencySymbol: '¥',
    rateToKRW: 9.0,
    cities: ['TOKYO', 'OSAKA', 'KYOTO', 'FUKUOKA', 'SAPPORO', 'NAGOYA', 'OKINAWA'],
    center: [36.2048, 138.2529],
    zoom: 5.5,
  },
  {
    code: 'KR',
    name: 'SOUTH KOREA',
    nameKo: '대한민국',
    currency: 'KRW',
    currencySymbol: '₩',
    rateToKRW: 1.0,
    cities: ['SEOUL', 'BUSAN', 'JEJU', 'GANGNEUNG', 'GYEONGJU', 'INCHEON'],
    center: [36.5, 127.8],
    zoom: 6.5,
  },
  {
    code: 'VN',
    name: 'VIETNAM',
    nameKo: '베트남',
    currency: 'VND',
    currencySymbol: '₫',
    rateToKRW: 0.055,
    cities: ['DA NANG', 'HANOI', 'HO CHI MINH', 'NHA TRANG', 'PHU QUOC', 'HOI AN'],
    center: [15.8, 108.0],
    zoom: 5.5,
  },
  {
    code: 'TH',
    name: 'THAILAND',
    nameKo: '태국',
    currency: 'THB',
    currencySymbol: '฿',
    rateToKRW: 38.0,
    cities: ['BANGKOK', 'CHIANG MAI', 'PHUKET', 'PATTAYA', 'KOH SAMUI'],
    center: [14.5, 101.0],
    zoom: 5.5,
  },
  {
    code: 'TW',
    name: 'TAIWAN',
    nameKo: '대만',
    currency: 'TWD',
    currencySymbol: 'NT$',
    rateToKRW: 43.0,
    cities: ['TAIPEI', 'KAOHSIUNG', 'TAICHUNG', 'TAINAN', 'HUALIEN'],
    center: [23.7, 121.0],
    zoom: 7,
  },
  {
    code: 'SG',
    name: 'SINGAPORE',
    nameKo: '싱가포르',
    currency: 'SGD',
    currencySymbol: 'S$',
    rateToKRW: 1040,
    cities: ['SINGAPORE', 'SENTOSA', 'MARINA BAY'],
    center: [1.3521, 103.8198],
    zoom: 11,
  },
  {
    code: 'FR',
    name: 'FRANCE',
    nameKo: '프랑스',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['PARIS', 'NICE', 'LYON', 'MARSEILLE', 'BORDEAUX', 'STRASBOURG'],
    center: [46.6, 2.3],
    zoom: 5.5,
  },
  {
    code: 'IT',
    name: 'ITALY',
    nameKo: '이탈리아',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['ROME', 'FLORENCE', 'VENICE', 'MILAN', 'NAPLES', 'AMALFI'],
    center: [42.5, 12.5],
    zoom: 5.5,
  },
  {
    code: 'ES',
    name: 'SPAIN',
    nameKo: '스페인',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['BARCELONA', 'MADRID', 'SEVILLE', 'GRANADA', 'VALENCIA'],
    center: [40.4, -3.7],
    zoom: 5.5,
  },
  {
    code: 'GB',
    name: 'UNITED KINGDOM',
    nameKo: '영국',
    currency: 'GBP',
    currencySymbol: '£',
    rateToKRW: 1750,
    cities: ['LONDON', 'EDINBURGH', 'MANCHESTER', 'OXFORD', 'CAMBRIDGE'],
    center: [54.5, -2.5],
    zoom: 5.5,
  },
  {
    code: 'CH',
    name: 'SWITZERLAND',
    nameKo: '스위스',
    currency: 'CHF',
    currencySymbol: 'CHF',
    rateToKRW: 1540,
    cities: ['ZURICH', 'INTERLAKEN', 'GENEVA', 'LUCERNE', 'ZERMATT'],
    center: [46.8, 8.2],
    zoom: 7,
  },
  {
    code: 'DE',
    name: 'GERMANY',
    nameKo: '독일',
    currency: 'EUR',
    currencySymbol: '€',
    rateToKRW: 1480,
    cities: ['BERLIN', 'MUNICH', 'FRANKFURT', 'HAMBURG', 'COLOGNE'],
    center: [51.1, 10.4],
    zoom: 5.5,
  },
  {
    code: 'US',
    name: 'UNITED STATES',
    nameKo: '미국',
    currency: 'USD',
    currencySymbol: '$',
    rateToKRW: 1380,
    cities: ['NEW YORK', 'LOS ANGELES', 'SAN FRANCISCO', 'LAS VEGAS', 'HONOLULU', 'SEATTLE'],
    center: [39.8, -98.5],
    zoom: 4,
  },
  {
    code: 'CA',
    name: 'CANADA',
    nameKo: '캐나다',
    currency: 'CAD',
    currencySymbol: 'C$',
    rateToKRW: 1010,
    cities: ['VANCOUVER', 'TORONTO', 'MONTREAL', 'QUEBEC', 'BANFF'],
    center: [56.1, -106.3],
    zoom: 3.5,
  },
  {
    code: 'AU',
    name: 'AUSTRALIA',
    nameKo: '호주',
    currency: 'AUD',
    currencySymbol: 'A$',
    rateToKRW: 900,
    cities: ['SYDNEY', 'MELBOURNE', 'BRISBANE', 'PERTH', 'GOLD COAST'],
    center: [-25.2, 133.7],
    zoom: 4,
  },
];

const KNOWN_CITY_COORDS: { [key: string]: [number, number] } = {
  tokyo: [35.6762, 139.6503],
  osaka: [34.6937, 135.5023],
  kyoto: [35.0116, 135.7681],
  fukuoka: [33.5902, 130.4017],
  sapporo: [43.0618, 141.3545],
  nagoya: [35.1815, 136.9066],
  okinawa: [26.2124, 127.6809],
  seoul: [37.5665, 126.9780],
  busan: [35.1796, 129.0756],
  jeju: [33.4996, 126.5312],
  gangneung: [37.7519, 128.8761],
  danang: [16.0544, 108.2022],
  hanoi: [21.0285, 105.8542],
  hochiminh: [10.8231, 106.6297],
  nhatrang: [12.2388, 109.1967],
  bangkok: [13.7563, 100.5018],
  chiangmai: [18.7883, 98.9853],
  phuket: [7.8804, 98.3923],
  taipei: [25.0330, 121.5654],
  kaohsiung: [22.6273, 120.3014],
  singapore: [1.3521, 103.8198],
  paris: [48.8566, 2.3522],
  nice: [43.7102, 7.2620],
  rome: [41.9028, 12.4964],
  florence: [43.7696, 11.2558],
  venice: [45.4408, 12.3155],
  milan: [45.4642, 9.1900],
  barcelona: [41.3879, 2.1699],
  madrid: [40.4168, -3.7038],
  london: [51.5074, -0.1278],
  edinburgh: [55.9533, -3.1883],
  zurich: [47.3769, 8.5417],
  interlaken: [46.6863, 7.8632],
  geneva: [46.2044, 6.1432],
  berlin: [52.5200, 13.4050],
  munich: [48.1351, 11.5820],
  frankfurt: [50.1109, 8.6821],
  newyork: [40.7128, -74.0060],
  losangeles: [34.0522, -118.2437],
  sanfrancisco: [37.7749, -122.4194],
  lasvegas: [36.1699, -115.1398],
  honolulu: [21.3069, -157.8583],
  hawaii: [21.3069, -157.8583],
  vancouver: [49.2827, -123.1207],
  toronto: [43.6532, -79.3832],
  sydney: [-33.8688, 151.2093],
  melbourne: [-37.8136, 144.9631],
};

interface MapPinGroup {
  city: string;
  country: string;
  lat: number;
  lng: number;
  journeys: (Trip | Plan)[];
}

interface MapHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  isDarkMode: boolean;
}

export function MapHubPage({ trips, plans, onNavigate, isDarkMode }: MapHubPageProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [selectedPinGroup, setSelectedPinGroup] = useState<MapPinGroup | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  const allJourneys = useMemo(() => [...trips, ...plans], [trips, plans]);

  // Group journeys into geographic pins
  const pinGroups: MapPinGroup[] = useMemo(() => {
    const map = new Map<string, MapPinGroup>();

    allJourneys.forEach(journey => {
      const loc = journey.locationStr || journey.country || '';
      if (!loc) return;

      const cleanLoc = cleanAdministrativeDistricts(loc);
      const parts = cleanLoc.split(/[,·/]/).map(p => p.trim()).filter(Boolean);
      const cityRaw = parts[0] || 'Unknown';
      const countryRaw = parts.length > 1 ? parts[parts.length - 1] : (journey.country || '');

      const cityKey = cityRaw.toLowerCase().replace(/\s+/g, '');
      let coords: [number, number] | null = null;

      // Check known city dictionary
      if (KNOWN_CITY_COORDS[cityKey]) {
        coords = KNOWN_CITY_COORDS[cityKey];
      } else {
        // Search country match
        const matchedCountry = COUNTRIES_DATA.find(c => 
          c.name.toLowerCase().includes(countryRaw.toLowerCase()) ||
          c.nameKo.includes(countryRaw) ||
          cleanLoc.toUpperCase().includes(c.name)
        );
        if (matchedCountry) {
          coords = matchedCountry.center;
        }
      }

      if (coords) {
        const groupKey = `${coords[0].toFixed(2)}_${coords[1].toFixed(2)}`;
        if (!map.has(groupKey)) {
          map.set(groupKey, {
            city: cityRaw.toUpperCase(),
            country: countryRaw.toUpperCase(),
            lat: coords[0],
            lng: coords[1],
            journeys: [],
          });
        }
        map.get(groupKey)!.journeys.push(journey);
      }
    });

    return Array.from(map.values());
  }, [allJourneys]);

  // ESC key to close modal or selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPinGroup(null);
        setSelectedCountry(null);
        setIsSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [25, 20],
      zoom: 2.7,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      worldCopyJump: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tiles on dark mode change
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);
  }, [isDarkMode]);

  // Render Red Pins
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    pinGroups.forEach(group => {
      // SVG: "상단이 둥글고 하단이 핀처럼 박힌 빨간 핀"
      const pinHtml = `
        <div class="relative cursor-pointer group flex flex-col items-center select-none" style="transform: translate(-50%, -100%);">
          <div class="relative transition-transform duration-200 group-hover:scale-110 drop-shadow-md">
            <svg viewBox="0 0 24 34" width="28" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#DC2626"/>
              <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
            </svg>
            ${group.journeys.length > 1 ? `
              <span class="absolute -top-1 -right-1.5 bg-black text-white dark:bg-white dark:text-black font-mono font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-black shadow-xs">
                ${group.journeys.length}
              </span>
            ` : ''}
          </div>
          <div class="bg-black/90 text-white font-sans text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-none mt-0.5 whitespace-nowrap shadow-sm border border-white/20 opacity-90 group-hover:opacity-100">
            ${group.city}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-map-pin',
        html: pinHtml,
        iconSize: [28, 42],
        iconAnchor: [14, 38],
      });

      const marker = L.marker([group.lat, group.lng], { icon }).addTo(map);

      marker.on('click', () => {
        setSelectedPinGroup(group);
      });

      markersRef.current.push(marker);
    });
  }, [pinGroups]);

  // Filtered countries for search
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES_DATA;
    const q = searchQuery.trim().toLowerCase();
    return COUNTRIES_DATA.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.nameKo.includes(q) ||
      c.cities.some(city => city.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    setIsSearchDropdownOpen(false);
    setSearchQuery(country.name);

    if (mapRef.current) {
      mapRef.current.flyTo(country.center, country.zoom, {
        duration: 1.2,
      });
    }
  };

  return (
    <main className="relative w-full h-[calc(100vh-56px)] flex flex-col bg-white dark:bg-[#0A0A0A] overflow-hidden select-none font-sans">
      {/* 1. Top Bar: Floating Swiss Minimal Search & Country Selector */}
      <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-auto z-[500] w-auto sm:w-80">
        <div className="relative bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl flex items-center px-3 py-2">
          <Search className="w-4 h-4 text-black/50 dark:text-white/50 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchDropdownOpen(true);
            }}
            onFocus={() => setIsSearchDropdownOpen(true)}
            placeholder="Search country or city..."
            className="w-full bg-transparent text-xs font-sans font-bold uppercase tracking-wider text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCountry(null);
              }}
              className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Suggestions */}
        {isSearchDropdownOpen && filteredCountries.length > 0 && (
          <>
            <div className="fixed inset-0 z-[490]" onClick={() => setIsSearchDropdownOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 shadow-2xl max-h-60 overflow-y-auto z-[510] divide-y divide-black/10 dark:divide-white/10 animate-in fade-in duration-150">
              {filteredCountries.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">
                      {c.nameKo}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-black/50 dark:text-white/50 border border-black/15 dark:border-white/15 px-1">
                    {c.currency}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 2. Full-bleed Leaflet Map */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 3. Selected Country Info Panel (Swiss Minimal Editorial Tone) */}
      {selectedCountry && (
        <div className="absolute bottom-6 left-4 sm:left-6 z-[500] max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between border-b border-black/15 dark:border-white/15 pb-3">
            <div>
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                COUNTRY DOSSIER
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-sans uppercase tracking-tight text-black dark:text-white">
                {selectedCountry.name}
              </h2>
              <span className="text-xs text-black/50 dark:text-white/50 font-medium">
                {selectedCountry.nameKo}
              </span>
            </div>
            <button
              onClick={() => setSelectedCountry(null)}
              className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-b border-black/15 dark:border-white/15 text-xs font-mono">
            <div>
              <span className="text-[8.5px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">
                CURRENCY / 통화
              </span>
              <span className="font-bold text-black dark:text-white">
                {selectedCountry.currency} ({selectedCountry.currencySymbol})
              </span>
            </div>
            <div>
              <span className="text-[8.5px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">
                RATE / 환율 (KRW)
              </span>
              <span className="font-bold text-black dark:text-white">
                1 {selectedCountry.currency} ≈ ₩{selectedCountry.rateToKRW.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-3">
            <span className="text-[8.5px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold mb-1">
              MAJOR TRAVEL CITIES / 주요 여행도시
            </span>
            <div className="flex flex-wrap gap-1 text-[10px] font-sans font-black text-black/80 dark:text-white/80 uppercase">
              {selectedCountry.cities.map((city) => (
                <span key={city} className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5">
                  {city}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Journey List Modal when a Pin is Clicked */}
      {selectedPinGroup && (
        <div 
          onClick={() => setSelectedPinGroup(null)}
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111111] max-w-md w-full border border-black/20 dark:border-white/20 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden rounded-none animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-black/15 dark:border-white/15 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
              <div>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-500 block">
                  REGISTERED JOURNEYS
                </span>
                <h3 className="text-lg sm:text-xl font-black font-sans uppercase tracking-tight text-black dark:text-white">
                  {selectedPinGroup.city}
                </h3>
                {selectedPinGroup.country && (
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-mono">
                    {selectedPinGroup.country} · {selectedPinGroup.journeys.length} JOURNEY{selectedPinGroup.journeys.length > 1 ? 'S' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPinGroup(null)}
                className="p-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer"
                title="닫기 (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Journey Card List */}
            <div className="flex-1 overflow-y-auto divide-y divide-black/10 dark:divide-white/10 p-2">
              {selectedPinGroup.journeys.map(journey => {
                const isPlan = journey.tags?.includes('Plan') || journey.title.includes('(Plan)');
                const cleanTitle = journey.title.replace(' (Plan)', '');

                return (
                  <div
                    key={journey.id}
                    onClick={() => {
                      setSelectedPinGroup(null);
                      onNavigate('detail', journey.id);
                    }}
                    className="p-3 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    {/* Square Thumbnail */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 aspect-square shrink-0 border border-black/15 dark:border-white/15 overflow-hidden bg-black/10">
                      <img
                        src={getEffectiveImageUrl(journey.img)}
                        alt={cleanTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-xs sm:text-sm font-black font-sans uppercase tracking-tight text-black dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {cleanTitle}
                        </h4>
                        {isPlan ? (
                          <span className="px-1 py-0.5 bg-blue-600 text-white font-mono text-[8px] font-black uppercase tracking-widest shrink-0">
                            PLAN
                          </span>
                        ) : (
                          <span className="px-1 py-0.5 bg-black text-white dark:bg-white dark:text-black font-mono text-[8px] font-black uppercase tracking-widest shrink-0">
                            LOG
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-black/60 dark:text-white/60 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-black/40 dark:text-white/40" />
                        <span>{journey.date}</span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
