export const dayColors = [
  '#dc2626', // Day 1: Red
  '#2563eb', // Day 2: Blue
  '#16a34a', // Day 3: Green
  '#d97706', // Day 4: Orange/Amber
  '#7c3aed', // Day 5: Purple
  '#db2777', // Day 6: Pink
  '#0891b2', // Day 7: Cyan
  '#4b5563', // Day 8: Gray
];

export function getDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    if (!isNaN(d.getTime())) {
      return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
    }
  }
  return '';
}
export const airportCoords: { [code: string]: { lat: number; lng: number } } = {
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

export function calculateLayoverTime(arrDate: string, arrTime: string, depDate: string, depTime: string): string {
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

export function extractCountry(address: string): string {
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
    { name: 'HUNGARY', keys: ['hungary', '헝가리', 'hu'] }
  ];

  for (const c of countries) {
    for (const key of c.keys) {
      if (clean.includes(key)) {
        return c.name;
      }
    }
  }

  const parts = address.split(',');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim().toUpperCase();
    for (const c of countries) {
      for (const key of c.keys) {
        if (lastPart.toLowerCase() === key) {
          return c.name;
        }
      }
    }
    return lastPart;
  }
  
  return address.trim().toUpperCase();
}

export function getCountryName(locationToken: string): string {
  if (!locationToken) return 'TRAVEL';
  const cleanToken = locationToken.trim().toLowerCase();
  const CITY_TO_COUNTRY_MAP: { [key: string]: string } = {
    'kyoto': 'JAPAN',
    '교토': 'JAPAN',
    'osaka': 'JAPAN',
    '오사카': 'JAPAN',
    'tokyo': 'JAPAN',
    '도쿄': 'JAPAN',
    'fukuoka': 'JAPAN',
    '후쿠오카': 'JAPAN',
    'sapporo': 'JAPAN',
    '삿포로': 'JAPAN',
    'okinawa': 'JAPAN',
    '오키나와': 'JAPAN',
    'nagoya': 'JAPAN',
    '나고야': 'JAPAN',
    'kobe': 'JAPAN',
    '고베': 'JAPAN',
    'takamatsu': 'JAPAN',
    '다카마쓰': 'JAPAN',
    'matsuyama': 'JAPAN',
    '마쓰야마': 'JAPAN',
    'shizuoka': 'JAPAN',
    '시즈오카': 'JAPAN',
    'kagoshima': 'JAPAN',
    '가고시마': 'JAPAN',
    'kumamoto': 'JAPAN',
    '구마모토': 'JAPAN',
    'miyazaki': 'JAPAN',
    '미야자키': 'JAPAN',
    'oita': 'JAPAN',
    '오이타': 'JAPAN',
    'nagasaki': 'JAPAN',
    '나가사키': 'JAPAN',
    'saga': 'JAPAN',
    '사가': 'JAPAN',
    'paris': 'FRANCE',
    '파리': 'FRANCE',
    'nice': 'FRANCE',
    '니스': 'FRANCE',
    'lyon': 'FRANCE',
    '리옹': 'FRANCE',
    'london': 'UNITED KINGDOM',
    '런던': 'UNITED KINGDOM',
    'taipei': 'TAIWAN',
    '타이베이': 'TAIWAN',
    'taiwan': 'TAIWAN',
    '대만': 'TAIWAN',
    'kaohsiung': 'TAIWAN',
    '가오슝': 'TAIWAN',
    'new york': 'USA',
    '뉴욕': 'USA',
    'la': 'USA',
    'los angeles': 'USA',
    '로스앤젤레스': 'USA',
    'san francisco': 'USA',
    '샌프란시스코': 'USA',
    'seattle': 'USA',
    '시애틀': 'USA',
    'chicago': 'USA',
    '시카고': 'USA',
    'las vegas': 'USA',
    '라스베이거스': 'USA',
    'boston': 'USA',
    '보스턴': 'USA',
    'washington': 'USA',
    '워싱턴': 'USA',
    'guam': 'USA',
    '괌': 'USA',
    'saipan': 'USA',
    '사이판': 'USA',
    'bangkok': 'THAILAND',
    '방콕': 'THAILAND',
    'chiang mai': 'THAILAND',
    '치앙마이': 'THAILAND',
    'phuket': 'THAILAND',
    '푸켓': 'THAILAND',
    'pattaya': 'THAILAND',
    '파타야': 'THAILAND',
    'danang': 'VIETNAM',
    '다낭': 'VIETNAM',
    'hanoi': 'VIETNAM',
    '하노이': 'VIETNAM',
    'ho chi minh': 'VIETNAM',
    '호치민': 'VIETNAM',
    'saigon': 'VIETNAM',
    '사이공': 'VIETNAM',
    'nha trang': 'VIETNAM',
    '나트랑': 'VIETNAM',
    '냐짱': 'VIETNAM',
    'phu quoc': 'VIETNAM',
    '푸꾸옥': 'VIETNAM',
    'da lat': 'VIETNAM',
    '달랏': 'VIETNAM',
    'sapa': 'VIETNAM',
    '사파': 'VIETNAM',
    'hoi an': 'VIETNAM',
    '호이안': 'VIETNAM',
    'singapore': 'SINGAPORE',
    '싱가포르': 'SINGAPORE',
    'sydney': 'AUSTRALIA',
    '시드니': 'AUSTRALIA',
    'melbourne': 'AUSTRALIA',
    '멜버른': 'AUSTRALIA',
    'brisbane': 'AUSTRALIA',
    '브리즈번': 'AUSTRALIA',
    'rome': 'ITALY',
    '로마': 'ITALY',
    'florence': 'ITALY',
    '피렌체': 'ITALY',
    'firenze': 'ITALY',
    'venice': 'ITALY',
    '베네치아': 'ITALY',
    '베니스': 'ITALY',
    'milan': 'ITALY',
    '밀라노': 'ITALY',
    'barcelona': 'SPAIN',
    '바르셀로나': 'SPAIN',
    'sevilla': 'SPAIN',
    '세비야': 'SPAIN',
    'granada': 'SPAIN',
    '그라나다': 'SPAIN',
    'berlin': 'GERMANY',
    '베를린': 'GERMANY',
    'frankfurt': 'GERMANY',
    '프랑크푸르트': 'GERMANY',
    'vienna': 'AUSTRIA',
    '빈': 'AUSTRIA',
    '비엔나': 'AUSTRIA',
    'salzburg': 'AUSTRIA',
    '잘츠부르크': 'AUSTRIA',
    'prague': 'CZECHIA',
    '프라하': 'CZECHIA',
    'budapest': 'HUNGARY',
    '부다페스트': 'HUNGARY',
    'zurich': 'SWITZERLAND',
    '취리히': 'SWITZERLAND',
    'interlaken': 'SWITZERLAND',
    '인터라켄': 'SWITZERLAND',
    'seoul': 'SOUTH KOREA',
    '서울': 'SOUTH KOREA',
    'jeju': 'SOUTH KOREA',
    '제주': 'SOUTH KOREA',
    'busan': 'SOUTH KOREA',
    '부산': 'SOUTH KOREA',
    'incheon': 'SOUTH KOREA',
    '인천': 'SOUTH KOREA',
    'daegu': 'SOUTH KOREA',
    '대구': 'SOUTH KOREA',
    'daejeon': 'SOUTH KOREA',
    '대전': 'SOUTH KOREA',
    'gwangju': 'SOUTH KOREA',
    '광주': 'SOUTH KOREA',
    'ulsan': 'SOUTH KOREA',
    '울산': 'SOUTH KOREA',
    'suwon': 'SOUTH KOREA',
    '수원': 'SOUTH KOREA',
    'gyeongju': 'SOUTH KOREA',
    '경주': 'SOUTH KOREA',
    'gangneung': 'SOUTH KOREA',
    '강릉': 'SOUTH KOREA',
    'sokcho': 'SOUTH KOREA',
    '속초': 'SOUTH KOREA',
    'yeosu': 'SOUTH KOREA',
    '여수': 'SOUTH KOREA',
    'jeonju': 'SOUTH KOREA',
    '전주': 'SOUTH KOREA',
    'chuncheon': 'SOUTH KOREA',
    '춘천': 'SOUTH KOREA',
    'cebu': 'PHILIPPINES',
    '세부': 'PHILIPPINES',
    'boracay': 'PHILIPPINES',
    '보라카이': 'PHILIPPINES',
    'bohol': 'PHILIPPINES',
    '보홀': 'PHILIPPINES',
    'clark': 'PHILIPPINES',
    '클락': 'PHILIPPINES',
    'kuala lumpur': 'MALAYSIA',
    '쿠알라룸푸르': 'MALAYSIA',
    'kota kinabalu': 'MALAYSIA',
    '코타키나발루': 'MALAYSIA',
    'penang': 'MALAYSIA',
    '페낭': 'MALAYSIA',
    'bali': 'INDONESIA',
    '발리': 'INDONESIA',
    'jakarta': 'INDONESIA',
    '자카르타': 'INDONESIA',
    'macau': 'MACAU',
    '마카오': 'MACAU',
    'hong kong': 'HONG KONG',
    '홍콩': 'HONG KONG'
  };
  return CITY_TO_COUNTRY_MAP[cleanToken] || locationToken.toUpperCase();
}

// Parse dateRange: 'YYYY.MM.DD - YYYY.MM.DD'
export function generateDateList(dateRangeStr: string): string[] {
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
export function minutesToTimeStr(minutes: number): string {
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
export function parseTimeToMinutes(timeStr: string): number {
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

export function timeStrTo24h(timeStr: string): string {
  if (!timeStr) return '00:00';
  const minutes = parseTimeToMinutes(timeStr);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function time24hTo12h(val24h: string): string {
  if (!val24h) return '12:00 AM';
  const parts = val24h.split(':');
  const h24 = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return minutesToTimeStr(h24 * 60 + m);
}


// Date range picker parsing and formatting helpers
export const parseDateRange = (dateStr: string) => {
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
